// API client for Hono backend
import { getAuthToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://admin-hono.agatekarin.workers.dev";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
}

export interface ProductAttributeValue {
  id: string;
  value: string;
}

export interface AttributeItem {
  id: string;
  name: string;
  values: ProductAttributeValue[];
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Attributes API
  async getAttributes(): Promise<ApiResponse<{ items: AttributeItem[] }>> {
    return this.request<{ items: AttributeItem[] }>("/api/admin/attributes");
  }

  async createAttribute(name: string): Promise<ApiResponse<{ item: ProductAttribute }>> {
    return this.request<{ item: ProductAttribute }>("/api/admin/attributes", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async updateAttribute(id: string, name: string): Promise<ApiResponse<{ item: ProductAttribute }>> {
    return this.request<{ item: ProductAttribute }>(`/api/admin/attributes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  async deleteAttribute(id: string): Promise<ApiResponse<{}>> {
    return this.request<{}>(`/api/admin/attributes/${id}`, {
      method: "DELETE",
    });
  }

  async createAttributeValue(
    attributeId: string,
    value: string
  ): Promise<ApiResponse<{ item: ProductAttributeValue }>> {
    return this.request<{ item: ProductAttributeValue }>(`/api/admin/attributes/${attributeId}/values`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
  }

  async updateAttributeValue(
    attributeId: string,
    valueId: string,
    value: string
  ): Promise<ApiResponse<{ item: ProductAttributeValue }>> {
    return this.request<{ item: ProductAttributeValue }>(`/api/admin/attributes/${attributeId}/values/${valueId}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  }

  async deleteAttributeValue(
    attributeId: string,
    valueId: string
  ): Promise<ApiResponse<{}>> {
    return this.request<{}>(`/api/admin/attributes/${attributeId}/values/${valueId}`, {
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient();
