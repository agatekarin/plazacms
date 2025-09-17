import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const transactions = new Hono<{ Bindings: Env; Variables: { user: any } }>();

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

// GET /api/admin/transactions - list transactions with filters & pagination
transactions.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const gateway = (url.searchParams.get("gateway") || "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    where.push(`(
      pt.provider_transaction_id ILIKE $${params.length - 3} OR 
      o.order_number ILIKE $${params.length - 2} OR 
      u.email ILIKE $${params.length - 1} OR 
      u.name ILIKE $${params.length}
    )`);
  }

  if (
    status &&
    [
      "requires_action",
      "pending",
      "authorized",
      "captured",
      "succeeded",
      "failed",
      "canceled",
      "refunded",
    ].includes(status)
  ) {
    params.push(status);
    where.push(`pt.status = $${params.length}`);
  }

  if (gateway) {
    // Filter by gateway slug
    params.push(gateway);
    where.push(`pg.slug = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const listSql = `
    SELECT pt.id, pt.provider_transaction_id, pt.status, pt.amount, pt.currency,
           pt.is_test, pt.created_at, pt.updated_at,
           o.id AS order_id, o.order_number, o.status AS order_status,
           u.id AS user_id, u.name AS customer_name, u.email AS customer_email,
           pg.name AS gateway_name, pg.slug AS gateway_slug,
           pm.name AS method_name,
           COALESCE(pr.refund_count, 0) AS refund_count,
           COALESCE(pr.refunded_amount, 0)::float AS refunded_amount
    FROM public.payment_transactions pt
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
    LEFT JOIN public.payment_methods pm ON pm.id = pt.method_id
    LEFT JOIN (
      SELECT transaction_id,
             COUNT(*) FILTER (WHERE status = 'succeeded') AS refund_count,
             COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) AS refunded_amount
      FROM public.payment_refunds
      GROUP BY transaction_id
    ) pr ON pr.transaction_id = pt.id
    ${whereSql}
    ORDER BY pt.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countSql = `
    SELECT COUNT(*)
    FROM public.payment_transactions pt
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
    ${whereSql}
  `;

  try {
    const rows = await (sql as any).unsafe(
      listSql,
      params.concat([pageSize, offset])
    );
    const countRows = await (sql as any).unsafe(countSql, params);
    const total = Number(countRows?.[0]?.count || 0);
    return c.json({ items: rows, total });
  } catch (e: any) {
    return c.json(
      {
        error: "Failed to fetch transactions",
        detail: String(e?.message || e),
      },
      500
    );
  }
});

// (Moved below static /refunds routes to avoid capturing "/refunds" as id)

// GET /api/admin/transactions/refunds - list refunds
transactions.get("/refunds", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    where.push(`(
      pr.provider_refund_id ILIKE $${params.length - 4} OR 
      pt.provider_transaction_id ILIKE $${params.length - 3} OR 
      o.order_number ILIKE $${params.length - 2} OR 
      u.email ILIKE $${params.length - 1} OR 
      u.name ILIKE $${params.length}
    )`);
  }

  if (status && ["pending", "succeeded", "failed"].includes(status)) {
    params.push(status);
    where.push(`pr.status = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const listSql = `
    SELECT pr.id, pr.amount, pr.reason, pr.provider_refund_id, pr.status,
           pr.created_at, pr.updated_at,
           pt.id AS transaction_id, pt.provider_transaction_id, pt.amount AS transaction_amount,
           o.id AS order_id, o.order_number, o.status AS order_status,
           u.id AS user_id, u.name AS customer_name, u.email AS customer_email,
           pg.name AS gateway_name, pg.slug AS gateway_slug
    FROM public.payment_refunds pr
    LEFT JOIN public.payment_transactions pt ON pt.id = pr.transaction_id
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
    ${whereSql}
    ORDER BY pr.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countSql = `
    SELECT COUNT(*)
    FROM public.payment_refunds pr
    LEFT JOIN public.payment_transactions pt ON pt.id = pr.transaction_id
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
    ${whereSql}
  `;

  const sumSql = `
    SELECT COALESCE(SUM(pr.amount), 0) AS sum
    FROM public.payment_refunds pr
    ${status ? `WHERE pr.status = 'succeeded'` : ``}
  `;

  try {
    const rows = await (sql as any).unsafe(
      listSql,
      params.concat([pageSize, offset])
    );
    const countRows = await (sql as any).unsafe(countSql, params);
    const sumRows = await (sql as any).unsafe(sumSql);
    const total = Number(countRows?.[0]?.count || 0);
    const sum = Number(sumRows?.[0]?.sum || 0);
    return c.json({ items: rows, total, sum });
  } catch (e: any) {
    return c.json(
      { error: "Failed to fetch refunds", detail: String(e?.message || e) },
      500
    );
  }
});

// POST /api/admin/transactions/refunds - create refund record (no gateway integration here)
transactions.post("/refunds", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  const transaction_id =
    typeof body.transaction_id === "string" ? body.transaction_id : undefined;
  const amount = Number(body.amount);
  const reason = typeof body.reason === "string" ? body.reason : null;
  const status =
    typeof body.status === "string" &&
    ["pending", "succeeded", "failed"].includes(body.status)
      ? body.status
      : "pending";

  if (!transaction_id || !Number.isFinite(amount) || amount <= 0) {
    return c.json(
      { error: "transaction_id and valid amount are required" },
      400
    );
  }

  const client = sql;
  try {
    // Validate transaction exists and refundable
    const txRows = await client`
      SELECT id, amount, status FROM public.payment_transactions WHERE id = ${transaction_id}
    `;
    if (!txRows[0]) return c.json({ error: "Transaction not found" }, 404);
    const tx = txRows[0] as any;
    if (!["succeeded", "captured"].includes(String(tx.status))) {
      return c.json(
        { error: "Transaction must be succeeded or captured to be refunded" },
        400
      );
    }

    const refundedRows = await client`
      SELECT COALESCE(SUM(amount), 0) AS total_refunded
      FROM public.payment_refunds
      WHERE transaction_id = ${transaction_id} AND status = 'succeeded'
    `;
    const totalRefunded = Number(refundedRows?.[0]?.total_refunded || 0);
    const txAmount = Number(tx.amount || 0);
    if (totalRefunded + amount > txAmount) {
      return c.json(
        {
          error: `Refund amount exceeds available balance. Available: ${
            txAmount - totalRefunded
          }`,
        },
        400
      );
    }

    const insRows = await client`
      INSERT INTO public.payment_refunds (transaction_id, amount, reason, provider_refund_id, status)
      VALUES (${transaction_id}, ${amount}, ${reason}, ${null}, ${status})
      RETURNING id, amount, reason, provider_refund_id, status, created_at
    `;
    return c.json({ ok: true, refund: insRows[0] }, 201);
  } catch (e: any) {
    return c.json(
      { error: "Failed to create refund", detail: String(e?.message || e) },
      500
    );
  }
});

// POST /api/admin/transactions - create manual transaction
transactions.post("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  const {
    order_id,
    gateway_id,
    method_id = null,
    provider_transaction_id = null,
    status = "pending",
    amount,
    currency = "USD",
    is_test = false,
    meta = null,
  } = body || {};

  if (!order_id) return c.json({ error: "order_id is required" }, 400);
  if (!gateway_id) return c.json({ error: "gateway_id is required" }, 400);
  if (
    amount === undefined ||
    amount === null ||
    !Number.isFinite(Number(amount))
  ) {
    return c.json({ error: "amount must be a number" }, 400);
  }
  if (
    ![
      "requires_action",
      "pending",
      "authorized",
      "captured",
      "succeeded",
      "failed",
      "canceled",
      "refunded",
    ].includes(String(status))
  ) {
    return c.json({ error: "invalid status" }, 400);
  }

  try {
    const insertSql = `
      INSERT INTO public.payment_transactions (
        order_id, gateway_id, method_id, provider_transaction_id, status,
        amount, currency, is_test, meta
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING id, provider_transaction_id, status, amount, currency, created_at
    `;
    const params = [
      order_id,
      gateway_id,
      method_id,
      provider_transaction_id,
      status,
      amount,
      currency,
      is_test,
      meta ? JSON.stringify(meta) : null,
    ];
    const rows = await (sql as any).unsafe(insertSql, params);
    return c.json({ transaction: rows[0] });
  } catch (e: any) {
    return c.json(
      {
        error: "Failed to create transaction",
        detail: String(e?.message || e),
      },
      500
    );
  }
});

// PUT /api/admin/transactions/:id - update transaction
transactions.put("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "Invalid transaction id" }, 400);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  const { status, provider_transaction_id, amount, meta } = body || {};

  const sets: string[] = [];
  const params: any[] = [];

  if (status !== undefined) {
    if (
      ![
        "requires_action",
        "pending",
        "authorized",
        "captured",
        "succeeded",
        "failed",
        "canceled",
        "refunded",
      ].includes(String(status))
    ) {
      return c.json({ error: "Invalid status" }, 400);
    }
    sets.push(`status = $${sets.length + 1}`);
    params.push(status);
  }

  if (provider_transaction_id !== undefined) {
    sets.push(`provider_transaction_id = $${sets.length + 1}`);
    params.push(provider_transaction_id);
  }

  if (amount !== undefined) {
    if (!Number.isFinite(Number(amount))) {
      return c.json({ error: "Invalid amount" }, 400);
    }
    sets.push(`amount = $${sets.length + 1}`);
    params.push(amount);
  }

  if (meta !== undefined) {
    sets.push(`meta = $${sets.length + 1}`);
    params.push(meta ? JSON.stringify(meta) : null);
  }

  if (sets.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  try {
    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    const updateSql = `
      UPDATE public.payment_transactions
      SET ${sets.join(", ")}
      WHERE id = $${params.length}
      RETURNING id, provider_transaction_id, status, amount, currency, updated_at
    `;
    const rows = await (sql as any).unsafe(updateSql, params);
    if (!rows[0]) return c.json({ error: "Transaction not found" }, 404);
    return c.json({ transaction: rows[0] });
  } catch (e: any) {
    return c.json(
      {
        error: "Failed to update transaction",
        detail: String(e?.message || e),
      },
      500
    );
  }
});

export default transactions;
// GET /api/admin/transactions/:id - detail with refunds
transactions.get("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  if (!isUuid(id)) {
    return c.json({ error: "Invalid transaction id" }, 400);
  }
  try {
    const txSql = `
      SELECT pt.*, 
             o.id AS order_id, o.order_number, o.status AS order_status, o.total_amount AS order_total,
             u.id AS user_id, u.name AS customer_name, u.email AS customer_email,
             pg.name AS gateway_name, pg.slug AS gateway_slug, pg.settings AS gateway_settings,
             pm.name AS method_name
      FROM public.payment_transactions pt
      LEFT JOIN public.orders o ON o.id = pt.order_id
      LEFT JOIN public.users u ON u.id = o.user_id
      LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
      LEFT JOIN public.payment_methods pm ON pm.id = pt.method_id
      WHERE pt.id = $1
    `;
    const refundsSql = `
      SELECT pr.*, pt.provider_transaction_id AS original_transaction_id
      FROM public.payment_refunds pr
      LEFT JOIN public.payment_transactions pt ON pt.id = pr.transaction_id
      WHERE pr.transaction_id = $1
      ORDER BY pr.created_at DESC
    `;

    const [txRows, refundRows] = await Promise.all([
      (sql as any).unsafe(txSql, [id]),
      (sql as any).unsafe(refundsSql, [id]),
    ]);

    if (!txRows[0]) return c.json({ error: "Not found" }, 404);
    const transaction = { ...txRows[0], refunds: refundRows };
    return c.json({ transaction });
  } catch (e: any) {
    return c.json(
      { error: "Failed to fetch transaction", detail: String(e?.message || e) },
      500
    );
  }
});
