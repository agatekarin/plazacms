import { useSession } from "@hono/auth-js/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseAuthenticatedFetchOptions {
  onRequest?: (url: string, options: RequestInit) => void;
  onResponse?: (url: string, response: Response) => void;
  onError?: (url: string, error: any) => void;
}

type ApiCallOptions = RequestInit;

/**
 * Custom hook for making authenticated API calls to the Hono backend
 * Simplified for admin panel - no retry logic needed for task-oriented workflows
 */
export function useAuthenticatedFetch(
  hookOptions: UseAuthenticatedFetchOptions = {}
) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // Create stable references for interceptors to prevent infinite re-renders
  const onRequestRef = useRef(hookOptions.onRequest);
  const onResponseRef = useRef(hookOptions.onResponse);
  const onErrorRef = useRef(hookOptions.onError);

  // Update refs when hookOptions change
  useEffect(() => {
    onRequestRef.current = hookOptions.onRequest;
    onResponseRef.current = hookOptions.onResponse;
    onErrorRef.current = hookOptions.onError;
  });

  const memoizedHookOptions = useMemo(
    () => ({
      onRequest: onRequestRef.current,
      onResponse: onResponseRef.current,
      onError: onErrorRef.current,
    }),
    [] // Empty dependency array - stable reference
  );

  const apiCall = useCallback(
    async (url: string, options: ApiCallOptions = {}) => {
      // Build full URL with base URL
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const fullUrl = baseUrl ? `${baseUrl}${url}` : url;

      // Prepare headers
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...((options.headers as Record<string, string>) || {}),
      };

      // Add Authorization header if session exists
      if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
      }

      // Request interceptor
      memoizedHookOptions.onRequest?.(fullUrl, { ...options, headers });

      try {
        setIsLoading(true);

        const response = await fetch(fullUrl, {
          ...options,
          headers,
        });

        // Response interceptor
        memoizedHookOptions.onResponse?.(fullUrl, response);

        return response;
      } catch (error) {
        memoizedHookOptions.onError?.(fullUrl, error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [session, memoizedHookOptions]
  );

  // Helper for JSON responses
  const apiCallJson = useCallback(
    async (url: string, options: ApiCallOptions = {}) => {
      const response = await apiCall(url, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status} ${response.statusText}`,
        }));

        const errorObj = new Error(
          error.error || error.message || "Request failed"
        );
        (errorObj as any).status = response.status;
        (errorObj as any).statusText = response.statusText;

        memoizedHookOptions.onError?.(url, errorObj);
        throw errorObj;
      }

      return response.json();
    },
    [apiCall, memoizedHookOptions]
  );

  return {
    apiCall,
    apiCallJson,
    session,
    isAuthenticated: !!session?.accessToken,
    isLoading,
  };
}
