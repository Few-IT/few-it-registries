import Axios, { InternalAxiosRequestConfig } from "axios";
import { toDate } from "date-fns";

import { auth, responses } from "@/config/constants";
import { env } from "@/config/env";
import { paths } from "@/config/paths";

import { clearAllCookies, getCookie, setCookie } from "./cookies";
import { generateToken, refreshToken } from "./token";

const checkToken = async () => {
  let token = getCookie(auth.token);
  if (!token) {
    const refresh_token = getCookie(auth.refresh_token);
    if (refresh_token) {
      const response = await refreshToken();
      if (response?.data?.response?.message_en === responses.success) {
        token = response?.data?.response?.data?.token || "";
        const expires = toDate(
          response?.data?.response?.data?.token_expired || ""
        );
        const refresh_token_expires = toDate(
          response?.data?.response?.data?.refresh_token_expired || ""
        );

        setCookie(auth.token, token, expires);
        setCookie(
          auth.token_expired,
          response?.data?.response?.data?.token_expired || "",
          expires
        );
        setCookie(
          auth.refresh_token,
          response?.data?.response?.data?.refresh_token || "",
          refresh_token_expires
        );
        setCookie(
          auth.refresh_token_expired,
          response?.data?.response?.data?.refresh_token_expired || "",
          refresh_token_expires
        );

        return token;
      }
    }

    const response = await generateToken();
    if (response?.data?.response?.message_en === responses.success) {
      token = response?.data?.response?.data?.token || "";
      const expires = toDate(
        response?.data?.response?.data?.token_expired || ""
      );
      const refresh_token_expires = toDate(
        response?.data?.response?.data?.refresh_token_expired || ""
      );

      setCookie(auth.token, token, expires);
      setCookie(
        auth.token_expired,
        response?.data?.response?.data?.token_expired || "",
        expires
      );
      setCookie(
        auth.refresh_token,
        response?.data?.response?.data?.refresh_token || "",
        refresh_token_expires
      );
      setCookie(
        auth.refresh_token_expired,
        response?.data?.response?.data?.refresh_token_expired || "",
        refresh_token_expires
      );
    }
  }

  return token;
};

async function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = "application/json";
  }

  const token = await checkToken();
  config.headers.token = token;

  console.log({ config });

  return config;
}

export const api = Axios.create({
  baseURL: env.API_URL,
});

api.interceptors.request.use(authRequestInterceptor);
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const previousRequest = error.config;
    const message = error.response?.data?.response?.message_en || error.message;
    // useNotifications.getState().addNotification({
    //   type: 'error',
    //   title: 'Error',
    //   message,
    // });

    if (message === responses.unauthorizedToken) {
      // refresh token
      let token = getCookie(auth.refresh_token);

      if (token) {
        const response = await refreshToken();
        if (response?.data?.response?.message_en === responses.success) {
          token = response?.data?.response?.data?.token || "";
          const expires = toDate(
            response?.data?.response?.data?.token_expired || ""
          );

          setCookie(auth.token, token, expires);
          setCookie(
            auth.token_expired,
            response?.data?.response?.data?.token_expired || "",
            expires
          );
          setCookie(
            auth.refresh_token,
            response?.data?.response?.data?.refresh_token || "",
            expires
          );
          setCookie(
            auth.refresh_token_expired,
            response?.data?.response?.data?.refresh_token_expired || "",
            expires
          );
        }
      } else {
        token = await checkToken();

        return Promise.resolve(
          api(previousRequest, {
            headers: {
              ...previousRequest.headers,
              token,
            },
          })
        );
      }
    }

    if (message === responses.unauthorizedRefreshToken) {
      clearAllCookies();
      const searchParams = new URLSearchParams();
      const redirectTo = searchParams.get("redirectTo");
      window.location.href = paths.auth.login.getHref(redirectTo || undefined);
    }

    return Promise.reject(error);
  }
);
