/**
 * Build API URL with query parameters
 */
export interface BuildUrlOptions {
  baseUrl: string;
  page?: number;
  limit?: number;
  sort?: { field: string; direction: 'asc' | 'desc' } | string;
  filters?: Array<{ field: string; value: any }>;
  query?: { field: string; value: string };
}

export function buildUrl(options: BuildUrlOptions): string {
  const { baseUrl, page, limit, sort, filters, query } = options;
  const params = new URLSearchParams();

  if (page && page > 1) {
    params.set('page', page.toString());
  }

  if (limit) {
    params.set('limit', limit.toString());
  }

  if (sort) {
    if (typeof sort === 'string') {
      params.set('sort', sort);
    } else {
      params.set('sort', `${sort.field}|${sort.direction}`);
    }
  }

  if (query) {
    params.set(query.field, query.value);
  }

  if (filters) {
    filters.forEach((filter) => {
      const key = `filter_${filter.field}`;
      if (Array.isArray(filter.value)) {
        params.set(key, JSON.stringify(filter.value));
      } else {
        params.set(key, String(filter.value));
      }
    });
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Parse URL parameters into filter object
 */
export function parseUrlParams(searchParams: URLSearchParams): {
  page?: number;
  sort?: string;
  query?: string;
  filters: Record<string, any>;
} {
  const result: {
    page?: number;
    sort?: string;
    query?: string;
    filters: Record<string, any>;
  } = {
    filters: {},
  };

  const pageParam = searchParams.get('page');
  if (pageParam) {
    result.page = parseInt(pageParam, 10);
  }

  const sortParam = searchParams.get('sort');
  if (sortParam) {
    result.sort = sortParam;
  }

  const queryParam = searchParams.get('query');
  if (queryParam) {
    result.query = decodeURIComponent(queryParam);
  }

  searchParams.forEach((value, key) => {
    if (key.startsWith('filter_')) {
      const filterKey = key.replace('filter_', '');
      try {
        result.filters[filterKey] = JSON.parse(value);
      } catch {
        result.filters[filterKey] = decodeURIComponent(value);
      }
    }
  });

  return result;
}

/**
 * Serialize filter object to URL parameters
 */
export function serializeToUrlParams(filters: Record<string, any>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        params.set(`filter_${key}`, JSON.stringify(value));
      } else if (typeof value === 'string') {
        params.set(`filter_${key}`, encodeURIComponent(value));
      } else {
        params.set(`filter_${key}`, String(value));
      }
    }
  });

  return params;
}

/**
 * Convert filter object to array format
 */
export function objectToFilters(filters: Record<string, any>): Array<{ field: string; value: any }> {
  return Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([field, value]) => ({ field, value }));
}

