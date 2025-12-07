import { useIndexResourceState } from '@shopify/polaris';
import { useCallback } from 'react';

export type SelectionChangeHandler = ReturnType<typeof useIndexResourceState>['handleSelectionChange'];

export interface UseSelectionReturn {
  selectedResources: string[];
  allResourcesSelected: boolean;
  handleSelectionChange: SelectionChangeHandler;
  clearSelection: () => void;
}

/**
 * Hook for managing row selection in IndexTable
 */
export function useSelection<T extends { id?: string; _id?: string }>(
  items: T[]
): UseSelectionReturn {
  const resourceIDResolver = useCallback((item: T) => item.id || item._id || '', []);
  const selection = useIndexResourceState(items, { resourceIDResolver });

  return {
    selectedResources: selection.selectedResources,
    allResourcesSelected: selection.allResourcesSelected,
    handleSelectionChange: selection.handleSelectionChange,
    clearSelection: selection.clearSelection,
  };
}

