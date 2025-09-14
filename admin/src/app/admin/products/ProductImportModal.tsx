"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ImportMode = "create" | "update" | "upsert";

export default function ProductImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported?: (stats: {
    createdProducts: number;
    updatedProducts: number;
    createdVariants: number;
    updatedVariants: number;
  }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [isImporting, setIsImporting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    createdProducts: number;
    updatedProducts: number;
    createdVariants: number;
    updatedVariants: number;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<string>("");

  function parseHeaderLine(text: string): string[] {
    // Parse only first row with minimal quote handling
    const out: string[] = [];
    let i = 0;
    let field = "";
    let inQuotes = false;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        out.push(field.trim());
        field = "";
        i++;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        break;
      }
      field += ch;
      i++;
    }
    out.push(field.trim());
    return out;
  }

  async function validateFile(file: File) {
    const text = await file.text();
    const header = parseHeaderLine(text);
    const lower = header.map((h) => h.trim().toLowerCase());
    const required = [
      "row_type",
      "product_slug",
      "name",
      "status",
      "currency",
      "regular_price",
      "stock",
      "variant_sku",
      "variant_attributes",
    ];
    const missing = required.filter((k) => !lower.includes(k));
    if (missing.length) {
      setValidationError(`Missing columns: ${missing.join(", ")}`);
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function onChooseFile(files: FileList | null) {
    const file = files?.[0] || null;
    setSelectedFile(file);
    setLastResult(null);
    if (file) {
      setFileInfo(`${file.name} • ${(file.size / 1024).toFixed(1)} KB`);
      await validateFile(file);
    } else {
      setFileInfo("");
      setValidationError(null);
    }
  }

  async function handleImport() {
    if (!selectedFile) return;
    if (validationError) return;
    setIsImporting(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const res = await fetch(`/api/admin/products/import?mode=${mode}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Import failed");
      const stats = {
        createdProducts: Number(data.createdProducts || 0),
        updatedProducts: Number(data.updatedProducts || 0),
        createdVariants: Number(data.createdVariants || 0),
        updatedVariants: Number(data.updatedVariants || 0),
      };
      setLastResult(stats);
      onImported?.(stats);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="p-4 border-b bg-white">
          <DialogHeader>
            <DialogTitle>Import Products (CSV)</DialogTitle>
            <DialogDescription>
              Upload a CSV using the unified schema. Choose how to apply rows.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-900">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode((e.target.value as any) || "upsert")}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            >
              <option value="create">Create Only</option>
              <option value="update">Update Only</option>
              <option value="upsert">Upsert</option>
            </select>
            <p className="text-xs text-gray-500">
              - Create: insert new by slug/SKU; skip existing.
              <br />- Update: update existing by slug/SKU; skip new.
              <br />- Upsert: create or update as needed.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-900">
              CSV File
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onChooseFile(e.target.files)}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                Choose File
              </Button>
              <span className="text-xs text-gray-500">
                {fileInfo || ".csv up to 10MB"}
              </span>
            </div>
          </div>

          {/* Template download */}
          <div className="flex items-center gap-2">
            <a
              href="/data/products-template.csv"
              download
              className="text-sm text-blue-700 hover:underline"
            >
              Download CSV template
            </a>
            <span className="text-xs text-gray-400">
              (placeholders: product and variants)
            </span>
          </div>

          {lastResult && (
            <div className="rounded-lg border bg-green-50 p-3 text-sm text-green-700">
              Imported successfully: products +{lastResult.createdProducts}/
              {lastResult.updatedProducts}, variants +
              {lastResult.createdVariants}/{lastResult.updatedVariants}
            </div>
          )}
          {!lastResult && validationError && (
            <div className="rounded-lg border bg-red-50 p-3 text-sm text-red-700">
              {validationError}
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-white">
          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={isImporting}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={isImporting || !selectedFile || !!validationError}
            >
              {isImporting ? "Importing..." : "Import CSV"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
