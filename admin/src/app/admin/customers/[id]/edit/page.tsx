"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CountrySelector } from "@/components/CountrySelector";
import { StateSelector } from "@/components/StateSelector";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface Customer {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  email_verified: string | null;
  image: string | null;
  address_count: number;
  order_count: number;
  total_spent: number;
  last_order_date: string | null;
}

interface Address {
  id: string;
  address_name: string;
  recipient_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  email: string;
  role: string;
  image: string;
}

interface AddressFormData {
  address_name: string;
  recipient_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  state_id: string;
  postal_code: string;
  country: string;
  country_code: string;
  is_default: boolean;
}

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { apiCallJson, apiCall } = useAuthenticatedFetch();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );

  // Form data
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    role: "customer",
    image: "",
  });

  // Address form data
  const [addressFormData, setAddressFormData] = useState<AddressFormData>({
    address_name: "",
    recipient_name: "",
    phone_number: "",
    street_address: "",
    city: "",
    state: "",
    state_id: "",
    postal_code: "",
    country: "",
    country_code: "",
    is_default: false,
  });

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const fetchCustomerData = useCallback(async () => {
    if (!resolvedParams?.id) return;

    try {
      setLoading(true);
      const data = await apiCallJson(
        `/api/admin/customers/${resolvedParams.id}`,
        {
          cache: "no-store",
        }
      );

      setCustomer(data.customer);
      setAddresses(data.addresses || []);

      // Populate form data
      setFormData({
        name: data.customer.name || "",
        email: data.customer.email || "",
        role: data.customer.role || "customer",
        image: data.customer.image || "",
      });
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setLoading(false);
    }
  }, [apiCallJson, resolvedParams?.id]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddressFormData = (
    field: keyof AddressFormData,
    value: string | boolean
  ) => {
    setAddressFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!resolvedParams?.id) return;

    try {
      setSaving(true);
      await apiCall(`/api/admin/customers/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // Refresh data
      await fetchCustomerData();
      alert("Customer updated successfully!");
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async () => {
    if (!resolvedParams?.id) return;

    try {
      await apiCall(`/api/admin/customers/${resolvedParams.id}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressFormData),
      });

      // Reset form and refresh data
      setAddressFormData({
        address_name: "",
        recipient_name: "",
        phone_number: "",
        street_address: "",
        city: "",
        state: "",
        state_id: "",
        postal_code: "",
        country: "",
        country_code: "",
        is_default: false,
      });
      setShowAddressForm(false);
      await fetchCustomerData();
      alert("Address added successfully!");
    } catch (error) {
      console.error("Error adding address:", error);
      alert("Failed to add address. Please try again.");
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressFormData({
      address_name: address.address_name || "",
      recipient_name: address.recipient_name || "",
      phone_number: address.phone_number || "",
      street_address: address.street_address || "",
      city: address.city || "",
      state: address.state || "",
      state_id: "",
      postal_code: address.postal_code || "",
      country: address.country || "",
      country_code: "",
      is_default: address.is_default || false,
    });
    setShowAddressForm(true);
  };

  const handleUpdateAddress = async () => {
    if (!resolvedParams?.id || !editingAddress) return;

    try {
      await apiCall(
        `/api/admin/customers/${resolvedParams.id}/addresses/${editingAddress.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addressFormData),
        }
      );

      // Reset form and refresh data
      setEditingAddress(null);
      setAddressFormData({
        address_name: "",
        recipient_name: "",
        phone_number: "",
        street_address: "",
        city: "",
        state: "",
        state_id: "",
        postal_code: "",
        country: "",
        country_code: "",
        is_default: false,
      });
      setShowAddressForm(false);
      await fetchCustomerData();
      alert("Address updated successfully!");
    } catch (error) {
      console.error("Error updating address:", error);
      alert("Failed to update address. Please try again.");
    }
  };

  const handleDeleteAddress = async (
    addressId: string,
    addressName: string
  ) => {
    if (!resolvedParams?.id) return;

    if (!confirm(`Are you sure you want to delete address "${addressName}"?`)) {
      return;
    }

    try {
      await apiCall(
        `/api/admin/customers/${resolvedParams.id}/addresses/${addressId}`,
        {
          method: "DELETE",
        }
      );

      await fetchCustomerData();
      alert("Address deleted successfully!");
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("Failed to delete address. Please try again.");
    }
  };

  const cancelAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressFormData({
      address_name: "",
      recipient_name: "",
      phone_number: "",
      street_address: "",
      city: "",
      state: "",
      state_id: "",
      postal_code: "",
      country: "",
      country_code: "",
      is_default: false,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Customer Not Found
          </h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              The customer you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link href="/admin/customers">
              <Button>Back to Customers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Customer</h1>
            <p className="text-gray-600">
              Update customer information and addresses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/customers/${customer.id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
            <CardDescription>Update basic customer details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                placeholder="Customer name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => updateFormData("role", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="image">Profile Image URL</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => updateFormData("image", e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Addresses ({addresses.length})
              </span>
              <Button
                size="sm"
                onClick={() => setShowAddressForm(true)}
                disabled={showAddressForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </CardTitle>
            <CardDescription>Manage customer addresses</CardDescription>
          </CardHeader>
          <CardContent>
            {showAddressForm ? (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="address_name">Address Name</Label>
                      <Input
                        id="address_name"
                        value={addressFormData.address_name}
                        onChange={(e) =>
                          updateAddressFormData("address_name", e.target.value)
                        }
                        placeholder="Home, Office, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="recipient_name">Recipient Name</Label>
                      <Input
                        id="recipient_name"
                        value={addressFormData.recipient_name}
                        onChange={(e) =>
                          updateAddressFormData(
                            "recipient_name",
                            e.target.value
                          )
                        }
                        placeholder="Full name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={addressFormData.phone_number}
                      onChange={(e) =>
                        updateAddressFormData("phone_number", e.target.value)
                      }
                      placeholder="+1-555-123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="street_address">Street Address</Label>
                    <Input
                      id="street_address"
                      value={addressFormData.street_address}
                      onChange={(e) =>
                        updateAddressFormData("street_address", e.target.value)
                      }
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={addressFormData.city}
                        onChange={(e) =>
                          updateAddressFormData("city", e.target.value)
                        }
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={addressFormData.postal_code}
                        onChange={(e) =>
                          updateAddressFormData("postal_code", e.target.value)
                        }
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <CountrySelector
                        value={addressFormData.country_code}
                        onValueChange={(value) => {
                          updateAddressFormData("country_code", value);
                          // Reset state when country changes
                          updateAddressFormData("state_id", "");
                        }}
                        placeholder="Select country..."
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <StateSelector
                        value={addressFormData.state_id}
                        onValueChange={(value) =>
                          updateAddressFormData("state_id", value)
                        }
                        countryCode={addressFormData.country_code}
                        placeholder="Select state..."
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={addressFormData.is_default}
                      onChange={(e) =>
                        updateAddressFormData("is_default", e.target.checked)
                      }
                      className="rounded"
                    />
                    <Label htmlFor="is_default">Set as default address</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={
                        editingAddress ? handleUpdateAddress : handleAddAddress
                      }
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {editingAddress ? "Update Address" : "Add Address"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelAddressForm}
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-3">
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No addresses found</p>
                  <Button onClick={() => setShowAddressForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Address
                  </Button>
                </div>
              ) : (
                addresses.map((address) => (
                  <Card key={address.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">
                              {address.address_name}
                            </h4>
                            {address.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>{address.recipient_name}</div>
                            {address.phone_number && (
                              <div>{address.phone_number}</div>
                            )}
                            <div>
                              {address.street_address}, {address.city},{" "}
                              {address.state} {address.postal_code}
                            </div>
                            <div>{address.country}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAddress(address)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Address
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;
                                  {address.address_name}&quot;? This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteAddress(
                                      address.id,
                                      address.address_name
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
