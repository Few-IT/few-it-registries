export type BaseResponse<T> = {
  app_name?: string;
  version?: string;
  build?: string;
  response?: Response<T>;
};

export type Response<T> = {
  code?: string;
  status?: string;
  data?: T;
  message_en?: string;
  message_id?: string;
  current_page?: number;
  total_page?: number;
  total_data?: number;
};

export type BaseListRequest<T> = {
  filter?: T;
  limit?: number;
  page?: number;
  order?: string;
  sort?: string;
};
