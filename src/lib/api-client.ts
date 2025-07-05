import Axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  isAxiosError,
} from "axios";
import { toDate } from "date-fns";

import { auth, responses } from "@/config/constants";
import { env } from "@/config/env";

import { clearAllCookies, getCookie, setCookie } from "@/lib/cookies";
import { generateToken, refreshToken } from "@/lib/token";

let isRefreshingToken = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const createNewToken = async () => {
  try {
    const response = await generateToken();
    if (response?.data?.response?.message_en === responses.success) {
      const token = response?.data?.response?.data?.token || "";
      const tokenExpires = toDate(
        `${response?.data?.response?.data?.token_expired}Z`
      );
      const refreshTokenExpires = toDate(
        `${response?.data?.response?.data?.refresh_token_expired}Z`
      );

      setCookie(auth.token, token || "", tokenExpires);
      setCookie(
        auth.refresh_token,
        response?.data?.response?.data?.refresh_token || "",
        refreshTokenExpires
      );

      return token;
    }

    return null;
  } catch (error) {
    return null;
  }
};

async function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  try {
    if (config.headers) {
      config.headers.Accept = "application/json";
    }

    let token = getCookie(auth.token);
    if (!token) {
      const tokenRefresh = getCookie(auth.refresh_token);

      if (!tokenRefresh) {
        token = await createNewToken();
      } else {
        if (isRefreshingToken) {
          return new Promise<InternalAxiosRequestConfig>((resolve) => {
            refreshSubscribers.push((token) => {
              config.headers.token = token;
              resolve(config);
            });
          });
        }

        isRefreshingToken = true;
        try {
          const response = await refreshToken();

          if (response?.data?.response?.message_en === responses.success) {
            token = response?.data?.response?.data?.token || "";
            const tokenExpires = toDate(
              `${response?.data?.response?.data?.token_expired}Z`
            );
            const refreshTokenExpires = toDate(
              `${response?.data?.response?.data?.refresh_token_expired}Z`
            );

            setCookie(auth.token, token || "", tokenExpires);
            setCookie(
              auth.refresh_token,
              tokenRefresh || "",
              refreshTokenExpires
            );

            isRefreshingToken = false;
            refreshSubscribers.forEach((subscriber) => subscriber(token || ""));
            refreshSubscribers = [];
          } else {
            clearAllCookies();
            token = await createNewToken();
          }
        } catch (refreshError) {
          console.log("failed to refresh token", { refreshError });
          clearAllCookies();
          token = await createNewToken();
        }
      }
    }

    config.headers.token = token;
    return config;
  } catch (error) {
    console.error("auth interceptor failed request", { error });

    if (isNetworkError(error)) {
      throw new Error("Network error during authentication");
    }

    if (isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        clearAllCookies();
        redirectToLogin();
      }
    }

    throw error;
  }
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    ["ECONNABORTED", "ENETDOWN"].includes(error.code as string)
  );
}

function redirectToLogin() {
  // Implementation depends on your framework
  window.location.href = "/login";
}

export const api = Axios.create({
  baseURL: env.API_URL,
});

api.interceptors.request.use(authRequestInterceptor);
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // const message = error.response?.data?.message || error.message;
    // useNotifications.getState().addNotification({
    //   type: 'error',
    //   title: 'Error',
    //   message,
    // });

    if (error.response?.status === 401) {
      // const searchParams = new URLSearchParams();
      // let redirectTo = searchParams.get("redirectTo");
      // console.log({ redirectTo });
      // window.location.href = paths.auth.login.getHref(redirectTo);
    }

    return Promise.reject(error);
  }
);
