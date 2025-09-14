import { Session } from "next-auth";
import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import ModernAdminLayout from "../../components/ModernAdminLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;

  if (!session?.user || role !== "admin") {
    redirect("/signin");
  }

  return (
    <SessionProvider session={session}>
      <ModernAdminLayout>{children}</ModernAdminLayout>
    </SessionProvider>
  );
}
