import { redirect } from "next/navigation";
import ModernAdminLayout from "../../components/ModernAdminLayout";
import { AuthService } from "../../lib/auth/service";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("plaza_session")?.value;
  const user = await AuthService.getCurrentUser(sessionToken);

  if (!user || user.role !== "admin") {
    // redirect("/signin");
  }

  return <ModernAdminLayout>{children}</ModernAdminLayout>;
}
