declare module "@tanstack/react-query" {
  import type { ReactNode } from "react";

  export type QueryKey = readonly unknown[];

  export type UseQueryOptions<TData> = {
    queryKey: QueryKey;
    enabled?: boolean;
    queryFn: () => Promise<TData>;
    staleTime?: number;
  };

  export type UseQueryResult<TData> = {
    data: TData | undefined;
    isLoading: boolean;
    error: unknown;
  };

  export function useQuery<TData>(
    options: UseQueryOptions<TData>
  ): UseQueryResult<TData>;

  export class QueryClient {
    constructor(config?: {
      defaultOptions?: {
        queries?: {
          refetchOnWindowFocus?: boolean;
        };
      };
    });

    setQueryData<TData>(
      queryKey: QueryKey,
      updater: TData | ((oldData: TData | undefined) => TData)
    ): void;

    removeQueries(filters: { queryKey: QueryKey }): void;
  }

  export function useQueryClient(): QueryClient;

  export function QueryClientProvider(props: {
    client: QueryClient;
    children: ReactNode;
  }): ReactNode;
}
