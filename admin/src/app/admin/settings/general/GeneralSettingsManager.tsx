"use client";

interface MediaItem {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  size: number;
  alt_text?: string;
  media_type: string;
  folder_name?: string;
  folder_path?: string;
  uploaded_by_name?: string;
  created_at: string;
}

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  GlobeAltIcon,
  MapPinIcon,
  Square3Stack3DIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import MediaPicker from "@/components/MediaPicker";
import toast from "react-hot-toast";

interface SettingsData {
  id?: string;
  site_name: string;
  site_description: string;
  contact_email: string;
  contact_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  currency_code: string;
  currency_symbol: string;
  logo_media_id?: string | null;
  favicon_media_id?: string | null;
  default_product_image_id?: string | null;
  default_user_avatar_id?: string | null;
  social_share_image_id?: string | null;
  other_settings?: Record<string, unknown>;
  // Media URLs from JOIN
  logo_url?: string;
  logo_alt?: string;
  favicon_url?: string;
  favicon_alt?: string;
  default_product_url?: string;
  default_product_alt?: string;
  default_avatar_url?: string;
  default_avatar_alt?: string;
  social_share_url?: string;
  social_share_alt?: string;
  // Email settings
  email_from_name?: string;
  email_from_email?: string;
  email_reply_to?: string;
}

interface GeneralSettingsManagerProps {
  initialSettings: SettingsData | null;
}

export default function GeneralSettingsManager({
  initialSettings,
}: GeneralSettingsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMediaPicker, setShowMediaPicker] = useState<string | null>(null); // logo, favicon, etc.

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`GeneralSettingsManager API Error on ${url}:`, error);
      // Let component handle error display via toast
    },
  });

  const [settings, setSettings] = useState<SettingsData>({
    site_name: initialSettings?.site_name || "PlazaCMS",
    site_description: initialSettings?.site_description || "",
    contact_email: initialSettings?.contact_email || "",
    contact_phone: initialSettings?.contact_phone || "",
    address_line1: initialSettings?.address_line1 || "",
    address_line2: initialSettings?.address_line2 || "",
    city: initialSettings?.city || "",
    state: initialSettings?.state || "",
    postal_code: initialSettings?.postal_code || "",
    country: initialSettings?.country || "",
    currency_code: initialSettings?.currency_code || "USD",
    currency_symbol: initialSettings?.currency_symbol || "$",
    logo_media_id: initialSettings?.logo_media_id,
    favicon_media_id: initialSettings?.favicon_media_id,
    default_product_image_id: initialSettings?.default_product_image_id,
    default_user_avatar_id: initialSettings?.default_user_avatar_id,
    social_share_image_id: initialSettings?.social_share_image_id,
    other_settings: initialSettings?.other_settings || {},
    // URLs
    logo_url: initialSettings?.logo_url,
    logo_alt: initialSettings?.logo_alt,
    favicon_url: initialSettings?.favicon_url,
    favicon_alt: initialSettings?.favicon_alt,
    default_product_url: initialSettings?.default_product_url,
    default_product_alt: initialSettings?.default_product_alt,
    default_avatar_url: initialSettings?.default_avatar_url,
    default_avatar_alt: initialSettings?.default_avatar_alt,
    social_share_url: initialSettings?.social_share_url,
    social_share_alt: initialSettings?.social_share_alt,
  });

  const updateField = (field: keyof SettingsData, value: unknown) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleMediaSelect = (media: MediaItem[]) => {
    if (media.length > 0 && showMediaPicker) {
      const selectedMedia = media[0];
      updateField(
        `${showMediaPicker}_media_id` as keyof SettingsData,
        selectedMedia.id
      );
      updateField(
        `${showMediaPicker}_url` as keyof SettingsData,
        selectedMedia.file_url
      );
      updateField(
        `${showMediaPicker}_alt` as keyof SettingsData,
        selectedMedia.alt_text
      );
    }
    setShowMediaPicker(null);
  };

  const removeImage = (type: string) => {
    updateField(`${type}_media_id` as keyof SettingsData, null);
    updateField(`${type}_url` as keyof SettingsData, undefined);
    updateField(`${type}_alt` as keyof SettingsData, undefined);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await apiCallJson("/api/admin/settings/general", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            site_name: settings.site_name,
            site_description: settings.site_description,
            contact_email: settings.contact_email,
            contact_phone: settings.contact_phone,
            address_line1: settings.address_line1,
            address_line2: settings.address_line2,
            city: settings.city,
            state: settings.state,
            postal_code: settings.postal_code,
            country: settings.country,
            currency_code: settings.currency_code,
            currency_symbol: settings.currency_symbol,
            logo_media_id: settings.logo_media_id,
            favicon_media_id: settings.favicon_media_id,
            default_product_image_id: settings.default_product_image_id,
            default_user_avatar_id: settings.default_user_avatar_id,
            social_share_image_id: settings.social_share_image_id,
            other_settings: settings.other_settings,
          }),
        });

        toast.success("Settings saved successfully!");
        router.refresh();
      } catch (error: unknown) {
        // Error already handled by useAuthenticatedFetch interceptor
        toast.error(
          error instanceof Error ? error.message : "Failed to save settings"
        );
      }
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Site Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Site Information
              </h3>
              <p className="text-sm text-gray-600">
                Basic information about your website
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <Input
                  value={settings.site_name}
                  onChange={(e) => updateField("site_name", e.target.value)}
                  placeholder="Your Site Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Description
                </label>
                <textarea
                  value={settings.site_description}
                  onChange={(e) =>
                    updateField("site_description", e.target.value)
                  }
                  placeholder="Brief description of your website..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Logo
              </label>
              <ImageUploadBox
                imageUrl={settings.logo_url}
                imageAlt={settings.logo_alt}
                onUpload={() => setShowMediaPicker("logo")}
                onRemove={() => removeImage("logo")}
                label="Upload Logo"
                description="Recommended: 200x60px PNG"
              />
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <PhoneIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Contact Information
              </h3>
              <p className="text-sm text-gray-600">
                How customers can reach you
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => updateField("contact_email", e.target.value)}
                  placeholder="contact@yoursite.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  value={settings.contact_phone}
                  onChange={(e) => updateField("contact_phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1
                </label>
                <Input
                  value={settings.address_line1}
                  onChange={(e) => updateField("address_line1", e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <Input
                  value={settings.address_line2}
                  onChange={(e) => updateField("address_line2", e.target.value)}
                  placeholder="Suite 100 (optional)"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <Input
                    value={settings.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <Input
                    value={settings.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    placeholder="NY"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <Input
                    value={settings.postal_code}
                    onChange={(e) => updateField("postal_code", e.target.value)}
                    placeholder="10001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <Input
                    value={settings.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    placeholder="United States"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Currency Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Currency Settings
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency Code
              </label>
              <select
                value={settings.currency_code}
                onChange={(e) => updateField("currency_code", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="IDR">IDR - Indonesian Rupiah</option>
                <option value="SGD">SGD - Singapore Dollar</option>
                <option value="MYR">MYR - Malaysian Ringgit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency Symbol
              </label>
              <Input
                value={settings.currency_symbol}
                onChange={(e) => updateField("currency_symbol", e.target.value)}
                placeholder="$"
              />
            </div>
          </div>
        </Card>

        {/* Default Images */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <PhotoIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Default Images
              </h3>
              <p className="text-sm text-gray-600">
                Set default images for your site
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favicon
                </label>
                <ImageUploadBox
                  imageUrl={settings.favicon_url}
                  imageAlt={settings.favicon_alt}
                  onUpload={() => setShowMediaPicker("favicon")}
                  onRemove={() => removeImage("favicon")}
                  label="Upload Favicon"
                  description="Recommended: 32x32px ICO/PNG"
                  size="small"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Product Image
                </label>
                <ImageUploadBox
                  imageUrl={settings.default_product_url}
                  imageAlt={settings.default_product_alt}
                  onUpload={() => setShowMediaPicker("default_product")}
                  onRemove={() => removeImage("default_product")}
                  label="Upload Default Product Image"
                  description="Used when products have no image"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default User Avatar
                </label>
                <ImageUploadBox
                  imageUrl={settings.default_avatar_url}
                  imageAlt={settings.default_avatar_alt}
                  onUpload={() => setShowMediaPicker("default_user_avatar")}
                  onRemove={() => removeImage("default_user_avatar")}
                  label="Upload Default Avatar"
                  description="Default user profile picture"
                  size="small"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Social Share Image
                </label>
                <ImageUploadBox
                  imageUrl={settings.social_share_url}
                  imageAlt={settings.social_share_alt}
                  onUpload={() => setShowMediaPicker("social_share")}
                  onRemove={() => removeImage("social_share")}
                  label="Upload Social Share Image"
                  description="Used for social media previews"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending} className="px-8">
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* MediaPicker Outside Form */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-[60]">
          <MediaPicker
            mode="single"
            mediaType="product_image"
            selectedMedia={[]}
            onSelect={handleMediaSelect}
            onClose={() => setShowMediaPicker(null)}
            autoCreateFolder="settings"
          />
        </div>
      )}
    </>
  );
}

// Helper component for image upload boxes
function ImageUploadBox({
  imageUrl,
  imageAlt,
  onUpload,
  onRemove,
  label,
  description,
  size = "normal",
}: {
  imageUrl?: string;
  imageAlt?: string;
  onUpload: () => void;
  onRemove: () => void;
  label: string;
  description: string;
  size?: "small" | "normal";
}) {
  const sizeClasses = size === "small" ? "w-16 h-16" : "w-24 h-24";

  return (
    <div className="space-y-2">
      {imageUrl ? (
        <div className="relative inline-block">
          <div
            className={`${sizeClasses} rounded-lg overflow-hidden bg-gray-100`}
          >
            <img
              src={imageUrl}
              alt={imageAlt || "Preview"}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onUpload}
          className={`${sizeClasses} border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors`}
        >
          <PhotoIcon className="h-6 w-6 mb-1" />
          <span className="text-xs text-center">
            Add
            <br />
            Image
          </span>
        </button>
      )}
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
