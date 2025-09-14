"use client";

import { useState, useEffect } from "react";
import { apiClient, AttributeItem } from "@/lib/api-client";
import AttributesManager from "./AttributesManager";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";

export default function AttributesPage() {
  const [items, setItems] = useState<AttributeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAttributes();
      if (response.success) {
        setItems(response.data.items);
      } else {
        setError("Failed to fetch attributes");
      }
    } catch (err) {
      setError("Failed to fetch attributes");
      console.error("Fetch attributes error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading attributes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">{error}</div>
        <Button onClick={fetchAttributes} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
            <Settings className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attributes</h1>
            <p className="text-sm text-gray-600 mt-1">
              Define product attributes and their values
            </p>
          </div>
        </div>
      </div>

      {/* Attributes Manager */}
      <AttributesManager initialItems={items} />
    </div>
  );
}
