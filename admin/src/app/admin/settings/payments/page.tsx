import { Session } from "../../../../lib/auth/types";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import PaymentsManager, { PaymentGatewayRow } from "./PaymentsManager";

export const dynamic = "force-dynamic";

export default async function PaymentsSettingsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("plaza_session")?.value;
  const session = await auth(sessionToken);
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  // if (!session?.user || role !== "admin") redirect("/signin");

  const { rows } = await pool.query<PaymentGatewayRow>(
    `SELECT g.id, g.name, g.slug, g.description, g.is_enabled, g.settings, g.logo_media_id,
            m.file_url AS logo_url
     FROM public.payment_gateways g
     LEFT JOIN public.media m ON m.id = g.logo_media_id
     ORDER BY g.name ASC`
  );
  const gateways = rows as unknown as PaymentGatewayRow[];

  return (
    <div className="space-y-6">
      <PaymentsManager initialGateways={gateways} />
    </div>
  );
}
