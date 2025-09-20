"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { toast } from "react-hot-toast";
import EmailRotationBreadcrumb from "@/components/EmailRotationBreadcrumb";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface APIProvider {
  id: string;
  name: string;
  provider_type: "resend" | "brevo" | "mailjet";
  api_key_encrypted: string;
  api_secret_encrypted?: string;
  base_url?: string;
  from_email: string;
  weight: number;
  priority: number;
  daily_limit: number;
  hourly_limit: number;
  is_active: boolean;
  is_healthy: boolean;
  consecutive_failures: number;
  total_success_count: number;
  total_failure_count: number;
  today_sent_count: number;
  current_hour_sent: number;
  avg_response_time_ms: number;
  last_used_at?: string;
  last_health_check_at?: string;
  last_error_message?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface ProviderFormData {
  name: string;
  provider_type: "resend" | "brevo" | "mailjet";
  api_key: string;
  api_secret?: string;
  base_url?: string;
  from_email: string;
  weight: number;
  priority: number;
  daily_limit: number;
  hourly_limit: number;
  is_active: boolean;
  tags: string;
  metadata: Record<string, any>;
}

export default function EmailAPIProvidersPage() {
  const [providers, setProviders] = useState<APIProvider[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<APIProvider | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<APIProvider | null>(
    null
  );
  const [testEmail, setTestEmail] = useState("");
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProviderFormData>({
    name: "",
    provider_type: "resend",
    api_key: "",
    api_secret: "",
    base_url: "",
    from_email: "",
    weight: 1,
    priority: 100,
    daily_limit: 10000,
    hourly_limit: 1000,
    is_active: true,
    tags: "",
    metadata: {},
  });

  const { apiCallJson, isLoading } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "API request failed");
    },
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await apiCallJson("/api/admin/email-api-providers");
      if (data.success) {
        setProviders(data.data);
      }
    } catch (error) {
      console.error("Failed to load providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      let response;
      if (editingProvider) {
        response = await apiCallJson(
          `/api/admin/email-api-providers/${editingProvider.id}`,
          {
            method: "PUT",
            body: JSON.stringify(submitData),
          }
        );
      } else {
        response = await apiCallJson("/api/admin/email-api-providers", {
          method: "POST",
          body: JSON.stringify(submitData),
        });
      }

      if (response.success) {
        toast.success(response.message || "Provider saved successfully");
        resetForm();
        loadProviders();
      }
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const handleEdit = (provider: APIProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      provider_type: provider.provider_type,
      api_key: provider.api_key_encrypted || "", // Pre-fill for easier editing
      api_secret: provider.api_secret_encrypted || "",
      base_url: provider.base_url || "",
      from_email: provider.from_email || "",
      weight: provider.weight,
      priority: provider.priority,
      daily_limit: provider.daily_limit,
      hourly_limit: provider.hourly_limit,
      is_active: provider.is_active,
      tags: provider.tags.join(", "),
      metadata: {},
    });
    setShowAddForm(true);
  };

  const handleDelete = async (provider: APIProvider) => {
    if (!confirm(`Are you sure you want to delete "${provider.name}"?`)) return;

    try {
      const response = await apiCallJson(
        `/api/admin/email-api-providers/${provider.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        toast.success("Provider deleted successfully");
        loadProviders();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleTestProvider = async (provider: APIProvider) => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    try {
      setTestingProvider(provider.id);
      const response = await apiCallJson(
        `/api/admin/email-api-providers/${provider.id}/test`,
        {
          method: "POST",
          body: JSON.stringify({ test_email: testEmail }),
        }
      );

      if (response.success) {
        const result = response.data;
        if (result.health.healthy) {
          toast.success(
            `✅ ${provider.name} is healthy! Response: ${result.health.responseTime}ms`
          );
        } else {
          toast.error(`❌ ${provider.name} failed: ${result.health.error}`);
        }
        loadProviders(); // Refresh to show updated health status
      }
    } catch (error) {
      console.error("Test error:", error);
    } finally {
      setTestingProvider(null);
    }
  };

  const resetCounters = async (provider: APIProvider) => {
    try {
      const response = await apiCallJson(
        `/api/admin/email-api-providers/${provider.id}/reset-counters`,
        {
          method: "POST",
        }
      );

      if (response.success) {
        toast.success("Counters reset successfully");
        loadProviders();
      }
    } catch (error) {
      console.error("Reset counters error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider_type: "resend",
      api_key: "",
      api_secret: "",
      base_url: "",
      from_email: "",
      weight: 1,
      priority: 100,
      daily_limit: 10000,
      hourly_limit: 1000,
      is_active: true,
      tags: "",
      metadata: {},
    });
    setEditingProvider(null);
    setShowAddForm(false);
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "resend":
        return "📧";
      case "brevo":
        return "📮";
      case "mailjet":
        return "✈️";
      default:
        return "📬";
    }
  };

  const getProviderColor = (type: string) => {
    switch (type) {
      case "resend":
        return "text-purple-600 bg-purple-50";
      case "brevo":
        return "text-blue-600 bg-blue-50";
      case "mailjet":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <EmailRotationBreadcrumb />

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Cog6ToothIcon className="h-8 w-8 text-blue-600" />
              Email API Providers
            </h1>
            <p className="text-gray-600 mt-1">
              Manage Resend, Brevo, and Mailjet API providers for email rotation
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add Provider
          </button>
        </div>

        {/* Test Email Input */}
        <div className="mt-4 flex gap-2">
          <input
            type="email"
            placeholder="Enter test email address..."
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            {/* Provider Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {getProviderIcon(provider.provider_type)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {provider.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProviderColor(
                          provider.provider_type
                        )}`}
                      >
                        {provider.provider_type}
                      </span>
                      <div className="flex items-center gap-1">
                        {provider.is_healthy ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`text-xs ${
                            provider.is_healthy
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {provider.is_healthy ? "Healthy" : "Unhealthy"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTestProvider(provider)}
                    disabled={testingProvider === provider.id || !testEmail}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 disabled:opacity-50"
                    title="Test Provider"
                  >
                    {testingProvider === provider.id ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(provider)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600"
                    title="Edit Provider"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(provider)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-red-600"
                    title="Delete Provider"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Provider Stats */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Weight/Priority</span>
                  <div className="font-medium">
                    {provider.weight} / {provider.priority}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Response Time</span>
                  <div className="font-medium">
                    {provider.avg_response_time_ms}ms
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Today Sent</span>
                  <div className="font-medium text-blue-600">
                    {provider.today_sent_count} / {provider.daily_limit}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (provider.today_sent_count / provider.daily_limit) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Hour Sent</span>
                  <div className="font-medium text-green-600">
                    {provider.current_hour_sent} / {provider.hourly_limit}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div
                      className="bg-green-600 h-1 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (provider.current_hour_sent / provider.hourly_limit) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Success Rate</span>
                  <div className="font-medium text-green-600">
                    {provider.total_success_count +
                      provider.total_failure_count >
                    0
                      ? Math.round(
                          (provider.total_success_count /
                            (provider.total_success_count +
                              provider.total_failure_count)) *
                            100
                        )
                      : 0}
                    %
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Failures</span>
                  <div className="font-medium text-red-600">
                    {provider.consecutive_failures}
                  </div>
                </div>
              </div>

              {provider.tags && provider.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {provider.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {provider.last_error_message && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  Last Error: {provider.last_error_message}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => resetCounters(provider)}
                  className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded transition-colors"
                >
                  Reset Counters
                </button>
                <button
                  onClick={() => setSelectedProvider(provider)}
                  className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded transition-colors flex items-center justify-center gap-1"
                >
                  <ChartBarIcon className="h-3 w-3" />
                  Stats
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {providers.length === 0 && (
        <div className="text-center py-12">
          <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No API providers
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first email API provider.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Add Provider
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Provider Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProvider ? "Edit Provider" : "Add New Provider"}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Primary Resend"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider Type *
                    </label>
                    <select
                      value={formData.provider_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          provider_type: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="resend">Resend</option>
                      <option value="brevo">Brevo (Sendinblue)</option>
                      <option value="mailjet">Mailjet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.api_key}
                      onChange={(e) =>
                        setFormData({ ...formData, api_key: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter API key"
                    />
                  </div>

                  {formData.provider_type === "mailjet" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Secret *
                      </label>
                      <input
                        type="password"
                        required={formData.provider_type === "mailjet"}
                        value={formData.api_secret}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            api_secret: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter API secret"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.from_email}
                      onChange={(e) =>
                        setFormData({ ...formData, from_email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., noreply@yourdomain.com"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Must be a verified sender address for this provider
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weight: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.daily_limit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          daily_limit: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.hourly_limit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hourly_limit: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., primary, marketing, transactional"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    Active (enable this provider for email rotation)
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {isLoading
                      ? "Saving..."
                      : editingProvider
                      ? "Update"
                      : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Provider Details Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Provider Statistics - {selectedProvider.name}
                </h2>
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    Performance
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Avg Response Time:</span>
                      <span className="font-medium">
                        {selectedProvider.avg_response_time_ms}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Success:</span>
                      <span className="font-medium text-green-600">
                        {selectedProvider.total_success_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Failures:</span>
                      <span className="font-medium text-red-600">
                        {selectedProvider.total_failure_count}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">
                    Usage Today
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sent:</span>
                      <span className="font-medium">
                        {selectedProvider.today_sent_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Limit:</span>
                      <span className="font-medium">
                        {selectedProvider.daily_limit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Usage:</span>
                      <span className="font-medium">
                        {Math.round(
                          (selectedProvider.today_sent_count /
                            selectedProvider.daily_limit) *
                            100
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-900 mb-2">
                    Configuration
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Weight:</span>
                      <span className="font-medium">
                        {selectedProvider.weight}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Priority:</span>
                      <span className="font-medium">
                        {selectedProvider.priority}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Health:</span>
                      <span
                        className={`font-medium ${
                          selectedProvider.is_healthy
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {selectedProvider.is_healthy ? "Healthy" : "Unhealthy"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedProvider.last_used_at && (
                <div className="mt-6 text-sm text-gray-600">
                  Last used:{" "}
                  {new Date(selectedProvider.last_used_at).toLocaleString()}
                </div>
              )}

              {selectedProvider.last_health_check_at && (
                <div className="text-sm text-gray-600">
                  Last health check:{" "}
                  {new Date(
                    selectedProvider.last_health_check_at
                  ).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
