import { QueryUrlOptions } from '@/types';

/**
 * Default translation function
 */
export const defaultT = (key: string, options?: any): string => {
  // Simple interpolation for common patterns
  if (options && typeof options === 'object') {
    let result = key;
    Object.entries(options).forEach(([k, v]) => {
      result = result.replace(`{${k}}`, String(v));
    });
    return result;
  }
  return key;
};

/**
 * Lightweight debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Lightweight deep equality check
 */
export function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!isEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Lightweight isEmpty check
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
}

/**
 * Build a query URL with filters, pagination, and sorting.
 * Works in both browser and Node.js environments.
 * OPTIMIZED: Direct string building for common cases
 *
 * @example
 * ```ts
 * const url = buildQueryUrl("/api/products", {
 *   page: 1,
 *   limit: 20,
 *   sort: "price|desc",
 *   filters: ["status|string|eq|active", "price|amount|gt|100"],
 * });
 * // => "/api/products?page=1&limit=20&sort=price|desc&filter=status|string|eq|active&filter=price|amount|gt|100"
 * ```
 */
export function buildQueryUrl(baseUrl: string, options: QueryUrlOptions = {}): string {
  const parts: string[] = [];

  if (options.page) parts.push(`page=${options.page}`);
  if (options.limit) parts.push(`limit=${options.limit}`);
  if (options.sort) parts.push(`sort=${encodeURIComponent(options.sort)}`);
  if (options.id) parts.push(`id=${encodeURIComponent(options.id)}`);
  if (options.export) parts.push('export=true');
  if (options.countOnly) parts.push('countResultOnly=true');

  const filters = options.filters;
  if (filters) {
    for (let i = 0; i < filters.length; i++) {
      parts.push(`filter=${encodeURIComponent(filters[i])}`);
    }
  }

  if (parts.length === 0) return baseUrl;
  return `${baseUrl}?${parts.join('&')}`;
}
