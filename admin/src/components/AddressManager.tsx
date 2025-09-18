"use client";

import React, { useState } from "react";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  User,
  Phone,
  Globe,
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
import { CountrySelector } from "./CountrySelector";
import { StateSelector } from "./StateSelector";

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

interface AddressManagerProps {
  addresses: Address[];
  onAddAddress: (addressData: AddressFormData) => Promise<void>;
  onUpdateAddress: (
    addressId: string,
    addressData: AddressFormData
  ) => Promise<void>;
  onDeleteAddress: (addressId: string) => Promise<void>;
  loading?: boolean;
}

export function AddressManager({
  addresses,
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  loading = false,
}: AddressManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
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

  const updateFormData = (
    field: keyof AddressFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setFormData({
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
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingAddress) {
        await onUpdateAddress(editingAddress.id, formData);
      } else {
        await onAddAddress(formData);
      }

      // Reset form
      setFormData({
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
      setShowForm(false);
      setEditingAddress(null);
    } catch (error) {
      console.error("Error handling address:", error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
    setFormData({
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

  const handleDeleteAddress = async (
    addressId: string,
    addressName: string
  ) => {
    if (!confirm(`Are you sure you want to delete address "${addressName}"?`)) {
      return;
    }

    try {
      await onDeleteAddress(addressId);
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Addresses ({addresses.length})
          </span>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            disabled={showForm || loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Address
          </Button>
        </CardTitle>
        <CardDescription>Manage customer addresses</CardDescription>
      </CardHeader>

      <CardContent>
        {showForm && (
          <Card className="mb-6">
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
                    value={formData.address_name}
                    onChange={(e) =>
                      updateFormData("address_name", e.target.value)
                    }
                    placeholder="Home, Office, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="recipient_name">Recipient Name</Label>
                  <Input
                    id="recipient_name"
                    value={formData.recipient_name}
                    onChange={(e) =>
                      updateFormData("recipient_name", e.target.value)
                    }
                    placeholder="Full name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) =>
                    updateFormData("phone_number", e.target.value)
                  }
                  placeholder="+1-555-123-4567"
                />
              </div>

              <div>
                <Label htmlFor="street_address">Street Address</Label>
                <Input
                  id="street_address"
                  value={formData.street_address}
                  onChange={(e) =>
                    updateFormData("street_address", e.target.value)
                  }
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) =>
                      updateFormData("postal_code", e.target.value)
                    }
                    placeholder="10001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <CountrySelector
                    value={formData.country_code}
                    onValueChange={(value) => {
                      updateFormData("country_code", value);
                      // Reset state when country changes
                      updateFormData("state_id", "");
                    }}
                    placeholder="Select country..."
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <StateSelector
                    value={formData.state_id}
                    onValueChange={(value) => updateFormData("state_id", value)}
                    countryCode={formData.country_code}
                    placeholder="Select state..."
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) =>
                    updateFormData("is_default", e.target.checked)
                  }
                  className="rounded"
                />
                <Label htmlFor="is_default">Set as default address</Label>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleSubmit} size="sm" disabled={loading}>
                  <Check className="h-4 w-4 mr-2" />
                  {editingAddress ? "Update Address" : "Add Address"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  size="sm"
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No addresses found</p>
              <Button onClick={() => setShowForm(true)} disabled={loading}>
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
                        <h4 className="font-medium">{address.address_name}</h4>
                        {address.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{address.recipient_name}</span>
                        </div>
                        {address.phone_number && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{address.phone_number}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {address.street_address}, {address.city},{" "}
                            {address.state} {address.postal_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          <span>{address.country}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAddress(address)}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Address</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;
                              {address.address_name}&quot;? This action cannot
                              be undone.
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
  );
}
