// src/utils/queryParam.js

/**
 * Get a query parameter from the current URL or return a default value.
 * @param {URLSearchParams} queryParams - result of new URLSearchParams(...)
 * @param {string} key - the parameter name
 * @param {string} defaultValue - fallback if not found
 */
export function getQueryParam(queryParams, key, defaultValue = '') {
  const value = queryParams.get(key);
  return value !== null ? value : defaultValue;
}

/**
 * Optional convenience wrapper to extract all query params at once.
 */
export function getAllQueryParams() {
  return new URLSearchParams(window.location.search);
}
