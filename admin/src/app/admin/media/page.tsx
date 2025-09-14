import { Session } from "../../../lib/auth/types";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import MediaManager from "./MediaManager";

export default async function MediaPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("plaza_session")?.value;
  const session = await auth(sessionToken);
  const role = (session?.user as Session["user"] & { role?: string })?.role;

  if (!session?.user || role !== "admin") {
    redirect("/signin");
  }

  return <MediaManager />;
}
