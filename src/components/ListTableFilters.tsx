import { IndexFilters } from '@shopify/polaris';
import type { IndexFiltersProps, TabProps } from '@shopify/polaris';
import type { Dispatch, SetStateAction } from 'react';
import type { ListTableFilter, ListTableProps, ListTableState, ListTableView } from '../types';
import { VIEW_ACTIONS } from '../types';
import { defaultFetch } from '../utils/defaultFetch';
import { defaultT, isEqual } from '../utils/helpers';

export function ListTableFilters(
  props: ListTableProps,
  state: ListTableState,
  setState: Dispatch<SetStateAction<ListTableState>>
) {
  const {
    t = defaultT,
    sort,
    loading,
    setSort,
    firstLoad,
    sortOptions,
    showFilter = true,
    queryPlaceholder,
    filterValues: { queryValue },
    useIndexResourceState: { mode, setMode },
    setViewSelected,
    viewsEndpoint,
    fetchFunction = defaultFetch,
    fetchFn,
    onlyLocalData = false,
  } = props;

  // Support both fetchFn and fetchFunction (fetchFn takes precedence)
  const effectiveFetchFunction = fetchFn || fetchFunction || defaultFetch;
  console.log('effectiveFetchFunction', effectiveFetchFunction);
  const { selected } = state;

  // Declare all the function handlers first
  const onQueryChange = (queryValue: string) => {
    const { filterValues, setFilterValues } = props;
    setFilterValues({ ...filterValues, queryValue });
  };

  const onQueryClear = () => onQueryChange('');

  const removeAppliedFilter = (key: string): void => {
    const { filterValues, setFilterValues } = props;
    setFilterValues({
      ...filterValues,
      [key]: undefined,
      queryValue: filterValues.queryValue || '',
    });
  };

  const clearAllAppliedFilters = () => {
    const { setFilterValues } = props;
    setFilterValues({ queryValue: '' });
  };

  const cancelFilters = () => {
    const { setFilterValues } = props;
    const { views, selected } = state;
    const viewFilters = views[selected]?.filters || {};
    setFilterValues({
      queryValue: viewFilters.queryValue || '',
      ...viewFilters,
    });
  };

  const setSelectedView = (selected: number) => {
    // Get viewNameOrId from views before state update (setState is async)
    const viewNameOrId = state.views[selected]?._id || state.views[selected]?.name;
    setState({ ...state, selected });

    if (setViewSelected) {
      setViewSelected(viewNameOrId || null);
    } else {
      console.error('===> setViewSelected is not available in props');
    }
  };

  const createView = async (value: string): Promise<boolean> => {
    const { filterValues } = props;
    const { views } = state;

    if (!onlyLocalData && viewsEndpoint) {
      try {
        await effectiveFetchFunction(
          `${viewsEndpoint}?path=${
            typeof window !== 'undefined' ? window.location.pathname : ''
          }&action=${VIEW_ACTIONS.CREATE}&name=${encodeURIComponent(value)}`,
          {
            method: 'POST',
            body: JSON.stringify(filterValues),
          }
        );
      } catch (error) {
        console.error('Error creating view:', error);
      }
    }

    setState({
      ...state,
      selected: views?.length,
      views: [...views, { name: value, filters: filterValues }],
    });

    return true;
  };

  const renameView = (value: string, index: number) => {
    const { views } = state;
    const newViews = views.map((item: any, idx: number) => {
      if (idx === index) {
        if (!onlyLocalData && viewsEndpoint) {
          effectiveFetchFunction(
            `${viewsEndpoint}?path=${
              typeof window !== 'undefined' ? window.location.pathname : ''
            }&action=${VIEW_ACTIONS.RENAME}&oldName=${encodeURIComponent(
              item.name
            )}&newName=${encodeURIComponent(value)}`,
            {
              method: 'GET',
            }
          ).catch((error) => console.error('Error renaming view:', error));
        }

        item.name = value;
      }

      return item;
    });

    setState({ ...state, views: newViews });
  };

  const updateView = async (): Promise<boolean> => {
    const { filterValues } = props;
    const { views, selected } = state;
    const newViews = [...views].map((view, index) =>
      index === selected ? { ...view, filters: filterValues } : view
    );

    if (!onlyLocalData && viewsEndpoint) {
      try {
        await effectiveFetchFunction(
          `${viewsEndpoint}?path=${
            typeof window !== 'undefined' ? window.location.pathname : ''
          }&action=${VIEW_ACTIONS.UPDATE}&name=${encodeURIComponent(views[selected].name)}`,
          {
            method: 'PUT',
            body: JSON.stringify(filterValues),
          }
        );
      } catch (error) {
        console.error('Error updating view:', error);
      }
    }

    setState({ ...state, views: newViews });

    return true;
  };

  const duplicateView = (name: string, index: number) => {
    const { views } = state;
    const newFilters = views[index]?.filters;

    if (!onlyLocalData && viewsEndpoint) {
      fetchFunction(
        `${viewsEndpoint}?path=${
          typeof window !== 'undefined' ? window.location.pathname : ''
        }&action=${VIEW_ACTIONS.CREATE}&name=${encodeURIComponent(name)}`,
        {
          method: 'POST',
          body: JSON.stringify(newFilters),
        }
      ).catch((error) => console.error('Error duplicating view:', error));
    }

    setState({
      ...state,
      selected: views?.length,
      views: [...views, { name, filters: newFilters }],
    });
  };

  const deleteView = (index: number) => {
    const { views } = state;
    const newViews = [...views];
    const name = newViews.splice(index, 1)[0]?.name;

    if (!onlyLocalData && viewsEndpoint) {
      fetchFunction(
        `${viewsEndpoint}?path=${
          typeof window !== 'undefined' ? window.location.pathname : ''
        }&action=${VIEW_ACTIONS.DELETE}&name=${encodeURIComponent(name)}`,
        {
          method: 'GET',
        }
      ).catch((error) => console.error('Error deleting view:', error));
    }

    setState({
      ...state,
      selected: 0,
      views: newViews,
    });

    // Clear all filter after select tab 0 (All)
    clearAllAppliedFilters();
  };

  // Filter generation functions
  function generateFilters(): ListTableFilter[] {
    const { filters, filterValues, setFilterValues } = props;

    return (
      filters?.map((def: ListTableFilter) => {
        const _def = { ...def };
        const { Component, props: compProps } = def.filter;

        if (Component && compProps) {
          _def.filter = (
            <Component
              {...compProps}
              {...(compProps.value ? { value: filterValues[def.key] } : {})}
              {...(compProps.choices ? { selected: filterValues[def.key] || [] } : {})}
              onChange={(value: any) =>
                setFilterValues({
                  ...filterValues,
                  queryValue: filterValues.queryValue || '',
                  [def.key]: value,
                })
              }
            />
          );

          return _def;
        }

        return def;
      }) || []
    );
  }

  function generateAppliedFilters(): IndexFiltersProps['appliedFilters'] {
    const filters = generateFilters();
    const { queryKey, filterValues, renderFilterLabel } = props;

    // Generate applied filters from current filter values
    const appliedFilters: IndexFiltersProps['appliedFilters'] = [];

    for (const key in filterValues) {
      if (key !== queryKey && filterValues[key]?.length) {
        const filter = filters?.find((filter: ListTableFilter) => filter.key === key);

        if (filter) {
          appliedFilters.push({
            key,
            label: renderFilterLabel ? renderFilterLabel(key, filterValues[key]) : filter.label,
            onRemove: () => removeAppliedFilter(key),
          });
        }
      }
    }

    return appliedFilters;
  }

  function generatePrimaryActionForFilters(): any {
    const { views, selected } = state;
    const { filterValues: newFilters } = props;
    const currentFilters = [...views][selected]?.filters || {};
    const disabled = isEqual(currentFilters, newFilters);

    return selected === 0
      ? {
          type: 'save-as',
          onAction: createView,
          disabled,
          loading: false,
        }
      : {
          type: 'save',
          onAction: updateView,
          disabled,
          loading: false,
        };
  }

  function generateTabsForViews(): TabProps[] {
    const { setFilterValues } = props;
    const { views } = state;

    if (!views || views.length === 0) {
      return [];
    }

    return views.map((item: ListTableView, index: number) => ({
      index,
      content: item.name,
      isLocked: index === 0,
      id: `${index}-${item.name}`,
      key: `${index}-${item.name}`,
      onAction: () => {
        // Add queryValue with default empty string to avoid type errors
        const filters = {
          ...views[index].filters,
          queryValue: views[index].filters.queryValue || '',
        };
        setFilterValues(filters);
      },
      actions:
        index === 0
          ? []
          : [
              ...(!item.allowActions || item.allowActions?.includes(VIEW_ACTIONS.RENAME)
                ? [
                    {
                      type: 'rename' as const,
                      onPrimaryAction: async (value: string): Promise<boolean> => {
                        renameView(value, index);
                        return true;
                      },
                    },
                  ]
                : []),

              ...(!item.allowActions || item.allowActions?.includes(VIEW_ACTIONS.DUPLICATE)
                ? [
                    {
                      type: 'duplicate' as const,
                      onPrimaryAction: async (value: string): Promise<boolean> => {
                        duplicateView(value, index);
                        return true;
                      },
                    },
                  ]
                : []),

              ...(!item.allowActions || item.allowActions?.includes(VIEW_ACTIONS.DELETE)
                ? [
                    {
                      type: 'delete' as const,
                      onPrimaryAction: async (): Promise<boolean> => {
                        deleteView(index);
                        return true;
                      },
                    },
                  ]
                : []),
            ],
    }));
  }

  // Generate all components
  const filters = generateFilters();
  const tabs = generateTabsForViews();
  const appliedFilters = generateAppliedFilters();
  const primaryAction = generatePrimaryActionForFilters();

  return (
    <>
      {showFilter && !firstLoad && (
        <IndexFilters
          canCreateNewView
          mode={mode}
          tabs={tabs}
          onSort={setSort}
          filters={filters}
          loading={loading}
          setMode={setMode}
          selected={selected}
          sortSelected={sort}
          queryValue={queryValue}
          sortOptions={sortOptions}
          primaryAction={primaryAction}
          appliedFilters={appliedFilters}
          onSelect={setSelectedView}
          onQueryClear={onQueryClear}
          onCreateNewView={createView}
          onQueryChange={onQueryChange}
          onClearAll={clearAllAppliedFilters}
          queryPlaceholder={queryPlaceholder || t('filter-items')}
          isFlushWhenSticky
          cancelAction={{
            onAction: cancelFilters,
            disabled: false,
            loading: false,
          }}
        />
      )}
    </>
  );
}
