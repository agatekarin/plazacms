import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const users = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/users - list users with optional ?q=search
users.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const url = new URL(c.req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const rows = await sql`
      SELECT id, name, email, role, image, created_at
      FROM public.users
      ${
        q
          ? sql`WHERE LOWER(name) LIKE ${"%" + q + "%"} OR LOWER(email) LIKE ${
              "%" + q + "%"
            }`
          : sql``
      }
      ORDER BY created_at DESC
      LIMIT 200
    `;

    return c.json({ items: rows });
  } catch (err) {
    console.error("[users:list]", err);
    return c.json({ error: "Failed" }, 500);
  }
});

// POST /api/admin/users - create user (non-admin)
users.post("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.email !== "string") {
      return c.json({ error: "Email required" }, 400);
    }
    const name = typeof body.name === "string" ? body.name : null;
    const email = body.email.toLowerCase();
    const role = ["vendor", "customer", "guest"].includes(body.role)
      ? body.role
      : "customer";
    if (role === "admin")
      return c.json({ error: "Cannot assign admin role" }, 400);

    let hash: string | null = null;
    if (typeof body.password === "string") {
      const bcrypt = await import("bcryptjs");
      hash = await bcrypt.hash(body.password, 10);
    }

    const rows = await sql`
      INSERT INTO public.users (name, email, role, image, password_hash)
      VALUES (${name}, ${email}, ${role}, ${null}, ${hash})
      RETURNING id, name, email, role, image, created_at
    `;
    return c.json({ item: rows[0] }, 201);
  } catch (e: any) {
    return c.json({ error: e?.message || "Failed" }, 500);
  }
});

// GET /api/admin/users/:id - detail with addresses
users.get("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { id } = c.req.param();
    const u = await sql`
      SELECT id, name, email, role, image, created_at FROM public.users WHERE id = ${id}
    `;
    if (!u[0]) return c.json({ error: "Not found" }, 404);
    const addr = await sql`
      SELECT id, user_id, address_name, recipient_name, phone_number, street_address, city, state, postal_code, country, is_default, created_at
      FROM public.user_addresses WHERE user_id = ${id} ORDER BY created_at DESC
    `;
    return c.json({ item: u[0], addresses: addr });
  } catch (err) {
    console.error("[users:get]", err);
    return c.json({ error: "Failed" }, 500);
  }
});

// DELETE /api/admin/users/:id
users.delete("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { id } = c.req.param();
    const roleRows = await sql`SELECT role FROM public.users WHERE id = ${id}`;
    if (!roleRows[0]) return c.json({ error: "Not found" }, 404);
    if (roleRows[0].role === "admin")
      return c.json({ error: "Cannot delete admin" }, 400);

    await sql`DELETE FROM public.user_addresses WHERE user_id = ${id}`;
    await sql`DELETE FROM public.accounts WHERE user_id = ${id}`.catch(
      () => {}
    );
    await sql`DELETE FROM public.sessions WHERE user_id = ${id}`.catch(
      () => {}
    );
    await sql`UPDATE public.media SET entity_id = NULL WHERE media_type = 'user_profile' AND entity_id = ${id}`;
    await sql`DELETE FROM public.users WHERE id = ${id}`;
    return c.json({ success: true });
  } catch (err) {
    console.error("[users:delete]", err);
    return c.json({ error: "Failed" }, 500);
  }
});

// PATCH /api/admin/users/:id - update profile and/or avatar
users.patch("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { id } = c.req.param();
    const b = await c.req.json().catch(() => ({} as any));

    const current = await sql`SELECT role FROM public.users WHERE id = ${id}`;
    if (!current[0]) return c.json({ error: "Not found" }, 404);
    const currentRole = current[0].role as string;

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (typeof b.name === "string") {
      fields.push(`name = $${i++}`);
      values.push(b.name);
    }
    if (typeof b.email === "string") {
      fields.push(`email = $${i++}`);
      values.push(b.email);
    }
    if (typeof b.image === "string") {
      fields.push(`image = $${i++}`);
      values.push(b.image);
    }
    if (typeof b.role === "string") {
      if (currentRole === "admin")
        return c.json({ error: "Cannot change admin role" }, 400);
      if (b.role === "admin")
        return c.json({ error: "Admin role cannot be assigned" }, 400);
      fields.push(`role = $${i++}`);
      values.push(b.role);
    }
    if (fields.length) {
      fields.push(`updated_at = NOW()`);
      await sql.unsafe(
        `UPDATE public.users SET ${fields.join(", ")} WHERE id = $${i}`,
        [...values, id]
      );
    }

    if (b.avatar_media_id) {
      const m = await sql`
        SELECT id, file_url FROM public.media WHERE id = ${b.avatar_media_id} AND media_type = 'user_profile'
      `;
      if (!m[0]) return c.json({ error: "Media not found" }, 404);
      await sql`UPDATE public.media SET entity_id = ${id} WHERE id = ${b.avatar_media_id}`;
      await sql`UPDATE public.users SET image = ${m[0].file_url}, updated_at = NOW() WHERE id = ${id}`;
    }

    const u =
      await sql`SELECT id, name, email, role, image, created_at FROM public.users WHERE id = ${id}`;
    const addr = await sql`
      SELECT id, user_id, address_name, recipient_name, phone_number, street_address, city, state, postal_code, country, is_default, created_at
      FROM public.user_addresses WHERE user_id = ${id} ORDER BY created_at DESC
    `;
    return c.json({ item: u[0], addresses: addr });
  } catch (err) {
    console.error("[users:patch]", err);
    return c.json({ error: "Failed" }, 500);
  }
});

// Addresses subroutes
users.get("/:id/addresses", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const rows =
    await sql`SELECT * FROM public.user_addresses WHERE user_id = ${id} ORDER BY created_at DESC`;
  return c.json({ items: rows });
});

users.post("/:id/addresses", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const b = await c.req.json();
  const rows = await sql`
    INSERT INTO public.user_addresses (user_id, address_name, recipient_name, phone_number, street_address, city, state, postal_code, country, is_default)
    VALUES (${id}, ${b.address_name || ""}, ${b.recipient_name || ""}, ${
    b.phone_number || ""
  }, ${b.street_address || ""}, ${b.city || ""}, ${b.state || ""}, ${
    b.postal_code || ""
  }, ${b.country || ""}, ${!!b.is_default})
    RETURNING *
  `;
  if (b.is_default) {
    await sql`UPDATE public.user_addresses SET is_default = FALSE WHERE user_id = ${id} AND id <> ${rows[0].id}`;
  }
  return c.json({ item: rows[0] }, 201);
});

users.patch("/:id/addresses", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id: userId } = c.req.param();
  const b = await c.req.json();
  if (!b?.id) return c.json({ error: "Address id required" }, 400);

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  const keys = [
    "address_name",
    "recipient_name",
    "phone_number",
    "street_address",
    "city",
    "state",
    "postal_code",
    "country",
  ] as const;
  for (const key of keys) {
    if (typeof b[key] === "string") {
      fields.push(`${key} = $${i++}`);
      values.push(b[key]);
    }
  }
  if (typeof b.is_default === "boolean") {
    fields.push(`is_default = $${i++}`);
    values.push(!!b.is_default);
  }
  if (!fields.length) return c.json({ error: "No changes" }, 400);

  const rows = await sql.unsafe(
    `UPDATE public.user_addresses SET ${fields.join(
      ", "
    )} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
    [...values, b.id, userId]
  );
  if (b.is_default) {
    await sql`UPDATE public.user_addresses SET is_default = FALSE WHERE user_id = ${userId} AND id <> ${b.id}`;
  }
  return c.json({ item: rows[0] });
});

users.delete("/:id/addresses", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id: userId } = c.req.param();
  const b = await c.req.json().catch(() => null);
  if (!b?.id) return c.json({ error: "Address id required" }, 400);
  await sql`DELETE FROM public.user_addresses WHERE id = ${b.id} AND user_id = ${userId}`;
  return c.json({ success: true });
});

export default users;
