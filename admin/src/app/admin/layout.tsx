import { redirect } from "next/navigation";
import ModernAdminLayout from "../../components/ModernAdminLayout";
import { AuthService } from "../../lib/auth/service";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await AuthService.getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/signin");
  }

  return <ModernAdminLayout>{children}</ModernAdminLayout>;
}
