import { useCallback, useMemo } from 'react';

export interface UsePaginationOptions {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface UsePaginationReturn {
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  goToPage: (page: number) => void;
  label: string;
}

/**
 * Hook for managing pagination state and actions
 */
export function usePagination({
  page,
  limit,
  total,
  onPageChange,
}: UsePaginationOptions): UsePaginationReturn {
  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  const hasPrevious = useMemo(() => page > 1, [page]);
  const hasNext = useMemo(() => page < totalPages, [page, totalPages]);

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
      if (newPage >= 1 && newPage <= totalPages) {
        onPageChange(newPage);
      }
    },
    [totalPages, onPageChange]
  );

  const label = useMemo(() => {
    if (total === 0) return '';
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

