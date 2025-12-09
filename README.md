# @peakify/polaris-data-table-views

[![npm version](https://img.shields.io/npm/v/@peakify/polaris-data-table-views.svg)](https://www.npmjs.com/package/@peakify/polaris-data-table-views)

[![npm downloads](https://img.shields.io/npm/dm/@peakify/polaris-data-table-views.svg)](https://www.npmjs.com/package/@peakify/polaris-data-table-views)

[![license](https://img.shields.io/npm/l/@peakify/polaris-data-table-views.svg)](https://github.com/BillyND/polaris-list-table/blob/main/LICENSE)

A complete data table component library for Shopify Polaris IndexTable with filtering, sorting, pagination, URL synchronization, and view management. Integrates seamlessly with `@peakify/mongoose-url-query` for server-side data fetching.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Usage Patterns](#usage-patterns)
  - [Basic Usage with Remote Data](#basic-usage-with-remote-data)
  - [Local Data Mode](#local-data-mode)
  - [Custom Fetch Function](#custom-fetch-function)
  - [View Management](#view-management)
  - [Custom Filters](#custom-filters)
  - [Using Hooks Directly](#using-hooks-directly)
  - [Server-Side Setup](#server-side-setup)
- [API Reference](#api-reference)
  - [ListTable Component](#listtable-component)
  - [useDataSource Hook](#usedatasource-hook)
  - [Server Utilities](#server-utilities)
- [Advanced Usage](#advanced-usage)
  - [Custom View Models](#custom-view-models)
  - [URL Synchronization](#url-synchronization)
  - [Transform Response](#transform-response)
  - [Error Handling](#error-handling)

## Installation

```bash
npm install @peakify/polaris-data-table-views
# or
yarn add @peakify/polaris-data-table-views
```

### Peer Dependencies

This library requires:

- `@shopify/polaris`: ^12.0.0 || ^13.0.0
- `react`: ^18.0.0
- `mongoose`: ^7.0.0 || ^8.0.0 (optional, only for server-side view management)

## Quick Start

### 1. Basic Remote Data Table

```tsx
import { ListTable } from '@peakify/polaris-data-table-views';
import { IndexTable } from '@shopify/polaris';

function UsersPage() {
  return (
    <ListTable
      endpoint="/api/users"
      queryKey="email"
      headings={[{ title: 'Name' }, { title: 'Email' }, { title: 'Status' }]}
      renderRowMarkup={(user) => (
        <IndexTable.Row id={user._id} key={user._id}>
          <IndexTable.Cell>{user.name}</IndexTable.Cell>
          <IndexTable.Cell>{user.email}</IndexTable.Cell>
          <IndexTable.Cell>{user.status}</IndexTable.Cell>
        </IndexTable.Row>
      )}
    />
  );
}
```

### 2. With View Management (Server-Side)

**Client-side:**

```tsx
import { ListTable } from '@peakify/polaris-data-table-views';

function UsersPage() {
  return (
    <ListTable
      endpoint="/api/users"
      queryKey="email"
      viewsEndpoint="/api/views"
      headings={[...]}
      renderRowMarkup={...}
    />
  );
}
```

**Server-side (API route):**

```tsx
// pages/api/views.ts (Next.js) or routes/views.js (Express)
import { ViewModel } from '@peakify/polaris-data-table-views/server';
import {
  serverGetViews,
  serverCreateView,
  serverUpdateView,
  serverDeleteView,
  serverRenameView,
} from '@peakify/polaris-data-table-views/server';

export default async function handler(req, res) {
  const { path, action, name, oldName, newName } = req.query;
  const ownerId = req.user?.id; // Optional: for user-specific views

  switch (action) {
    case 'createView':
      await serverCreateView(path, name, req.body, ViewModel, ownerId);
      return res.json({ success: true });

    case 'updateView':
      await serverUpdateView(path, name, req.body, ViewModel, ownerId);
      return res.json({ success: true });

    case 'deleteView':
      await serverDeleteView(path, name, ViewModel, ownerId);
      return res.json({ success: true });

    case 'renameView':
      await serverRenameView(path, oldName, newName, ViewModel, ownerId);
      return res.json({ success: true });

    default:
      const views = await serverGetViews(path, ViewModel, ownerId);
      return res.json({ items: views });
  }
}
```

## Core Concepts

### 1. Data Source Modes

The library supports two data source modes:

- **Remote Data Mode**: Fetches data from an API endpoint (default)
- **Local Data Mode**: Filters/sorts/paginates data in-memory

### 2. View Management

Views are saved filter configurations that users can create, update, delete, and rename. Views are stored in MongoDB and can be:

- **Shared**: Available to all users (no `ownerId`)
- **User-specific**: Only visible to the owner (`ownerId` provided)

### 3. URL Synchronization

By default, the table state (page, sort, filters, selected view) is synchronized with URL query parameters, allowing:

- Bookmarkable URLs
- Browser back/forward navigation
- Shareable filtered views

### 4. Filtering System

- **Query Search**: Text search on a specified field (`queryKey`)
- **Custom Filters**: Additional filters defined via `filters` prop
- **Applied Filters**: Visual representation of active filters

## Usage Patterns

### Basic Usage with Remote Data

```tsx
import { ListTable } from '@peakify/polaris-data-table-views';

<ListTable
  endpoint="/api/products"
  queryKey="name"
  headings={[
    { title: 'Product', id: 'name' },
    { title: 'Price', id: 'price' },
  ]}
  sortOptions={[
    { label: 'Name A-Z', value: 'name asc' },
    { label: 'Name Z-A', value: 'name desc' },
    { label: 'Price Low-High', value: 'price asc' },
  ]}
  defaultSort={{ field: 'createdAt', direction: 'desc' }}
  renderRowMarkup={(product) => (
    <IndexTable.Row id={product._id}>
      <IndexTable.Cell>{product.name}</IndexTable.Cell>
      <IndexTable.Cell>${product.price}</IndexTable.Cell>
    </IndexTable.Row>
  )}
/>;
```

### Local Data Mode

When you have data already loaded and want to filter/sort/paginate in-memory:

```tsx
const [products, setProducts] = useState([...]);

<ListTable
  queryKey="name"
  localData={products}
  onlyLocalData={true}
  headings={[...]}
  renderRowMarkup={...}
/>
```

### Custom Fetch Function

For authentication, custom headers, or API wrappers:

```tsx
const customFetch = async (url: string, options?: RequestInit) => {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};

<ListTable
  endpoint="/api/products"
  queryKey="name"
  fetchFn={customFetch}
  headings={[...]}
  renderRowMarkup={...}
/>
```

### View Management

#### Client-Side Configuration

```tsx
<ListTable
  endpoint="/api/products"
  queryKey="name"
  viewsEndpoint="/api/views"
  defaultViews={[
    {
      name: 'Active Products',
      filters: { status: 'active' },
      allowActions: ['update', 'delete', 'rename'], // Optional: restrict actions
    },
  ]}
  headings={[...]}
  renderRowMarkup={...}
/>
```

#### Server-Side API Route

```tsx
// Next.js API route example
import { ViewModel } from '@peakify/polaris-data-table-views/server';
import {
  serverGetViews,
  serverCreateView,
  serverUpdateView,
  serverDeleteView,
  serverRenameView,
} from '@peakify/polaris-data-table-views/server';

export default async function handler(req, res) {
  const { method, query, body } = req;
  const { path, action, name, oldName, newName } = query;
  const ownerId = req.user?.id; // Get from your auth system

  try {
    switch (action) {
      case 'createView':
        if (method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        await serverCreateView(path, name, body, ViewModel, ownerId);
        return res.json({ success: true });

      case 'updateView':
        if (method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
        await serverUpdateView(path, name, body, ViewModel, ownerId);
        return res.json({ success: true });

      case 'deleteView':
        if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        await serverDeleteView(path, name, ViewModel, ownerId);
        return res.json({ success: true });

      case 'renameView':
        if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        await serverRenameView(path, oldName, newName, ViewModel, ownerId);
        return res.json({ success: true });

      default:
        // GET views
        if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const views = await serverGetViews(path, ViewModel, ownerId);
        return res.json({ items: views });
    }
  } catch (error) {
    console.error('View management error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### Custom Filters

Add custom filter components (e.g., Select, DatePicker):

```tsx
import { Select } from '@shopify/polaris';

<ListTable
  endpoint="/api/products"
  queryKey="name"
  filters={[
    {
      key: 'status',
      label: 'Status',
      shortcut: true,
      filter: {
        Component: Select,
        props: {
          label: 'Status',
          options: [
            { label: 'All', value: '' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ],
        },
      },
    },
    {
      key: 'category',
      label: 'Category',
      shortcut: false,
      filter: {
        Component: Select,
        props: {
          label: 'Category',
          options: [
            { label: 'All', value: '' },
            { label: 'Electronics', value: 'electronics' },
            { label: 'Clothing', value: 'clothing' },
          ],
        },
      },
    },
  ]}
  renderFilterLabel={(key, value) => {
    if (key === 'status') {
      return `Status: ${value}`;
    }
    if (key === 'category') {
      return `Category: ${value}`;
    }
    return `${key}: ${value}`;
  }}
  headings={[...]}
  renderRowMarkup={...}
/>
```

### Using Hooks Directly

For more control, use the hooks directly:

```tsx
import { useDataSource } from '@peakify/polaris-data-table-views';
import { IndexTable, Card } from '@shopify/polaris';

function CustomTable() {
  const {
    items,
    total,
    loading,
    state,
    setPage,
    setQueryValue,
    setFilter,
    setSort,
    pagination,
  } = useDataSource({
    endpoint: '/api/products',
    queryKey: 'name',
    defaultSort: { field: 'createdAt', direction: 'desc' },
    defaultLimit: 25,
  });

  return (
    <Card>
      <input
        type="text"
        placeholder="Search..."
        onChange={(e) => setQueryValue(e.target.value)}
      />
      <IndexTable
        headings={[...]}
        itemCount={items.length}
        loading={loading}
        pagination={{
          hasNext: pagination.hasNext,
          hasPrevious: pagination.hasPrevious,
          onNext: pagination.onNext,
          onPrevious: pagination.onPrevious,
          label: pagination.label,
        }}
      >
        {items.map((item) => (
          <IndexTable.Row key={item._id}>
            {/* Your row content */}
          </IndexTable.Row>
        ))}
      </IndexTable>
    </Card>
  );
}
```

### Server-Side Setup

#### 1. Install and Connect Mongoose

```tsx
// lib/mongodb.ts or similar
import mongoose from 'mongoose';

if (!mongoose.connection.readyState) {
  await mongoose.connect(process.env.MONGODB_URI);
}
```

#### 2. Create API Route for Views

See [View Management](#view-management) section above.

#### 3. Create API Route for Data

Your data endpoint should accept query parameters from `@billy/mongoose-url-query`:

```tsx
// pages/api/products.ts
import { buildQuery } from '@billy/mongoose-url-query';
import Product from '@/models/Product';

export default async function handler(req, res) {
  const { page, limit, sort, filters } = buildQuery(req.query);

  const query = Product.find();

  // Apply filters
  if (filters) {
    // @billy/mongoose-url-query filters are already parsed
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query.where(key).in(value);
      } else {
        query.where(key).equals(value);
      }
    });
  }

  // Apply sorting
  if (sort) {
    query.sort(sort);
  }

  // Apply pagination
  const skip = (page - 1) * limit;
  query.skip(skip).limit(limit);

  const [items, total] = await Promise.all([
    query.exec(),
    Product.countDocuments(query.getQuery()),
  ]);

  res.json({ items, total, page, limit });
}
```

## API Reference

### ListTable Component

#### Props

| Prop                        | Type                                                   | Required | Default          | Description                                               |
| --------------------------- | ------------------------------------------------------ | -------- | ---------------- | --------------------------------------------------------- |
| `endpoint`                  | `string`                                               | No\*     | -                | API endpoint for data fetching (required for remote mode) |
| `queryKey`                  | `string`                                               | Yes      | -                | Field name for text search                                |
| `headings`                  | `IndexTableHeading[]`                                  | Yes      | -                | Table column headers                                      |
| `renderRowMarkup`           | `(item, idx, selectedResources, context) => ReactNode` | Yes      | -                | Function to render each row                               |
| `localData`                 | `T[]`                                                  | No       | -                | Array of data for local mode                              |
| `onlyLocalData`             | `boolean`                                              | No       | `false`          | Enable local data mode                                    |
| `viewsEndpoint`             | `string`                                               | No       | -                | API endpoint for view management                          |
| `defaultViews`              | `ListTableView[]`                                      | No       | `[]`             | Default views to show                                     |
| `views`                     | `ListTableView[]`                                      | No       | -                | Controlled views (overrides fetching)                     |
| `filters`                   | `ListTableFilter[]`                                    | No       | `[]`             | Custom filter definitions                                 |
| `sortOptions`               | `IndexFiltersProps['sortOptions']`                     | No       | -                | Sort dropdown options                                     |
| `defaultSort`               | `{ field: string; direction: 'asc' \| 'desc' }`        | No       | -                | Default sort configuration                                |
| `limit`                     | `number`                                               | No       | `50`             | Items per page                                            |
| `selectable`                | `boolean`                                              | No       | `false`          | Enable row selection                                      |
| `bulkActions`               | `BulkActionsProps['actions']`                          | No       | -                | Bulk action buttons                                       |
| `promotedBulkActions`       | `BulkActionsProps['promotedActions']`                  | No       | -                | Promoted bulk actions                                     |
| `condensed`                 | `boolean`                                              | No       | `false`          | Use condensed table layout                                |
| `showBorder`                | `boolean`                                              | No       | `true`           | Show card border                                          |
| `showFilter`                | `boolean`                                              | No       | `true`           | Show filter UI                                            |
| `showPagination`            | `boolean`                                              | No       | `true`           | Show pagination controls                                  |
| `emptyState`                | `ReactNode`                                            | No       | -                | Custom empty state component                              |
| `fetchFn` / `fetchFunction` | `(url, options?) => Promise<Response>`                 | No       | `defaultFetch`   | Custom fetch function                                     |
| `syncWithUrl`               | `boolean`                                              | No       | `true`           | Sync state with URL params                                |
| `queryPlaceholder`          | `string`                                               | No       | `'Filter items'` | Search input placeholder                                  |
| `renderFilterLabel`         | `(key, value) => string`                               | No       | -                | Custom filter label renderer                              |
| `resourceName`              | `{ singular: string; plural: string }`                 | No       | -                | Resource names for bulk actions                           |
| `t`                         | `(key, options?) => string`                            | No       | `defaultT`       | Translation function                                      |
| `onDataChange`              | `(data: ListTableData) => void`                        | No       | -                | Callback when data changes                                |
| `setListTableData`          | `Dispatch<SetStateAction<ListTableData>>`              | No       | -                | State setter for data                                     |
| `error`                     | `Error`                                                | No       | -                | Error to display                                          |
| `loadingComponent`          | `ReactNode`                                            | No       | -                | Custom loading component                                  |
| `abbreviated`               | `string`                                               | No       | -                | Abbreviated response format                               |

#### ListTableView Type

```typescript
type ListTableView = {
  _id?: string;
  name: string;
  filters: {
    queryValue?: string;
    [key: string]: any;
  };
  allowActions?: VIEW_ACTIONS[]; // ['createView', 'updateView', 'deleteView', 'renameView', 'duplicateView']
};
```

#### ListTableFilter Type

```typescript
type ListTableFilter = {
  key: string;
  label: string;
  shortcut: boolean; // Show in shortcut bar
  filter:
    | {
        Component: React.ComponentType<any>;
        props: any;
      }
    | ReactNode;
};
```

### useDataSource Hook

#### Options

```typescript
interface UseDataSourceOptions<T> {
  endpoint: string;
  queryKey: string;
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  defaultLimit?: number;
  defaultViews?: ViewDefinition[];
  syncWithUrl?: boolean;
  localData?: T[];
  abbreviated?: boolean;
  transformResponse?: (response: unknown) => QueryResult<T>;
  fetchFn?: (url: string, options?: RequestInit) => Promise<unknown>;
  debounceMs?: number;
}
```

#### Return Value

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
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: Record<string, any>) => void;
  clearFilters: () => void;
  setSort: (sort: SortDefinition | null) => void;
  setSelectedView: (index: number) => void;
  setViewSelected: (viewNameOrId: string | null) => void;
  refresh: () => void;

  // Polaris helpers
  tabs: IndexFiltersProps['tabs'];
  sortOptions: IndexFiltersProps['sortOptions'];
  sortSelected: string[];
  onSort: (selected: string[]) => void;

  // Pagination helpers
  pagination: {
    page: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    goToPage: (page: number) => void;
    label: string;
  };
}
```

### Server Utilities

#### serverGetViews

```typescript
function serverGetViews(
  path: string,
  ViewModel: Model<IView>,
  ownerId?: string,
  select?: (keyof IView)[]
): Promise<IView[]>;
```

#### serverCreateView

```typescript
function serverCreateView(
  path: string,
  name: string,
  filters: Record<string, any>,
  ViewModel: Model<IView>,
  ownerId?: string
): Promise<void>;
```

#### serverUpdateView

```typescript
function serverUpdateView(
  path: string,
  name: string,
  filters: Record<string, any>,
  ViewModel: Model<IView>,
  ownerId?: string
): Promise<void>;
```

#### serverDeleteView

```typescript
function serverDeleteView(
  path: string,
  name: string,
  ViewModel: Model<IView>,
  ownerId?: string
): Promise<void>;
```

#### serverRenameView

```typescript
function serverRenameView(
  path: string,
  oldName: string,
  newName: string,
  ViewModel: Model<IView>,
  ownerId?: string
): Promise<void>;
```

## Advanced Usage

### Custom View Models

Create a custom Mongoose model with additional fields:

```tsx
import { createViewModel } from '@peakify/polaris-data-table-views/server';
import { Schema } from 'mongoose';

const CustomViewModel = createViewModel({
  modelName: 'CustomView',
  collectionName: 'custom_views',
  schemaOptions: {
    description: { type: String },
    isPublic: { type: Boolean, default: false },
    tags: [{ type: String }],
    metadata: { type: Schema.Types.Mixed },
  },
  additionalIndexes: [{ fields: { isPublic: 1 } }, { fields: { tags: 1 } }],
});

// Use in your API routes
const views = await serverGetViews('/admin/products', CustomViewModel, userId);
```

### URL Synchronization

The library automatically syncs state with URL parameters:

- `?page=2` - Current page
- `?sort=name|asc` - Sort field and direction
- `?query=search+term` - Search query
- `?filter_status=active` - Custom filter values
- `?viewSelected=My+View` - Selected view name/ID

To disable URL sync:

```tsx
<ListTable
  syncWithUrl={false}
  // ... other props
/>
```

### Transform Response

Transform API responses to match expected format:

```tsx
<ListTable
  endpoint="/api/products"
  queryKey="name"
  transformResponse={(response) => {
    // Transform from { data: [...], count: 100 } to { items: [...], total: 100 }
    return {
      items: response.data || [],
      total: response.count || 0,
    };
  }}
  headings={[...]}
  renderRowMarkup={...}
/>
```

### Error Handling

Display custom error messages:

```tsx
const [error, setError] = useState<Error | null>(null);

<ListTable
  endpoint="/api/products"
  queryKey="name"
  error={error}
  headings={[...]}
  renderRowMarkup={...}
/>
```

Or handle errors in custom fetch:

```tsx
const customFetch = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
```

## Exports

### Client-Side Exports

```tsx
// Main component
import { ListTable } from '@peakify/polaris-data-table-views';

// Hooks
import { useDataSource, useSelection, usePagination } from '@peakify/polaris-data-table-views';

// Types
import type {
  ListTableProps,
  ListTableData,
  ListTableView,
  ListTableFilter,
} from '@peakify/polaris-data-table-views/types';

// Constants
import { VIEW_ACTIONS } from '@peakify/polaris-data-table-views/types';
import { TABLE_ITEM_LIST_LIMITATION } from '@peakify/polaris-data-table-views/constants';

// Utils
import { defaultFetch, defaultT } from '@peakify/polaris-data-table-views';
```

### Server-Side Exports

```tsx
// Models
import { ViewModel } from '@peakify/polaris-data-table-views/server';
import {
  createViewModel,
  baseViewSchemaDefinition,
  createBaseViewIndexes,
} from '@peakify/polaris-data-table-views/server';

// Server utilities
import {
  serverGetViews,
  serverCreateView,
  serverUpdateView,
  serverDeleteView,
  serverRenameView,
} from '@peakify/polaris-data-table-views/server';
```

## TypeScript Support

Full TypeScript support is included. All types are exported and can be imported:

```tsx
import type {
  ListTableProps,
  UseDataSourceOptions,
  UseDataSourceReturn,
  QueryState,
  SortDefinition,
  ViewDefinition,
} from '@peakify/polaris-data-table-views';
```

## Best Practices

1. **Always provide `queryKey`**: Required for text search functionality
2. **Use `viewsEndpoint` for persistent views**: Enables save/load functionality
3. **Implement proper error handling**: Use `error` prop or custom `fetchFn`
4. **Optimize with `abbreviated`**: For large datasets, request only needed fields
5. **Use `onlyLocalData` for small datasets**: Avoids unnecessary API calls
6. **Customize `renderFilterLabel`**: Provides better UX for applied filters
7. **Set `defaultSort`**: Improves initial load performance
8. **Use `syncWithUrl={false}`**: Only if you don't need bookmarkable URLs

## License

MIT
