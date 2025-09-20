import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Rotation | PlazaCMS Admin",
  description: "Manage email API providers and rotation configuration",
};

export default function EmailRotationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
