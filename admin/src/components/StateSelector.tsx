"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface State {
  id: string;
  name: string;
  country_id: string;
  country_code: string;
}

interface StateSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  countryCode: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function StateSelector({
  value,
  onValueChange,
  countryCode,
  placeholder = "Select state...",
  disabled = false,
  className = "",
}: StateSelectorProps) {
  const { apiCallJson } = useAuthenticatedFetch();
  const [states, setStates] = useState<State[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchStates = useCallback(
    async (countryCode: string) => {
      try {
        setLoading(true);
        const data = await apiCallJson(
          `/api/admin/locations/states?country_code=${countryCode}`,
          {
            cache: "no-store",
          }
        );
        setStates(data.states || []);
      } catch (error) {
        console.error("Error fetching states:", error);
        setStates([]);
      } finally {
        setLoading(false);
      }
    },
    [apiCallJson]
  );

  useEffect(() => {
    if (countryCode) {
      fetchStates(countryCode);
    } else {
      setStates([]);
    }
  }, [countryCode, fetchStates]);

  const selectedState = useMemo(() => {
    return states.find((state) => state.id === value);
  }, [states, value]);

  const isDisabled = disabled || !countryCode || loading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className}`}
          disabled={isDisabled}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {selectedState ? (
              <span>{selectedState.name}</span>
            ) : (
              <span className="text-gray-500">
                {!countryCode ? "Select country first" : placeholder}
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search states..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading states..." : "No states found."}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {states.map((state) => (
                <CommandItem
                  key={state.id}
                  value={`${state.name}-${state.id}`}
                  onSelect={() => {
                    onValueChange(state.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-gray-50 aria-selected:bg-gray-100"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Check
                        className={`h-4 w-4 ${
                          value === state.id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span>{state.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {state.country_code}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
