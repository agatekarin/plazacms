"use client";

import UserEditor, { AddressRow, UserRow } from "../UserEditor";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import React, { useEffect, useState } from "react";

function useUser(id: string) {
  const { apiCallJson } = useAuthenticatedFetch();
  const [item, setItem] = useState<UserRow | null>(null);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  useEffect(() => {
    if (id === "new") {
      setItem(null);
      setAddresses([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const d = await apiCallJson(`/api/admin/users/${id}`);
      if (!cancelled) {
        setItem(d.item as UserRow);
        setAddresses(d.addresses as AddressRow[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, apiCallJson]);
  return { item, addresses };
}

export default function UserEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const data = useUser(id);
  return (
    <UserEditor
      initialUser={data.item || undefined}
      initialAddresses={data.addresses || []}
    />
  );
}
