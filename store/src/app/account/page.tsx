"use client";

import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import { useSession, signOut } from "next-auth/react";

export default function AccountPage() {
  const { data: session, status } = useSession();
  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[720px] px-3 md:px-6 py-6 grid gap-3">
        <h1 className="text-base md:text-xl font-semibold text-gray-900">
          Account
        </h1>
        {status === "loading" && (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
        {!session?.user && status !== "loading" && (
          <div className="text-sm">
            You are not signed in.{" "}
            <a href="/signin" className="underline">
              Sign in
            </a>
          </div>
        )}
        {session?.user && (
          <div className="grid gap-2">
            <div className="text-sm">Name: {session.user.name ?? "-"}</div>
            <div className="text-sm">Email: {session.user.email}</div>
            <button
              className="h-10 px-4 rounded-lg border w-fit"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Logout
            </button>
          </div>
        )}
      </main>
      <BottomBar />
    </div>
  );
}
