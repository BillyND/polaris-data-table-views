/**
 * Default translation function
 */
export const defaultT = (key: string, options?: any): string => {
  // Simple interpolation for common patterns
  if (options && typeof options === 'object') {
    let result = key;
    Object.entries(options).forEach(([k, v]) => {
      result = result.replace(`{${k}}`, String(v));
    });
    return result;
  }
  return key;
};
