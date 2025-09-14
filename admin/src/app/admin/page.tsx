import { redirect } from "next/navigation";
import Link from "next/link";
import PageContainer from "../../components/PageContainer";
import {
  ShoppingBagIcon,
  PhotoIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { AuthService } from "../../lib/auth/service";
import { User } from "@/lib/auth/types";
import { cookies } from "next/headers";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("plaza_session")?.value;
  const user = await AuthService.getCurrentUser(sessionToken);
  const role = user?.role;

  if (!user || role !== "admin") {
    // redirect("/signin");
  }

  return (
    <PageContainer
      title={`Welcome back, ${user?.name ?? user?.email}`}
      subtitle="Manage your e-commerce store from this admin dashboard"
    >
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">$0</p>
              <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                +0% from last month
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500 mt-1">Total products</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Orders</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500 mt-1">Total orders</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DocumentTextIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500 mt-1">Registered users</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <UsersIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/products/add"
            className="group flex items-center p-6 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all duration-200 border border-blue-200"
          >
            <div className="p-3 bg-blue-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
              <PlusIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-semibold text-blue-900">
                Add New Product
              </span>
              <p className="text-sm text-blue-700">
                Create a new product listing
              </p>
            </div>
          </Link>

          <Link
            href="/admin/media"
            className="group flex items-center p-6 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all duration-200 border border-green-200"
          >
            <div className="p-3 bg-green-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
              <PhotoIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-semibold text-green-900">
                Media Library
              </span>
              <p className="text-sm text-green-700">Upload and manage files</p>
            </div>
          </Link>

          <Link
            href="/admin/products"
            className="group flex items-center p-6 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all duration-200 border border-purple-200"
          >
            <div className="p-3 bg-purple-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
              <ShoppingBagIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-semibold text-purple-900">
                Manage Products
              </span>
              <p className="text-sm text-purple-700">View and edit products</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Recent Activity
        </h2>
        <div className="text-center py-12 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium">No recent activity</p>
          <p className="text-sm mt-1">
            Activity will appear here as you use the system
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
