"use client";

import { Trash2 } from "lucide-react";
import React from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

type Props = {
  action: string;
  disabled?: boolean;
  title?: string;
};

export default function ConfirmDeleteForm({ action, disabled, title }: Props) {
  const { apiCall } = useAuthenticatedFetch();
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirm("Delete this user?")) return;
    try {
      const res = await apiCall(action, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.error || "Failed to delete");
        return;
      }
      // Refresh list
      window.location.reload();
    } catch (err) {
      alert((err as Error).message || "Failed to delete");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <button
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        disabled={disabled}
        title={title}
        type="submit"
      >
        <Trash2 className="w-4 h-4 sm:mr-1" />
        <span className="hidden sm:inline">Delete</span>
      </button>
    </form>
  );
}
