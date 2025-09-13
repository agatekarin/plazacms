"use client";

import Link from "next/link";
import { ShoppingCart, Search, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState<string>(params.get("q") ?? "");
  const { data: session } = useSession();
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
      <div className="mx-auto max-w-[1280px] px-3 py-2 md:px-6 md:py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-base md:text-lg font-semibold text-gray-800"
        >
          Plaza Store
        </Link>
        <div className="flex items-center gap-3 md:gap-4">
          <form
            className="hidden md:flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const sp = new URLSearchParams();
              if (q) sp.set("q", q);
              router.push(`/catalog${sp.toString() ? `?${sp}` : ""}`);
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              className="h-9 px-3 text-sm rounded-lg border w-[260px]"
            />
            <button className="h-9 px-3 text-sm rounded-lg border">
              Search
            </button>
          </form>
          <button
            aria-label="Search"
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Search className="h-5 w-5 text-gray-700" />
          </button>
          <button
            aria-label="Cart"
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ShoppingCart className="h-5 w-5 text-gray-700" />
          </button>
          {session?.user ? (
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-700" />
              <span className="hidden md:inline text-sm max-w-[160px] truncate">
                {session.user.name ?? session.user.email}
              </span>
              <a
                href="/account/orders"
                className="text-sm underline hidden md:inline"
              >
                Orders
              </a>
              <a href="/account" className="text-sm underline hidden md:inline">
                Account
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm underline hidden md:inline"
              >
                Logout
              </button>
            </div>
          ) : (
            <a
              href="/signin"
              className="p-2 rounded-lg hover:bg-gray-100 inline-flex items-center gap-2"
            >
              <User className="h-5 w-5 text-gray-700" />
              <span className="hidden md:inline text-sm">Sign in</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
