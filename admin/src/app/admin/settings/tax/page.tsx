"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, User } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function PagePage() {
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Page Under Migration</h1>
      <p className="text-gray-600">
        This page is being migrated to use the new Hono backend API.
        Please check back later or contact the administrator.
      </p>
    </div>
  );
}

/*
ORIGINAL CODE COMMENTED OUT:
import { Session } from "next-auth";
import { auth } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../../lib/db";
import TaxClassesManager from "../tax-classes/TaxClassesManager";

export const dynamic = "force-dynamic";

interface TaxClassRow {
  id: string;
  name: string;
  rate: string; // numeric comes back as string from pg
  is_active: boolean;
}

export default async function TaxSettingsPage() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const { rows } = await pool.query<TaxClassRow>(
    "SELECT id, name, rate, is_active FROM public.tax_classes ORDER BY name ASC"
  );
  const items = rows as unknown as TaxClassRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tax Settings</h1>
      </div>
      <TaxClassesManager initialItems={items} />
    </div>
  );
}

*/
