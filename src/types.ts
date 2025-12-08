import type { IndexFiltersProps } from '@shopify/polaris';
import type { BulkActionsProps } from '@shopify/polaris/build/ts/src/components/BulkActions';
import type { IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable';
import type { NonEmptyArray } from '@shopify/polaris/build/ts/src/types';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import type { WithDataSourceChildProps } from './hoc/withDataSource';

export enum VIEW_ACTIONS {
  CREATE = 'createView',
  UPDATE = 'updateView',
  DELETE = 'deleteView',
  RENAME = 'renameView',
  DUPLICATE = 'duplicateView',
}

export type ListTableView = {
  _id?: string;
  name: string;
  filters: {
    queryValue?: string;
    [key: string]: any;
  };
  allowActions?: VIEW_ACTIONS[];
};

export type ListTableFilter = {
  key: string;
  label: string;
  shortcut: boolean;
  filter: ReactNode | any;
};

export type ListTableData<T = any> = {
  items?: T[];
  selectedResources?: string[];
  allResourcesSelected?: boolean;
  handleSelectionChange?: (mode: string, value: boolean) => void;
  clearSelection?: () => void;
  filterValues?: any;
  total?: number;
  page?: number;
  limit?: number;
  queryKey?: string;
};

export type ListTableProps<T = any> = WithDataSourceChildProps & {
  t?: (key: string, options?: any) => string;
  limit?: number;
  views?: ListTableView[];
  defaultViews?: ListTableView[];
  filters?: ListTableFilter[];
  condensed?: boolean;
  selectable?: boolean;
  showBorder?: boolean;
  showFilter?: boolean;
  emptyState?: ReactNode;
  abbreviated?: string;
  showPagination?: boolean;
  bulkActions?: BulkActionsProps['actions'];
  headings: NonEmptyArray<IndexTableHeading>;
  sortOptions?: IndexFiltersProps['sortOptions'];
  promotedBulkActions?: BulkActionsProps['promotedActions'];
  renderRowMarkup: (item: T, idx: number, selectedResources?: string[], context?: any) => ReactNode;
  renderFilterLabel?: (key: string, value: string | any[]) => string;
  resourceName?: {
    singular: string;
    plural: string;
  };
  setListTableData?: Dispatch<SetStateAction<ListTableData<T>>>;
  onDataChange?: (data: ListTableData<T>) => void;
  error?: Error;
  onlyLocalData?: boolean;
  localData?: T[];
  queryPlaceholder?: string;
  viewsEndpoint?: string;
  fetchFunction?: (url: string, options?: RequestInit) => Promise<Response>;
  fetchFn?: (url: string, options?: RequestInit) => Promise<Response>;
  syncWithUrl?: boolean;
  loadingComponent?: ReactNode;
};

export type ListTableState = {
  views: ListTableView[];
  selected: number;
  error?: Error;
};

export interface QueryUrlOptions {
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field and direction: "field|asc" or "field|desc" */
  sort?: string;
  /** Filter strings in format: "field|type|operator|value" or "field|value" */
  filters?: string[];
  /** Item ID for fetchItem */
  id?: string;
  /** Skip pagination and return all results */
  export?: boolean;
  /** Return only count, no items */
  countOnly?: boolean;
}
