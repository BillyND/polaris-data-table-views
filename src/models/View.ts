/**
 * SERVER-SIDE MONGOOSE MODEL FOR VIEW MANAGEMENT
 *
 * ⚠️ IMPORTANT: This is a SERVER-SIDE Mongoose model that should only be used
 * in Node.js backend code (API routes, Express handlers, Next.js API routes, etc.).
 *
 * DO NOT import this model in client-side React components or browser code.
 *
 * This model defines the database schema for storing saved table views (filters, sorting, etc.)
 * that users can create, update, and delete.
 *
 * Usage:
 * ```typescript
 * // ✅ Server-side only (API route, Express handler, etc.)
 * import { ViewModel } from '@peakify/polaris-data-table-views/models/View';
 *
 * // In your server-side code
 * const views = await ViewModel.find({ path: '/admin/users' });
 * ```
 *
 * For custom models, use the factory function:
 * ```typescript
 * import { createViewModel } from '@peakify/polaris-data-table-views/models/createViewModel';
 *
 * const CustomViewModel = createViewModel({
 *   modelName: 'CustomView',
 *   schemaOptions: { customField: { type: String } }
 * });
 * ```
 *
 * Schema Fields:
 * - path: The URL path where the view is used (e.g., '/admin/users')
 * - name: The name of the saved view
 * - filters: Object containing filter values (queryValue, custom filters, etc.)
 * - ownerId: Optional user ID for user-specific views (null for shared views)
 * - createdAt: Auto-generated timestamp
 * - updatedAt: Auto-generated timestamp
 */

import mongoose, { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Interface for the View document in MongoDB
 * This extends Mongoose Document and includes all view-related fields
 */
export interface IView extends Document {
  _id: Types.ObjectId;
  path: string;
  name: string;
  filters: Record<string, any>;
  ownerId?: string; // Optional: if provided, only owner can view/edit/delete. If not, views are shared.
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema definition for the View collection
 * This schema is optimized with proper indexes for efficient queries
 */
const ViewSchema = new Schema<IView>(
  {
    path: { type: String, required: true, index: true },
    name: { type: String, required: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    ownerId: { type: String, required: false, index: true },
  },
  {
    timestamps: true,
  }
);

// Compound index for path + ownerId - optimized for getViews queries
ViewSchema.index({ path: 1, ownerId: 1 });

// Create compound index for path, name, and ownerId (if provided)
// This allows same path+name for different owners, but unique for same owner
ViewSchema.index({ path: 1, name: 1, ownerId: 1 }, { unique: true, sparse: true });
// Also keep the original index for backward compatibility (shared views without ownerId)
ViewSchema.index(
  { path: 1, name: 1 },
  { unique: true, partialFilterExpression: { ownerId: { $exists: false } } }
);

/**
 * SERVER-SIDE: Mongoose model for the View collection
 *
 * Use this model in your server-side code to interact with saved views in the database.
 *
 * @example
 * ```typescript
 * // In your server-side API route
 * import { ViewModel } from '@peakify/polaris-data-table-views/models/View';
 *
 * const views = await ViewModel.find({ path: '/admin/users' });
 * ```
 */
// Safe access to mongoose.models - handles both ESM and CJS imports
// In ESM, mongoose might be wrapped in default, so we check both
const getMongooseModels = () => {
  try {
    // Handle direct mongoose.models (CJS or ESM direct)
    if (mongoose && typeof mongoose === 'object') {
      // Check direct models property first
      if ('models' in mongoose && mongoose.models && typeof mongoose.models === 'object') {
        return mongoose.models;
      }
      // Handle ESM default export - mongoose might be { default: { models: {...} } }
      // But also handle case where mongoose itself is the default export
      const mongooseInstance =
        'default' in mongoose && mongoose.default ? mongoose.default : mongoose;
      if (mongooseInstance && typeof mongooseInstance === 'object') {
        if (
          'models' in mongooseInstance &&
          mongooseInstance.models &&
          typeof mongooseInstance.models === 'object'
        ) {
          return mongooseInstance.models;
        }
      }
    }
  } catch (e) {
    // Silently fail if mongoose is not available (e.g., in browser)
  }
  return null;
};

const mongooseModels = getMongooseModels();
// Fallback to creating new model if models registry is not available
export const ViewModel = mongooseModels?.View || model<IView>('View', ViewSchema);

// Re-export factory function and utilities for customization
export {
  createViewModel,
  baseViewSchemaDefinition,
  createBaseViewIndexes,
} from './createViewModel';
export type { CreateViewModelOptions } from './createViewModel';
