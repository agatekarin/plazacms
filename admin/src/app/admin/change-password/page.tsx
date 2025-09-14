"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, User } from "@/lib/auth";
import { useRouter } from "next/navigation";
import ChangePasswordForm from "./ChangePasswordForm";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "admin") {
          router.push("/signin");
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <h1>Change Password</h1>
      <p style={{ marginTop: 8, color: "#6b7280" }}>
        Enter your current password and choose a new one (min 8 chars).
      </p>
      <div style={{ marginTop: 16 }}>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
