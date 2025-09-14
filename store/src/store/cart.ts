"use client";

import { create } from "zustand";

type CartItem = {
  id: string; // product variant id preferred
  name: string;
  price: number;
  currency: string;
  qty: number;
  image?: string | null;
  variantLabel?: string | null;
};

type CartState = {
  isOpen: boolean;
  items: CartItem[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  setItems: (items: CartItem[]) => void;
  total: () => number;
};

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem("cart-items");
    return s ? (JSON.parse(s) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("cart-items", JSON.stringify(items));
  } catch {}
}

export const useCart = create<CartState>((set, get) => ({
  isOpen: false,
  items: load(),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  add: (item) => {
    const items = get().items.slice();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0)
      items[idx] = { ...items[idx], qty: items[idx].qty + item.qty };
    else items.push(item);
    set({ items });
    save(items);
    set({ isOpen: true });
  },
  remove: (id) =>
    set((s) => {
      const items = s.items.filter((i) => i.id !== id);
      save(items);
      return { items };
    }),
  setItems: (items) => {
    save(items);
    set({ items });
  },
  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}));
