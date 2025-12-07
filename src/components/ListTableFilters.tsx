import React, { useCallback, useMemo } from 'react';
import { IndexFilters } from '@shopify/polaris';
import type { IndexFiltersProps, TabProps } from '@shopify/polaris';
import type { ListTableChildProps, ListTableFilter, FilterComponentConfig } from './types';
import type { FilterValue } from '../types';
import { isEqual } from '../utils/helpers';

interface ListTableFiltersProps<T> extends ListTableChildProps<T> {
  onCreateView?: (name: string) => Promise<boolean>;
  onRenameView?: (name: string, index: number) => void;
  onDuplicateView?: (name: string, index: number) => void;
  onDeleteView?: (index: number) => void;
  onUpdateView?: () => Promise<boolean>;
}

export function ListTableFilters<T>(props: ListTableFiltersProps<T>) {
  const {
    t,
    sort,
    loading,
    setSort,
    firstLoad,
    sortOptions,
    showFilter = true,
    queryPlaceholder,
    queryValue,
    filterValues,
    setFilterValues,
    setQueryValue,
    mode,
    setMode,
    views,
    selectedView,
    setSelectedView,
    filters: filterDefs,
    renderFilterLabel,
    onCreateView,
    onRenameView,
    onDuplicateView,
    onDeleteView,
    onUpdateView,
  } = props;

  // Query handlers
  const onQueryChange = useCallback(
    (value: string) => {
      setQueryValue(value);
    },
    [setQueryValue]
  );

  const onQueryClear = useCallback(() => {
    onQueryChange('');
  }, [onQueryChange]);

  // Filter handlers
  const removeAppliedFilter = useCallback(
    (key: string) => {
      const newFilters = { ...filterValues };
      delete newFilters[key];
      setFilterValues(newFilters);
    },
    [filterValues, setFilterValues]
  );

  const clearAllAppliedFilters = useCallback(() => {
    setFilterValues({});
    setQueryValue('');
  }, [setFilterValues, setQueryValue]);

  const cancelFilters = useCallback(() => {
    const viewFilters = views[selectedView]?.filters || {};
    setFilterValues(viewFilters);
    setQueryValue((viewFilters.queryValue as string) || '');
  }, [views, selectedView, setFilterValues, setQueryValue]);

  // Check if filter is a component config
  const isComponentConfig = (filter: unknown): filter is FilterComponentConfig => {
    return (
      typeof filter === 'object' && filter !== null && 'Component' in filter && 'props' in filter
    );
  };

  // Generate filters with components for IndexFilters
  const filters = useMemo(() => {
    if (!filterDefs) return [];

    return filterDefs.map((def) => {
      const filterConfig = def.filter;

      // If it's a component config, render the component
      if (isComponentConfig(filterConfig)) {
        const { Component, props: compProps } = filterConfig;

        return {
          key: def.key,
          label: def.label,
          shortcut: def.shortcut,
          filter: (
            <Component
              {...compProps}
              {...(compProps.value !== undefined ? { value: filterValues[def.key] } : {})}
              {...(compProps.choices ? { selected: filterValues[def.key] || [] } : {})}
              onChange={(value: FilterValue) =>
                setFilterValues({
                  ...filterValues,
                  [def.key]: value,
                })
              }
            />
          ),
        };
      }

      // Otherwise return as-is (ReactNode)
      return {
        key: def.key,
        label: def.label,
        shortcut: def.shortcut,
        filter: filterConfig,
      };
    });
  }, [filterDefs, filterValues, setFilterValues]);

  // Generate applied filters
  const appliedFilters = useMemo((): IndexFiltersProps['appliedFilters'] => {
    const applied: IndexFiltersProps['appliedFilters'] = [];

    for (const [key, value] of Object.entries(filterValues)) {
      if (key === 'queryValue') continue;

      const hasValue = Array.isArray(value)
        ? value.length > 0
        : value !== undefined && value !== '';
      if (!hasValue) continue;

      const filterDef = filters.find((f) => f.key === key);
      if (!filterDef) continue;

      applied.push({
        key,
        label: renderFilterLabel ? renderFilterLabel(key, value) : filterDef.label,
        onRemove: () => removeAppliedFilter(key),
      });
    }

    return applied;
  }, [filterValues, filters, renderFilterLabel, removeAppliedFilter]);

  // Generate primary action
  const primaryAction = useMemo(() => {
    const currentFilters = views[selectedView]?.filters || {};
    const combinedNew = { ...filterValues, queryValue };
    const combinedCurrent = { ...currentFilters, queryValue: currentFilters.queryValue || '' };
    const disabled = isEqual(combinedCurrent, combinedNew);

    if (selectedView === 0) {
      return {
        type: 'save-as' as const,
        onAction: onCreateView || (async () => true),
        disabled,
        loading: false,
      };
    }

    return {
      type: 'save' as const,
      onAction: onUpdateView || (async () => true),
      disabled,
      loading: false,
    };
  }, [views, selectedView, filterValues, queryValue, onCreateView, onUpdateView]);

  // Generate tabs for views
  const tabs = useMemo((): TabProps[] => {
    if (!views || views.length === 0) return [];

    return views.map((view, index) => ({
      index,
      content: view.name,
      isLocked: index === 0,
      id: `${index}-${view.name}`,
      key: `${index}-${view.name}`,
      onAction: () => {
        const filters = view.filters || {};
        setFilterValues(filters);
        setQueryValue((filters.queryValue as string) || '');
      },
      actions:
        index === 0
          ? []
          : [
              // Rename action
              ...(!view.allowActions || view.allowActions.includes('rename')
                ? [
                    {
                      type: 'rename' as const,
                      onPrimaryAction: async (value: string): Promise<boolean> => {
                        onRenameView?.(value, index);
                        return true;
                      },
                    },
                  ]
                : []),

              // Duplicate action
              ...(!view.allowActions || view.allowActions.includes('duplicate')
                ? [
                    {
                      type: 'duplicate' as const,
                      onPrimaryAction: async (value: string): Promise<boolean> => {
                        onDuplicateView?.(value, index);
                        return true;
                      },
                    },
                  ]
                : []),

              // Delete action
              ...(!view.allowActions || view.allowActions.includes('delete')
                ? [
                    {
                      type: 'delete' as const,
                      onPrimaryAction: async (): Promise<boolean> => {
                        onDeleteView?.(index);
                        return true;
                      },
                    },
                  ]
                : []),
            ],
    }));
  }, [views, setFilterValues, setQueryValue, onRenameView, onDuplicateView, onDeleteView]);

  // Ensure sort is always a valid array of strings
  const validSort = useMemo(() => {
    if (!Array.isArray(sort)) return [];
    return sort.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  }, [sort]);

  if (!showFilter || firstLoad) {
    return null;
  }

  return (
    <IndexFilters
      canCreateNewView
      mode={mode}
      tabs={tabs}
      onSort={setSort}
      filters={filters}
      loading={loading}
      setMode={setMode}
      selected={selectedView}
      sortSelected={validSort}
      queryValue={queryValue}
      sortOptions={sortOptions}
      primaryAction={primaryAction}
      appliedFilters={appliedFilters}
      onSelect={setSelectedView}
      onQueryClear={onQueryClear}
      onCreateNewView={onCreateView}
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
  );
}
