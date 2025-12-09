/**
 * FACTORY FUNCTION FOR CREATING CUSTOM VIEW MODELS
 *
 * This allows you to create a custom Mongoose model for views with:
 * - Custom model name
 * - Custom collection name
 * - Additional schema fields
 * - Custom indexes
 *
 * @example
 * ```typescript
 * import { createViewModel } from '@peakify/polaris-data-table-views/models/createViewModel';
 * import { Schema } from 'mongoose';
 *
 * // Create custom model with additional fields
 * const CustomViewModel = createViewModel({
 *   modelName: 'CustomView',
 *   collectionName: 'custom_views',
 *   schemaOptions: {
 *     // Add custom fields
 *     customField: { type: String },
 *     metadata: { type: Schema.Types.Mixed }
 *   }
 * });
 * ```
 */

import mongoose, { Schema, model, type Model, type Document, type Types } from 'mongoose';
import type { IView } from './View';

/**
 * Mongoose schema field definition
 * Supports all Mongoose schema types and options
 * This is a flexible type that accepts any valid Mongoose schema field definition
 */
export type SchemaFieldDefinition = Record<string, any>;

/**
 * Options for creating a custom View model
 */
export interface CreateViewModelOptions {
  /**
   * Custom model name (default: 'View')
   */
  modelName?: string;
  /**
   * Custom collection name (default: undefined, uses modelName)
   */
  collectionName?: string;
  /**
   * Additional schema fields to add to the base schema
   * You can add as many custom fields as needed
   *
   * @example
   * ```typescript
   * schemaOptions: {
   *   customField1: { type: String },
   *   customField2: { type: Number },
   *   tags: [{ type: String }],
   *   metadata: { type: Schema.Types.Mixed },
   *   userId: { type: Schema.Types.ObjectId, ref: 'User' },
   *   isActive: { type: Boolean, default: true },
   *   // ... add as many fields as you need
   * }
   * ```
   */
  schemaOptions?: Record<string, SchemaFieldDefinition | any>;
  /**
   * Custom schema options (timestamps, etc.)
   */
  mongooseSchemaOptions?: {
    timestamps?: boolean;
    [key: string]: any;
  };
  /**
   * Additional indexes to add
   * You can add multiple indexes for your custom fields
   *
   * @example
   * ```typescript
   * additionalIndexes: [
   *   { fields: { customField1: 1 }, options: { sparse: true } },
   *   { fields: { tags: 1 }, options: {} },
   *   { fields: { userId: 1, isActive: 1 }, options: {} },
   * ]
   * ```
   */
  additionalIndexes?: Array<{
    fields: Record<string, 1 | -1>;
    options?: any;
  }>;
}

/**
 * Base View schema definition
 * You can use this to extend your own schema
 */
export const baseViewSchemaDefinition = {
  path: { type: String, required: true, index: true },
  name: { type: String, required: true },
  filters: { type: Schema.Types.Mixed, default: {} },
  ownerId: { type: String, required: false, index: true },
} as const;

/**
 * Create base indexes for View schema
 */
export function createBaseViewIndexes(schema: Schema) {
  // Compound index for path + ownerId
  schema.index({ path: 1, ownerId: 1 });

  // Compound index for path, name, and ownerId (unique per owner)
  schema.index({ path: 1, name: 1, ownerId: 1 }, { unique: true, sparse: true });

  // Index for shared views (no ownerId)
  schema.index(
    { path: 1, name: 1 },
    { unique: true, partialFilterExpression: { ownerId: { $exists: false } } }
  );
}

/**
 * Factory function to create a custom View model
 *
 * @param options - Configuration options for the custom model
 * @returns Mongoose Model instance
 *
 * @example
 * ```typescript
 * import { createViewModel } from '@peakify/polaris-data-table-views/server';
 * import { Schema } from 'mongoose';
 *
 * // Basic usage with default settings
 * const ViewModel = createViewModel();
 *
 * // Custom model name and collection
 * const CustomViewModel = createViewModel({
 *   modelName: 'CustomView',
 *   collectionName: 'custom_views'
 * });
 *
 * // With multiple custom fields
 * const ExtendedViewModel = createViewModel({
 *   modelName: 'ExtendedView',
 *   schemaOptions: {
 *     // String fields
 *     description: { type: String },
 *     category: { type: String, index: true },
 *
 *     // Number fields
 *     priority: { type: Number, default: 0 },
 *     viewCount: { type: Number, default: 0 },
 *
 *     // Boolean fields
 *     isPublic: { type: Boolean, default: false },
 *     isFavorite: { type: Boolean, default: false },
 *
 *     // Array fields
 *     tags: [{ type: String }],
 *     permissions: [{ type: String }],
 *
 *     // Object/Mixed fields
 *     metadata: { type: Schema.Types.Mixed, default: {} },
 *     settings: { type: Schema.Types.Mixed },
 *
 *     // Reference fields
 *     createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
 *     teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
 *
 *     // Date fields
 *     lastAccessed: { type: Date },
 *     expiresAt: { type: Date, index: true },
 *
 *     // Add as many fields as you need!
 *   },
 *   additionalIndexes: [
 *     { fields: { category: 1, isPublic: 1 } },
 *     { fields: { tags: 1 } },
 *     { fields: { createdBy: 1, priority: -1 } },
 *   ]
 * });
 * ```
 */
export function createViewModel<T extends IView = IView>(
  options: CreateViewModelOptions = {}
): Model<T> {
  const {
    modelName = 'View',
    collectionName,
    schemaOptions = {},
    mongooseSchemaOptions = { timestamps: true },
    additionalIndexes = [],
  } = options;

  // Merge base schema with custom fields
  const schemaDefinition = {
    ...baseViewSchemaDefinition,
    ...schemaOptions,
  };

  // Create schema
  const ViewSchema = new Schema<T>(schemaDefinition, {
    ...mongooseSchemaOptions,
    ...(collectionName && { collection: collectionName }),
  });

  // Add base indexes
  createBaseViewIndexes(ViewSchema);

  // Add custom indexes
  additionalIndexes.forEach(({ fields, options: indexOptions = {} }) => {
    ViewSchema.index(fields, indexOptions);
  });

  // Safe access to mongoose.models
  const getMongooseModels = () => {
    try {
      if (mongoose && typeof mongoose === 'object') {
        if ('models' in mongoose && mongoose.models && typeof mongoose.models === 'object') {
          return mongoose.models;
        }
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
      // Silently fail if mongoose is not available
    }
    return null;
  };

  const mongooseModels = getMongooseModels();
  // Return existing model if it exists, otherwise create new one
  return (mongooseModels?.[modelName] as Model<T>) || model<T>(modelName, ViewSchema);
}
