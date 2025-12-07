import React from "react";
import { BlockStack, Divider, IndexTable, SkeletonBodyText, Box } from "@shopify/polaris";
import type { ListTableChildProps } from "./types";

const DEFAULT_LIMIT = 50;

/**
 * Default loading skeleton
 */
function DefaultLoadingSkeleton() {
  return (
    <Box padding="400">
      <BlockStack gap="400">
        <SkeletonBodyText lines={3} />
        <SkeletonBodyText lines={3} />
        <SkeletonBodyText lines={3} />
      </BlockStack>
    </Box>
  );
}

export function ListTableContent<T>(props: ListTableChildProps<T>) {
  const {
    t,
    page,
    items,
    total,
    setPage,
    headings,
    condensed,
    firstLoad,
    selectable = true,
    bulkActions,
    resourceName,
    renderRowMarkup,
    promotedBulkActions,
    showPagination = true,
    limit = DEFAULT_LIMIT,
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
    loading,
    loadingComponent,
  } = props;

  // Helper functions for row rendering context
  const getSelectedResources = () => selectedResources;
  const clearAllSelection = () => clearSelection();

  // Generate pagination config
  const paginationConfig = React.useMemo(() => {
    if (!showPagination || firstLoad) return undefined;

    const totalPages = Math.ceil(total / limit) || 1;
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      hasNext,
      hasPrevious,
      onNext: () => setPage(page + 1),
      onPrevious: () => setPage(page - 1),
      label: total > 0 ? t("page-totalpage", { page, totalPage: totalPages }) : "",
    };
  }, [showPagination, firstLoad, total, limit, page, setPage, t]);

  // Empty/loading state
  const emptyState = firstLoad ? (loadingComponent || <DefaultLoadingSkeleton />) : undefined;

  return (
    <BlockStack>
      <IndexTable
        headings={headings}
        loading={loading}
        condensed={condensed}
        emptyState={emptyState}
        selectable={selectable}
        itemCount={items?.length || 0}
        bulkActions={bulkActions}
        resourceName={resourceName}
        onSelectionChange={handleSelectionChange}
        promotedBulkActions={promotedBulkActions}
        selectedItemsCount={allResourcesSelected ? "All" : selectedResources?.length || 0}
        pagination={paginationConfig}
      >
        {(items || []).map((item: T, index: number) => {
          const itemWithId = item as T & { uuid?: string; _id?: string; id?: string };
          const key = itemWithId.uuid || itemWithId._id || itemWithId.id || index;

          return (
            <React.Fragment key={key}>
              {renderRowMarkup(item, index, selectedResources, {
                getSelectedResources,
                clearAllSelection,
              })}
            </React.Fragment>
          );
        })}
      </IndexTable>

      <Divider />
    </BlockStack>
  );
}

