"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Search, User2, Edit3, Trash2 } from "lucide-react";
import ConfirmDeleteForm from "./ConfirmDeleteForm";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

type UserListRow = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "vendor" | "customer" | "guest";
  image: string | null;
  created_at: string;
};

function useUsers(q: string) {
  const { apiCallJson } = useAuthenticatedFetch();
  const [items, setItems] = useState<UserListRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiCallJson(
          `/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`
        );
        if (!cancelled) setItems(data.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, apiCallJson]);
  return { items, loading };
}

export default function UsersPage() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const { items, loading } = useUsers(q);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <User2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500">
                Manage accounts, roles, avatars, and addresses
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action="/admin/users" className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Search name or email..."
                  className="h-10 rounded-lg border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </form>
            <Link
              href="/admin/users/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                items?.map((u: UserListRow) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                          {u.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.image}
                              alt={u.name || u.email}
                              className="w-9 h-9 object-cover"
                            />
                          ) : (
                            <User2 className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {u.name || "(no name)"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {u.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4 capitalize">{u.role}</td>
                    <td className="py-3 px-4">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
                        >
                          <Edit3 className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Link>
                        <ConfirmDeleteForm
                          action={`/api/admin/users/${u.id}`}
                          disabled={u.role === "admin"}
                          title={
                            u.role === "admin"
                              ? "Cannot delete admin"
                              : "Delete"
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && (!items || items.length === 0) && (
                <tr>
                  <td className="py-6 px-4 text-gray-500" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
