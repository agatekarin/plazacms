import { redirect } from "next/navigation";
import ModernAdminLayout from "../../components/ModernAdminLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModernAdminLayout>{children}</ModernAdminLayout>;
}
