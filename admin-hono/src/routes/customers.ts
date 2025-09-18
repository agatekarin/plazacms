import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const customers = new Hono();

// GET /api/admin/customers - list customers with pagination and filters
customers.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { searchParams } = new URL(c.req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "customer";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const where: string[] = [];
  const params: any[] = [];

  // Role filter
  if (role) {
    where.push(`u.role = $${params.length + 1}`);
    params.push(role);
  }

  // Search filter
  if (search) {
    where.push(
      `(u.name ILIKE $${params.length + 1} OR u.email ILIKE $${
        params.length + 1
      })`
    );
    params.push(`%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Count total
  const countSql = `
    SELECT COUNT(*)::int AS total 
    FROM public.users u 
    ${whereSql}
  `;
  const [{ total }] = await (sql as any).unsafe(countSql, params);

  // Get customers with stats
  const offset = (page - 1) * limit;
  // Handle sorting for aggregated fields
  let orderBy = `u.${sortBy}`;
  if (sortBy === "total_spent") {
    orderBy = `COALESCE(SUM(o.total_amount), 0)`;
  } else if (sortBy === "order_count") {
    orderBy = `COUNT(DISTINCT o.id)`;
  } else if (sortBy === "address_count") {
    orderBy = `COUNT(DISTINCT ua.id)`;
  }

  const listSql = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at,
      u.updated_at,
      u.email_verified,
      u.image,
      COUNT(DISTINCT ua.id) as address_count,
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.total_amount), 0) as total_spent,
      MAX(o.created_at) as last_order_date
    FROM public.users u
    LEFT JOIN public.user_addresses ua ON u.id = ua.user_id
    LEFT JOIN public.orders o ON u.id = o.user_id
    ${whereSql}
    GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.updated_at, u.email_verified, u.image
    ORDER BY ${orderBy} ${sortOrder.toUpperCase()}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const rows = await (sql as any).unsafe(
    listSql,
    params.concat([limit, offset])
  );

  const totalPages = Math.ceil(total / limit);
  return c.json({
    customers: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});

// GET /api/admin/customers/:id - get customer detail
customers.get("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();

  const customerSql = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at,
      u.updated_at,
      u.email_verified,
      u.image,
      COUNT(DISTINCT ua.id) as address_count,
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.total_amount), 0) as total_spent,
      MAX(o.created_at) as last_order_date
    FROM public.users u
    LEFT JOIN public.user_addresses ua ON u.id = ua.user_id
    LEFT JOIN public.orders o ON u.id = o.user_id
    WHERE u.id = $1
    GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.updated_at, u.email_verified, u.image
  `;

  const [customer] = await (sql as any).unsafe(customerSql, [id]);
  if (!customer) {
    return c.json({ error: "Customer not found" }, 404);
  }

  // Get addresses
  const addressesSql = `
    SELECT 
      id,
      address_name,
      recipient_name,
      phone_number,
      street_address,
      city,
      state,
      postal_code,
      country,
      is_default,
      created_at,
      updated_at
    FROM public.user_addresses
    WHERE user_id = $1
    ORDER BY is_default DESC, created_at ASC
  `;
  const addresses = await (sql as any).unsafe(addressesSql, [id]);

  // Get recent orders
  const ordersSql = `
    SELECT 
      id,
      order_number,
      status,
      total_amount,
      currency,
      created_at,
      updated_at
    FROM public.orders
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `;
  const orders = await (sql as any).unsafe(ordersSql, [id]);

  return c.json({
    customer,
    addresses,
    recentOrders: orders,
  });
});

// PATCH /api/admin/customers/:id - update customer
customers.patch("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  const { name, email, role, image } = body;

  // Check if customer exists
  const [existing] = await (sql as any).unsafe(
    "SELECT id FROM public.users WHERE id = $1",
    [id]
  );
  if (!existing) {
    return c.json({ error: "Customer not found" }, 404);
  }

  // Check email uniqueness if email is being updated
  if (email) {
    const [emailCheck] = await (sql as any).unsafe(
      "SELECT id FROM public.users WHERE email = $1 AND id != $2",
      [email, id]
    );
    if (emailCheck) {
      return c.json({ error: "Email already exists" }, 400);
    }
  }

  // Build update query
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    params.push(email);
  }
  if (role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    params.push(role);
  }
  if (image !== undefined) {
    updates.push(`image = $${paramIndex++}`);
    params.push(image);
  }

  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const updateSql = `
    UPDATE public.users 
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING id, name, email, role, created_at, updated_at, email_verified, image
  `;

  const [updated] = await (sql as any).unsafe(updateSql, params);
  return c.json({ customer: updated });
});

// DELETE /api/admin/customers/:id - delete customer
customers.delete("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();

  // Check if customer exists
  const [existing] = await (sql as any).unsafe(
    "SELECT id, name FROM public.users WHERE id = $1",
    [id]
  );
  if (!existing) {
    return c.json({ error: "Customer not found" }, 404);
  }

  // Check if customer has orders
  const [orderCheck] = await (sql as any).unsafe(
    "SELECT COUNT(*)::int as count FROM public.orders WHERE user_id = $1",
    [id]
  );
  if (orderCheck.count > 0) {
    return c.json(
      {
        error:
          "Cannot delete customer with existing orders. Consider deactivating instead.",
      },
      400
    );
  }

  // Delete customer (cascade will handle addresses, carts, etc.)
  await (sql as any).unsafe("DELETE FROM public.users WHERE id = $1", [id]);

  return c.json({ message: "Customer deleted successfully" });
});

// GET /api/admin/customers/:id/addresses - get customer addresses
customers.get("/:id/addresses", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();

  const addressesSql = `
    SELECT 
      id,
      address_name,
      recipient_name,
      phone_number,
      street_address,
      city,
      state,
      postal_code,
      country,
      is_default,
      created_at,
      updated_at
    FROM public.user_addresses
    WHERE user_id = $1
    ORDER BY is_default DESC, created_at ASC
  `;
  const addresses = await (sql as any).unsafe(addressesSql, [id]);

  return c.json({ addresses });
});

// POST /api/admin/customers/:id/addresses - add customer address
customers.post("/:id/addresses", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  const {
    address_name,
    recipient_name,
    phone_number,
    street_address,
    city,
    state,
    postal_code,
    country,
    is_default = false,
  } = body;

  if (!street_address || !city || !postal_code || !country) {
    return c.json(
      {
        error: "Street address, city, postal code, and country are required",
      },
      400
    );
  }

  // Check if customer exists
  const [customer] = await (sql as any).unsafe(
    "SELECT id FROM public.users WHERE id = $1",
    [id]
  );
  if (!customer) {
    return c.json({ error: "Customer not found" }, 404);
  }

  // If setting as default, unset other defaults
  if (is_default) {
    await (sql as any).unsafe(
      "UPDATE public.user_addresses SET is_default = false WHERE user_id = $1",
      [id]
    );
  }

  const insertSql = `
    INSERT INTO public.user_addresses (
      user_id, address_name, recipient_name, phone_number,
      street_address, city, state, postal_code, country, is_default
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const [address] = await (sql as any).unsafe(insertSql, [
    id,
    address_name,
    recipient_name,
    phone_number,
    street_address,
    city,
    state,
    postal_code,
    country,
    is_default,
  ]);

  return c.json({ address });
});

// PATCH /api/admin/customers/:id/addresses/:addressId - update customer address
customers.patch(
  "/:id/addresses/:addressId",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const { id, addressId } = c.req.param();
    const body = await c.req.json().catch(() => ({}));

    const {
      address_name,
      recipient_name,
      phone_number,
      street_address,
      city,
      state,
      postal_code,
      country,
      is_default,
    } = body;

    // Check if address exists and belongs to customer
    const [existing] = await (sql as any).unsafe(
      "SELECT id FROM public.user_addresses WHERE id = $1 AND user_id = $2",
      [addressId, id]
    );
    if (!existing) {
      return c.json({ error: "Address not found" }, 404);
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await (sql as any).unsafe(
        "UPDATE public.user_addresses SET is_default = false WHERE user_id = $1 AND id != $2",
        [id, addressId]
      );
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (address_name !== undefined) {
      updates.push(`address_name = $${paramIndex++}`);
      params.push(address_name);
    }
    if (recipient_name !== undefined) {
      updates.push(`recipient_name = $${paramIndex++}`);
      params.push(recipient_name);
    }
    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      params.push(phone_number);
    }
    if (street_address !== undefined) {
      updates.push(`street_address = $${paramIndex++}`);
      params.push(street_address);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      params.push(city);
    }
    if (state !== undefined) {
      updates.push(`state = $${paramIndex++}`);
      params.push(state);
    }
    if (postal_code !== undefined) {
      updates.push(`postal_code = $${paramIndex++}`);
      params.push(postal_code);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      params.push(country);
    }
    if (is_default !== undefined) {
      updates.push(`is_default = $${paramIndex++}`);
      params.push(is_default);
    }

    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(addressId);

    const updateSql = `
    UPDATE public.user_addresses 
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

    const [updated] = await (sql as any).unsafe(updateSql, params);
    return c.json({ address: updated });
  }
);

// DELETE /api/admin/customers/:id/addresses/:addressId - delete customer address
customers.delete(
  "/:id/addresses/:addressId",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const { id, addressId } = c.req.param();

    // Check if address exists and belongs to customer
    const [existing] = await (sql as any).unsafe(
      "SELECT id FROM public.user_addresses WHERE id = $1 AND user_id = $2",
      [addressId, id]
    );
    if (!existing) {
      return c.json({ error: "Address not found" }, 404);
    }

    await (sql as any).unsafe(
      "DELETE FROM public.user_addresses WHERE id = $1",
      [addressId]
    );

    return c.json({ message: "Address deleted successfully" });
  }
);

// GET /api/admin/customers/:id/orders - get customer orders
customers.get("/:id/orders", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const { searchParams } = new URL(c.req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const offset = (page - 1) * limit;

  const ordersSql = `
    SELECT 
      o.id,
      o.order_number,
      o.status,
      o.total_amount,
      o.currency,
      o.created_at,
      o.updated_at,
      COUNT(oi.id) as item_count
    FROM public.orders o
    LEFT JOIN public.order_items oi ON o.id = oi.order_id
    WHERE o.user_id = $1
    GROUP BY o.id, o.order_number, o.status, o.total_amount, o.currency, o.created_at, o.updated_at
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const orders = await (sql as any).unsafe(ordersSql, [id, limit, offset]);

  // Get total count
  const [countResult] = await (sql as any).unsafe(
    "SELECT COUNT(*)::int as total FROM public.orders WHERE user_id = $1",
    [id]
  );
  const total = countResult.total;
  const totalPages = Math.ceil(total / limit);

  return c.json({
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});

export default customers;
