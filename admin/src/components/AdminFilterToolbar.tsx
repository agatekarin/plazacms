"use client";

import * as React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export type ToolbarGroup = {
  key: string;
  options: Array<{ label: string; value: string }>;
};

export type ToolbarActive = Record<string, string>;

type AdminFilterToolbarProps = {
  searchPlaceholder?: string;
  searchValue: string;
  onSearch: (value: string) => void;
  groups: ToolbarGroup[];
  active: ToolbarActive;
  onChange: (groupKey: string, value: string) => void;
  className?: string;
};

export default function AdminFilterToolbar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearch,
  groups,
  active,
  onChange,
  className = "",
}: AdminFilterToolbarProps) {
  return (
    <div className={`w-full bg-white border rounded-xl p-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {groups.map((group) => (
              <div key={group.key} className="flex items-center gap-1">
                {group.options.map((opt) => {
                  const isActive = (active[group.key] || "") === opt.value;
                  return (
                    <button
                      key={`${group.key}-${opt.value}`}
                      onClick={() =>
                        onChange(group.key, isActive ? "" : opt.value)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs border transition whitespace-nowrap ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                      type="button"
                    >
                      {isActive ? opt.label : opt.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
