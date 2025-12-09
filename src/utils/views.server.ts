/**
 * SERVER-SIDE UTILITIES FOR VIEW MANAGEMENT
 *
 * ⚠️ IMPORTANT: These functions are designed to run on the SERVER SIDE only.
 * They require direct access to MongoDB via Mongoose and should NOT be imported
 * in client-side code (React components, browser bundles, etc.).
 *
 * Usage: Import these functions in your server-side API routes, Express handlers,
 * Next.js API routes, or other Node.js backend code.
 *
 * Example:
 * ```typescript
 * // ✅ Server-side (API route, Express handler, etc.)
 * import { serverGetViews, serverCreateView } from '@peakify/polaris-data-table-views/server/views';
 * import { ViewModel } from '@peakify/polaris-data-table-views/models/View';
 *
 * app.get('/api/views', async (req, res) => {
 *   const views = await serverGetViews('/admin/users', ViewModel, req.user.id);
 *   res.json({ items: views });
 * });
 * ```
 */

import type { Model } from 'mongoose';
import type { IView } from '../models/View';

/**
 * SERVER-SIDE: Get views for a specific path
 *
 * This function queries the database to retrieve saved views for a given path.
 * It should only be called from server-side code (API routes, server handlers).
 *
 * @param path - The path to filter views by (e.g., '/admin/users')
 * @param ViewModel - The Mongoose model instance (from '../models/View')
 * @param ownerId - Optional owner ID. If provided, only returns views owned by this ID or shared views (without ownerId)
 * @returns Promise resolving to an array of view objects with name and filters
 *
 * @example
 * ```typescript
 * // In your server-side API route
 * const views = await serverGetViews('/admin/users', ViewModel, req.user.id);
 * ```
 */
export async function serverGetViews(
  path: string,
  ViewModel: Model<IView>,
  ownerId?: string,
  select: (keyof IView)[] = ['_id', 'path', 'name', 'filters', 'ownerId', 'createdAt', 'updatedAt']
): Promise<IView[]> {
  // Compose query: filter by path and, if provided, ownerId/shared
  const query: any = { path };

  if (ownerId) {
    query.ownerId = { $in: [ownerId, null] };
  }

  // Use 'any' for better type compatibility with .lean() output
  let viewsQuery: any = ViewModel.find(query).lean();

  if (select && Array.isArray(select) && select.length) {
    viewsQuery = viewsQuery.select(select.join(' '));
  }

  // Await and return the result as type IView[]
  const views = await viewsQuery.exec();
  return views;
}

/**
 * SERVER-SIDE: Create a new view
 *
 * This function creates a new saved view in the database.
 * It should only be called from server-side code (API routes, server handlers).
 *
 * @param path - The path for the view (e.g., '/admin/users')
 * @param name - The name of the view
 * @param filters - The filters object to save with the view
 * @param ViewModel - The Mongoose model instance (from '../models/View')
 * @param ownerId - Optional owner ID. If provided, the view will be owned by this ID
 * @returns Promise that resolves when the view is created
 *
 * @example
 * ```typescript
 * // In your server-side API route
 * await serverCreateView('/admin/users', 'Active Users', { status: 'active' }, ViewModel, req.user.id);
 * ```
 */
export async function serverCreateView(
  path: string,
  name: string,
  filters: Record<string, any>,
  ViewModel: Model<IView>,
  ownerId?: string
): Promise<void> {
  // Use insertOne for better performance when creating single document
  const doc: any = { path, name, filters };
  if (ownerId) {
    doc.ownerId = ownerId;
  } else {
    doc.ownerId = null; // Explicitly set null for shared views
  }
  await ViewModel.create(doc);
}

/**
 * SERVER-SIDE: Update an existing view
 *
 * This function updates the filters of an existing saved view in the database.
 * It should only be called from server-side code (API routes, server handlers).
 *
 * @param path - The path for the view (e.g., '/admin/users')
 * @param name - The name of the view to update
 * @param filters - The new filters object to save
 * @param ViewModel - The Mongoose model instance (from '../models/View')
 * @param ownerId - Optional owner ID. If provided, only updates if the view belongs to this owner or is shared (no ownerId)
 * @returns Promise that resolves when the view is updated
 *
 * @example
 * ```typescript
 * // In your server-side API route
 * await serverUpdateView('/admin/users', 'Active Users', { status: 'inactive' }, ViewModel, req.user.id);
 * ```
 */
export async function serverUpdateView(
  path: string,
  name: string,
  filters: Record<string, any>,
  ViewModel: Model<IView>,
  ownerId?: string
): Promise<void> {
  // Optimized query: use $in instead of $or with $exists
  const query: any = { path, name };
  if (ownerId) {
    query.ownerId = { $in: [ownerId, null] };
  } else {
    query.ownerId = null;
  }

  // Use updateOne with $set for better performance
  await ViewModel.updateOne(query, { $set: { filters } });
}

/**
 * SERVER-SIDE: Delete a view
 *
 * This function deletes a saved view from the database.
 * It should only be called from server-side code (API routes, server handlers).
 *
 * @param path - The path for the view (e.g., '/admin/users')
 * @param name - The name of the view to delete
 * @param ViewModel - The Mongoose model instance (from '../models/View')
 * @param ownerId - Optional owner ID. If provided, only deletes if the view belongs to this owner or is shared (no ownerId)
 * @returns Promise that resolves when the view is deleted
 *
 * @example
 * ```typescript
 * // In your server-side API route
 * await serverDeleteView('/admin/users', 'Active Users', ViewModel, req.user.id);
 * ```
 */
export async function serverDeleteView(
  path: string,
  name: string,
  ViewModel: Model<IView>,
  ownerId?: string
): Promise<void> {
  // Optimized query: use $in instead of $or with $exists
  const query: any = { path, name };
  if (ownerId) {
    query.ownerId = { $in: [ownerId, null] };
  } else {
    query.ownerId = null;
  }

  await ViewModel.deleteOne(query);
}

/**
 * SERVER-SIDE: Rename a view
 *
 * This function renames an existing saved view in the database.
 * It should only be called from server-side code (API routes, server handlers).
 *
 * @param path - The path for the view (e.g., '/admin/users')
 * @param oldName - The current name of the view
 * @param newName - The new name for the view
 * @param ViewModel - The Mongoose model instance (from '../models/View')
 * @param ownerId - Optional owner ID. If provided, only renames if the view belongs to this owner or is shared (no ownerId)
 * @returns Promise that resolves when the view is renamed
 *
 * @example
 * ```typescript
 * // In your server-side API route
 * await serverRenameView('/admin/users', 'Old Name', 'New Name', ViewModel, req.user.id);
 * ```
 */
export async function serverRenameView(
  path: string,
  oldName: string,
  newName: string,
  ViewModel: Model<IView>,
  ownerId?: string
): Promise<void> {
  // Optimized query: use $in instead of $or with $exists
  const query: any = { path, name: oldName };
  if (ownerId) {
    query.ownerId = { $in: [ownerId, null] };
  } else {
    query.ownerId = null;
  }

  // Use $set for better performance
  await ViewModel.updateOne(query, { $set: { name: newName } });
}
