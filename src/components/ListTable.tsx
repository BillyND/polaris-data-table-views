import { useState, useEffect, useCallback } from "react";
import { BlockStack, Card } from "@shopify/polaris";
import withDataSource from "../hoc/withDataSource";
import type { ListTableProps, ListTableState, ListTableData, ListTableView } from "../types";
import { ListTableFilters } from "./ListTableFilters";
import { ListTableContent } from "./ListTableContent";
import { defaultFetch } from "../utils/defaultFetch";
import lodash from "lodash";

function ListTableComponent<T = any>(props: ListTableProps<T>) {
  // URL param handling for view selection
  const getSearchParams = useCallback(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const getSelectedView = useCallback(
    (views: ListTableView[]) => {
      const viewSelected = getSearchParams().get("viewSelected");
      return views?.findIndex(
        (view) => view.name === viewSelected || view._id === viewSelected
      );
    },
    [getSearchParams]
  );

  const [state, setState] = useState<ListTableState>({
    views: [],
    selected: 0,
  });

  useEffect(() => {
    const selectedView = getSelectedView(state.views);
    setState((prev) => ({
      ...prev,
      selected: Math.max(0, selectedView),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(state?.views)]);

  const {
    error: propsError,
    total,
    loading,
    emptyState,
    filterValues,
    showBorder = true,
    items,
    useSetIndexFiltersMode: {
      selectedResources,
      allResourcesSelected,
      handleSelectionChange,
      clearSelection,
    },
    page,
    limit,
    queryKey,
    setListTableData,
    onDataChange,
    views: propsViews,
    onlyLocalData,
    defaultViews,
    viewsEndpoint,
    fetchFunction = defaultFetch,
    fetchFn,
    localData,
    syncWithUrl = true,
  } = props;

  // Support both fetchFn and fetchFunction (fetchFn takes precedence)
  const effectiveFetchFunction = fetchFn || fetchFunction || defaultFetch;

  // Equivalent to componentDidMount - fetch saved views
  useEffect(() => {
    if (propsViews === undefined && !onlyLocalData && viewsEndpoint) {
      // Fetch saved views
      effectiveFetchFunction(`${viewsEndpoint}?path=${typeof window !== "undefined" ? window.location.pathname : ""}`)
        .then((response) => response.json())
        .then(({ items }) =>
          setState((prev) => ({
            ...prev,
            views: [
              { name: "All", filters: { queryValue: "" } },
              ...(defaultViews || []),
              ...items,
            ],
          }))
        )
        .catch((error) => {
          console.error("Error fetching views:", error);
          setState((prev) => ({
            ...prev,
            views: [
              { name: "All", filters: { queryValue: "" } },
              ...(defaultViews || []),
            ],
          }));
        });
    } else {
      setState((prev) => ({
        ...prev,
        views: [
          { name: "All", filters: { queryValue: "" } },
          ...(defaultViews || []),
          ...(propsViews || []),
        ],
      }));
    }
  }, [propsViews, onlyLocalData, defaultViews, viewsEndpoint, effectiveFetchFunction]);

  // Update table data when dependencies change
  useEffect(() => {
    if (!setListTableData && !onDataChange) {
      return;
    }

    const debounceUpdateTableData = lodash.debounce(() => {
      const newData: ListTableData<T> = {
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

      if (setListTableData) {
        setListTableData((prev: ListTableData<T>) => {
          const canUpdate = !lodash.isEqual(
            {
              items: prev.items,
              selectedResources: prev.selectedResources,
              filterValues: prev.filterValues,
              total: prev.total,
              page: prev.page,
              limit: prev.limit,
              queryKey: prev.queryKey,
            },
            {
              items,
              selectedResources,
              filterValues,
              total,
              page,
              limit,
              queryKey,
            }
          );

          // Update list table data
          if (canUpdate) {
            return newData;
          }

          return prev;
        });
      }

      if (onDataChange) {
        onDataChange(newData);
      }
    }, 100);

    debounceUpdateTableData();
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
    setListTableData,
    onDataChange,
  ]);

  // Error handling
  const error = state.error || propsError;

  // Check if empty state should be shown
  const showEmptyState = !total && !loading && lodash.isEmpty(filterValues);

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        Error: {error.message || String(error)}
      </div>
    );
  }

  return (
    <>
      {showEmptyState && emptyState ? (
        emptyState
      ) : showBorder ? (
        <Card padding="0" roundedAbove="sm">
          {ListTableFilters(props, state, setState)}
          <ListTableContent {...props} />
        </Card>
      ) : (
        <BlockStack>
          {ListTableFilters(props, state, setState)}
          <ListTableContent {...props} />
        </BlockStack>
      )}
    </>
  );
}

// Use a simple error boundary wrapper
const ListTableWithErrorBoundary = <T = any,>(props: ListTableProps<T>) => {
  const [error, setError] = useState<Error | null>(null);

  // Override the error from props if we have one in state
  const displayError = error || props.error;

  if (displayError) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        Error: {displayError.message || String(displayError)}
      </div>
    );
  }

  try {
    return <ListTableComponent {...props} />;
  } catch (err) {
    if (err instanceof Error) {
      setError(err);
      return (
        <div style={{ padding: "20px", color: "red" }}>
          Error: {err.message || String(err)}
        </div>
      );
    }
    // For unknown error types
    const unknownError = new Error(String(err));
    setError(unknownError);
    return (
      <div style={{ padding: "20px", color: "red" }}>
        Error: {unknownError.message || String(unknownError)}
      </div>
    );
  }
};

// Use type assertion to ensure compatibility with withDataSource
const ListTable = withDataSource(ListTableWithErrorBoundary as any);

export default ListTable;

