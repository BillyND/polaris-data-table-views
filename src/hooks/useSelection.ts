import { useCallback, useMemo, useState } from "react";
import type { ResourceItem, SelectionState } from "../types";

/**
 * Hook for managing resource selection in IndexTable
 * Similar to Polaris useIndexResourceState but simpler
 *
 * @example
 * ```tsx
 * const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
 *   useSelection(items);
 *
 * <IndexTable
 *   selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
 *   onSelectionChange={handleSelectionChange}
 * >
 * ```
 */
export function useSelection<T extends ResourceItem>(
  items: T[],
  options?: {
    resourceIDResolver?: (item: T) => string;
  }
): SelectionState {
  const { resourceIDResolver = (item: T) => item.id || (item as Record<string, unknown>)._id as string } = options || {};

  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [allResourcesSelected, setAllResourcesSelected] = useState(false);

  const itemIds = useMemo(
    () => items.map(resourceIDResolver),
    [items, resourceIDResolver]
  );

  const handleSelectionChange = useCallback(
    (
      selectionType: "single" | "page" | "multi" | "all",
      toggleType: boolean,
      selection?: string,
      position?: number
    ) => {
      switch (selectionType) {
        case "single":
          if (selection) {
            setSelectedResources((prev) =>
              toggleType
                ? [...prev, selection]
                : prev.filter((id) => id !== selection)
            );
            setAllResourcesSelected(false);
          }
          break;

        case "page":
          if (toggleType) {
            setSelectedResources(itemIds);
          } else {
            setSelectedResources([]);
          }
          setAllResourcesSelected(false);
          break;

        case "multi":
          if (selection && position !== undefined) {
            // Handle shift-click range selection
            const lastSelected = selectedResources[selectedResources.length - 1];
            const lastIndex = itemIds.indexOf(lastSelected);
            const currentIndex = position;

            if (lastIndex !== -1) {
              const start = Math.min(lastIndex, currentIndex);
              const end = Math.max(lastIndex, currentIndex);
              const range = itemIds.slice(start, end + 1);

              if (toggleType) {
                setSelectedResources((prev) => [
                  ...new Set([...prev, ...range]),
                ]);
              } else {
                setSelectedResources((prev) =>
                  prev.filter((id) => !range.includes(id))
                );
              }
            }
          }
          setAllResourcesSelected(false);
          break;

        case "all":
          setAllResourcesSelected(toggleType);
          if (toggleType) {
            setSelectedResources(itemIds);
          } else {
            setSelectedResources([]);
          }
          break;
      }
    },
    [itemIds, selectedResources]
  );

  const clearSelection = useCallback(() => {
    setSelectedResources([]);
    setAllResourcesSelected(false);
  }, []);

  return {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  };
}

