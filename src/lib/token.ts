import Axios from "axios";
import { nanoid } from "nanoid";

import { auth, services } from "@/config/constants";
import { env } from "@/config/env";
import { BaseResponse } from "@/types/base";

import { getCookie } from "./cookies";

const DEVICE_TYPE = "Web";
const apiToken = Axios.create({
  baseURL: env.API_URL,
});

export type GenerateToken = {
  name?: string;
  device_id?: string;
  device_type?: string;
  token?: string;
  token_expired?: string;
  refresh_token?: string;
  refresh_token_expired?: string;
  is_login?: boolean;
  user_login?: string;
};

// generate token
export const generateToken = () => {
  const device_id = `${Date.now()}-${nanoid(10)}`;
  const body = {
    app_name: env.SERVICE_NAME,
    app_key: env.SECRET_KEY,
    device_id,
    device_type: DEVICE_TYPE,
    fcm_token: "",
    ip_address: "0.0.0.0",
  };
  return apiToken.post<BaseResponse<GenerateToken>>(
    `${services.auth}/token/auth`,
    body,
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
};

// refresh token
export const refreshToken = () => {
  const token = getCookie(auth.refresh_token);

  return apiToken.get<BaseResponse<GenerateToken>>(
    `${services.auth}/token/refresh`,
    {
      headers: {
        "refresh-token": token,
      },
    }
  );
};
