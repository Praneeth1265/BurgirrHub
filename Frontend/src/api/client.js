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

// AuthContext registers its own clearSession here so this module can react
// to a *genuinely* dead session (refresh token itself expired/invalid) --
// without this, a request made after the 15-minute access token expires
// would just fail with a toast while the navbar/RequireAuth still believed
// the user was signed in, since `user` state never got told otherwise.
let onAuthExpired = null;
export function setAuthExpiredHandler(handler) {
  onAuthExpired = handler;
}

// The access token is short-lived (15m, see JWT_ACCESS_TTL) by design, but
// nothing else was ever refreshing it proactively -- so any request made
// after 15 minutes of otherwise-idle browsing (no full page reload) would
// 401 even though the user never "signed out". This retries exactly once,
// transparently, using the httpOnly refresh cookie, before giving up.
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = gatewayClient
      .post("/auth/refresh")
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

gatewayClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isRefreshCall = config?.url?.includes("/auth/refresh");

    if (!response || response.status !== 401 || isRefreshCall || config._retriedAfterRefresh) {
      return Promise.reject(error);
    }

    config._retriedAfterRefresh = true;
    try {
      const freshToken = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${freshToken}`;
      return gatewayClient(config);
    } catch (refreshError) {
      setAccessToken(null);
      onAuthExpired?.();
      return Promise.reject(error);
    }
  }
);
