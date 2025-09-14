import { Session } from "../../../lib/auth/types";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MediaManager from "./MediaManager";

export default async function MediaPage() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;

  if (!session?.user || role !== "admin") {
    redirect("/signin");
  }

  return <MediaManager />;
}
