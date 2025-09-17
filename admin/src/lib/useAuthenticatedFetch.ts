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

  // Cache last known token to avoid race on initial hydration
  const lastTokenRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if ((session as any)?.accessToken) {
      lastTokenRef.current = (session as any).accessToken as string;
    }
  }, [session]);

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

      // Ensure we have a token even on first hydration
      let token: string | undefined = (session as any)?.accessToken as
        | string
        | undefined;
      if (!token) token = lastTokenRef.current;
      if (!token) {
        try {
          const sRes = await fetch("/api/authjs/session", {
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          const s = await sRes.json().catch(() => ({} as any));
          if (s?.accessToken) {
            token = s.accessToken as string;
            lastTokenRef.current = token;
          }
        } catch {}
      }
      if (token) headers.Authorization = `Bearer ${token}`;

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
    isAuthenticated: Boolean(
      (session as any)?.accessToken || lastTokenRef.current
    ),
    isLoading,
  };
}
