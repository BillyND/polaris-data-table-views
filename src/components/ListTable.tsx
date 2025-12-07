import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BlockStack, Card } from "@shopify/polaris";
import { useSetIndexFiltersMode, useIndexResourceState } from "@shopify/polaris";
import lodash from "lodash";
import { useUrlParams } from "../hooks/useUrlParams";

import type {
  ListTableProps,
  ListTableState,
  ListTableView,
  ListTableChildProps,
  ListTableData,
} from "./types";
import type { FilterValue, SortDefinition } from "../types";
import { ListTableFilters } from "./ListTableFilters";
import { ListTableContent } from "./ListTableContent";
import { buildUrl, objectToFilters, parseUrlParams, serializeToUrlParams } from "../utils/buildUrl";
import { sortToPolaris, polarisToSort, filterItemsLocally, areFiltersEmpty } from "../utils/filters";

const DEFAULT_LIMIT = 50;

// Cache for abort controllers
const abortControllers: Record<string, AbortController> = {};

/**
 * Default translation function
 */
const defaultT = (key: string, params?: Record<string, unknown>): string => {
  const translations: Record<string, string> = {
    "filter-items": "Filter items",
    "page-totalpage": params ? `${params.page} of ${params.totalPage}` : "",
  };
  return translations[key] || key;
};

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
 * ListTable - A complete data table component with filtering, sorting, pagination
 *
 * @example
 * ```tsx
 * <ListTable
 *   endpoint="/api/products"
 *   queryKey="name"
 *   headings={[{ title: "Name" }, { title: "Price" }]}
 *   renderRowMarkup={(item, index) => (
 *     <IndexTable.Row id={item.id} position={index}>
 *       <IndexTable.Cell>{item.name}</IndexTable.Cell>
 *       <IndexTable.Cell>{item.price}</IndexTable.Cell>
 *     </IndexTable.Row>
 *   )}
 *   sortOptions={[
 *     { label: "Name", value: "name asc", directionLabel: "A-Z" },
 *     { label: "Name", value: "name desc", directionLabel: "Z-A" },
 *   ]}
 * />
 * ```
 */
export function ListTable<T = unknown>(props: ListTableProps<T>) {
  const {
    endpoint,
    queryKey,
    headings,
    renderRowMarkup,
    resourceName,
    defaultSort,
    limit = DEFAULT_LIMIT,
    localData,
    abbreviated,
    views: propsViews,
    defaultViews = [],
    filters: filterDefs,
    sortOptions,
    bulkActions,
    promotedBulkActions,
    condensed,
    selectable = true,
    showBorder = true,
    showFilter = true,
    showPagination = true,
    emptyState,
    queryPlaceholder,
    loadingComponent,
    onDataChange,
    setListTableData: externalSetListTableData,
    renderFilterLabel,
    fetchFn = defaultFetch,
    viewsEndpoint,
    syncWithUrl = true,
    t = defaultT,
  } = props;

  const [searchParams, setSearchParams] = useUrlParams();
  const isInitialMount = useRef(true);
  const refreshCounter = useRef(0);

  // Parse initial state from URL
  const getInitialState = useCallback(() => {
    if (syncWithUrl) {
      const parsed = parseUrlParams(searchParams);
      return {
        page: parsed.page,
        queryValue: parsed.queryValue,
        filterValues: parsed.filters,
        sort: parsed.sort,
        viewSelected: parsed.viewSelected,
      };
    }
    return {
      page: 1,
      queryValue: "",
      filterValues: {} as Record<string, FilterValue>,
      sort: defaultSort || null,
      viewSelected: null as string | null,
    };
  }, [searchParams, syncWithUrl, defaultSort]);

  const initialState = getInitialState();

  // Core state
  const [page, setPage] = useState(initialState.page);
  const [queryValue, setQueryValue] = useState(initialState.queryValue);
  const [filterValues, setFilterValues] = useState<Record<string, FilterValue>>(initialState.filterValues);
  const [sortState, setSortState] = useState<SortDefinition | null>(initialState.sort);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Views state
  const [state, setState] = useState<ListTableState>({
    views: [],
    selected: 0,
  });

  // Polaris hooks
  const { mode, setMode } = useSetIndexFiltersMode();
  const resourceIDResolver = useCallback(
    (item: T) => (item as T & { id?: string; _id?: string }).id || (item as T & { _id?: string })._id || "",
    []
  );
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(items as unknown as { id: string }[], { resourceIDResolver: resourceIDResolver as (item: { id: string }) => string });

  // Initialize views
  useEffect(() => {
    const initViews = async () => {
      let views: ListTableView[] = [{ name: "All", filters: {} }, ...defaultViews];

      if (propsViews !== undefined) {
        views = [...views, ...propsViews];
      } else if (!localData && viewsEndpoint) {
        try {
          const response = await fetchFn(`${viewsEndpoint}?path=${location.pathname}`);
          const data = response as { items?: ListTableView[] };
          if (data.items) {
            views = [...views, ...data.items];
          }
        } catch (err) {
          console.error("===> Error loading views:", err);
        }
      }

      // Find selected view from URL
      const viewSelected = searchParams.get("viewSelected");
      const selectedIndex = viewSelected
        ? views.findIndex((v) => v.name === viewSelected || v._id === viewSelected)
        : 0;

      setState({
        views,
        selected: Math.max(0, selectedIndex),
      });
    };

    initViews();
  }, [propsViews, defaultViews, localData, viewsEndpoint, fetchFn, searchParams]);

  // Sync state to URL
  useEffect(() => {
    if (!syncWithUrl || isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const debouncedSync = lodash.debounce(() => {
      setSearchParams((prev) =>
        serializeToUrlParams(
          {
            page,
            sort: sortState,
            queryValue,
            filters: filterValues,
            viewSelected: state.views[state.selected]?.name || null,
          },
          prev
        )
      );
    }, 100);

    debouncedSync();
    return () => debouncedSync.cancel();
  }, [page, sortState, queryValue, filterValues, state.selected, state.views, syncWithUrl, setSearchParams]);

  // Abort previous request
  const abortRequest = useCallback(() => {
    if (abortControllers[endpoint]) {
      abortControllers[endpoint].abort();
      delete abortControllers[endpoint];
    }
  }, [endpoint]);

  // Fetch remote data
  const fetchRemoteData = useCallback(async () => {
    abortRequest();

    const controller = new AbortController();
    abortControllers[endpoint] = controller;

    try {
      const url = buildUrl({
        baseUrl: endpoint,
        page,
        limit,
        sort: sortState,
        filters: objectToFilters(filterValues),
        query: queryValue ? { field: queryKey, value: queryValue } : undefined,
        abbreviated,
      });

      const response = await fetchFn(url, { signal: controller.signal });
      const data = response as { items?: T[]; total?: number };

      return {
        items: data.items || [],
        total: data.total || 0,
      };
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return null;
      }
      throw err;
    }
  }, [endpoint, page, limit, sortState, filterValues, queryValue, queryKey, abbreviated, fetchFn, abortRequest]);

  // Fetch local data
  const fetchLocalData = useCallback(() => {
    if (!localData) {
      return { items: [], total: 0 };
    }

    return filterItemsLocally(localData as Record<string, unknown>[], {
      queryKey,
      queryValue,
      filters: filterValues,
      sort: sortState,
      page,
      limit,
    }) as unknown as { items: T[]; total: number };
  }, [localData, queryKey, queryValue, filterValues, sortState, page, limit]);

  // Main fetch function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result;

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
      console.error("===> Error fetching data:", err);
      setError(err as Error);
      setLoading(false);
      setFirstLoad(false);
    }
  }, [localData, fetchLocalData, fetchRemoteData]);

  // Fetch on dependencies change
  useEffect(() => {
    const debouncedFetch = lodash.debounce(fetchData, 100);
    debouncedFetch();
    return () => {
      debouncedFetch.cancel();
      abortRequest();
    };
  }, [fetchData, abortRequest, refreshCounter.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of data changes
  useEffect(() => {
    const data: ListTableData<T> = {
      items,
      selectedResources,
      allResourcesSelected,
      handleSelectionChange,
      clearSelection,
      filterValues,
      total,
      page,
      limit,
      queryKey,
    };

    onDataChange?.(data);
    externalSetListTableData?.((prev) => {
      if (lodash.isEqual(prev, data)) return prev;
      return data;
    });
  }, [
    items,
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
    filterValues,
    total,
    page,
    limit,
    queryKey,
    onDataChange,
    externalSetListTableData,
  ]);

  // Sort helpers
  const sort = useMemo(() => sortToPolaris(sortState), [sortState]);
  const setSort = useCallback((selected: string[]) => {
    const newSort = polarisToSort(selected);
    setSortState(newSort);
    clearSelection();
  }, [clearSelection]);

  // Action handlers
  const handleSetPage = useCallback(
    (newPage: number) => {
      setPage(newPage);
      clearSelection();
    },
    [clearSelection]
  );

  const handleSetQueryValue = useCallback(
    (value: string) => {
      setQueryValue(value);
      setPage(1);
      clearSelection();
    },
    [clearSelection]
  );

  const handleSetFilterValues = useCallback(
    (filters: Record<string, FilterValue>) => {
      setFilterValues(filters);
      setPage(1);
      clearSelection();
    },
    [clearSelection]
  );

  const handleSetSelectedView = useCallback(
    (index: number) => {
      setState((prev) => ({ ...prev, selected: index }));
    },
    []
  );

  // View CRUD handlers
  const handleCreateView = useCallback(
    async (name: string): Promise<boolean> => {
      const newView: ListTableView = { name, filters: { ...filterValues, queryValue } };

      if (!localData && viewsEndpoint) {
        try {
          await fetchFn(`${viewsEndpoint}?path=${location.pathname}&action=create&name=${encodeURIComponent(name)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newView.filters),
          });
        } catch (err) {
          console.error("===> Error creating view:", err);
        }
      }

      setState((prev) => ({
        ...prev,
        selected: prev.views.length,
        views: [...prev.views, newView],
      }));

      return true;
    },
    [filterValues, queryValue, localData, viewsEndpoint, fetchFn]
  );

  const handleRenameView = useCallback(
    (name: string, index: number) => {
      setState((prev) => {
        const newViews = prev.views.map((v, i) => (i === index ? { ...v, name } : v));

        if (!localData && viewsEndpoint) {
          const oldName = prev.views[index].name;
          fetchFn(`${viewsEndpoint}?path=${location.pathname}&action=rename&oldName=${encodeURIComponent(oldName)}&newName=${encodeURIComponent(name)}`);
        }

        return { ...prev, views: newViews };
      });
    },
    [localData, viewsEndpoint, fetchFn]
  );

  const handleDuplicateView = useCallback(
    (name: string, index: number) => {
      setState((prev) => {
        const sourceView = prev.views[index];
        const newView: ListTableView = { name, filters: { ...sourceView.filters } };

        if (!localData && viewsEndpoint) {
          fetchFn(`${viewsEndpoint}?path=${location.pathname}&action=create&name=${encodeURIComponent(name)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newView.filters),
          });
        }

        return {
          ...prev,
          selected: prev.views.length,
          views: [...prev.views, newView],
        };
      });
    },
    [localData, viewsEndpoint, fetchFn]
  );

  const handleDeleteView = useCallback(
    (index: number) => {
      setState((prev) => {
        const deletedView = prev.views[index];
        const newViews = prev.views.filter((_, i) => i !== index);

        if (!localData && viewsEndpoint) {
          fetchFn(`${viewsEndpoint}?path=${location.pathname}&action=delete&name=${encodeURIComponent(deletedView.name)}`);
        }

        return {
          ...prev,
          selected: 0,
          views: newViews,
        };
      });

      // Clear filters when deleting view
      handleSetFilterValues({});
      setQueryValue("");
    },
    [localData, viewsEndpoint, fetchFn, handleSetFilterValues]
  );

  const handleUpdateView = useCallback(async (): Promise<boolean> => {
    setState((prev) => {
      const newViews = prev.views.map((v, i) =>
        i === prev.selected ? { ...v, filters: { ...filterValues, queryValue } } : v
      );

      if (!localData && viewsEndpoint) {
        const viewName = prev.views[prev.selected].name;
        fetchFn(`${viewsEndpoint}?path=${location.pathname}&action=update&name=${encodeURIComponent(viewName)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...filterValues, queryValue }),
        });
      }

      return { ...prev, views: newViews };
    });

    return true;
  }, [filterValues, queryValue, localData, viewsEndpoint, fetchFn]);

  // Build child props
  const childProps: ListTableChildProps<T> = {
    items,
    total,
    page,
    limit,
    loading,
    firstLoad,
    queryValue,
    filterValues,
    sort,
    selectedResources,
    allResourcesSelected,
    setPage: handleSetPage,
    setSort,
    setQueryValue: handleSetQueryValue,
    setFilterValues: handleSetFilterValues,
    handleSelectionChange,
    clearSelection,
    views: state.views,
    selectedView: state.selected,
    setSelectedView: handleSetSelectedView,
    mode,
    setMode,
    headings,
    renderRowMarkup,
    resourceName,
    filters: filterDefs,
    sortOptions,
    bulkActions,
    promotedBulkActions,
    condensed,
    selectable,
    showFilter,
    showPagination,
    emptyState,
    queryPlaceholder,
    loadingComponent,
    renderFilterLabel,
    viewsEndpoint,
    onlyLocalData: !!localData,
    t,
  };

  // Error state
  if (error) {
    return (
      <Card>
        <div style={{ padding: "20px", color: "red" }}>
          Error: {error.message}
        </div>
      </Card>
    );
  }

  // Empty state
  const showEmptyState = !total && !loading && areFiltersEmpty(filterValues) && !queryValue;
  if (showEmptyState && emptyState) {
    return <>{emptyState}</>;
  }

  // Render
  const content = (
    <>
      <ListTableFilters
        {...childProps}
        onCreateView={handleCreateView}
        onRenameView={handleRenameView}
        onDuplicateView={handleDuplicateView}
        onDeleteView={handleDeleteView}
        onUpdateView={handleUpdateView}
      />
      <ListTableContent {...childProps} />
    </>
  );

  if (showBorder) {
    return (
      <Card padding="0" roundedAbove="sm">
        {content}
      </Card>
    );
  }

  return <BlockStack>{content}</BlockStack>;
}

