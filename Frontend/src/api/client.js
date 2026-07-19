import axios from "axios";

// Points at the new microservices gateway (services/gateway), not the old
// Backend/ -- see .env's VITE_GATEWAY_URL comment. The old VITE_API_URL is
// left untouched for anything not yet migrated.
export const gatewayClient = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_URL,
  // Needed so the httpOnly refreshToken cookie the Auth Service sets is
  // actually sent back on /auth/refresh calls.
  withCredentials: true,
});

// The access token lives here, outside React state, because the axios
// request interceptor below runs on every request and has no access to
// React context. AuthContext is the only thing that calls setAccessToken;
// everything else just reads it implicitly through this client.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

gatewayClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
