'use client';

import { useMemo, useState } from 'react';

interface UsePaginationOptions<T> {
  data: T[];
  pageSize?: number;
  initialPage?: number;
}

export const usePagination = <T,>({ data, pageSize = 5, initialPage = 1 }: UsePaginationOptions<T>) => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(data.length / pageSize));
  }, [data.length, pageSize]);

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, currentPage, pageSize]);

  const goToPage = (page: number) => {
    setCurrentPage((prev) => {
      if (page < 1) return 1;
      if (page > totalPages) return totalPages;
      return page;
    });
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  return {
    currentPage,
    setCurrentPage: goToPage,
    totalPages,
    pageSize,
    currentItems,
    goToNextPage,
    goToPreviousPage,
  };
};
