"use client";

import React from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import MediaPicker, { MediaItem } from "@/components/MediaPicker";
import {
  PlusCircleIcon,
  PencilSquareIcon,
  PowerIcon,
  TrashIcon,
  ChevronRightIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

type JsonRecord = Record<string, unknown> | null;

export interface PaymentGatewayRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_enabled: boolean;
  settings: JsonRecord;
  logo_media_id: string | null;
  // Hydrated in page.tsx
  logo_url?: string | null;
}

export interface PaymentMethodRow {
  id: string;
  gateway_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_enabled: boolean;
  settings: JsonRecord;
  display_order: number;
  logo_media_id: string | null;
  // Optional hydrated field when needed
  logo_url?: string | null;
}

const gatewaySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  is_enabled: z.boolean().optional(),
});

const methodSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  is_enabled: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 w-full max-w-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Close
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
        aria-label={label || "toggle"}
      >
        <span
          className={`block w-5 h-5 bg-white rounded-full mt-0.5 ml-0.5 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      {label}
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm">
      {children}
    </div>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    help?: string;
  }
) {
  const { label, help, ...rest } = props;
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-gray-900">{label}</label>
      )}
      <input
        {...rest}
        className={[
          "h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none",
          "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10",
          props.className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {help && <p className="text-xs text-gray-500">{help}</p>}
    </div>
  );
}

function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    help?: string;
  }
) {
  const { label, help, ...rest } = props;
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-gray-900">{label}</label>
      )}
      <textarea
        {...rest}
        className={[
          "min-h-[80px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none",
          "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10",
          props.className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {help && <p className="text-xs text-gray-500">{help}</p>}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const base =
    "inline-flex items-center justify-center px-3 py-2 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : variant === "ghost"
      ? "text-gray-700 hover:bg-gray-100"
      : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50";
  return (
    <button
      aria-label={ariaLabel}
      type={type}
      className={`${base} ${styles}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default function PaymentsManager({
  initialGateways,
}: {
  initialGateways: PaymentGatewayRow[];
}) {
  const [gateways, setGateways] =
    React.useState<PaymentGatewayRow[]>(initialGateways);
  const [expandedGatewayId, setExpandedGatewayId] = React.useState<
    string | null
  >(null);
  const [creatingGateway, setCreatingGateway] = React.useState(false);
  const [logoPickerOpenForGateway, setLogoPickerOpenForGateway] =
    React.useState<string | null>(null);
  const [logoPickerOpenForMethod, setLogoPickerOpenForMethod] = React.useState<
    string | null
  >(null);
  const [methodsByGateway, setMethodsByGateway] = React.useState<
    Record<string, PaymentMethodRow[]>
  >({});
  const [activeTab, setActiveTab] = React.useState<"gateways" | "methods">(
    "gateways"
  );
  const [creatingGatewayOpen, setCreatingGatewayOpen] = React.useState(false);
  const [creatingMethodOpen, setCreatingMethodOpen] = React.useState(false);
  const [methodCreateGatewayId, setMethodCreateGatewayId] = React.useState<
    string | null
  >(null);
  const [loadingAllMethods, setLoadingAllMethods] = React.useState(false);
  const [editGatewayId, setEditGatewayId] = React.useState<string | null>(null);
  const [editMethod, setEditMethod] = React.useState<{
    gatewayId: string;
    methodId: string;
  } | null>(null);

  async function refreshGateways() {
    const res = await fetch("/api/admin/payments/gateways", {
      cache: "no-store",
    });
    const d = await res.json();
    setGateways(Array.isArray(d.items) ? d.items : []);
  }

  async function loadMethods(gatewayId: string) {
    const res = await fetch(
      `/api/admin/payments/gateways/${gatewayId}/methods`,
      { cache: "no-store" }
    );
    const d = await res.json();
    setMethodsByGateway((prev) => ({
      ...prev,
      [gatewayId]: Array.isArray(d.items) ? d.items : [],
    }));
  }

  async function loadAllMethods() {
    if (!gateways.length) return;
    setLoadingAllMethods(true);
    try {
      const notLoaded = gateways.filter((g) => !methodsByGateway[g.id]);
      await Promise.all(notLoaded.map((g) => loadMethods(g.id)));
    } finally {
      setLoadingAllMethods(false);
    }
  }

  React.useEffect(() => {
    if (activeTab === "methods") {
      void loadAllMethods();
    }
  }, [activeTab, gateways]);

  const allMethods: Array<PaymentMethodRow & { gateway_name: string }> =
    React.useMemo(() => {
      const map: Array<PaymentMethodRow & { gateway_name: string }> = [];
      for (const g of gateways) {
        const arr = methodsByGateway[g.id] || [];
        for (const m of arr) map.push({ ...m, gateway_name: g.name });
      }
      return map.sort(
        (a, b) =>
          a.gateway_name.localeCompare(b.gateway_name) ||
          a.display_order - b.display_order ||
          a.name.localeCompare(b.name)
      );
    }, [methodsByGateway, gateways]);

  async function createGateway(formData: FormData) {
    const data = {
      name: String(formData.get("name") || "").trim(),
      slug: String(formData.get("slug") || "").trim() || undefined,
      description:
        String(formData.get("description") || "").trim() || undefined,
      is_enabled: true,
    };
    const parsed = gatewaySchema.safeParse(data);
    if (!parsed.success) {
      toast.error("Invalid fields");
      return;
    }
    setCreatingGateway(true);
    try {
      const res = await fetch("/api/admin/payments/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to create gateway");
      toast.success("Gateway created");
      await refreshGateways();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreatingGateway(false);
    }
  }

  async function toggleGateway(g: PaymentGatewayRow) {
    try {
      const res = await fetch(`/api/admin/payments/gateways/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !g.is_enabled }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to update gateway");
      toast.success(!g.is_enabled ? "Gateway enabled" : "Gateway disabled");
      await refreshGateways();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function setGatewayEnabled(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/admin/payments/gateways/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to update gateway");
      toast.success(enabled ? "Gateway enabled" : "Gateway disabled");
      await refreshGateways();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function deleteGateway(id: string) {
    if (!confirm("Delete this gateway? This will remove its methods.")) return;
    try {
      const res = await fetch(`/api/admin/payments/gateways/${id}`, {
        method: "DELETE",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Failed to delete");
      toast.success("Gateway deleted");
      await refreshGateways();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function GatewayLogo({ gateway }: { gateway: PaymentGatewayRow }) {
    const src = gateway.logo_url;
    return (
      <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={gateway.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <PhotoIcon className="h-5 w-5 text-gray-400" />
        )}
      </div>
    );
  }

  async function onGatewayLogoPick(gatewayId: string, media: MediaItem[]) {
    const mediaId = media?.[0]?.id;
    if (!mediaId) return;
    try {
      const res = await fetch(`/api/admin/payments/gateways/${gatewayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_media_id: mediaId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to set logo");
      toast.success("Logo updated");
      await refreshGateways();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function createMethod(gatewayId: string) {
    const name = prompt(
      "Method name (e.g., PayPal, Bank Transfer, COD)"
    )?.trim();
    if (!name) return;
    const parsed = methodSchema.safeParse({ name, is_enabled: true });
    if (!parsed.success) {
      toast.error("Invalid method");
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/payments/gateways/${gatewayId}/methods`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to create method");
      toast.success("Method created");
      await loadMethods(gatewayId);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function toggleMethod(m: PaymentMethodRow) {
    try {
      const res = await fetch(
        `/api/admin/payments/gateways/${m.gateway_id}/methods/${m.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_enabled: !m.is_enabled }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to update method");
      toast.success(!m.is_enabled ? "Method enabled" : "Method disabled");
      await loadMethods(m.gateway_id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function setMethodEnabled(m: PaymentMethodRow, enabled: boolean) {
    try {
      const res = await fetch(
        `/api/admin/payments/gateways/${m.gateway_id}/methods/${m.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_enabled: enabled }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to update method");
      toast.success(enabled ? "Method enabled" : "Method disabled");
      await loadMethods(m.gateway_id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function deleteMethod(m: PaymentMethodRow) {
    if (!confirm("Delete this method?")) return;
    try {
      const res = await fetch(
        `/api/admin/payments/gateways/${m.gateway_id}/methods/${m.id}`,
        { method: "DELETE" }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Failed to delete method");
      toast.success("Method deleted");
      await loadMethods(m.gateway_id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function EditGatewayModal({ id }: { id: string }) {
    const gw = gateways.find((x) => x.id === id);
    const [name, setName] = React.useState(gw?.name || "");
    const [slug, setSlug] = React.useState(gw?.slug || "");
    const [description, setDescription] = React.useState(gw?.description || "");
    const [isEnabled, setIsEnabled] = React.useState<boolean>(
      Boolean(gw?.is_enabled)
    );
    const [settingsText, setSettingsText] = React.useState<string>(
      JSON.stringify(gw?.settings ?? {}, null, 2)
    );
    const [saving, setSaving] = React.useState(false);

    // Non-dev PayPal helpers derived from current settings
    const currentSettings = (gw?.settings as Record<string, unknown>) || {};
    const [paypalMode, setPaypalMode] = React.useState<string>(
      typeof currentSettings["mode"] === "string" &&
        currentSettings["mode"] === "live"
        ? "live"
        : "sandbox"
    );
    const [paypalClientIdEnv, setPaypalClientIdEnv] = React.useState<string>(
      typeof currentSettings["clientIdEnv"] === "string"
        ? String(currentSettings["clientIdEnv"])
        : "PAYPAL_CLIENT_ID"
    );
    const [paypalClientSecretEnv, setPaypalClientSecretEnv] =
      React.useState<string>(
        typeof currentSettings["clientSecretEnv"] === "string"
          ? String(currentSettings["clientSecretEnv"])
          : "PAYPAL_CLIENT_SECRET"
      );
    const [envStatuses, setEnvStatuses] = React.useState<
      { name: string; present: boolean }[] | null
    >(null);

    async function save() {
      setSaving(true);
      let parsedSettings: JsonRecord = null;
      try {
        parsedSettings = settingsText.trim()
          ? (JSON.parse(settingsText) as Record<string, unknown>)
          : null;
      } catch (e) {
        toast.error("Invalid JSON in settings");
        setSaving(false);
        return;
      }
      // If PayPal, prefer structured form values over raw JSON
      if ((gw?.slug || "").toLowerCase() === "paypal") {
        parsedSettings = {
          mode: paypalMode,
          clientIdEnv: paypalClientIdEnv,
          clientSecretEnv: paypalClientSecretEnv,
        } as Record<string, unknown>;
      }
      try {
        const res = await fetch(`/api/admin/payments/gateways/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug: slug || undefined,
            description: description || null,
            is_enabled: isEnabled,
            settings: parsedSettings,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d?.error || "Failed to save");
        toast.success("Gateway saved");
        setEditGatewayId(null);
        await refreshGateways();
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setSaving(false);
      }
    }

    const paypalHelp = gw?.slug === "paypal" && (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 space-y-2">
        <div className="font-semibold">PayPal Setup</div>
        <ul className="list-disc ml-5 space-y-1">
          <li>Choose mode: Sandbox for testing, Live for production.</li>
          <li>
            Provide env var names (we never store secrets in DB): Client ID Env
            and Client Secret Env.
          </li>
          <li>
            Create a REST app on PayPal Developer, copy credentials to your
            .env.
          </li>
          <li>
            Optional: set webhook to /api/webhooks/paypal and subscribe
            payment.capture.* events.
          </li>
        </ul>
      </div>
    );

    return (
      <Modal
        title="Edit Gateway"
        onClose={() => setEditGatewayId(null)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setEditGatewayId(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="paypal"
          />
        </div>
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Toggle checked={isEnabled} onChange={setIsEnabled} label="Enabled" />

        {(gw?.slug || "").toLowerCase() === "paypal" ? (
          <div className="space-y-3">
            {paypalHelp}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Mode
                </label>
                <select
                  value={paypalMode}
                  onChange={(e) => setPaypalMode(e.target.value)}
                  className="mt-1 w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="live">Live (Production)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Client ID Env
                </label>
                <input
                  value={paypalClientIdEnv}
                  onChange={(e) => setPaypalClientIdEnv(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Client Secret Env
                </label>
                <input
                  value={paypalClientSecretEnv}
                  onChange={(e) => setPaypalClientSecretEnv(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        "/api/admin/payments/env-status",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            vars: [paypalClientIdEnv, paypalClientSecretEnv],
                          }),
                        }
                      );
                      const d = await res.json();
                      setEnvStatuses(
                        Array.isArray(d.statuses) ? d.statuses : null
                      );
                    } catch {}
                  }}
                >
                  Check ENV
                </Button>
              </div>
            </div>
            {envStatuses && (
              <div className="text-sm">
                <div className="text-gray-700 font-medium mb-1">
                  Environment Status
                </div>
                <ul className="space-y-1">
                  {envStatuses.map((s) => (
                    <li
                      key={s.name}
                      className={s.present ? "text-green-700" : "text-red-700"}
                    >
                      {s.name}: {s.present ? "Found" : "Not Set"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              JSON examples:
              <pre className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg overflow-auto">
                {`// General (leave empty if not used)
{ }

// Manual Payments (gateway manual)
{
  "supportsOffline": true
}

// COD gateway
{
  "label": "Cash on Delivery"
}`}
              </pre>
            </div>
            <label className="text-sm font-medium text-gray-900">
              Settings (JSON)
            </label>
            <textarea
              value={settingsText}
              onChange={(e) => setSettingsText(e.target.value)}
              className="min-h-[180px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono"
            />
          </div>
        )}
      </Modal>
    );
  }

  function EditMethodModal({
    gatewayId,
    methodId,
  }: {
    gatewayId: string;
    methodId: string;
  }) {
    const m = (methodsByGateway[gatewayId] || []).find(
      (x) => x.id === methodId
    );
    const [name, setName] = React.useState(m?.name || "");
    const [slug, setSlug] = React.useState(m?.slug || "");
    const [description, setDescription] = React.useState(m?.description || "");
    const [isEnabled, setIsEnabled] = React.useState<boolean>(
      Boolean(m?.is_enabled)
    );
    const [displayOrder, setDisplayOrder] = React.useState<number>(
      Number(m?.display_order || 0)
    );
    const [settingsText, setSettingsText] = React.useState<string>(
      JSON.stringify(m?.settings ?? {}, null, 2)
    );
    const [saving, setSaving] = React.useState(false);

    // Manual method helpers (non-dev form)
    const currentSettings = (m?.settings as Record<string, unknown>) || {};
    const accountsArr = Array.isArray((currentSettings as any)?.accounts)
      ? ((currentSettings as any).accounts as Array<Record<string, unknown>>)
      : [];
    const firstAccount = accountsArr[0] || {};
    const [manualInstructions, setManualInstructions] = React.useState<string>(
      typeof currentSettings["instructions"] === "string"
        ? String(currentSettings["instructions"])
        : ""
    );
    const [manualBank, setManualBank] = React.useState<string>(
      typeof firstAccount["bank"] === "string"
        ? String(firstAccount["bank"])
        : ""
    );
    const [manualAccountName, setManualAccountName] = React.useState<string>(
      typeof firstAccount["accountName"] === "string"
        ? String(firstAccount["accountName"])
        : ""
    );
    const [manualAccountNumber, setManualAccountNumber] =
      React.useState<string>(
        typeof firstAccount["accountNumber"] === "string"
          ? String(firstAccount["accountNumber"])
          : ""
      );
    const [qrisMediaId, setQrisMediaId] = React.useState<string | null>(null);
    const [qrisMediaUrl, setQrisMediaUrl] = React.useState<string | null>(null);
    const [qrisPickerOpen, setQrisPickerOpen] = React.useState<boolean>(false);

    // Prefill when method data arrives late (e.g., switching tabs loads methods async)
    React.useEffect(() => {
      if (!m) return;
      setName(m.name || "");
      setSlug(m.slug || "");
      setDescription(m.description || "");
      setIsEnabled(Boolean(m.is_enabled));
      setDisplayOrder(Number(m.display_order || 0));
      setSettingsText(JSON.stringify(m.settings ?? {}, null, 2));

      const s = (m.settings as Record<string, unknown>) || {};
      const accs = Array.isArray((s as any).accounts)
        ? ((s as any).accounts as Array<Record<string, unknown>>)
        : [];
      const acc = accs[0] || {};
      setManualInstructions(
        typeof (s as any).instructions === "string"
          ? String((s as any).instructions)
          : ""
      );
      setManualBank(typeof acc["bank"] === "string" ? String(acc["bank"]) : "");
      setManualAccountName(
        typeof acc["accountName"] === "string" ? String(acc["accountName"]) : ""
      );
      setManualAccountNumber(
        typeof acc["accountNumber"] === "string"
          ? String(acc["accountNumber"])
          : ""
      );
      const qrId =
        typeof (s as any).qr_media_id === "string"
          ? String((s as any).qr_media_id)
          : null;
      const fallbackId =
        !qrId && typeof m.logo_media_id === "string" && m.logo_media_id
          ? String(m.logo_media_id)
          : null;
      const chosenId = qrId || fallbackId;
      setQrisMediaId(chosenId);
      if (chosenId) {
        (async () => {
          try {
            console.log("Fetching QR media:", chosenId);
            const res = await fetch(`/api/admin/media/${chosenId}`, {
              cache: "no-store",
            });
            const d = await res.json();
            console.log("QR media response:", d);
            if (d?.media?.file_url) {
              console.log("Setting QR URL:", d.media.file_url);
              setQrisMediaUrl(d.media.file_url as string);
            } else {
              console.log(
                "No file_url in response, using existing logo_url as fallback"
              );
              // Fallback to existing logo_url if available
              if (m.logo_url) {
                setQrisMediaUrl(m.logo_url);
              } else {
                setQrisMediaUrl(null);
              }
            }
          } catch (err) {
            console.error("Failed to fetch QR media:", err);
            // Fallback to existing logo_url if available
            if (m.logo_url) {
              setQrisMediaUrl(m.logo_url);
            } else {
              setQrisMediaUrl(null);
            }
          }
        })();
      } else {
        setQrisMediaUrl(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [m?.id]);

    async function save() {
      setSaving(true);
      let parsedSettings: JsonRecord = null;
      try {
        parsedSettings = settingsText.trim()
          ? (JSON.parse(settingsText) as Record<string, unknown>)
          : null;
      } catch (e) {
        toast.error("Invalid JSON in settings");
        setSaving(false);
        return;
      }
      const slugLower = (m?.slug || slug || "").toLowerCase();
      const manualAliases = [
        "bank_transfer",
        "bank-transfer",
        "bank transfer",
        "cod",
        "cash-on-delivery",
        "cash_on_delivery",
        "cash on delivery",
      ];
      if (manualAliases.includes(slugLower)) {
        const accounts =
          manualBank && manualAccountName && manualAccountNumber
            ? [
                {
                  bank: manualBank,
                  accountName: manualAccountName,
                  accountNumber: manualAccountNumber,
                },
              ]
            : Array.isArray((currentSettings as any)?.accounts)
            ? (currentSettings as any).accounts
            : undefined;
        parsedSettings = {
          instructions: manualInstructions,
          ...(accounts ? { accounts } : {}),
        } as Record<string, unknown>;
      } else {
        const base =
          parsedSettings && typeof parsedSettings === "object"
            ? (parsedSettings as Record<string, unknown>)
            : {};
        const gw = gateways.find((g) => g.id === gatewayId);
        parsedSettings = {
          ...base,
          ...(manualInstructions ? { instructions: manualInstructions } : {}),
          ...(gw && gw.slug?.toLowerCase() === "qris" && qrisMediaId
            ? { qr_media_id: qrisMediaId }
            : {}),
        } as Record<string, unknown>;
      }
      try {
        const res = await fetch(
          `/api/admin/payments/gateways/${gatewayId}/methods/${methodId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              slug: slug || undefined,
              description: description || null,
              is_enabled: isEnabled,
              display_order: Math.max(0, Number(displayOrder) || 0),
              settings: parsedSettings,
            }),
          }
        );
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d?.error || "Failed to save");
        toast.success("Method saved");
        setEditMethod(null);
        await loadMethods(gatewayId);
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setSaving(false);
      }
    }

    const manualHelp = (m?.slug || slug || "").toLowerCase() &&
      [
        "bank_transfer",
        "bank-transfer",
        "bank transfer",
        "cod",
        "cash-on-delivery",
        "cash_on_delivery",
        "cash on delivery",
      ].includes((m?.slug || slug || "").toLowerCase()) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
          <div className="font-semibold">Instructions</div>
          <p>Fill the form; JSON will be generated:</p>
          <pre className="text-xs overflow-auto p-2 bg-white border border-amber-200 rounded-md">{`// Bank Transfer
{
  "instructions": "Transfer ke rekening ...",
  "accounts": [
    { "bank": "BCA", "accountName": "Nama Anda", "accountNumber": "1234567890" }
  ]
}

// COD method
{
  "instructions": "Bayar di tempat"
}`}</pre>
        </div>
      );

    const renderManualForm = (m?.slug || slug || "").toLowerCase() &&
      [
        "bank_transfer",
        "bank-transfer",
        "bank transfer",
        "cod",
        "cash-on-delivery",
        "cash_on_delivery",
        "cash on delivery",
      ].includes((m?.slug || slug || "").toLowerCase()) && (
        <div className="space-y-3">
          {manualHelp}
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Bank"
              value={manualBank}
              onChange={(e) => setManualBank(e.target.value)}
              placeholder="BCA"
            />
            <Input
              label="Account Name"
              value={manualAccountName}
              onChange={(e) => setManualAccountName(e.target.value)}
              placeholder="Nama Anda"
            />
            <Input
              label="Account Number"
              value={manualAccountNumber}
              onChange={(e) => setManualAccountNumber(e.target.value)}
              placeholder="1234567890"
            />
          </div>
        </div>
      );

    return (
      <Modal
        title="Edit Method"
        onClose={() => setEditMethod(null)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setEditMethod(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="bank_transfer"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Display Order"
            type="number"
            min={0}
            value={String(displayOrder)}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
          />
          <div className="flex items-end">
            <Toggle
              checked={isEnabled}
              onChange={setIsEnabled}
              label="Enabled"
            />
          </div>
        </div>
        <Textarea
          label="Instructions (shown at checkout)"
          value={manualInstructions}
          onChange={(e) => setManualInstructions(e.target.value)}
        />
        {renderManualForm}
        {gateways.find((g) => g.id === gatewayId)?.slug?.toLowerCase() ===
          "qris" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              QR Image
            </label>
            <div className="flex items-center gap-3">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                {qrisMediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrisMediaUrl}
                    alt="QRIS"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <PhotoIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setQrisPickerOpen(true)}
                ariaLabel="Select QR Image"
              >
                <PhotoIcon className="h-4 w-4" />
              </Button>
            </div>
            {qrisPickerOpen && (
              <MediaPicker
                mode="single"
                mediaType="user_profile"
                selectedMedia={[]}
                onSelect={(items) => {
                  const it = items?.[0];
                  if (it) {
                    setQrisMediaId(it.id);
                    setQrisMediaUrl(it.file_url);
                  }
                  setQrisPickerOpen(false);
                }}
                onClose={() => setQrisPickerOpen(false)}
                autoCreateFolder="site-assets"
              />
            )}
          </div>
        )}
        {![
          "bank_transfer",
          "bank-transfer",
          "bank transfer",
          "cod",
          "cash-on-delivery",
          "cash_on_delivery",
          "cash on delivery",
        ].includes((m?.slug || slug || "").toLowerCase()) && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500">
              Example:
              <pre className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg overflow-auto">{`{
  "instructions": "Your message to customer"
}`}</pre>
            </div>
            <label className="text-sm font-medium text-gray-900">
              Settings (JSON)
            </label>
            <textarea
              value={settingsText}
              onChange={(e) => setSettingsText(e.target.value)}
              className="min-h-[180px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono"
            />
          </div>
        )}
      </Modal>
    );
  }

  function GatewayRow({ gateway }: { gateway: PaymentGatewayRow }) {
    const expanded = expandedGatewayId === gateway.id;
    const methods = methodsByGateway[gateway.id] || [];
    return (
      <div className="border-t border-gray-100">
        <div className="py-3 pr-3 pl-2 flex items-center gap-3">
          <button
            className={`p-1 rounded-md ${
              expanded
                ? "bg-blue-50 text-blue-700"
                : "hover:bg-gray-100 text-gray-600"
            }`}
            onClick={async () => {
              if (!expanded) await loadMethods(gateway.id);
              setExpandedGatewayId(expanded ? null : gateway.id);
            }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${
                expanded ? "rotate-90" : "rotate-0"
              }`}
            />
          </button>
          <GatewayLogo gateway={gateway} />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">
              {gateway.name}
            </div>
            <div className="text-xs text-gray-500 truncate">{gateway.slug}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setLogoPickerOpenForGateway(gateway.id)}
              ariaLabel="Set logo"
            >
              <PhotoIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditGatewayId(gateway.id)}
              ariaLabel="Edit"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteGateway(gateway.id)}
              ariaLabel="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
            <Toggle
              checked={gateway.is_enabled}
              onChange={(v) => setGatewayEnabled(gateway.id, v)}
            />
          </div>
        </div>

        {expanded && (
          <div className="bg-gray-50/40 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">Methods</div>
              <Button
                onClick={() => createMethod(gateway.id)}
                ariaLabel="Add method"
              >
                <PlusCircleIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Method</span>
              </Button>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm bg-white">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pl-3 pr-3">Name</th>
                    <th className="py-2 pr-3">Slug</th>
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {methods.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100">
                      <td className="py-2 pl-3 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {m.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.logo_url}
                                alt={m.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <PhotoIcon className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 break-words max-w-[220px] sm:max-w-none">
                              {m.name}
                            </div>
                            {m.description && (
                              <div className="text-xs text-gray-500 break-words max-w-[260px] sm:max-w-none">
                                {m.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{m.slug}</td>
                      <td className="py-2 pr-3 text-gray-600">
                        {m.display_order}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-md font-medium ${
                            m.is_enabled
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {m.is_enabled ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setEditMethod({
                                gatewayId: gateway.id,
                                methodId: m.id,
                              })
                            }
                            ariaLabel="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setLogoPickerOpenForMethod(m.id)}
                            ariaLabel="Set logo"
                          >
                            <PhotoIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => deleteMethod(m)}
                            ariaLabel="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                          <Toggle
                            checked={m.is_enabled}
                            onChange={(v) => setMethodEnabled(m, v)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {methods.length === 0 && (
                    <tr>
                      <td className="py-4 text-gray-500" colSpan={5}>
                        No methods yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {logoPickerOpenForGateway === gateway.id && (
          <MediaPicker
            mode="single"
            mediaType="user_profile"
            selectedMedia={[]}
            onSelect={(items) => onGatewayLogoPick(gateway.id, items)}
            onClose={() => setLogoPickerOpenForGateway(null)}
            autoCreateFolder="site-assets"
          />
        )}
      </div>
    );
  }

  async function onMethodLogoPick(methodId: string, media: MediaItem[]) {
    const mediaId = media?.[0]?.id;
    if (!mediaId) return;
    // find gateway id
    const gwId = Object.entries(methodsByGateway).find(([_, arr]) =>
      arr.some((m) => m.id === methodId)
    )?.[0];
    if (!gwId) return;
    try {
      const res = await fetch(
        `/api/admin/payments/gateways/${gwId}/methods/${methodId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logo_media_id: mediaId }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to set logo");
      toast.success("Logo updated");
      await loadMethods(gwId);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Payment Settings</h1>
          <p className="text-sm text-gray-500">
            Manage payment gateways and their methods.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCreatingGatewayOpen(true)}
            ariaLabel="Add Gateway"
          >
            <PlusCircleIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Gateway</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setCreatingMethodOpen(true);
              setMethodCreateGatewayId(gateways[0]?.id || null);
            }}
            ariaLabel="Add Method"
          >
            <PlusCircleIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Method</span>
          </Button>
        </div>
      </div>

      <Card>
        <div className="px-6 pt-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              className={`px-3 py-1.5 text-sm rounded-md ${
                activeTab === "gateways"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("gateways")}
            >
              Gateways
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-md ${
                activeTab === "methods"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("methods")}
            >
              Methods
            </button>
          </div>
        </div>

        {activeTab === "gateways" ? (
          <div className="p-6">
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm bg-white">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pl-2">Gateway</th>
                      <th className="py-2 pr-3">Slug</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateways.map((g) => (
                      <tr key={g.id} className="align-top">
                        <td className="p-0" colSpan={4}>
                          <div className="px-2">
                            <GatewayRow gateway={g} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {gateways.length === 0 && (
                      <tr>
                        <td className="py-4 text-gray-500" colSpan={4}>
                          No gateways yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="text-sm text-gray-600">
                {loadingAllMethods
                  ? "Loading methods..."
                  : `${allMethods.length} methods across ${gateways.length} gateways`}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={methodCreateGatewayId || ""}
                  onChange={(e) =>
                    setMethodCreateGatewayId(e.target.value || null)
                  }
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">Select gateway</option>
                  {gateways.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => setCreatingMethodOpen(true)}
                  ariaLabel="Add Method"
                >
                  <PlusCircleIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Method</span>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm bg-white">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pl-3 pr-3">Method</th>
                      <th className="py-2 pr-3">Gateway</th>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMethods.map((m) => (
                      <tr key={m.id} className="border-t border-gray-100">
                        <td className="py-2 pl-3 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                              {m.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={m.logo_url}
                                  alt={m.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <PhotoIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 break-words max-w-[220px] sm:max-w-none">
                                {m.name}
                              </div>
                              {m.description && (
                                <div className="text-xs text-gray-500 break-words max-w-[260px] sm:max-w-none">
                                  {m.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-gray-600">
                          {m.gateway_name}
                        </td>
                        <td className="py-2 pr-3 text-gray-600">
                          {m.display_order}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-md font-medium ${
                              m.is_enabled
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {m.is_enabled ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setEditMethod({
                                  gatewayId: m.gateway_id,
                                  methodId: m.id,
                                })
                              }
                              ariaLabel="Edit"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setLogoPickerOpenForMethod(m.id)}
                              ariaLabel="Set logo"
                            >
                              <PhotoIcon className="h-4 w-4" />
                            </Button>
                            <Toggle
                              checked={m.is_enabled}
                              onChange={(v) => setMethodEnabled(m, v)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allMethods.length === 0 && (
                      <tr>
                        <td className="py-4 text-gray-500" colSpan={5}>
                          No methods yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>

      {creatingGatewayOpen && (
        <Modal
          title="New Gateway"
          onClose={() => setCreatingGatewayOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreatingGatewayOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const f = document.getElementById(
                    "create-gateway-form"
                  ) as HTMLFormElement | null;
                  f?.requestSubmit();
                }}
              >
                Create
              </Button>
            </div>
          }
        >
          <form
            id="create-gateway-form"
            action={(formData) => {
              void createGateway(formData);
              setCreatingGatewayOpen(false);
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Input name="name" label="Name" placeholder="PayPal" required />
            <Input name="slug" label="Slug (optional)" placeholder="paypal" />
            <div className="sm:col-span-2">
              <Textarea
                name="description"
                label="Description"
                placeholder="Description (optional)"
              />
            </div>
          </form>
        </Modal>
      )}

      {creatingMethodOpen && (
        <Modal
          title="New Method"
          onClose={() => setCreatingMethodOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreatingMethodOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!methodCreateGatewayId) {
                    toast.error("Select a gateway first");
                    return;
                  }
                  setCreatingMethodOpen(false);
                  const ok = await (async () => {
                    const res = await fetch(
                      `/api/admin/payments/gateways/${methodCreateGatewayId}/methods`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: "New Method",
                          is_enabled: true,
                          display_order: 0,
                        }),
                      }
                    );
                    const d = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(d?.error || "Failed to create method");
                      return false;
                    }
                    toast.success("Method created");
                    return true;
                  })();
                  if (ok) await loadMethods(methodCreateGatewayId);
                }}
              >
                Create
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-900">
                Gateway
              </label>
              <select
                value={methodCreateGatewayId || ""}
                onChange={(e) =>
                  setMethodCreateGatewayId(e.target.value || null)
                }
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Select gateway...</option>
                {gateways.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-gray-500 sm:col-span-2">
              A new method with default values will be created. You can edit
              details later.
            </p>
          </div>
        </Modal>
      )}

      {logoPickerOpenForMethod && (
        <MediaPicker
          mode="single"
          mediaType="user_profile"
          selectedMedia={[]}
          onSelect={(items) => onMethodLogoPick(logoPickerOpenForMethod, items)}
          onClose={() => setLogoPickerOpenForMethod(null)}
          autoCreateFolder="site-assets"
        />
      )}

      {editGatewayId && <EditGatewayModal id={editGatewayId} />}
      {editMethod && (
        <EditMethodModal
          gatewayId={editMethod.gatewayId}
          methodId={editMethod.methodId}
        />
      )}
    </div>
  );
}
