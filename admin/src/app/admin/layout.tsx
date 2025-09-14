import ModernAdminLayout from "../../components/ModernAdminLayout";
import AuthWrapper from "../../components/AuthWrapper";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthWrapper>
      <ModernAdminLayout>{children}</ModernAdminLayout>
    </AuthWrapper>
  );
}
