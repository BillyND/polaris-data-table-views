import type { ComponentClass, FunctionComponent } from 'react';
import { useEffect, useCallback } from 'react';
import { useSetIndexFiltersMode } from '@shopify/polaris';
import { TABLE_ITEM_LIST_LIMITATION } from '../index.constants';
import { defaultFetch } from '../utils/defaultFetch';
import { useDataSource } from '../hooks/useDataSource';
import { useSelection } from '../hooks/useSelection';

export type WithDataSourceProps = {
  sort?: string[];
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  // The data key used for querying items that match a keyword
  queryKey: string;
  // The URL for requesting data
  endpoint?: string;
  // Custom fetch function
  fetchFunction?: (url: string, options?: RequestInit) => Promise<Response>;
  fetchFn?: (url: string, options?: RequestInit) => Promise<Response>;
  // Local data array (for local data mode)
  localData?: any[];
  // Sync state with URL
  syncWithUrl?: boolean;
  // Refresh trigger
  refresh?: number;
  // Other props
  abbreviated?: string;
  loading?: boolean;
  onlyLocalData?: boolean;
  // And other properties as well
  [key: string]: any;
};

export type WithDataSourceChildProps = {
  page: number;
  items: any[];
  total: number;
  limit?: number;
  loading: boolean | undefined;
  queryKey: string;
  firstLoad: boolean;
  selectable?: boolean;
  showPagination?: number;
  sort: string[] | undefined;
  onlyLocalData?: boolean;
  filterValues: {
    queryValue?: string;
    [key: string]: string | any[] | undefined;
  };
  setPage: (page: number) => void;
  setSort: (sort: string[]) => void;
  setFilterValues: (filterValues: {
    queryValue: string;
    [key: string]: string | any[] | undefined;
  }) => void;
  /**
   * Function to update viewSelected in URL params
   */
  setViewSelected: (view: { _id?: string; name: string; filters: { queryValue?: string; [key: string]: any } } | null) => void;
  /**
   * Object returned by calling the function `useSetIndexFiltersMode`
   */
  useSetIndexFiltersMode: any;
  /**
   * Object returned by calling the function `useIndexResourceState`
   */
  useIndexResourceState: any;
};

/**
 * Higher-order component that provides data source functionality
 * Uses useDataSource hook internally to avoid code duplication
 */
export default function withDataSource(
  Component: FunctionComponent<WithDataSourceChildProps> | ComponentClass<WithDataSourceChildProps>
) {
  return function WithDataSource(props: WithDataSourceProps) {
    const {
      queryKey,
      limit = TABLE_ITEM_LIST_LIMITATION,
      refresh,
      sort: defaultSortProp,
      defaultSort,
      abbreviated,
      endpoint = '',
      loading: externalLoading,
      onlyLocalData = false,
      localData,
      syncWithUrl = true,
      fetchFunction,
      fetchFn,
      items: propsItems,
      ...otherProps
    } = props;

    // Support both fetchFn and fetchFunction (fetchFn takes precedence)
    const effectiveFetchFunction = fetchFn || fetchFunction || defaultFetch;

    // Determine if we should use local data mode
    // Use localData prop if provided, otherwise check onlyLocalData flag or propsItems
    const effectiveLocalData = localData || (onlyLocalData ? propsItems : undefined);

    // Use useDataSource hook for data management
    const {
      items,
      total,
      loading,
      firstLoad,
      state,
      setPage,
      setSort: setSortFromHook,
      setFilters: setFiltersFromHook,
      setViewSelected: setViewSelectedFromHook,
      refresh: refreshDataSource,
    } = useDataSource({
      endpoint: endpoint || '',
      queryKey,
      defaultSort:
        defaultSort ||
        (defaultSortProp
          ? {
              field: defaultSortProp[0]?.split(' ')[0] || '',
              direction: (defaultSortProp[0]?.split(' ')[1] || 'asc') as 'asc' | 'desc',
            }
          : undefined),
      defaultLimit: limit,
      syncWithUrl,
      localData: effectiveLocalData,
      abbreviated: typeof abbreviated === 'string' ? true : abbreviated,
      fetchFn: effectiveFetchFunction as (url: string, options?: RequestInit) => Promise<unknown>,
      debounceMs: 100,
    });

    // Use setViewSelected from useDataSource hook
    // It will update state, and updateSearchParamsFromState will sync to URL automatically
    const setViewSelected = setViewSelectedFromHook;

    // Map filterValues from state
    const filterValues = state.filterValues;

    // Handler functions that also clear selection
    const filters = useSetIndexFiltersMode();
    const selection = useSelection(items);

    const handleSetSort = useCallback(
      (newSort: string[]) => {
        if (newSort && newSort.length > 0) {
          const [field, direction] = newSort[0].split(' ');
          setSortFromHook({ field, direction: (direction || 'asc') as 'asc' | 'desc' });
        } else {
          setSortFromHook(null);
        }
        selection.clearSelection();
      },
      [setSortFromHook, selection]
    );

    const handleSetFilterValues = useCallback(
      (newFilters: Record<string, any>) => {
        setFiltersFromHook(newFilters);
        selection.clearSelection();
        // Reset to page 1 when filters change
        setPage(1);
      },
      [setFiltersFromHook, selection, setPage]
    );

    const handleSetPage = useCallback(
      (newPage: number) => {
        setPage(newPage);
        selection.clearSelection();
      },
      [setPage, selection]
    );

    // Trigger refresh when refresh prop changes
    useEffect(() => {
      if (refresh !== undefined) {
        refreshDataSource();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]);

    return (
      <Component
        {...otherProps}
        page={state.page}
        sort={state.sort}
        items={items}
        limit={limit}
        total={total}
        setPage={handleSetPage}
        setSort={handleSetSort}
        queryKey={queryKey}
        firstLoad={firstLoad}
        filterValues={filterValues}
        loading={loading || externalLoading}
        useIndexResourceState={filters}
        setFilterValues={handleSetFilterValues}
        setViewSelected={setViewSelected}
        useSetIndexFiltersMode={selection}
        onlyLocalData={onlyLocalData ?? false}
      />
    );
  };
}
