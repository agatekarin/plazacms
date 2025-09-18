"use client";

import React from "react";
import Link from "next/link";
import {
  Mail,
  MapPin,
  ShoppingBag,
  DollarSign,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Customer {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  email_verified: string | null;
  image: string | null;
  address_count: number;
  order_count: number;
  total_spent: number;
}

interface CustomerCardProps {
  customer: Customer;
  showActions?: boolean;
  className?: string;
}

export function CustomerCard({
  customer,
  showActions = true,
  className = "",
}: CustomerCardProps) {
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "vendor":
        return "bg-blue-100 text-blue-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              {customer.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customer.image}
                  alt={customer.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-medium text-gray-600">
                  {customer.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {customer.name || "No name"}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getRoleColor(customer.role)}>
                  {customer.role.toUpperCase()}
                </Badge>
                {customer.email_verified && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span className="truncate">{customer.email}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatDate(customer.created_at)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <MapPin className="h-3 w-3" />
              <span>Addresses</span>
            </div>
            <div className="font-semibold">{customer.address_count}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <ShoppingBag className="h-3 w-3" />
              <span>Orders</span>
            </div>
            <div className="font-semibold">{customer.order_count}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <DollarSign className="h-3 w-3" />
              <span>Spent</span>
            </div>
            <div className="font-semibold text-sm">
              {formatCurrency(customer.total_spent)}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-2 pt-3 border-t">
            <Link href={`/admin/customers/${customer.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
            <Link href={`/admin/customers/${customer.id}/edit`}>
              <Button size="sm">Edit</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
