"use client";

import Link from "next/link";
import { Home, ShoppingCart, User } from "lucide-react";

export default function BottomBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-sm md:hidden">
      <div className="grid grid-cols-3 text-xs">
        <Link href="/" className="flex flex-col items-center py-2">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/cart" className="flex flex-col items-center py-2">
          <ShoppingCart className="h-5 w-5" />
          <span>Cart</span>
        </Link>
        <Link href="/account" className="flex flex-col items-center py-2">
          <User className="h-5 w-5" />
          <span>Account</span>
        </Link>
      </div>
    </nav>
  );
}

