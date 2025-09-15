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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Change Password</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Enter your current password and choose a new one (min 8 characters).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-sm dark:bg-slate-900/60 dark:border-slate-800">
          <div className="p-6 sm:p-8">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
