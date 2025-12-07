import React from 'react';
import { BlockStack, Divider, IndexTable } from '@shopify/polaris';
import type { ListTableProps } from '../types';
import { TABLE_ITEM_LIST_LIMITATION } from '../constants';
import { usePagination } from '../hooks/usePagination';

export function ListTableContent(props: ListTableProps) {
  const {
    page,
    items,
    total,
    setPage,
    headings,
    condensed,
    firstLoad,
    selectable,
    bulkActions,
    resourceName,
    renderRowMarkup,
    promotedBulkActions,
    showPagination = true,
    limit = TABLE_ITEM_LIST_LIMITATION,
    useSetIndexFiltersMode: { selectedResources, allResourcesSelected, handleSelectionChange },
    loading,
  } = props;

  // Use pagination hook
  const pagination = usePagination({
    page,
    limit,
    total,
    onPageChange: setPage || (() => {}),
  });

  // Helper functions for row rendering
  const getSelectedResources = () => {
    return selectedResources;
  };

  const clearAllSelection = () => {
    handleSelectionChange('page', false);
  };

  // Generate empty state - simple loading indicator
  const emptyState = firstLoad ? (
    <div style={{ paddingTop: '90px', textAlign: 'center' }}>Loading...</div>
  ) : undefined;

  return (
    <BlockStack>
      <IndexTable
        headings={headings}
        loading={loading}
        condensed={condensed}
        emptyState={emptyState}
        selectable={selectable}
        itemCount={items?.length}
        bulkActions={bulkActions}
        resourceName={resourceName}
        onSelectionChange={handleSelectionChange}
        promotedBulkActions={promotedBulkActions}
        selectedItemsCount={allResourcesSelected ? 'All' : selectedResources?.length}
        pagination={
          showPagination && !firstLoad
            ? {
                hasNext: pagination.hasNext,
                hasPrevious: pagination.hasPrevious,
                onNext: pagination.onNext,
                onPrevious: pagination.onPrevious,
                label: pagination.label,
              }
            : {}
        }
      >
        {items.map((item: any, index: number) => (
          <React.Fragment key={item.uuid || item._id || item.id || index}>
            {renderRowMarkup(item, index, selectedResources, {
              getSelectedResources,
              clearAllSelection,
            })}
          </React.Fragment>
        ))}
      </IndexTable>

      <Divider />
    </BlockStack>
  );
}
