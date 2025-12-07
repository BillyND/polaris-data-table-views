# polaris-list-table

A complete, flexible data table component for **Shopify Polaris** with filtering, sorting, pagination, and URL sync. Zero router dependencies - works with Next.js, Remix, Vite, or any React app.

[![npm version](https://img.shields.io/npm/v/polaris-list-table.svg)](https://www.npmjs.com/package/polaris-list-table)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🎯 **Full Polaris Integration** - Works seamlessly with IndexTable, IndexFilters
- 🔗 **URL Sync** - State persists in URL (pagination, filters, sort, views)
- 🚀 **SSR Compatible** - Works with Next.js, Remix, and server-side rendering
- 📦 **Zero Router Dependencies** - Uses native browser APIs
- 🎨 **Flexible** - Use as component or hooks for custom implementations
- 🔍 **Advanced Filtering** - Multi-value filters, operators, nested fields
- 📑 **Views/Tabs** - Save filter presets as views
- 💾 **Local Data Mode** - Filter/sort/paginate local arrays
- 🔄 **Backend Compatible** - Works with [mongoose-url-query](https://www.npmjs.com/package/mongoose-url-query)

## 📦 Installation

```bash
npm install polaris-list-table
# or
yarn add polaris-list-table
# or
pnpm add polaris-list-table
```

### Peer Dependencies

```bash
npm install @shopify/polaris@^13.0.0 react@^18.0.0
```

### Version Compatibility

| Package              | Tested Version | Supported Range        |
| -------------------- | -------------- | ---------------------- |
| `@shopify/polaris`   | `13.9.0`       | `^12.0.0 \|\| ^13.0.0` |
| `react`              | `18.3.1`       | `^18.0.0`              |
| `mongoose-url-query` | `1.6.2`        | `^1.6.0`               |
| `lodash`             | `4.17.21`      | `^4.17.0`              |
| `node`               | `18+`          | `>=18.0.0`             |

## 🚀 Quick Start

### Option 1: Using `ListTable` Component (Recommended)

```tsx
import { ListTable } from 'polaris-list-table';
import { IndexTable } from '@shopify/polaris';

interface Product {
  id: string;
  name: string;
  price: number;
  status: 'active' | 'draft';
}

function ProductList() {
  return (
    <ListTable<Product>
      endpoint="/api/products"
      queryKey="name"
      resourceName={{ singular: 'product', plural: 'products' }}
      headings={[{ title: 'Name' }, { title: 'Price' }, { title: 'Status' }]}
      renderRowMarkup={(item, index) => (
        <IndexTable.Row id={item.id} position={index} key={item.id}>
          <IndexTable.Cell>{item.name}</IndexTable.Cell>
          <IndexTable.Cell>${item.price}</IndexTable.Cell>
          <IndexTable.Cell>{item.status}</IndexTable.Cell>
        </IndexTable.Row>
      )}
      sortOptions={[
        { label: 'Name', value: 'name asc', directionLabel: 'A-Z' },
        { label: 'Name', value: 'name desc', directionLabel: 'Z-A' },
        { label: 'Price', value: 'price asc', directionLabel: 'Low to High' },
        { label: 'Price', value: 'price desc', directionLabel: 'High to Low' },
      ]}
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
    />
  );
}
```

### Option 2: Using Hooks (Custom Implementation)

```tsx
import { useDataSource, useSelection, usePagination } from 'polaris-list-table';
import { IndexTable, IndexFilters, Card, Pagination } from '@shopify/polaris';

function CustomProductList() {
  const {
    items,
    loading,
    total,
    state,
    setQueryValue,
    setPage,
    setFilter,
    clearFilters,
    tabs,
    sortSelected,
    onSort,
  } = useDataSource<Product>({
    endpoint: '/api/products',
    queryKey: 'name',
    defaultSort: { field: 'createdAt', direction: 'desc' },
    defaultLimit: 20,
  });

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useSelection(items);

  const pagination = usePagination({
    page: state.page,
    limit: state.limit,
    total,
    onPageChange: setPage,
  });

  return (
    <Card padding="0">
      <IndexFilters
        queryValue={state.queryValue}
        onQueryChange={setQueryValue}
        onQueryClear={() => setQueryValue('')}
        tabs={tabs}
        sortSelected={sortSelected}
        onSort={onSort}
        // ... other IndexFilters props
      />
      <IndexTable
        resourceName={{ singular: 'product', plural: 'products' }}
        itemCount={items.length}
        selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
        onSelectionChange={handleSelectionChange}
        headings={[{ title: 'Name' }, { title: 'Price' }]}
        loading={loading}
      >
        {items.map((item, index) => (
          <IndexTable.Row id={item.id} position={index} key={item.id}>
            <IndexTable.Cell>{item.name}</IndexTable.Cell>
            <IndexTable.Cell>${item.price}</IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
      <Pagination
        hasPrevious={pagination.hasPrevious}
        hasNext={pagination.hasNext}
        onPrevious={pagination.onPrevious}
        onNext={pagination.onNext}
        label={pagination.label}
      />
    </Card>
  );
}
```

## 📖 API Reference

### `<ListTable>` Props

| Prop                  | Type                         | Default      | Description                    |
| --------------------- | ---------------------------- | ------------ | ------------------------------ |
| `endpoint`            | `string`                     | **required** | API endpoint URL               |
| `queryKey`            | `string`                     | **required** | Field name for search queries  |
| `headings`            | `IndexTableHeading[]`        | **required** | Column headings                |
| `renderRowMarkup`     | `(item, index) => ReactNode` | **required** | Row render function            |
| `resourceName`        | `{ singular, plural }`       | -            | Resource name for empty states |
| `defaultSort`         | `{ field, direction }`       | -            | Default sort configuration     |
| `limit`               | `number`                     | `50`         | Items per page                 |
| `localData`           | `T[]`                        | -            | Use local data instead of API  |
| `filters`             | `ListTableFilter[]`          | -            | Filter definitions             |
| `sortOptions`         | `SortOption[]`               | -            | Sort dropdown options          |
| `views`               | `ListTableView[]`            | -            | Predefined views/tabs          |
| `defaultViews`        | `ListTableView[]`            | -            | Default views (always shown)   |
| `bulkActions`         | `BulkAction[]`               | -            | Bulk action buttons            |
| `promotedBulkActions` | `BulkAction[]`               | -            | Promoted bulk actions          |
| `selectable`          | `boolean`                    | `true`       | Enable row selection           |
| `showBorder`          | `boolean`                    | `true`       | Show card border               |
| `showFilter`          | `boolean`                    | `true`       | Show filter bar                |
| `showPagination`      | `boolean`                    | `true`       | Show pagination                |
| `emptyState`          | `ReactNode`                  | -            | Custom empty state             |
| `queryPlaceholder`    | `string`                     | -            | Search input placeholder       |
| `loadingComponent`    | `ReactNode`                  | -            | Custom loading skeleton        |
| `syncWithUrl`         | `boolean`                    | `true`       | Sync state with URL            |
| `fetchFn`             | `(url, options) => Promise`  | `fetch`      | Custom fetch function          |
| `onDataChange`        | `(data) => void`             | -            | Callback when data changes     |
| `t`                   | `(key, params) => string`    | -            | Translation function           |

### `useDataSource` Options

```typescript
interface UseDataSourceOptions<T> {
  endpoint: string; // API endpoint
  queryKey: string; // Search field name
  defaultSort?: SortDefinition;
  defaultLimit?: number; // Default: 50
  defaultViews?: ViewDefinition[];
  syncWithUrl?: boolean; // Default: true
  localData?: T[]; // Use local data mode
  abbreviated?: boolean;
  transformResponse?: (response: unknown) => QueryResult<T>;
  fetchFn?: (url: string, options?: RequestInit) => Promise<unknown>;
  debounceMs?: number; // Default: 300
}
```

### `useDataSource` Return

```typescript
interface UseDataSourceReturn<T> {
  // State
  state: QueryState;
  items: T[];
  total: number;
  loading: boolean;
  firstLoad: boolean;
  error: Error | null;

  // Actions
  setPage: (page: number) => void;
  setQueryValue: (value: string) => void;
  setFilter: (key: string, value: FilterValue) => void;
  setFilters: (filters: Record<string, FilterValue>) => void;
  clearFilters: () => void;
  setSort: (sort: SortDefinition | null) => void;
  setSelectedView: (index: number) => void;
  refresh: () => void;

  // Polaris helpers
  tabs: TabProps[];
  sortOptions: SortOption[];
  sortSelected: string[];
  onSort: (selected: string[]) => void;
}
```

### `usePagination`

```typescript
const pagination = usePagination({
  page: 1,
  limit: 20,
  total: 100,
  onPageChange: (page) => setPage(page),
});

// Returns:
{
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  goToPage: (page: number) => void;
  label: string;  // "1-20 of 100"
}
```

### `useSelection`

```typescript
const selection = useSelection(items);

// Returns:
{
  selectedResources: string[];
  allResourcesSelected: boolean;
  handleSelectionChange: SelectionChangeHandler;
  clearSelection: () => void;
}
```

## 🔧 Advanced Usage

### Custom Filters

```tsx
import { ListTable, ListTableFilter } from 'polaris-list-table';
import { ChoiceList, TextField } from '@shopify/polaris';

const filters: ListTableFilter[] = [
  {
    key: 'status',
    label: 'Status',
    shortcut: true,
    filter: (
      <ChoiceList
        title="Status"
        titleHidden
        choices={[
          { label: 'Active', value: 'active' },
          { label: 'Draft', value: 'draft' },
          { label: 'Archived', value: 'archived' },
        ]}
        selected={[]}
        onChange={() => {}}
      />
    ),
  },
  {
    key: 'vendor',
    label: 'Vendor',
    filter: <TextField label="Vendor" labelHidden autoComplete="off" />,
  },
];

<ListTable
  endpoint="/api/products"
  queryKey="name"
  filters={filters}
  // ... other props
/>;
```

### Views/Tabs

```tsx
const views = [
  {
    name: 'Active Products',
    filters: { status: 'active' },
  },
  {
    name: 'Low Stock',
    filters: { stock: 'low', status: 'active' },
  },
];

<ListTable
  endpoint="/api/products"
  queryKey="name"
  defaultViews={views}
  // ... other props
/>;
```

### Local Data Mode

```tsx
const products = [
  { id: '1', name: 'Widget', price: 10 },
  { id: '2', name: 'Gadget', price: 20 },
  // ...
];

<ListTable
  endpoint="" // Not used in local mode
  queryKey="name"
  localData={products}
  // ... other props
/>;
```

### Custom Fetch Function

```tsx
// With authentication
<ListTable
  endpoint="/api/products"
  queryKey="name"
  fetchFn={async (url, options) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  }}
  // ... other props
/>
```

### Accessing Table Data

```tsx
import { useState } from 'react';
import { ListTable, ListTableData } from 'polaris-list-table';

function ProductList() {
  const [tableData, setTableData] = useState<ListTableData<Product>>();

  const handleBulkDelete = () => {
    const { selectedResources } = tableData;
    // Delete selected items...
  };

  return (
    <>
      <ListTable
        endpoint="/api/products"
        queryKey="name"
        setListTableData={setTableData}
        bulkActions={[{ content: 'Delete', onAction: handleBulkDelete }]}
        // ... other props
      />
    </>
  );
}
```

## 🔗 URL Parameters

When `syncWithUrl` is enabled, the following URL parameters are used:

| Parameter      | Example                 | Description              |
| -------------- | ----------------------- | ------------------------ |
| `page`         | `?page=2`               | Current page number      |
| `sort`         | `?sort=name\|asc`       | Sort field and direction |
| `query`        | `?query=shirt`          | Search query value       |
| `filter_*`     | `?filter_status=active` | Filter values            |
| `viewSelected` | `?viewSelected=Active`  | Selected view/tab        |

## 🔄 Backend Integration

This library is designed to work with [mongoose-url-query](https://www.npmjs.com/package/mongoose-url-query) on the backend:

```javascript
// Express + Mongoose example
const { getFiltersFromUrl, getPaginationFromUrl } = require('mongoose-url-query');

app.get('/api/products', async (req, res) => {
  const filters = getFiltersFromUrl(req.query);
  const { page, limit, sort } = getPaginationFromUrl(req.query);

  const items = await Product.find(filters)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Product.countDocuments(filters);

  res.json({ items, total, page });
});
```

## 📝 Utility Functions

```typescript
import {
  buildUrl,
  objectToFilters,
  parseUrlParams,
  serializeToUrlParams,
  createSortOptions,
  sortToPolaris,
  polarisToSort,
  cleanFilters,
  mergeFilters,
} from 'polaris-list-table';

// Build API URL manually
const url = buildUrl({
  baseUrl: '/api/products',
  page: 2,
  limit: 20,
  sort: { field: 'price', direction: 'desc' },
  filters: [{ field: 'status', value: 'active' }],
  query: { field: 'name', value: 'shirt' },
});

// Create sort options for Polaris
const sortOptions = createSortOptions([
  { field: 'name', label: 'Name' },
  { field: 'price', label: 'Price' },
  { field: 'createdAt', label: 'Date' },
]);
```

## 🌐 SSR Support

This library is fully compatible with server-side rendering:

- **Next.js** (App Router & Pages Router)
- **Remix**
- **Vite SSR**

The `useUrlParams` hook safely handles the `window` object and provides hydration fixes.

## 📄 License

MIT © 2024

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.
