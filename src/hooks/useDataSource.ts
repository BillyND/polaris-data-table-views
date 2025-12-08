import { useCallback, useEffect, useState, useRef } from 'react';
import { useSetIndexFiltersMode } from '@shopify/polaris';
import { TABLE_ITEM_LIST_LIMITATION } from '../index.constants';
import { defaultFetch } from '../utils/defaultFetch';
import { debounce, buildQueryUrl } from '../utils/helpers';
import type { IndexFiltersProps } from '@shopify/polaris';
import { usePagination } from './usePagination';

export type SortDefinition = {
  field: string;
  direction: 'asc' | 'desc';
};

export type ViewDefinition = {
  _id?: string;
  name: string;
  filters: {
    queryValue?: string;
    [key: string]: any;
  };
};

export type QueryResult<T> = {
  items: T[];
  total: number;
  page?: number;
};

export type QueryState = {
  page: number;
  limit: number;
  sort: string[] | undefined;
  filterValues: {
    queryValue?: string;
    [key: string]: string | any[] | undefined;
  };
  viewSelected: string | null;
};

export interface UseDataSourceOptions<T> {
  endpoint: string;
  queryKey: string;
  defaultSort?: SortDefinition;
  defaultLimit?: number;
  defaultViews?: ViewDefinition[];
  syncWithUrl?: boolean;
  localData?: T[];
  abbreviated?: boolean;
  transformResponse?: (response: unknown) => QueryResult<T>;
  fetchFn?: (url: string, options?: RequestInit) => Promise<unknown>;
  debounceMs?: number;
}

export interface UseDataSourceReturn<T> {
  // State
  state: QueryState;
  items: T[];
  total: number;
  loading: boolean;
  firstLoad: boolean;
  error: Error | null;

  // Actions
  setPage: (page: number) => void;
  setQueryValue: (value: string) => void;
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: Record<string, any>) => void;
  clearFilters: () => void;
  setSort: (sort: SortDefinition | null) => void;
  setSelectedView: (index: number) => void;
  setViewSelected: (viewNameOrId: string | null) => void;
  refresh: () => void;

  // Polaris helpers
  tabs: IndexFiltersProps['tabs'];
  sortOptions: IndexFiltersProps['sortOptions'];
  sortSelected: string[];
  onSort: (selected: string[]) => void;

  // Pagination helpers
  pagination: {
    page: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    goToPage: (page: number) => void;
    label: string;
  };
}

// Cache for timers and abort controllers
const timers: Record<string, ReturnType<typeof setTimeout>> = {};
const aborters: Record<string, AbortController> = {};

/**
 * Hook for managing data source with filtering, sorting, and pagination
 */
export function useDataSource<T = any>({
  endpoint,
  queryKey,
  defaultSort,
  defaultLimit = TABLE_ITEM_LIST_LIMITATION,
  defaultViews = [],
  syncWithUrl = true,
  localData,
  abbreviated,
  transformResponse,
  fetchFn = defaultFetch,
  debounceMs = 300,
}: UseDataSourceOptions<T>): UseDataSourceReturn<T> {
  const limit = defaultLimit;

  // Convert defaultSort to string array format
  const getDefaultSort = useCallback(() => {
    if (defaultSort) {
      return [`${defaultSort.field} ${defaultSort.direction}`];
    }
    return undefined;
  }, [defaultSort]);

  // URL param handling
  const getSearchParams = useCallback(() => {
    if (typeof window === 'undefined' || !syncWithUrl) return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, [syncWithUrl]);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      if (typeof window === 'undefined' || !syncWithUrl) return;
      const searchParams = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          searchParams.delete(key);
        } else {
          searchParams.set(key, value);
        }
      });
      const newUrl = `${window.location.pathname}${
        searchParams.toString() ? `?${searchParams.toString()}` : ''
      }`;
      window.history.replaceState({}, '', newUrl);
    },
    [syncWithUrl]
  );

  const getPageFromUrl = useCallback(() => {
    if (!syncWithUrl) return 1;
    const pageParam = getSearchParams().get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  }, [getSearchParams, syncWithUrl]);

  const getSortFromUrl = useCallback(() => {
    if (!syncWithUrl) return getDefaultSort();
    const sortParam = getSearchParams().get('sort');
    if (sortParam) {
      return [sortParam.replace('|', ' ')];
    }
    return getDefaultSort();
  }, [getSearchParams, getDefaultSort, syncWithUrl]);

  const getFiltersFromUrl = useCallback(() => {
    if (!syncWithUrl) return { queryValue: '' };
    const searchParams = getSearchParams();
    const filters: Record<string, any> = {};

    const queryParam = searchParams.get('query');
    if (queryParam) {
      filters.queryValue = decodeURIComponent(queryParam);
    }

    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        try {
          const parsedValue = JSON.parse(value);
          filters[filterKey] = parsedValue;
        } catch {
          filters[filterKey] = decodeURIComponent(value);
        }
      }
    });

    return filters;
  }, [getSearchParams, syncWithUrl]);

  // State initialization
  const [page, setPageState] = useState<number>(getPageFromUrl());
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [sort, setSortState] = useState<string[] | undefined>(getSortFromUrl());
  const [loading, setLoading] = useState<boolean>(true);
  const [firstLoad, setFirstLoad] = useState<boolean>(true);
  const [filterValues, setFilterValuesState] = useState<Record<string, any>>(getFiltersFromUrl());
  const [viewSelected, setViewSelectedState] = useState<string | null>(
    syncWithUrl ? getSearchParams().get('viewSelected') : null
  );
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isInitialMount = useRef(true);

  // Unified function to update URL search params from current state
  const updateSearchParamsFromState = useCallback(() => {
    if (!syncWithUrl) return;
    const updates: Record<string, string | null> = {};

    if (page > 1) {
      updates.page = page.toString();
    } else {
      updates.page = null;
    }

    if (sort?.length) {
      updates.sort = sort[0].replace(' ', '|');
    } else {
      updates.sort = null;
    }

    if (filterValues.queryValue) {
      updates.query = encodeURIComponent(filterValues.queryValue);
    } else {
      updates.query = null;
    }

    if (viewSelected) {
      updates.viewSelected = viewSelected;
    } else {
      updates.viewSelected = null;
    }

    const currentParams = getSearchParams();
    currentParams.forEach((_, key) => {
      if (key.startsWith('filter_')) {
        updates[key] = null;
      }
    });

    Object.entries(filterValues).forEach(([key, value]) => {
      if (key !== 'queryValue' && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          updates[`filter_${key}`] = JSON.stringify(value);
        } else if (typeof value === 'string' && value) {
          updates[`filter_${key}`] = encodeURIComponent(value);
        }
      }
    });

    updateSearchParams(updates);
  }, [page, sort, filterValues, viewSelected, getSearchParams, updateSearchParams, syncWithUrl]);

  // Watch state changes and update URL params (debounced)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const debouncedUpdate = debounce(() => {
      updateSearchParamsFromState();
    }, 100);

    debouncedUpdate();

    return () => {
      debouncedUpdate.cancel();
    };
  }, [page, sort, filterValues, viewSelected, updateSearchParamsFromState]);

  // Sync URL changes back to component state (only on mount)
  useEffect(() => {
    if (!syncWithUrl) return;
    const urlPage = getPageFromUrl();
    const urlSort = getSortFromUrl();
    const urlFilters = getFiltersFromUrl();
    const urlViewSelected = getSearchParams().get('viewSelected');

    setPageState((prev) => (urlPage === prev ? prev : urlPage));
    setSortState((prev) => (JSON.stringify(urlSort) === JSON.stringify(prev) ? prev : urlSort));
    setFilterValuesState((prev) =>
      JSON.stringify(urlFilters) === JSON.stringify(prev) ? prev : urlFilters
    );
    setViewSelectedState(urlViewSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abort ongoing requests
  const abortRequest = useCallback((dataSource: string) => {
    if (aborters[dataSource]) {
      aborters[dataSource].abort();
      delete aborters[dataSource];
    }

    if (timers[dataSource]) {
      clearTimeout(timers[dataSource]);
      delete timers[dataSource];
    }
  }, []);

  // Handles local data filtering and sorting
  const handleLocalData = useCallback(() => {
    if (!localData) return { items: [], total: 0 };
    const { queryValue, ...otherFilters } = filterValues;
    let filteredItems = [...localData];

    if (queryValue) {
      filteredItems = filteredItems.filter((item: any) =>
        item[queryKey]?.toString().toLowerCase().includes(queryValue.toLowerCase())
      );
    }

    Object.entries(otherFilters).forEach(([filterKey, filterValue]) => {
      if (Array.isArray(filterValue) && filterValue.length) {
        filteredItems = filteredItems.filter((item: any) => filterValue.includes(item[filterKey]));
      } else if (typeof filterValue === 'string' && filterValue) {
        filteredItems = filteredItems.filter((item: any) =>
          item[filterKey]?.toString().toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    if (sort?.[0]) {
      const [key, order] = sort[0].split(' ');
      const isAsc = order === 'asc';

      filteredItems = filteredItems.sort((a: any, b: any) => {
        const aValue = key === 'createdAt' ? new Date(a[key]).getTime() : a[key];
        const bValue = key === 'createdAt' ? new Date(b[key]).getTime() : b[key];

        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return isAsc ? 1 : -1;
        if (bValue === undefined) return isAsc ? -1 : 1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return isAsc ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        return isAsc ? aValue - bValue : bValue - aValue;
      });
    }

    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

    return { items: paginatedItems, total: filteredItems.length };
  }, [localData, filterValues, queryKey, sort, page, limit]);

  // Handles remote data fetching
  const handleRemoteData = useCallback(async () => {
    if (!endpoint) return { items: [], total: 0 };
    abortRequest(endpoint);

    return new Promise<{ items: T[]; total: number } | null>((resolve) => {
      timers[endpoint] = setTimeout(async () => {
        const { queryValue, ...otherFilters } = filterValues;

        const filters: string[] = [];

        if (queryValue) {
          filters.push(`${queryKey}|${queryValue.trim()}`);
        }

        Object.entries(otherFilters).forEach(([filterKey, filterValue]) => {
          if (Array.isArray(filterValue) && filterValue.length) {
            filters.push(`${filterKey}|array|any|${filterValue.join(',')}`);
          } else if (typeof filterValue === 'string' && filterValue) {
            filters.push(`${filterKey}|${filterValue}`);
          }
        });

        let sortString: string | undefined;
        if (sort?.length) {
          const [field, direction] = sort[0].split(' ');
          sortString = `${field}|${direction || 'asc'}`;
        }

        let url = buildQueryUrl(endpoint, {
          page: page > 1 ? page : undefined,
          limit,
          sort: sortString,
          filters: filters.length > 0 ? filters : undefined,
        });

        if (abbreviated) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}abbreviated=${encodeURIComponent(abbreviated)}`;
        }

        aborters[endpoint] = new AbortController();

        try {
          const response = await fetchFn(url, {
            signal: aborters[endpoint].signal,
          } as RequestInit);

          if (aborters[endpoint].signal.aborted) {
            resolve(null);
            return;
          }

          let res: any;
          if (response instanceof Response) {
            res = await response.json();
          } else {
            res = response;
          }

          if (transformResponse) {
            res = transformResponse(res);
          }

          if (res?.message !== 'aborted') {
            resolve({
              items: res.items || [],
              total: res.total || 0,
            });
          } else {
            resolve(null);
          }
        } catch (error: any) {
          if (error?.name === 'AbortError' || error?.message === 'aborted') {
            resolve(null);
          } else {
            console.error('Error fetching data:', error);
            setError(error instanceof Error ? error : new Error(String(error)));
            resolve({ items: [], total: 0 });
          }
        }
      }, debounceMs);
    });
  }, [
    endpoint,
    filterValues,
    limit,
    page,
    queryKey,
    sort,
    abbreviated,
    abortRequest,
    fetchFn,
    transformResponse,
    debounceMs,
  ]);

  // Main data fetching function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result;

      if (localData) {
        result = handleLocalData();
      } else {
        result = await handleRemoteData();
      }

      if (result !== null) {
        setItems(result.items);
        setTotal(result.total);
        setLoading(false);
        setFirstLoad(false);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
      setLoading(false);
      setFirstLoad(false);
    }
  }, [localData, handleLocalData, handleRemoteData]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
    return () => abortRequest(endpoint);
  }, [refreshTrigger, endpoint, fetchData, abortRequest]);

  // UI state handlers
  const filters = useSetIndexFiltersMode();

  // Handler functions
  const handleSetSort = useCallback((newSort: string[]) => {
    setSortState(newSort);
  }, []);

  const handleSetFilterValues = useCallback((newFilters: Record<string, any>) => {
    setFilterValuesState(newFilters);
    setPageState(1);
  }, []);

  const handleSetPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setQueryValue = useCallback(
    (value: string) => {
      handleSetFilterValues({ ...filterValues, queryValue: value });
    },
    [filterValues, handleSetFilterValues]
  );

  const setFilter = useCallback(
    (key: string, value: any) => {
      handleSetFilterValues({ ...filterValues, [key]: value });
    },
    [filterValues, handleSetFilterValues]
  );

  const setFilters = useCallback(
    (filters: Record<string, any>) => {
      handleSetFilterValues({ ...filterValues, ...filters });
    },
    [filterValues, handleSetFilterValues]
  );

  const clearFilters = useCallback(() => {
    handleSetFilterValues({ queryValue: '' });
  }, [handleSetFilterValues]);

  const setSort = useCallback(
    (sortDef: SortDefinition | null) => {
      if (sortDef) {
        handleSetSort([`${sortDef.field} ${sortDef.direction}`]);
      } else {
        handleSetSort([]);
      }
    },
    [handleSetSort]
  );

  const setSelectedView = useCallback(
    (index: number) => {
      const view = defaultViews[index];
      if (view) {
        setViewSelectedState(view.name);
        handleSetFilterValues(view.filters);
      }
    },
    [defaultViews, handleSetFilterValues]
  );

  const setViewSelected = useCallback((viewNameOrId: string | null) => {
    setViewSelectedState(viewNameOrId);
  }, []);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Generate tabs from defaultViews
  const tabs = defaultViews.map((view, index) => ({
    content: view.name,
    index,
    id: (view?._id || view?.name) ?? '',
    onAction: () => setSelectedView(index),
  }));

  // Convert sort to Polaris format
  const sortSelected = sort || [];
  const onSort = useCallback(
    (selected: string[]) => {
      handleSetSort(selected);
    },
    [handleSetSort]
  );

  // Use pagination hook
  const pagination = usePagination({
    page,
    limit,
    total,
    onPageChange: handleSetPage,
  });

  const state: QueryState = {
    page,
    limit,
    sort,
    filterValues,
    viewSelected,
  };

  return {
    state,
    items,
    total,
    loading,
    firstLoad,
    error,
    setPage: handleSetPage,
    setQueryValue,
    setFilter,
    setFilters,
    clearFilters,
    setSort,
    setSelectedView,
    setViewSelected,
    refresh,
    tabs,
    sortOptions: [],
    sortSelected,
    onSort,
    pagination,
  };
}
