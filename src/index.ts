/**
 * @file Polaris Query
 *
 * A client-side query library for Shopify Polaris that integrates with mongoose-url-query.
 * Provides components, hooks, and utilities for building filtered, sorted, paginated data tables.
 *
 * @example Using ListTable Component (Recommended)
 * ```tsx
 * import { ListTable } from "polaris-query";
 * import { IndexTable } from "@shopify/polaris";
 *
 * function ProductList() {
 *   return (
 *     <ListTable
 *       endpoint="/api/products"
 *       queryKey="name"
 *       headings={[{ title: "Name" }, { title: "Price" }, { title: "Status" }]}
 *       renderRowMarkup={(item, index) => (
 *         <IndexTable.Row id={item.id} position={index}>
 *           <IndexTable.Cell>{item.name}</IndexTable.Cell>
 *           <IndexTable.Cell>${item.price}</IndexTable.Cell>
 *           <IndexTable.Cell>{item.status}</IndexTable.Cell>
 *         </IndexTable.Row>
 *       )}
 *       sortOptions={[
 *         { label: "Name", value: "name asc", directionLabel: "A-Z" },
 *         { label: "Name", value: "name desc", directionLabel: "Z-A" },
 *         { label: "Price", value: "price asc", directionLabel: "Low to High" },
 *         { label: "Price", value: "price desc", directionLabel: "High to Low" },
 *       ]}
 *       defaultSort={{ field: "createdAt", direction: "desc" }}
 *       resourceName={{ singular: "product", plural: "products" }}
 *     />
 *   );
 * }
 * ```
 *
 * @example Using Hooks for Custom Implementation
 * ```tsx
 * import { useDataSource, useSelection, usePagination } from "polaris-query";
 *
 * function CustomProductList() {
 *   const {
 *     items,
 *     loading,
 *     total,
 *     state,
 *     setQueryValue,
 *     setPage,
 *     sortSelected,
 *     onSort,
 *   } = useDataSource({
 *     endpoint: "/api/products",
 *     queryKey: "name",
 *   });
 *
 *   const selection = useSelection(items);
 *   const pagination = usePagination({
 *     page: state.page,
 *     limit: state.limit,
 *     total,
 *     onPageChange: setPage,
 *   });
 *
 *   // Build your own UI...
 * }
 * ```
 *
 * @example Building URLs Manually
 * ```ts
 * import { buildUrl } from "polaris-query";
 *
 * const url = buildUrl({
 *   baseUrl: "/api/products",
 *   page: 2,
 *   limit: 20,
 *   sort: { field: "price", direction: "desc" },
 *   filters: [
 *     { field: "status", value: "active" },
 *     { field: "category", value: ["electronics", "clothing"] },
 *   ],
 *   query: { field: "name", value: "shirt" },
 * });
 * ```
 */

// Re-export from mongoose-url-query for convenience
export { buildQueryUrl, getFiltersFromUrl } from "mongoose-url-query";

// Components
export { ListTable, ListTableFilters, ListTableContent } from "./components";

// Hooks
export { useDataSource } from "./hooks/useDataSource";
export { useSelection } from "./hooks/useSelection";
export { usePagination } from "./hooks/usePagination";

// Utils
export {
  buildUrl,
  objectToFilters,
  parseUrlParams,
  serializeToUrlParams,
} from "./utils/buildUrl";

export {
  isEmptyFilter,
  areFiltersEmpty,
  cleanFilters,
  mergeFilters,
  sortToPolaris,
  polarisToSort,
  createSortOptions,
  filterItemsLocally,
} from "./utils/filters";

// Component Types
export type {
  ListTableProps,
  ListTableView,
  ListTableFilter,
  ListTableData,
  ListTableState,
  ListTableChildProps,
} from "./components/types";

// Core Types
export type {
  FilterValue,
  FilterOperator,
  FilterDefinition,
  SortDirection,
  SortDefinition,
  ViewDefinition,
  QueryState,
  QueryResult,
  UseDataSourceOptions,
  UseDataSourceReturn,
  BuildUrlConfig,
  SelectionState,
  ResourceItem,
} from "./types";

export type { UsePaginationOptions, UsePaginationReturn } from "./hooks/usePagination";

