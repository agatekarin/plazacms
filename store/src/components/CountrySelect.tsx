"use client";

import { useEffect, useState } from "react";
import { fetchCountries } from "@/lib/checkout";

type Props = {
  value: string;
  onChange: (code: string) => void;
};

export default function CountrySelect({ value, onChange }: Props) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Array<{ iso2: string; name: string }>>([]);

  useEffect(() => {
    (async () => {
      const res = await fetchCountries(q);
      setItems(res.items);
    })();
  }, [q]);

  return (
    <div className="grid gap-2">
      <input
        className="h-10 px-3 rounded-lg border"
        placeholder="Search country"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        className="h-10 px-3 rounded-lg border"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {items.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
