import { type TypedDocumentNode } from "@graphql-typed-document-node/core";
import {
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { print } from "graphql";
import { getKey } from "./utils/helpers/clientUtils";

export const useGqlQuery = <
  TData = any,
  TVariables = unknown,
  TError = unknown,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: Omit<UseQueryOptions<TData, TError, TData>, "queryKey">,
) =>
  useQuery<TData, TError, TData>({
    ...options,
    queryKey: [...getKey(document), variables],
    queryFn: customFetcher(document, variables),
  });

export const useGqlMutation = <
  TData = any,
  TVariables = unknown,
  TError = unknown,
  TContext = unknown,
>(
  document: TypedDocumentNode<TData, TVariables>,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationKey"
  >,
) =>
  useMutation<TData, TError, TVariables, TContext>({
    ...options,
    mutationKey: getKey(document),
    mutationFn: (variables) => customFetcher(document, variables)(),
  });

export const useGqlInfinite = <
  TData = any,
  TVariables = unknown,
  TError = unknown,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  options?: Omit<
    UseInfiniteQueryOptions<TData, TError, TData>,
    "queryKey" | "queryFn" | "initialPageParam"
  >,
) =>
  useInfiniteQuery<TData, TError, TData>({
    queryKey: [`${getKey(document).join("")}.infinite`, variables],
    queryFn: ({ pageParam }: any) =>
      customFetcher<TData, TVariables>(document, {
        ...variables,
        ...(pageParam ?? {}),
      })(),
    initialPageParam: undefined,
    ...(options as any),
  });

export const customFetcher = <TData, TVariables, T extends boolean = false>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: RequestInit["headers"],
  withHeaders: T = false as T,
): (() => T extends false
  ? Promise<TData>
  : Promise<{ data: TData; headers: Headers }>) => {
  return async () => {
    let body: FormData | string;
    const isFileUpload = Object.values(variables || {}).some(
      (v) => v instanceof File || v instanceof Blob,
    );

    if (isFileUpload) {
      const formData = new FormData();
      const fileMap: Record<string, string[]> = {};
      let fileIndex = 0;

      Object.entries(variables || {}).forEach(([key, value]) => {
        if (value instanceof File || value instanceof Blob) {
          formData.append(fileIndex.toString(), value);
          fileMap[fileIndex.toString()] = [`variables.${key}`];
          fileIndex++;
        } else {
          formData.append(key, JSON.stringify(value));
        }
      });

      formData.append(
        "operations",
        JSON.stringify({ query: print(document), variables }),
      );
      formData.append("map", JSON.stringify(fileMap));

      body = formData;
    } else {
      body = JSON.stringify({ query: print(document), variables });
    }

    const headers: RequestInit["headers"] = isFileUpload
      ? options
      : { ...options, "Content-Type": "application/json" };
    const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers,
      body,
    });
    
    const json = await res.json();

    if (json.errors) {
      throw new Error(
        JSON.stringify(json.errors.map((e: any) => e.message).flat()),
      );
    }

    return withHeaders ? { data: json.data, headers: res.headers } : json.data;
  };
};
