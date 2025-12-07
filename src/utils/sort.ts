import type { IndexFiltersProps } from '@shopify/polaris';

export type SortField = {
  field: string;
  label: string;
  directionLabel?: string;
};

/**
 * Create sort options for Polaris IndexFilters
 */
export function createSortOptions(fields: SortField[]): IndexFiltersProps['sortOptions'] {
  return fields.flatMap((field) => [
    {
      label: field.label,
      value: `${field.field} asc`,
      directionLabel: field.directionLabel || 'A-Z',
    },
    {
      label: field.label,
      value: `${field.field} desc`,
      directionLabel: field.directionLabel || 'Z-A',
    },
  ]);
}

/**
 * Convert sort definition to Polaris format
 */
export function sortToPolaris(sort: { field: string; direction: 'asc' | 'desc' }): string[] {
  return [`${sort.field} ${sort.direction}`];
}

/**
 * Convert Polaris sort format to sort definition
 */
export function polarisToSort(sort: string[]): { field: string; direction: 'asc' | 'desc' } | null {
  if (!sort || sort.length === 0) return null;
  const [field, direction] = sort[0].split(' ');
  return {
    field,
    direction: (direction || 'asc') as 'asc' | 'desc',
  };
}

