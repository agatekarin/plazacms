"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Save,
  TestTube,
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";

interface SMTPAccount {
  id: string;
  name: string;
  description?: string;
  host: string;
  port: number;
  username: string;
  password_encrypted: string;
  encryption: string;
  weight: number;
  priority: number;
  daily_limit: number;
  hourly_limit: number;
  is_active: boolean;
  tags: string[];
  from_email?: string;
  from_name?: string;
}

interface SMTPAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (accountData: any) => Promise<void>;
  editingAccount: SMTPAccount | null;
}

const ENCRYPTION_OPTIONS = [
  { value: "tls", label: "TLS (Recommended)" },
  { value: "ssl", label: "SSL" },
  { value: "none", label: "None (Insecure)" },
];

const COMMON_SMTP_PROVIDERS = [
  {
    name: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    encryption: "tls",
    note: "Use App Password, not regular password",
  },
  {
    name: "Outlook/Hotmail",
    host: "smtp-mail.outlook.com",
    port: 587,
    encryption: "tls",
    note: "Use App Password for 2FA accounts",
  },
  {
    name: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: 587,
    encryption: "tls",
    note: "Enable 'Less secure app access'",
  },
  {
    name: "SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    encryption: "tls",
    note: "Username: 'apikey', Password: your API key",
  },
  {
    name: "Mailgun",
    host: "smtp.mailgun.org",
    port: 587,
    encryption: "tls",
    note: "Use your Mailgun SMTP credentials",
  },
  {
    name: "Custom SMTP",
    host: "",
    port: 587,
    encryption: "tls",
    note: "Enter your custom SMTP server details",
  },
];

export default function SMTPAccountModal({
  open,
  onClose,
  onSave,
  editingAccount,
}: SMTPAccountModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    host: "",
    port: 587,
    username: "",
    password: "",
    encryption: "tls",
    weight: 1,
    priority: 100,
    daily_limit: 1000,
    hourly_limit: 100,
    is_active: true,
    tags: [] as string[],
    from_email: "",
    from_name: "PlazaCMS",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedProvider, setSelectedProvider] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        name: editingAccount.name,
        description: editingAccount.description || "",
        host: editingAccount.host,
        port: editingAccount.port,
        username: editingAccount.username,
        password: editingAccount.password_encrypted || "", // Pre-fill for easier editing
        encryption: editingAccount.encryption,
        weight: editingAccount.weight,
        priority: editingAccount.priority,
        daily_limit: editingAccount.daily_limit,
        hourly_limit: editingAccount.hourly_limit,
        is_active: editingAccount.is_active,
        tags: [...editingAccount.tags],
        from_email: editingAccount.from_email || "",
        from_name: editingAccount.from_name || "PlazaCMS",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        host: "",
        port: 587,
        username: "",
        password: "",
        encryption: "tls",
        weight: 1,
        priority: 100,
        daily_limit: 1000,
        hourly_limit: 100,
        is_active: true,
        tags: [],
        from_email: "",
        from_name: "PlazaCMS",
      });
    }
    setErrors({});
    setSelectedProvider("");
    setNewTag("");
  }, [editingAccount, open]);

  const handleProviderSelect = (provider: any) => {
    setSelectedProvider(provider.name);
    setFormData((prev) => ({
      ...prev,
      host: provider.host,
      port: provider.port,
      encryption: provider.encryption,
      name: prev.name || `${provider.name} Account`,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Account name is required";
    }

    if (!formData.host.trim()) {
      newErrors.host = "SMTP host is required";
    }

    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = "Port must be between 1 and 65535";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    // Validate from_email if provided
    if (formData.from_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.from_email.trim())) {
        newErrors.from_email = "Please enter a valid email address";
      }
    }

    // Validate from_name if provided
    if (formData.from_name.trim() && formData.from_name.trim().length > 100) {
      newErrors.from_name = "From name must be 100 characters or less";
    }

    if (formData.weight < 1 || formData.weight > 10) {
      newErrors.weight = "Weight must be between 1 and 10";
    }

    if (formData.priority < 1 || formData.priority > 1000) {
      newErrors.priority = "Priority must be between 1 and 1000";
    }

    if (formData.daily_limit < 1 || formData.daily_limit > 10000) {
      newErrors.daily_limit = "Daily limit must be between 1 and 10,000";
    }

    if (formData.hourly_limit < 1 || formData.hourly_limit > 1000) {
      newErrors.hourly_limit = "Hourly limit must be between 1 and 1,000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Always send the password since it's pre-filled
      await onSave({ ...formData });
    } catch (error) {
      console.error("Error saving SMTP account:", error);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingAccount ? "Edit SMTP Account" : "Add New SMTP Account"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure SMTP server settings for email sending
            </p>
          </div>
          <Button variant="outline" onClick={onClose} className="p-2">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          {!editingAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Setup (Optional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {COMMON_SMTP_PROVIDERS.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => handleProviderSelect(provider)}
                    className={`p-3 border rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition-colors ${
                      selectedProvider === provider.name
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="font-medium text-sm">{provider.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {provider.note}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Basic Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Gmail Primary Account"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (1-10) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        weight: parseInt(e.target.value) || 1,
                      }))
                    }
                    className={errors.weight ? "border-red-500" : ""}
                  />
                  {errors.weight && (
                    <p className="mt-1 text-xs text-red-600">{errors.weight}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Higher = more emails
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority (1-1000) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: parseInt(e.target.value) || 100,
                      }))
                    }
                    className={errors.priority ? "border-red-500" : ""}
                  />
                  {errors.priority && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.priority}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Lower = higher priority
                  </p>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Account Active
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Only active accounts will be used for sending emails
                </p>
              </div>
            </div>

            {/* SMTP Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                SMTP Configuration
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host *
                </label>
                <Input
                  value={formData.host}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, host: e.target.value }))
                  }
                  placeholder="smtp.gmail.com"
                  className={errors.host ? "border-red-500" : ""}
                />
                {errors.host && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.host}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="65535"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        port: parseInt(e.target.value) || 587,
                      }))
                    }
                    className={errors.port ? "border-red-500" : ""}
                  />
                  {errors.port && (
                    <p className="mt-1 text-xs text-red-600">{errors.port}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Encryption *
                  </label>
                  <select
                    value={formData.encryption}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        encryption: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {ENCRYPTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <Input
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="your-email@gmail.com"
                  className={errors.username ? "border-red-500" : ""}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.username}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Your password or app password"
                    className={
                      errors.password ? "border-red-500 pr-10" : "pr-10"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* From Email Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              From Email Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <Input
                  type="email"
                  value={formData.from_email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      from_email: e.target.value,
                    }))
                  }
                  placeholder="noreply@plazaku.my.id"
                  className={errors.from_email ? "border-red-500" : ""}
                />
                {errors.from_email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.from_email}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The email address that will appear as the sender. Leave empty
                  to auto-detect from username.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <Input
                  type="text"
                  value={formData.from_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      from_name: e.target.value,
                    }))
                  }
                  placeholder="PlazaCMS"
                  className={errors.from_name ? "border-red-500" : ""}
                />
                {errors.from_name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.from_name}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The name that will appear as the sender (e.g., "PlazaCMS",
                  "Customer Support").
                </p>
              </div>
            </div>
          </div>

          {/* Rate Limits */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Rate Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Limit *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.daily_limit}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      daily_limit: parseInt(e.target.value) || 1000,
                    }))
                  }
                  className={errors.daily_limit ? "border-red-500" : ""}
                />
                {errors.daily_limit && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.daily_limit}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Maximum emails per day
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Limit *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.hourly_limit}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hourly_limit: parseInt(e.target.value) || 100,
                    }))
                  }
                  className={errors.hourly_limit ? "border-red-500" : ""}
                />
                {errors.hourly_limit && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.hourly_limit}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Maximum emails per hour
                </p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag (e.g., primary, backup, gmail)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={addTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Tags help organize and filter your SMTP accounts
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="h-4 w-4" />
            {editingAccount
              ? "Update existing SMTP account"
              : "Create new SMTP account"}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingAccount ? "Update Account" : "Create Account"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
