import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "./signout-button";

export default async function AdminPage() {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    redirect("/signin");
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Admin Dashboard</h1>
        <SignOutButton />
      </div>
      <p>Welcome, {session.user?.name ?? session.user?.email}.</p>
      <ul style={{ marginTop: 16 }}>
        <li>Only users with role = admin can view this page.</li>
        <li>
          <a href="/admin/change-password" style={{ color: "#2563eb" }}>Change Password</a>
        </li>
      </ul>
    </main>
  );
}
