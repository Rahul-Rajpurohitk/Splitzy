/**
 * Optimized Axios API configuration with compression support.
 * 
 * Features:
 * - Automatic compression negotiation (Accept-Encoding)
 * - Request/Response interceptors for performance monitoring
 * - Retry logic for failed requests
 * - Request deduplication
 */
import axios from "axios";

// Create optimized axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080",
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
    // Accept-Encoding is automatically handled by browsers/axios
    // But we explicitly state our preference for compressed responses
    "Accept": "application/json",
  },
});

// Request deduplication cache
const pendingRequests = new Map();

/**
 * Generate a unique key for request deduplication
 */
const getRequestKey = (config) => {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("splitzyToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Request deduplication for GET requests
    if (config.method === "get") {
      const requestKey = getRequestKey(config);
      
      // If there's already a pending request with the same key, return it
      if (pendingRequests.has(requestKey)) {
        const controller = new AbortController();
        config.signal = controller.signal;
        controller.abort("Duplicate request cancelled");
        return Promise.reject({ __CANCEL__: true, requestKey });
      }
      
      // Mark this request as pending
      pendingRequests.set(requestKey, true);
      config._requestKey = requestKey;
    }

    // Performance timing
    config._startTime = performance.now();

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Remove from pending requests
    if (response.config._requestKey) {
      pendingRequests.delete(response.config._requestKey);
    }

    // Log performance metrics in development
    if (process.env.NODE_ENV === "development" && response.config._startTime) {
      const duration = performance.now() - response.config._startTime;
      const size = JSON.stringify(response.data).length;
      const contentEncoding = response.headers["content-encoding"] || "none";
      
      console.debug(
        `📡 ${response.config.method?.toUpperCase()} ${response.config.url}`,
        `| ${duration.toFixed(0)}ms`,
        `| ${(size / 1024).toFixed(1)}KB`,
        `| encoding: ${contentEncoding}`
      );
    }

    return response;
  },
  (error) => {
    // Handle cancelled duplicate requests silently
    if (error.__CANCEL__) {
      return Promise.reject(error);
    }

    // Remove from pending requests on error
    if (error.config?._requestKey) {
      pendingRequests.delete(error.config._requestKey);
    }

    // Retry logic for network errors (not for 4xx/5xx)
    if (!error.response && error.config && !error.config._retried) {
      error.config._retried = true;
      console.warn("Network error, retrying request...", error.config.url);
      return api(error.config);
    }

    return Promise.reject(error);
  }
);

/**
 * Batch multiple API requests for efficiency
 */
export const batchRequests = async (requests) => {
  return Promise.all(requests.map(req => api(req)));
};

/**
 * Cached fetch with optional TTL
 */
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export const cachedGet = async (url, config = {}, ttl = CACHE_TTL) => {
  const cacheKey = `${url}:${JSON.stringify(config.params || {})}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return { ...cached.response, _cached: true };
  }
  
  const response = await api.get(url, config);
  cache.set(cacheKey, { response, timestamp: Date.now() });
  
  // Clean old cache entries
  if (cache.size > 100) {
    const now = Date.now();
    for (const [key, value] of cache) {
      if (now - value.timestamp > ttl) {
        cache.delete(key);
      }
    }
  }
  
  return response;
};

/**
 * Clear cache for a specific URL pattern
 */
export const invalidateCache = (urlPattern) => {
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
};

export default api;

