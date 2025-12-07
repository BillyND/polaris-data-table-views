/**
 * Remove empty or undefined values from filter object
 */
export function cleanFilters(filters: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        cleaned[key] = value;
      } else if (typeof value === 'string' && value.trim()) {
        cleaned[key] = value;
      } else if (typeof value !== 'string') {
        cleaned[key] = value;
      }
    }
  });

  return cleaned;
}

/**
 * Merge multiple filter objects
 */
export function mergeFilters(...filters: Record<string, any>[]): Record<string, any> {
  return filters.reduce((merged, filter) => {
    return { ...merged, ...filter };
  }, {});
}

