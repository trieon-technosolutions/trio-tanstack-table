/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-comments/disallowComments */
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { debounce } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SELECT_PARAMS,
  useTableConfig,
} from "~/lib/TableConfigProvider";
import { sanitizeFilters } from "~/utils";

/**
 * Props for the useInfiniteSelectOptions hook.
 *
 * @example
 * ```tsx
 * const { options, loading, onSearch, onClear, onPopupScroll, onDropdownVisibleChange } =
 *   useInfiniteSelectOptions({
 *     endpoint: "/api/users",
 *     queryKey: "users-select",
 *   })
 *
 * <Select
 *   showSearch
 *   allowClear
 *   filterOption={false}  // IMPORTANT: Must be false for server-side search
 *   options={options}
 *   loading={loading}
 *   onSearch={onSearch}
 *   onClear={onClear}
 *   onPopupScroll={onPopupScroll}
 *   onDropdownVisibleChange={onDropdownVisibleChange}
 * />
 * ```
 */
interface UseInfiniteSelectOptionsProps {
  /** API endpoint to fetch options from (e.g., "/api/users") */
  endpoint: string;
  /** Unique query key for TanStack Query caching */
  queryKey: string;
  /** Key to extract data from response (default: "data") */
  dataKey?: "data" | "rows";
  /** Number of items per page (default: 10) */
  limit?: number;
  /** Whether to enable query only when dropdown opens (default behavior) */
  enabledOnOpen?: boolean;
  defaultExtraOptions?: Record<string, any>;
  /** Fetch immediately on mount (for autoSelectIfSingle) */
  fetchOnMount?: boolean;
}

/**
 * A hook for fetching paginated Select options with infinite scroll and debounced search.
 *
 * Features:
 * - Infinite scroll pagination
 * - Debounced server-side search (400ms)
 * - Lazy loading (fetches only when dropdown opens)
 * - TanStack Query for caching and state management
 * - Ant Design Select compatible
 *
 * @remarks
 * - NO Redux imports
 * - NO manual pagination state
 * - NO API calls on initial render
 * - Debounce is stable (not recreated per render)
 * - Use filterOption={false} on Select for server-side search
 */

// todo :  invalidate the query after apiToCall is changed

export const useInfiniteSelectOptions = ({
  endpoint,
  queryKey,
  dataKey = "data",
  limit = 10,
  defaultExtraOptions,
  fetchOnMount = false,
}: UseInfiniteSelectOptionsProps) => {
  const queryClient = useQueryClient();
  const { apiClient, selectParams } = useTableConfig();
  const {
    pageKey = DEFAULT_SELECT_PARAMS.pageKey,
    pageSizeKey = DEFAULT_SELECT_PARAMS.pageSizeKey,
    searchKey = DEFAULT_SELECT_PARAMS.searchKey,
    filtersKey = DEFAULT_SELECT_PARAMS.filtersKey,
  } = selectParams ?? {};

  // Minimal internal state
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Internal API function - single source of truth for API calls.
   * Defined inside the hook to access closure variables.
   */

  const sanitizedFilters = sanitizeFilters(defaultExtraOptions ?? ({} as any));
  const fetchOptions = async ({ pageParam = 1 }: { pageParam?: number }) => {
    const response = await apiClient({
      method: "get",
      url: endpoint,
      params: {
        [pageKey]: pageParam,
        [pageSizeKey]: limit,
        [searchKey]: searchText,
        ...(Object.keys(sanitizedFilters).length > 0 && {
          [filtersKey]: JSON.stringify(sanitizedFilters),
        }),
      },
    });
    return response.data;
  };

  // TanStack Query infinite query
  const query = useInfiniteQuery({
    queryKey: [queryKey, searchText, defaultExtraOptions],
    queryFn: fetchOptions,
    enabled: (isOpen || fetchOnMount) && !!endpoint,
    getNextPageParam: (lastPage, pages) => {
      const data = lastPage[dataKey];
      return data?.length === limit ? pages.length + 1 : undefined;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes — cache is cleared on dropdown close anyway
    initialPageParam: 1,
  });

  // Flatten pages into Select options - derived state, never stored
  const options = useMemo(
    () => query.data?.pages.flatMap((p) => p[dataKey]) ?? [],
    [query.data, dataKey],
  );

  const onPopupScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      // Use >= for better UX (triggers slightly before reaching absolute bottom)
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 8) {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      }
    },
    [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage],
  );

  useEffect(() => {
    if (query.isError) {
      const error: any = query.error;
      message.error(
        error?.response?.data?.message || "Failed to fetch options",
      );
    }
  }, [query.isError, query.error]);

  const onSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchText(value || undefined);
      }, 400),
    [],
  );

  const onClear = useCallback(() => {
    setSearchText(undefined);
  }, []);

  const onDropdownVisibleChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // note Reset search text so stale search results don't persist on reopen
        setSearchText(undefined);
        // note Remove all cached pages so next open starts fresh from page 1
        // This prevents TanStack Query from refetching all previously scrolled pages
        queryClient.removeQueries({ queryKey: [queryKey] });
      }
      setIsOpen(open);
    },
    [queryClient, queryKey],
  );

  return {
    options,
    onPopupScroll,
    onSearch,
    onClear,
    onDropdownVisibleChange,
    loading: query.isLoading || query.isFetchingNextPage,
  };
};
