import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("shine_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;

export const api = {
  login: (username, password) => client.post("/auth/login", { username, password }),
  me: () => client.get("/auth/me"),
  feedLatest: () => client.get("/feed/latest"),
  feedStatus: () => client.get("/feed/status"),
  categories: () => client.get("/categories"),
  sourcesCatalog: (params) => client.get("/sources/catalog", { params }),
  toolDetail: (id) => client.get(`/tools/${encodeURIComponent(id)}`),
  installUrl: (id, fmt) => `${API}/tools/${encodeURIComponent(id)}/install/${fmt}`,
  adminRefresh: () => client.post("/admin/refresh"),
  timeline: (limit = 30) => client.get(`/timeline?limit=${limit}`),
};
