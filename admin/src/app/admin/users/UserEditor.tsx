"use client";

import React, { useEffect, useMemo, useState } from "react";
import MediaPicker, { MediaItem } from "@/components/MediaPicker";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  User2,
  Image as ImageIcon,
  MapPin,
  Mail,
  Shield,
  Plus,
  Trash2,
  Edit3,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "vendor" | "customer" | "guest";
  image: string | null;
  created_at?: string;
};

export type AddressRow = {
  id: string;
  user_id: string;
  address_name: string;
  recipient_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

function Button({
  children,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  } as const;
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
    md: "px-4 py-2 text-sm rounded-lg gap-2",
    lg: "px-6 py-3 text-base rounded-lg gap-2",
  } as const;
  return (
    <button
      className={`inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function UserEditor({
  initialUser,
  initialAddresses,
  loading,
}: {
  initialUser?: UserRow | null;
  initialAddresses?: AddressRow[];
  loading?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserRow>(
    initialUser || {
      id: "",
      name: "",
      email: "",
      role: "customer",
      image: null,
    }
  );
  const [addresses, setAddresses] = useState<AddressRow[]>(
    initialAddresses || []
  );
  const [showPicker, setShowPicker] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const isNew = !initialUser?.id;
  const { apiCall, apiCallJson } = useAuthenticatedFetch();

  // Sync local state when props are loaded asynchronously
  useEffect(() => {
    if (initialUser) {
      setUser({
        id: initialUser.id,
        name: initialUser.name,
        email: initialUser.email,
        role: initialUser.role,
        image: initialUser.image,
        created_at: initialUser.created_at,
      } as UserRow);
    }
  }, [initialUser]);

  useEffect(() => {
    if (initialAddresses) {
      setAddresses(initialAddresses);
    }
  }, [initialAddresses]);

  const canSave = useMemo(() => !!user.email.trim(), [user.email]);

  async function saveUser(status?: "stay" | "back") {
    try {
      const payload = {
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      };
      const d = await apiCallJson(
        isNew ? "/api/admin/users" : `/api/admin/users/${user.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      toast.success("Saved");
      if (isNew) {
        const id = d?.item?.id as string | undefined;
        if (id) router.push(`/admin/users/${id}`);
      } else if (status === "back") router.push("/admin/users");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  async function onAvatarSelect(items: MediaItem[]) {
    if (!user.id) {
      toast.error("Please save the user before setting an avatar");
      setShowPicker(false);
      return;
    }
    if (!items?.length) return;
    try {
      const media = items[0];
      const d = await apiCallJson(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_media_id: media.id }),
      });
      setUser((u) => ({ ...u, image: media.file_url }));
      setShowPicker(false);
      toast.success("Avatar updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  async function addAddress() {
    const d = await apiCallJson(`/api/admin/users/${user.id}/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address_name: "Home",
        recipient_name: user.name || "",
        phone_number: "",
        street_address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        is_default: addresses.length === 0,
      }),
    });
    setAddresses((a) => [d.item, ...a]);
  }

  async function updateAddress(row: AddressRow) {
    const d = await apiCallJson(`/api/admin/users/${user.id}/addresses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    setAddresses((as) => as.map((a) => (a.id === row.id ? d.item : a)));
  }

  async function deleteAddress(id: string) {
    if (!confirm("Delete this address?")) return;
    const res = await apiCall(`/api/admin/users/${user.id}/addresses`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return toast.error("Failed to delete address");
    setAddresses((as) => as.filter((a) => a.id !== id));
  }

  async function resetPassword() {
    if (!user.id) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      const d = await apiCallJson(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      toast.success("Password updated");
      setNewPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm">
        <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="border-l border-gray-200 pl-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {isNew ? "Create User" : "Edit User"}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Account profile, role, avatar, and addresses
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveUser("stay")}
              disabled={!canSave}
            >
              <Save className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => saveUser("back")}
              disabled={!canSave}
            >
              <Save className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Save & Close</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm p-6">
        <div className="mb-6 flex items-center gap-3">
          <User2 className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">Profile</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" /> Email
            </label>
            <input
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900">Name</label>
            <input
              value={user.name || ""}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" /> Role
            </label>
            <select
              value={user.role}
              onChange={(e) =>
                setUser({ ...user, role: e.target.value as UserRow["role"] })
              }
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              disabled={user.role === "admin"}
              title={
                user.role === "admin" ? "Cannot change admin role" : "Set role"
              }
            >
              {(["vendor", "customer", "guest", "admin"] as const).map((r) => (
                <option key={r} value={r} disabled={r === "admin"}>
                  {r}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Admin role cannot be assigned via UI.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-500" /> Avatar
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name || user.email}
                    className="w-14 h-14 object-cover"
                  />
                ) : (
                  <User2 className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPicker(true)}
                disabled={isNew}
                title={isNew ? "Save user first" : "Choose avatar"}
              >
                <ImageIcon className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Choose</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Security: Reset Password */}
      {!isNew && (
        <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm p-6">
          <div className="mb-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">Security</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="text-sm font-medium text-gray-900">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
              <p className="text-xs text-gray-500 mt-1">
                This sets a new password for the selected user.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Button
                variant="primary"
                onClick={resetPassword}
                disabled={newPassword.length < 8}
                title={
                  newPassword.length < 8 ? "Password too short" : "Set password"
                }
              >
                <Save className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Set Password</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Addresses */}
      {!isNew && (
        <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm p-6">
          <div className="mb-6 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">Addresses</h3>
            <div className="ml-auto">
              <Button variant="outline" onClick={addAddress}>
                <Plus className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-3">Label</th>
                  <th className="py-2 pr-3">Recipient</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Default</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {addresses.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="py-2 pr-3">
                      <input
                        value={a.address_name}
                        onChange={(e) =>
                          setAddresses((as) =>
                            as.map((x) =>
                              x.id === a.id
                                ? { ...x, address_name: e.target.value }
                                : x
                            )
                          )
                        }
                        className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={a.recipient_name}
                        onChange={(e) =>
                          setAddresses((as) =>
                            as.map((x) =>
                              x.id === a.id
                                ? { ...x, recipient_name: e.target.value }
                                : x
                            )
                          )
                        }
                        className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={a.phone_number}
                        onChange={(e) =>
                          setAddresses((as) =>
                            as.map((x) =>
                              x.id === a.id
                                ? { ...x, phone_number: e.target.value }
                                : x
                            )
                          )
                        }
                        className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={a.street_address}
                        onChange={(e) =>
                          setAddresses((as) =>
                            as.map((x) =>
                              x.id === a.id
                                ? { ...x, street_address: e.target.value }
                                : x
                            )
                          )
                        }
                        className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={a.is_default}
                        onChange={(e) =>
                          setAddresses((as) =>
                            as.map((x) => ({
                              ...x,
                              is_default:
                                x.id === a.id ? e.target.checked : false,
                            }))
                          )
                        }
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateAddress(addresses.find((x) => x.id === a.id)!)
                          }
                        >
                          <Edit3 className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Save</span>
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => deleteAddress(a.id)}
                        >
                          <Trash2 className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {addresses.length === 0 && (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={6}>
                      No addresses yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPicker && (
        <MediaPicker
          mode="single"
          mediaType="user_profile"
          autoCreateFolder="avatars"
          onClose={() => setShowPicker(false)}
          onSelect={onAvatarSelect}
        />
      )}
    </div>
  );
}
