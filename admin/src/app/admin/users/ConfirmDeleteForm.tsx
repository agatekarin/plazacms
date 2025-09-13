"use client";

import { Trash2 } from "lucide-react";
import React from "react";

type Props = {
  action: string;
  disabled?: boolean;
  title?: string;
};

export default function ConfirmDeleteForm({ action, disabled, title }: Props) {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm("Delete this user?")) e.preventDefault();
  };

  return (
    <form action={action} method="post" onSubmit={onSubmit}>
      <input type="hidden" name="_method" value="DELETE" />
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
