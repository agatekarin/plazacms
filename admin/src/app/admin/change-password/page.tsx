import { Session } from "next-auth";
import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin") {
    redirect("/signin");
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <h1>Change Password</h1>
      <p style={{ marginTop: 8, color: "#6b7280" }}>
        Enter your current password and choose a new one (min 8 chars).
      </p>
      <div style={{ marginTop: 16 }}>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
