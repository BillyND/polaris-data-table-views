import { useState, useCallback, useEffect } from 'react';

/**
 * Check if code is running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get current search params safely (SSR compatible)
 */
function getSearchParams(): URLSearchParams {
  if (!isBrowser) {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

/**
 * Native browser URLSearchParams hook - replaces react-router's useSearchParams
 * Works with any React app without router dependencies
 * SSR compatible - returns empty URLSearchParams on server
 */
export function useUrlParams(): [
  URLSearchParams,
  (
    updater: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean }
  ) => void
] {
  // Initialize from current URL (SSR safe)
  const [searchParams, setSearchParamsState] = useState<URLSearchParams>(getSearchParams);

  // Sync state on client mount (hydration fix)
  useEffect(() => {
    setSearchParamsState(new URLSearchParams(window.location.search));
  }, []);

  // Listen for popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setSearchParamsState(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL and state
  const setSearchParams = useCallback(
    (
      updater: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean }
    ) => {
      if (!isBrowser) return;

      const currentParams = new URLSearchParams(window.location.search);
      const newParams = typeof updater === 'function' ? updater(currentParams) : updater;

      // Build new URL (preserve hash fragment)
      const newSearch = newParams.toString();
      const hash = window.location.hash;
      let newUrl = window.location.pathname;
      if (newSearch) {
        newUrl += `?${newSearch}`;
      }
      if (hash) {
        newUrl += hash;
      }

      // Update browser history
      if (options?.replace) {
        window.history.replaceState(null, '', newUrl);
      } else {
        window.history.pushState(null, '', newUrl);
      }

      // Update state
      setSearchParamsState(new URLSearchParams(newSearch));
    },
    []
  );

  return [searchParams, setSearchParams];
}
