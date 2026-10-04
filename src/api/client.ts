import axios from "axios";
import { queryClient } from "@/app/query-client";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("kurio-session-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const scenario = new URLSearchParams(window.location.search).get("mock");
  if (scenario === "favorite-error" || scenario === "session-expired") {
    config.headers["X-Mock-Scenario"] = scenario;
  }
  return config;
});

api.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const hadToken = Boolean(error.config?.headers?.Authorization);
    const isPublicAuth = error.config?.method === "post" && (error.config.url === "/session" || error.config.url === "/accounts");
    if (hadToken && !isPublicAuth) {
      window.localStorage.removeItem("kurio-session-token");
      // Let the rejected request reach its route guard before removing active queries.
      window.setTimeout(() => {
        queryClient.clear();
        queryClient.setQueryData(["session"], { user: null });
        window.dispatchEvent(new Event("kurio:session-expired"));
      }, 0);
    }
  }
  return Promise.reject(error);
});
