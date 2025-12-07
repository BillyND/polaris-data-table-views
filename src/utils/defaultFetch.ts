/**
 * Default fetch function that uses the browser's native fetch API
 */
export const defaultFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
};
