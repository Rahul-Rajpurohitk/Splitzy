/**
 * Optimized Axios API configuration with advanced caching and rate limiting awareness.
 * 
 * Features:
 * - Automatic compression negotiation (Accept-Encoding)
 * - Request/Response interceptors for performance monitoring
 * - Retry logic for failed requests with exponential backoff
 * - Request deduplication
 * - Multi-tier caching (memory + session storage)
 * - Rate limit detection and backoff
 */
import axios from "axios";

// Create optimized axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080",
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Request deduplication cache
const pendingRequests = new Map();

// Rate limit tracking
let rateLimitBackoff = 0;
let rateLimitResetTime = 0;

/**
 * Generate a unique key for request deduplication
 */
const getRequestKey = (config) => {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Check if we're in rate limit backoff
    if (rateLimitBackoff > 0 && Date.now() < rateLimitResetTime) {
      const waitTime = Math.ceil((rateLimitResetTime - Date.now()) / 1000);
      console.warn(`Rate limit active, waiting ${waitTime}s before retry`);
      return Promise.reject({ 
        __RATE_LIMITED__: true, 
        waitTime,
        message: `Rate limited. Please wait ${waitTime} seconds.`
      });
    }
    
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
    
    // Clear rate limit backoff on successful response
    if (rateLimitBackoff > 0) {
      rateLimitBackoff = 0;
      rateLimitResetTime = 0;
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
    if (error.__CANCEL__ || error.__RATE_LIMITED__) {
      return Promise.reject(error);
    }

    // Remove from pending requests on error
    if (error.config?._requestKey) {
      pendingRequests.delete(error.config._requestKey);
    }
    
    // Handle rate limiting (429 Too Many Requests)
    if (error.response?.status === 429) {
      // Exponential backoff: 5s, 10s, 20s, max 60s
      rateLimitBackoff = Math.min(rateLimitBackoff === 0 ? 5000 : rateLimitBackoff * 2, 60000);
      rateLimitResetTime = Date.now() + rateLimitBackoff;
      
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        rateLimitResetTime = Date.now() + (parseInt(retryAfter, 10) * 1000);
      }
      
      console.warn(`Rate limit hit. Backing off for ${rateLimitBackoff / 1000}s`);
      
      error.isRateLimited = true;
      error.retryAfter = Math.ceil(rateLimitBackoff / 1000);
      return Promise.reject(error);
    }

    // Retry logic for network errors with exponential backoff
    if (!error.response && error.config && !error.config._retried) {
      const retryCount = error.config._retryCount || 0;
      if (retryCount < 3) {
        error.config._retryCount = retryCount + 1;
        error.config._retried = true;
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.warn(`Network error, retrying in ${delay/1000}s...`, error.config.url);
        return new Promise(resolve => setTimeout(resolve, delay))
          .then(() => api(error.config));
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Batch multiple API requests for efficiency
 */
export const batchRequests = async (requests) => {
  return Promise.allSettled(requests.map(req => api(req)));
};

// ============ MULTI-TIER CACHING SYSTEM ============
const memoryCache = new Map();
const CACHE_TTL = 30000; // 30 seconds default
const SESSION_CACHE_KEY = 'splitzy_api_cache';
const MAX_CACHE_SIZE = 100;

// Cache TTL configuration by endpoint pattern
const CACHE_CONFIG = {
  '/home/friends': { ttl: 300000, persist: true },     // 5 min - friends rarely change
  '/groups': { ttl: 300000, persist: true },           // 5 min - groups rarely change
  '/analytics/summary': { ttl: 60000, persist: false }, // 1 min - analytics
  '/analytics/trends': { ttl: 60000, persist: false },  // 1 min - analytics
  '/analytics/balances': { ttl: 60000, persist: false }, // 1 min - analytics
  '/profile': { ttl: 300000, persist: true },           // 5 min - profile data
  '/notifications': { ttl: 30000, persist: false },     // 30s - notifications are time-sensitive
  'default': { ttl: 30000, persist: false }
};

/**
 * Get cache configuration for a URL
 */
const getCacheConfig = (url) => {
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (pattern !== 'default' && url.includes(pattern)) {
      return config;
    }
  }
  return CACHE_CONFIG.default;
};

/**
 * Load persisted cache from session storage
 */
const loadPersistedCache = () => {
  try {
    const stored = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const now = Date.now();
      // Only restore non-expired entries
      Object.entries(data).forEach(([key, value]) => {
        const config = getCacheConfig(key);
        if (now - value.timestamp < config.ttl) {
          memoryCache.set(key, value);
        }
      });
    }
  } catch (e) {
    console.warn('Failed to load cache from session storage:', e.message);
  }
};

/**
 * Persist cache to session storage
 */
const persistCache = () => {
  try {
    const persistable = {};
    memoryCache.forEach((value, key) => {
      const config = getCacheConfig(key);
      if (config.persist) {
        persistable[key] = value;
      }
    });
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(persistable));
  } catch (e) {
    console.warn('Failed to persist cache:', e.message);
  }
};

// Load cache on module init
loadPersistedCache();

/**
 * Cached fetch with intelligent TTL based on endpoint
 * @param {string} url - API endpoint
 * @param {object} config - Axios config
 * @param {number} ttl - Optional TTL override in ms
 */
export const cachedGet = async (url, config = {}, ttl) => {
  const cacheKey = `${url}:${JSON.stringify(config.params || {})}`;
  const cached = memoryCache.get(cacheKey);
  const cacheConfig = getCacheConfig(url);
  const effectiveTtl = ttl || cacheConfig.ttl;
  
  // Return cached if valid
  if (cached && Date.now() - cached.timestamp < effectiveTtl) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`💾 Cache hit: ${url}`);
    }
    return { ...cached.response, _cached: true };
  }
  
  // Fetch fresh data
  const response = await api.get(url, config);
  
  // Store in cache
  memoryCache.set(cacheKey, { 
    response: { data: response.data, status: response.status },
    timestamp: Date.now() 
  });
  
  // Evict old entries if cache is too large
  if (memoryCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    // Remove oldest 20%
    const toRemove = Math.ceil(entries.length * 0.2);
    entries.slice(0, toRemove).forEach(([key]) => memoryCache.delete(key));
  }
  
  // Persist if configured
  if (cacheConfig.persist) {
    persistCache();
  }
  
  return response;
};

/**
 * Clear cache for a specific URL pattern
 */
export const invalidateCache = (urlPattern) => {
  let cleared = 0;
  for (const key of memoryCache.keys()) {
    if (key.includes(urlPattern)) {
      memoryCache.delete(key);
      cleared++;
    }
  }
  persistCache();
  if (process.env.NODE_ENV === 'development' && cleared > 0) {
    console.debug(`🗑️ Invalidated ${cleared} cache entries for pattern: ${urlPattern}`);
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  memoryCache.clear();
  sessionStorage.removeItem(SESSION_CACHE_KEY);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: memoryCache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(memoryCache.keys())
  };
};

/**
 * Check if rate limited
 */
export const isRateLimited = () => {
  return rateLimitBackoff > 0 && Date.now() < rateLimitResetTime;
};

/**
 * Get rate limit wait time in seconds
 */
export const getRateLimitWaitTime = () => {
  if (!isRateLimited()) return 0;
  return Math.ceil((rateLimitResetTime - Date.now()) / 1000);
};

export default api;

