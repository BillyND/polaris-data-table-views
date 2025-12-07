import { Fragment } from 'react';
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
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: '90px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #000000',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }}
      >
        <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
      </div>
    </div>
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
          <Fragment key={item.uuid || item._id || item.id || index}>
            {renderRowMarkup(item, index, selectedResources, {
              getSelectedResources,
              clearAllSelection,
            })}
          </Fragment>
        ))}
      </IndexTable>

      <Divider />
    </BlockStack>
  );
}
