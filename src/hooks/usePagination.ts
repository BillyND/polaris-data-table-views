import { useCallback, useMemo } from "react";

export interface UsePaginationOptions {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface UsePaginationReturn {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a previous page */
  hasPrevious: boolean;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Go to previous page */
  onPrevious: () => void;
  /** Go to next page */
  onNext: () => void;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Pagination label (e.g., "1-20 of 100") */
  label: string;
}

/**
 * Hook for managing pagination state
 *
 * @example
 * ```tsx
 * const { hasPrevious, hasNext, onPrevious, onNext, label } = usePagination({
 *   page: state.page,
 *   limit: 20,
 *   total: 100,
 *   onPageChange: setPage,
 * });
 *
 * <Pagination
 *   hasPrevious={hasPrevious}
 *   hasNext={hasNext}
 *   onPrevious={onPrevious}
 *   onNext={onNext}
 *   label={label}
 * />
 * ```
 */
export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
  const { page, limit, total, onPageChange } = options;

  const totalPages = useMemo(
    () => Math.ceil(total / limit) || 1,
    [total, limit]
  );

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const onPrevious = useCallback(() => {
    if (hasPrevious) {
      onPageChange(page - 1);
    }
  }, [hasPrevious, page, onPageChange]);

  const onNext = useCallback(() => {
    if (hasNext) {
      onPageChange(page + 1);
    }
  }, [hasNext, page, onPageChange]);

  const goToPage = useCallback(
    (newPage: number) => {
      const clampedPage = Math.max(1, Math.min(newPage, totalPages));
      onPageChange(clampedPage);
    },
    [totalPages, onPageChange]
  );

  const label = useMemo(() => {
    if (total === 0) return "0 results";

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return `${start}-${end} of ${total}`;
  }, [page, limit, total]);

  return {
    page,
    totalPages,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    goToPage,
    label,
  };
}

