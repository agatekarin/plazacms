"use client";
import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to change password");
      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Current password
        </label>
        <div className="mt-1 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="currentPassword"
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            minLength={1}
            placeholder="Enter current password"
            className="block w-full rounded-lg border border-slate-300 pl-9 pr-10 py-2.5 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
          />
          <button
            type="button"
            aria-label={showCurrent ? "Hide current password" : "Show current password"}
            onClick={() => setShowCurrent((s) => !s)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          New password
        </label>
        <div className="mt-1 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="newPassword"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="block w-full rounded-lg border border-slate-300 pl-9 pr-10 py-2.5 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
          />
          <button
            type="button"
            aria-label={showNew ? "Hide new password" : "Show new password"}
            onClick={() => setShowNew((s) => !s)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Use a strong password you don't use elsewhere.</p>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
