import UserEditor, { AddressRow, UserRow } from "../UserEditor";
import { headers } from "next/headers";

async function getUser(id: string): Promise<{ item: UserRow | null; addresses: AddressRow[] }> {
  if (id === "new") return { item: null, addresses: [] };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const cookie = h.get("cookie");
  const res = await fetch(`${base}/api/admin/users/${id}`, { cache: "no-store", headers: cookie ? { cookie } : undefined });
  if (!res.ok) return { item: null, addresses: [] };
  const d = await res.json();
  return { item: d.item as UserRow, addresses: d.addresses as AddressRow[] };
}

export default async function UserEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const { id } = p;
  const data = await getUser(id);
  return <UserEditor initialUser={data.item || undefined} initialAddresses={data.addresses || []} />;
}
