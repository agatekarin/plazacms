"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { toast } from "react-hot-toast";
import EmailRotationBreadcrumb from "@/components/EmailRotationBreadcrumb";
import {
  Cog6ToothIcon,
  PlayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface RotationConfig {
  id: string;
  enabled: boolean;
  include_api_providers: boolean;
  strategy:
    | "round_robin"
    | "weighted"
    | "priority"
    | "health_based"
    | "least_used";
  api_smtp_balance_ratio: number;
  prefer_api_over_smtp: boolean;
  api_fallback_to_smtp: boolean;
  smtp_fallback_to_api: boolean;
  emergency_fallback_enabled: boolean;
  max_retry_attempts: number;
  retry_delay_ms: number;
  circuit_breaker_threshold: number;
  prefer_healthy_accounts: boolean;
  balance_by_response_time: boolean;
  avoid_consecutive_same_account: boolean;
  track_performance_metrics: boolean;
  log_rotation_decisions: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface RotationStats {
  smtp_stats: {
    total_accounts: number;
    healthy_accounts: number;
    total_sent: number;
    avg_response_time: number;
  };
  api_stats: {
    total_providers: number;
    healthy_providers: number;
    total_sent: number;
    avg_response_time: number;
  };
  hybrid_stats: {
    api_ratio: number;
    smtp_ratio: number;
    total_emails: number;
    success_rate: number;
  };
}

interface TestResult {
  selections: Array<{
    attempt: number;
    type: "api" | "smtp";
    name: string;
    priority: number;
    weight: number;
  }>;
  summary: {
    api_count: number;
    smtp_count: number;
    total_tests: number;
    api_percentage: number;
    smtp_percentage: number;
  };
}

export default function EmailRotationConfigPage() {
  const [config, setConfig] = useState<RotationConfig | null>(null);
  const [stats, setStats] = useState<RotationStats | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "API request failed");
    },
  });

  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await apiCallJson("/api/admin/email-rotation-config");
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiCallJson(
        "/api/admin/email-rotation-config/stats"
      );
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await apiCallJson("/api/admin/email-rotation-config", {
        method: "PUT",
        body: JSON.stringify(config),
      });

      if (response.success) {
        toast.success("Configuration saved successfully");
        setConfig(response.data);
        loadStats();
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const testRotation = async () => {
    try {
      setTesting(true);
      const response = await apiCallJson(
        "/api/admin/email-rotation-config/test",
        {
          method: "POST",
        }
      );

      if (response.success) {
        setTestResult(response.data);
        toast.success("Rotation test completed");
      }
    } catch (error) {
      console.error("Test error:", error);
    } finally {
      setTesting(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm("Are you sure you want to reset configuration to defaults?"))
      return;

    try {
      setSaving(true);
      const response = await apiCallJson(
        "/api/admin/email-rotation-config/reset",
        {
          method: "POST",
        }
      );

      if (response.success) {
        setConfig(response.data);
        toast.success("Configuration reset to defaults");
      }
    } catch (error) {
      console.error("Reset error:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<RotationConfig>) => {
    if (config) {
      setConfig({ ...config, ...updates });
    }
  };

  const strategyOptions = [
    {
      value: "round_robin",
      label: "Round Robin",
      description: "Rotate providers in order",
    },
    {
      value: "weighted",
      label: "Weighted",
      description: "Use provider weights for selection",
    },
    {
      value: "priority",
      label: "Priority",
      description: "Use highest priority providers first",
    },
    {
      value: "health_based",
      label: "Health Based",
      description: "Prefer healthy providers",
    },
    {
      value: "least_used",
      label: "Least Used",
      description: "Use least recently used provider",
    },
  ];

  if (loading || !config) {
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
              <AdjustmentsHorizontalIcon className="h-8 w-8 text-blue-600" />
              Email Rotation Configuration
            </h1>
            <p className="text-gray-600 mt-1">
              Configure how emails are distributed between API providers and
              SMTP accounts
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={testRotation}
              disabled={testing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <PlayIcon className="h-5 w-5" />
              )}
              Test Rotation
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-5 w-5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Basic Settings
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => updateConfig({ enabled: e.target.checked })}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Enable Rotation
                  </label>
                  <p className="text-xs text-gray-500">
                    Master switch for email rotation system
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.include_api_providers}
                  onChange={(e) =>
                    updateConfig({ include_api_providers: e.target.checked })
                  }
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Include API Providers
                  </label>
                  <p className="text-xs text-gray-500">
                    Use API providers in rotation mix
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rotation Strategy
              </label>
              <select
                value={config.strategy}
                onChange={(e) =>
                  updateConfig({ strategy: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {strategyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Load Balancing */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Load Balancing
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API vs SMTP Balance Ratio:{" "}
                  {Math.round(config.api_smtp_balance_ratio * 100)}% API
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.api_smtp_balance_ratio}
                  onChange={(e) =>
                    updateConfig({
                      api_smtp_balance_ratio: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>100% SMTP</span>
                  <span>50/50</span>
                  <span>100% API</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.prefer_api_over_smtp}
                    onChange={(e) =>
                      updateConfig({ prefer_api_over_smtp: e.target.checked })
                    }
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      Prefer API over SMTP
                    </label>
                    <p className="text-xs text-gray-500">
                      Give priority to API providers
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.balance_by_response_time}
                    onChange={(e) =>
                      updateConfig({
                        balance_by_response_time: e.target.checked,
                      })
                    }
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      Balance by Response Time
                    </label>
                    <p className="text-xs text-gray-500">
                      Consider response time in selection
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.prefer_healthy_accounts}
                    onChange={(e) =>
                      updateConfig({
                        prefer_healthy_accounts: e.target.checked,
                      })
                    }
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      Prefer Healthy Accounts
                    </label>
                    <p className="text-xs text-gray-500">
                      Prioritize providers with good health
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.avoid_consecutive_same_account}
                    onChange={(e) =>
                      updateConfig({
                        avoid_consecutive_same_account: e.target.checked,
                      })
                    }
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      Avoid Consecutive Same
                    </label>
                    <p className="text-xs text-gray-500">
                      Don't use same provider consecutively
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fallback & Reliability */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheckIcon className="h-6 w-6 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Fallback & Reliability
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.api_fallback_to_smtp}
                  onChange={(e) =>
                    updateConfig({ api_fallback_to_smtp: e.target.checked })
                  }
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    API → SMTP Fallback
                  </label>
                  <p className="text-xs text-gray-500">Use SMTP if API fails</p>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.smtp_fallback_to_api}
                  onChange={(e) =>
                    updateConfig({ smtp_fallback_to_api: e.target.checked })
                  }
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    SMTP → API Fallback
                  </label>
                  <p className="text-xs text-gray-500">Use API if SMTP fails</p>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.emergency_fallback_enabled}
                  onChange={(e) =>
                    updateConfig({
                      emergency_fallback_enabled: e.target.checked,
                    })
                  }
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Emergency Fallback
                  </label>
                  <p className="text-xs text-gray-500">
                    Ultimate fallback to any working provider
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Retry Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.max_retry_attempts}
                  onChange={(e) =>
                    updateConfig({
                      max_retry_attempts: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retry Delay (ms)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={config.retry_delay_ms}
                  onChange={(e) =>
                    updateConfig({ retry_delay_ms: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Circuit Breaker Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.circuit_breaker_threshold}
                  onChange={(e) =>
                    updateConfig({
                      circuit_breaker_threshold: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Monitoring & Analytics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <ClockIcon className="h-6 w-6 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Monitoring & Analytics
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.track_performance_metrics}
                  onChange={(e) =>
                    updateConfig({
                      track_performance_metrics: e.target.checked,
                    })
                  }
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Track Performance Metrics
                  </label>
                  <p className="text-xs text-gray-500">
                    Collect detailed performance data
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.log_rotation_decisions}
                  onChange={(e) =>
                    updateConfig({ log_rotation_decisions: e.target.checked })
                  }
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Log Rotation Decisions
                  </label>
                  <p className="text-xs text-gray-500">
                    Debug logging for provider selection
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={config.notes || ""}
                onChange={(e) => updateConfig({ notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any notes about this configuration..."
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={resetToDefaults}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Stats & Test Results Panel */}
        <div className="space-y-6">
          {/* Current Stats */}
          {stats && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-blue-600" />
                Current Statistics
              </h3>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    SMTP Accounts
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">
                        {stats.smtp_stats.total_accounts}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Healthy:</span>
                      <span className="font-medium text-green-600">
                        {stats.smtp_stats.healthy_accounts}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sent Today:</span>
                      <span className="font-medium">
                        {stats.smtp_stats.total_sent}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    API Providers
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">
                        {stats.api_stats.total_providers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Healthy:</span>
                      <span className="font-medium text-green-600">
                        {stats.api_stats.healthy_providers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sent Today:</span>
                      <span className="font-medium">
                        {stats.api_stats.total_sent}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">
                    Hybrid Performance
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>API Ratio:</span>
                      <span className="font-medium">
                        {Math.round(stats.hybrid_stats.api_ratio)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="font-medium text-green-600">
                        {Math.round(stats.hybrid_stats.success_rate)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Emails:</span>
                      <span className="font-medium">
                        {stats.hybrid_stats.total_emails}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Results */}
          {testResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PlayIcon className="h-5 w-5 text-green-600" />
                Test Results
              </h3>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Load Balance Test
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>API Selection:</span>
                      <span className="font-medium text-blue-600">
                        {testResult.summary.api_percentage}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>SMTP Selection:</span>
                      <span className="font-medium text-green-600">
                        {testResult.summary.smtp_percentage}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Tests:</span>
                      <span className="font-medium">
                        {testResult.summary.total_tests}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>API</span>
                      <span>SMTP</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 flex">
                      <div
                        className="bg-blue-500 h-2 rounded-l-full"
                        style={{
                          width: `${testResult.summary.api_percentage}%`,
                        }}
                      ></div>
                      <div
                        className="bg-green-500 h-2 rounded-r-full"
                        style={{
                          width: `${testResult.summary.smtp_percentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">
                    Selection Log
                  </h4>
                  <div className="space-y-1 text-xs">
                    {testResult.selections
                      .slice(0, 10)
                      .map((selection, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded"
                        >
                          <span>#{selection.attempt}</span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              selection.type === "api"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {selection.type.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs">
                            {selection.name}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={loadStats}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Refresh Stats
              </button>
              <button
                onClick={testRotation}
                disabled={testing}
                className="w-full bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm disabled:opacity-50"
              >
                {testing ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
                Test Rotation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
