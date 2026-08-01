import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import React, { createContext, useContext } from "react";
import { queryClient as defaultQueryClient } from "./queryClient";

/**
 * Shared configuration for the table package.
 *
 * The consumer application owns the HTTP layer: it passes its own configured
 * Axios instance (baseURL, auth, interceptors) so that all network requests
 * originate from the consumer's own client instead of a client hardcoded
 * inside this package. This is what avoids cross-origin (CORS) requests to a
 * backend the consumer does not control.
 */
export interface TableConfig {
  /** A configured Axios instance used for all internal package requests. */
  apiClient: AxiosInstance;
  /**
   * Optional React Query client. The package's internal queries (e.g. the
   * ProSelect infinite dropdown) require a QueryClientProvider ancestor; the
   * provider supplies one automatically. Pass your own client here only if you
   * already use React Query and want the table to share your cache. When
   * omitted, the package's singleton client is used.
   */
  queryClient?: QueryClient;
  /**
   * Maps the package's internal pagination concepts to your API's query-param
   * names, for the DYNAMIC (apiToCall) select/multiselect dropdowns. Different
   * backends spell these differently (e.g. `pageSize` vs `limit`). Any key you
   * omit falls back to the default shown below, so existing consumers need no
   * changes.
   */
  selectParams?: {
    /** Param carrying the 1-based page number. Default: "page". */
    pageKey?: string;
    /** Param carrying the page size. Default: "pageSize". */
    pageSizeKey?: string;
    /** Param carrying the search text. Default: "search". */
    searchKey?: string;
    /** Param carrying the serialized extra filters. Default: "filters". */
    filtersKey?: string;
  };
}

/** Default query-param names used when {@link TableConfig.selectParams} omits a key. */
export const DEFAULT_SELECT_PARAMS = {
  pageKey: "page",
  pageSizeKey: "pageSize",
  searchKey: "search",
  filtersKey: "filters",
} as const;

const TableConfigContext = createContext<TableConfig | null>(null);

export const TableConfigProvider: React.FC<{
  config: TableConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const client = config.queryClient ?? defaultQueryClient;
  return (
    <TableConfigContext.Provider value={config}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TableConfigContext.Provider>
  );
};

/**
 * Access the shared table configuration.
 *
 * @throws if used outside a {@link TableConfigProvider}. The provider is
 * required — there is no default client — so that a missing configuration
 * fails loudly instead of silently calling a hardcoded backend.
 */
export const useTableConfig = (): TableConfig => {
  const config = useContext(TableConfigContext);
  if (!config) {
    throw new Error(
      "useTableConfig must be used within a <TableConfigProvider>. " +
        "Wrap your app (or table) with <TableConfigProvider config={{ apiClient }}> " +
        "and pass your own Axios instance.",
    );
  }
  return config;
};

/**
 * Access the shared table configuration WITHOUT throwing when no provider is
 * present. Returns `null` outside a {@link TableConfigProvider}. Use this for
 * features that can work without an apiClient (e.g. toolbar actions whose
 * handlers may not need one), so they don't force consumers to add a provider.
 */
export const useTableConfigSafe = (): TableConfig | null =>
  useContext(TableConfigContext);
