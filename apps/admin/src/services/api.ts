import axios from "axios";

/** 预配置的 axios 实例，统一处理 base URL 和错误响应 */
export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || "请求失败";
    console.error("[API Error]", message);
    return Promise.reject(error);
  },
);
