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

interface Country {
  id: string;
  name: string;
  iso2: string;
  iso3: string;
}

interface CountrySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CountrySelector({
  value,
  onValueChange,
  placeholder = "Select country...",
  disabled = false,
  className = "",
}: CountrySelectorProps) {
  const { apiCallJson } = useAuthenticatedFetch();
  const [countries, setCountries] = useState<Country[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCountries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCallJson(
        "/api/admin/locations/countries?limit=300",
        {
          cache: "no-store",
        }
      );
      setCountries(data.countries || []);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoading(false);
    }
  }, [apiCallJson]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const selectedCountry = useMemo(() => {
    return countries.find((country) => country.iso2 === value);
  }, [countries, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className}`}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {selectedCountry ? (
              <span>{selectedCountry.name}</span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search countries..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading countries..." : "No countries found."}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {countries.map((country) => (
                <CommandItem
                  key={country.iso2}
                  value={`${country.name}-${country.iso2}`}
                  onSelect={() => {
                    onValueChange(country.iso2);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-gray-50 aria-selected:bg-gray-100"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Check
                        className={`h-4 w-4 ${
                          value === country.iso2 ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span>{country.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {country.iso2}
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
