import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("kurio-session-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (new URLSearchParams(window.location.search).get("mock") === "favorite-error") {
    config.headers["X-Mock-Scenario"] = "favorite-error";
  }
  return config;
});
