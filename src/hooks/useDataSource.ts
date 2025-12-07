import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { useUrlParams } from './useUrlParams';
import type {
  UseDataSourceOptions,
  UseDataSourceReturn,
  QueryState,
  QueryResult,
  FilterValue,
  SortDefinition,
  ViewDefinition,
} from '../types';
import { buildUrl, objectToFilters, parseUrlParams, serializeToUrlParams } from '../utils/buildUrl';
import {
  sortToPolaris,
  polarisToSort,
  filterItemsLocally,
  areFiltersEmpty,
} from '../utils/filters';

// Cache for abort controllers
const abortControllers: Record<string, AbortController> = {};

/**
 * Default fetch function
 */
async function defaultFetch(url: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Default response transformer
 */
function defaultTransformResponse<T>(response: unknown): QueryResult<T> {
  const data = response as Record<string, unknown>;
  return {
    items: (data.items as T[]) || [],
    total: (data.total as number) || 0,
    page: (data.page as number) || 1,
  };
}

/**
 * Hook for managing data source with Polaris integration
 *
 * @example
 * ```tsx
 * const {
 *   items,
 *   loading,
 *   total,
 *   state,
 *   setQueryValue,
 *   setFilter,
 *   setPage,
 *   tabs,
 *   sortOptions,
 *   sortSelected,
 *   onSort,
 * } = useDataSource({
 *   endpoint: "/api/products",
 *   queryKey: "name",
 *   defaultSort: { field: "createdAt", direction: "desc" },
 *   defaultLimit: 20,
 *   syncWithUrl: true,
 * });
 * ```
 */
export function useDataSource<T = unknown>(
  options: UseDataSourceOptions<T>
): UseDataSourceReturn<T> {
  const {
    endpoint,
    queryKey,
    defaultSort = null,
    defaultLimit = 50,
    defaultViews = [],
    syncWithUrl = true,
    localData,
    abbreviated,
    transformResponse = defaultTransformResponse,
    fetchFn = defaultFetch,
    debounceMs = 300,
  } = options;

  const [searchParams, setSearchParams] = useUrlParams();
  const isInitialMount = useRef(true);
  const refreshCounter = useRef(0);

  // Initialize state from URL or defaults
  const getInitialState = useCallback((): QueryState => {
    if (syncWithUrl) {
      const parsed = parseUrlParams(searchParams);
      const viewIndex = parsed.viewSelected
        ? defaultViews.findIndex(
            (v) => v.name === parsed.viewSelected || v.id === parsed.viewSelected
          )
        : 0;

      return {
        page: parsed.page,
        limit: defaultLimit,
        queryValue: parsed.queryValue,
        filters: parsed.filters,
        sort: parsed.sort || defaultSort,
        selectedView: Math.max(0, viewIndex),
      };
    }

    return {
      page: 1,
      limit: defaultLimit,
      queryValue: '',
      filters: {},
      sort: defaultSort,
      selectedView: 0,
    };
  }, [searchParams, syncWithUrl, defaultLimit, defaultSort, defaultViews]);

  const [state, setState] = useState<QueryState>(getInitialState);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Views/Tabs
  const views = useMemo<ViewDefinition[]>(
    () => [{ name: 'All', filters: {} }, ...defaultViews],
    [defaultViews]
  );

  // Sync state to URL
  const syncToUrl = useCallback(() => {
    if (!syncWithUrl) return;

    setSearchParams((prev) => {
      return serializeToUrlParams(
        {
          ...state,
          viewSelected: views[state.selectedView]?.name || null,
        },
        prev
      );
    });
  }, [syncWithUrl, state, views, setSearchParams]);

  // Debounced URL sync
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const debouncedSync = debounce(syncToUrl, 100);
    debouncedSync();

    return () => debouncedSync.cancel();
  }, [state, syncToUrl]);

  // Abort previous request
  const abortRequest = useCallback(() => {
    if (abortControllers[endpoint]) {
      abortControllers[endpoint].abort();
      delete abortControllers[endpoint];
    }
  }, [endpoint]);

  // Fetch data from API
  const fetchRemoteData = useCallback(async (): Promise<QueryResult<T> | null> => {
    abortRequest();

    const controller = new AbortController();
    abortControllers[endpoint] = controller;

    try {
      const url = buildUrl({
        baseUrl: endpoint,
        page: state.page,
        limit: state.limit,
        sort: state.sort,
        filters: objectToFilters(state.filters),
        query: state.queryValue ? { field: queryKey, value: state.queryValue } : undefined,
        abbreviated,
      });

      const response = await fetchFn(url, { signal: controller.signal });
      return transformResponse(response) as QueryResult<T>;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }, [
    endpoint,
    state.page,
    state.limit,
    state.sort,
    state.filters,
    state.queryValue,
    queryKey,
    abbreviated,
    fetchFn,
    transformResponse,
    abortRequest,
  ]);

  // Fetch local data
  const fetchLocalData = useCallback((): QueryResult<T> => {
    if (!localData) {
      return { items: [], total: 0, page: 1 };
    }

    return filterItemsLocally(localData as Record<string, unknown>[], {
      queryKey,
      queryValue: state.queryValue,
      filters: state.filters,
      sort: state.sort,
      page: state.page,
      limit: state.limit,
    }) as unknown as QueryResult<T>;
  }, [localData, queryKey, state]);

  // Main fetch function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result: QueryResult<T> | null;

      if (localData) {
        result = fetchLocalData();
      } else {
        result = await fetchRemoteData();
      }

      if (result !== null) {
        setItems(result.items);
        setTotal(result.total);
        setLoading(false);
        setFirstLoad(false);
      }
    } catch (err) {
      console.error('===> Error fetching data:', err);
      setError(err as Error);
      setLoading(false);
      setFirstLoad(false);
    }
  }, [localData, fetchLocalData, fetchRemoteData]);

  // Debounced fetch
  const debouncedFetch = useMemo(() => debounce(fetchData, debounceMs), [fetchData, debounceMs]);

  // Fetch on state change
  useEffect(() => {
    debouncedFetch();
    return () => {
      debouncedFetch.cancel();
      abortRequest();
    };
  }, [
    debouncedFetch,
    abortRequest,
    refreshCounter.current, // eslint-disable-line react-hooks/exhaustive-deps
  ]);

  // Action handlers
  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const setQueryValue = useCallback((queryValue: string) => {
    setState((prev) => ({ ...prev, queryValue, page: 1 }));
  }, []);

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      page: 1,
    }));
  }, []);

  const setFilters = useCallback((filters: Record<string, FilterValue>) => {
    setState((prev) => ({
      ...prev,
      filters,
      page: 1,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {},
      queryValue: '',
      page: 1,
    }));
  }, []);

  const setSort = useCallback((sort: SortDefinition | null) => {
    setState((prev) => ({ ...prev, sort }));
  }, []);

  const setSelectedView = useCallback(
    (index: number) => {
      const view = views[index];
      if (view) {
        setState((prev) => ({
          ...prev,
          selectedView: index,
          filters: view.filters || {},
          page: 1,
        }));
      }
    },
    [views]
  );

  const refresh = useCallback(() => {
    refreshCounter.current += 1;
    setState((prev) => ({ ...prev }));
  }, []);

  // Polaris helpers
  const tabs = useMemo(
    () =>
      views.map((view) => ({
        id: view.id || view.name,
        content: view.name,
        panelID: `${view.id || view.name}-panel`,
        badge: areFiltersEmpty(view.filters) ? undefined : 'Filtered',
      })),
    [views]
  );

  const sortSelected = useMemo(() => sortToPolaris(state.sort), [state.sort]);

  const onSort = useCallback(
    (selected: string[]) => {
      const newSort = polarisToSort(selected);
      setSort(newSort);
    },
    [setSort]
  );

  return {
    state,
    items,
    total,
    loading,
    firstLoad,
    error,

    // Actions
    setPage,
    setQueryValue,
    setFilter,
    setFilters,
    clearFilters,
    setSort,
    setSelectedView,
    refresh,

    // Polaris helpers
    tabs,
    sortOptions: [],
    sortSelected,
    onSort,
  };
}
