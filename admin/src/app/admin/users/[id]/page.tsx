"use client";

import UserEditor, { AddressRow, UserRow } from "../UserEditor";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import React, { useEffect, useState } from "react";

function useUser(id: string) {
  const { apiCallJson } = useAuthenticatedFetch();
  const [item, setItem] = useState<UserRow | null>(null);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (id === "new") {
      setItem(null);
      setAddresses([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const d = await apiCallJson(`/api/admin/users/${id}`);
        if (!cancelled) {
          setItem(d.item as UserRow);
          setAddresses(d.addresses as AddressRow[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, apiCallJson]);
  return { item, addresses, loading };
}

export default function UserEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const data = useUser(id);
  const isNew = id === "new";

  // While fetching an existing user, render a full-page skeleton and hide the form
  if (!isNew && data.loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm p-6 animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm p-6 animate-pulse">
          <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <UserEditor
      initialUser={data.item || undefined}
      initialAddresses={data.addresses || []}
      loading={data.loading}
    />
  );
}
