"use client";
import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
    <form
      onSubmit={onSubmit}
      style={{ display: "grid", gap: 12, maxWidth: 420 }}
    >
      <label>
        <div>Current password</div>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          minLength={1}
          style={{
            width: "100%",
            padding: 8,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
          }}
        />
      </label>
      <label>
        <div>New password</div>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          style={{
            width: "100%",
            padding: 8,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
          }}
        />
      </label>
      <button
        disabled={loading}
        type="submit"
        style={{
          padding: "10px 14px",
          borderRadius: 6,
          background: "#111827",
          color: "white",
        }}
      >
        {loading ? "Updating..." : "Update password"}
      </button>
      {message && <p style={{ color: "#059669" }}>{message}</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
    </form>
  );
}
