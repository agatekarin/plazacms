import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const schema = z.object({
  vars: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    );

  const statuses = parsed.data.vars.map((name) => ({
    name,
    present: Boolean(process.env[name]),
  }));

  return NextResponse.json({ statuses });
}
