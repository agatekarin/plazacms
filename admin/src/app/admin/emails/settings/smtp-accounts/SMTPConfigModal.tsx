"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  RotateCcw,
  Shield,
  Activity,
  Clock,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

interface RotationConfig {
  id: string;
  enabled: boolean;
  fallback_to_single: boolean;
  strategy: string;
  max_retry_attempts: number;
  retry_delay_seconds: number;
  failure_cooldown_minutes: number;
  health_check_interval_minutes: number;
  failure_threshold: number;
  success_threshold: number;
  global_daily_limit?: number;
  global_hourly_limit?: number;
  prefer_healthy_accounts: boolean;
  balance_by_response_time: boolean;
  avoid_consecutive_same_account: boolean;
  emergency_fallback_enabled: boolean;
  track_performance_metrics: boolean;
  log_rotation_decisions: boolean;
}

interface SMTPConfigModalProps {
  open: boolean;
  onClose: () => void;
  onConfigUpdate: () => void;
}

const STRATEGY_OPTIONS = [
  {
    value: "round_robin",
    label: "Round Robin",
    description: "Fair distribution across all healthy accounts",
  },
  {
    value: "weighted",
    label: "Weighted Distribution",
    description: "Based on account weights (higher weight = more emails)",
  },
  {
    value: "priority",
    label: "Priority Based",
    description: "Use highest priority accounts first",
  },
  {
    value: "health_based",
    label: "Health Based",
    description: "Prefer healthy accounts with good performance",
  },
  {
    value: "least_used",
    label: "Least Used",
    description: "Balance load by using least utilized accounts",
  },
];

export default function SMTPConfigModal({
  open,
  onClose,
  onConfigUpdate,
}: SMTPConfigModalProps) {
  const [config, setConfig] = useState<Partial<RotationConfig>>({
    enabled: true,
    fallback_to_single: true,
    strategy: "round_robin",
    max_retry_attempts: 3,
    retry_delay_seconds: 30,
    failure_cooldown_minutes: 30,
    health_check_interval_minutes: 5,
    failure_threshold: 5,
    success_threshold: 3,
    prefer_healthy_accounts: true,
    balance_by_response_time: false,
    avoid_consecutive_same_account: true,
    emergency_fallback_enabled: true,
    track_performance_metrics: true,
    log_rotation_decisions: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`SMTP Config API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load configuration");
    },
  });

  // Load current configuration
  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await apiCallJson("/api/admin/smtp-accounts/config");

      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error("Error loading SMTP config:", error);
      toast.error("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  // Save configuration
  const saveConfig = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const response = await apiCallJson("/api/admin/smtp-accounts/config", {
        method: "POST",
        body: JSON.stringify(config),
      });

      if (response.success) {
        toast.success("Configuration saved successfully");
        onConfigUpdate();
        onClose();
      } else {
        throw new Error(response.error || "Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving SMTP config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (
      (config.max_retry_attempts || 0) < 1 ||
      (config.max_retry_attempts || 0) > 10
    ) {
      newErrors.max_retry_attempts = "Retry attempts must be between 1 and 10";
    }

    if (
      (config.retry_delay_seconds || 0) < 1 ||
      (config.retry_delay_seconds || 0) > 300
    ) {
      newErrors.retry_delay_seconds =
        "Retry delay must be between 1 and 300 seconds";
    }

    if (
      (config.failure_cooldown_minutes || 0) < 1 ||
      (config.failure_cooldown_minutes || 0) > 1440
    ) {
      newErrors.failure_cooldown_minutes =
        "Cooldown must be between 1 and 1440 minutes";
    }

    if (
      (config.health_check_interval_minutes || 0) < 1 ||
      (config.health_check_interval_minutes || 0) > 60
    ) {
      newErrors.health_check_interval_minutes =
        "Health check interval must be between 1 and 60 minutes";
    }

    if (
      (config.failure_threshold || 0) < 1 ||
      (config.failure_threshold || 0) > 50
    ) {
      newErrors.failure_threshold =
        "Failure threshold must be between 1 and 50";
    }

    if (
      (config.success_threshold || 0) < 1 ||
      (config.success_threshold || 0) > 20
    ) {
      newErrors.success_threshold =
        "Success threshold must be between 1 and 20";
    }

    if (
      config.global_daily_limit &&
      (config.global_daily_limit < 1 || config.global_daily_limit > 100000)
    ) {
      newErrors.global_daily_limit =
        "Global daily limit must be between 1 and 100,000";
    }

    if (
      config.global_hourly_limit &&
      (config.global_hourly_limit < 1 || config.global_hourly_limit > 10000)
    ) {
      newErrors.global_hourly_limit =
        "Global hourly limit must be between 1 and 10,000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-500" />
              Multi-SMTP Configuration
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure load balancing, health monitoring, and retry settings
            </p>
          </div>
          <Button variant="outline" onClick={onClose} className="p-2">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading configuration...</p>
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Main Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-blue-500" />
                    Load Balancing
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              enabled: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Enable Multi-SMTP Load Balancing
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        When enabled, emails will be distributed across multiple
                        SMTP accounts
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Load Balancing Strategy
                      </label>
                      <select
                        value={config.strategy}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            strategy: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        disabled={!config.enabled}
                      >
                        {STRATEGY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        {
                          STRATEGY_OPTIONS.find(
                            (opt) => opt.value === config.strategy
                          )?.description
                        }
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.fallback_to_single}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              fallback_to_single: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300"
                          disabled={!config.enabled}
                        />
                        <span className="text-sm text-gray-700">
                          Enable fallback to single SMTP
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        Use single SMTP settings if all multi-SMTP accounts fail
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.avoid_consecutive_same_account}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              avoid_consecutive_same_account: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300"
                          disabled={!config.enabled}
                        />
                        <span className="text-sm text-gray-700">
                          Avoid consecutive emails from same account
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        Try to use different accounts for consecutive emails
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Retry & Recovery
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Retry Attempts
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={config.max_retry_attempts}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            max_retry_attempts: parseInt(e.target.value) || 3,
                          }))
                        }
                        className={
                          errors.max_retry_attempts ? "border-red-500" : ""
                        }
                        disabled={!config.enabled}
                      />
                      {errors.max_retry_attempts && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.max_retry_attempts}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        How many accounts to try before giving up
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retry Delay (seconds)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="300"
                        value={config.retry_delay_seconds}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            retry_delay_seconds: parseInt(e.target.value) || 30,
                          }))
                        }
                        className={
                          errors.retry_delay_seconds ? "border-red-500" : ""
                        }
                        disabled={!config.enabled}
                      />
                      {errors.retry_delay_seconds && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.retry_delay_seconds}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Wait time between retry attempts
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Failure Cooldown (minutes)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="1440"
                        value={config.failure_cooldown_minutes}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            failure_cooldown_minutes:
                              parseInt(e.target.value) || 30,
                          }))
                        }
                        className={
                          errors.failure_cooldown_minutes
                            ? "border-red-500"
                            : ""
                        }
                        disabled={!config.enabled}
                      />
                      {errors.failure_cooldown_minutes && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.failure_cooldown_minutes}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        How long to wait before retrying a failed account
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    Health Monitoring
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Health Check Interval (minutes)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={config.health_check_interval_minutes}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            health_check_interval_minutes:
                              parseInt(e.target.value) || 5,
                          }))
                        }
                        className={
                          errors.health_check_interval_minutes
                            ? "border-red-500"
                            : ""
                        }
                        disabled={!config.enabled}
                      />
                      {errors.health_check_interval_minutes && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.health_check_interval_minutes}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        How often to check account health
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Failure Threshold
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={config.failure_threshold}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            failure_threshold: parseInt(e.target.value) || 5,
                          }))
                        }
                        className={
                          errors.failure_threshold ? "border-red-500" : ""
                        }
                        disabled={!config.enabled}
                      />
                      {errors.failure_threshold && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.failure_threshold}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Consecutive failures before marking account as unhealthy
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Success Threshold
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={config.success_threshold}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            success_threshold: parseInt(e.target.value) || 3,
                          }))
                        }
                        className={
                          errors.success_threshold ? "border-red-500" : ""
                        }
                        disabled={!config.enabled}
                      />
                      {errors.success_threshold && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.success_threshold}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Consecutive successes to mark account as healthy again
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.prefer_healthy_accounts}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              prefer_healthy_accounts: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300"
                          disabled={!config.enabled}
                        />
                        <span className="text-sm text-gray-700">
                          Prefer healthy accounts
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        Prioritize healthy accounts over unhealthy ones
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.balance_by_response_time}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              balance_by_response_time: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300"
                          disabled={!config.enabled}
                        />
                        <span className="text-sm text-gray-700">
                          Balance by response time
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        Consider response time when selecting accounts
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-500" />
                    Global Limits (Optional)
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Global Daily Limit
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="100000"
                        value={config.global_daily_limit || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            global_daily_limit: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="Leave empty for no limit"
                        className={
                          errors.global_daily_limit ? "border-red-500" : ""
                        }
                        disabled={!config.enabled}
                      />
                      {errors.global_daily_limit && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.global_daily_limit}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Maximum emails per day across all accounts
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Global Hourly Limit
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="10000"
                        value={config.global_hourly_limit || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            global_hourly_limit: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="Leave empty for no limit"
                        className={
                          errors.global_hourly_limit ? "border-red-500" : ""
                        }
                        disabled={!config.enabled}
                      />
                      {errors.global_hourly_limit && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.global_hourly_limit}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Maximum emails per hour across all accounts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Advanced Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.emergency_fallback_enabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          emergency_fallback_enabled: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300"
                      disabled={!config.enabled}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable emergency fallback
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Use emergency account when all others fail
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.track_performance_metrics}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          track_performance_metrics: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300"
                      disabled={!config.enabled}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Track performance metrics
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Log detailed performance data for analytics
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.log_rotation_decisions}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          log_rotation_decisions: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300"
                      disabled={!config.enabled}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Log rotation decisions
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Log which accounts are selected (for debugging)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="h-4 w-4" />
            Configuration will be applied immediately after saving
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving || loading}
            >
              Cancel
            </Button>
            <Button
              onClick={saveConfig}
              disabled={saving || loading || !config.enabled}
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
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
