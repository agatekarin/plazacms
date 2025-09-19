## Hono Admin – Rate Limiting Guide

### Overview

This app uses `hono-rate-limiter` with Cloudflare Workers KV (`@hono-rate-limiter/cloudflare`) to protect sensitive endpoints and smooth traffic bursts.

- **Store**: Workers KV
  - Binding: `RATE_LIMIT_KV`
  - Prefix: `rl:`
- **Minimum TTL rule (Cloudflare KV)**: exp must be ≥ 60 seconds; we set windows to 180s to avoid 400 errors.

### Current Limits (Default)

- **Auth.js login (POST only)**

  - `POST /api/authjs/signin`: 10 requests / 180s per IP
  - `POST /api/authjs/callback/credentials`: 10 requests / 180s per IP
  - Prefix: `rl:auth:`
  - Why: Real credential submissions hit the callback route; signin page GET is not limited.

- **Business APIs**

  - Scopes: `/api/admin/*`, `/api/auth/*`, `/api/account/*`
  - Limit: 2000 requests / 180s per key
  - Key Strategy: prefer `user:{id}` (JWT sub), fallback `cf-connecting-ip` if no token
  - Prefix: `rl:api:`
  - Excluded: `/api/authjs/*` (Auth.js internal endpoints).

- **Heavy endpoints (admin-only)**

  - Paths: `/api/admin/products/import-export/import`, `/api/admin/products/import-export/export`, `/api/admin/media/upload`, `/api/admin/media/bulk`
  - Limit: 120 requests / 180s per key
  - Key Strategy: prefer `user:{id}`, fallback IP
  - Prefix: `rl:api:heavy:`

- **Health**
  - `/` (health check): Not rate-limited.

### Key Generation

- IP-based: `cf-connecting-ip`
- User-based: `user:{id}` extracted from Authorization Bearer JWT (`sub`) inside keyGenerator; if unavailable, it falls back to IP.

### Headers & Responses

- On limit exceed: HTTP `429 Too Many Requests`.
- Standard headers: `RateLimit-*` per `standardHeaders: "draft-6"`.

### Where It’s Wired (Key Snippets)

- File: `admin-hono/src/index.ts`
  - Auth.js POST routes limiter
  - Scoped business API limiter (`/api/admin/*`, `/api/auth/*`, `/api/account/*`)
  - CORS, secure headers also configured globally

### Configuration

1. KV Binding (`wrangler.toml`):

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<your-kv-namespace-id>"
```

2. Install deps (already added):

```bash
pnpm add -C admin-hono @hono-rate-limiter/cloudflare hono-rate-limiter
```

### Adjusting Limits

- Change `windowMs` and `limit` in `src/index.ts`.
- For stricter/looser rules by route, add additional `app.use("/path", rateLimiter(...))` blocks.
- To treat admins differently:
  - Option A: Increase `limit` when `user.role === 'admin'` (compute in `keyGenerator` or conditionally choose limiter).
  - Option B: Skip limiter entirely for admins (wrap with a small middleware that `return next()` if admin).

### Troubleshooting

- 400 Invalid expiration: Increase `windowMs` to ≥ 60_000 ms (we use 180_000 ms for margin).
- GET on signin page being limited: Ensure limiter checks `c.req.method === 'POST'` (already applied).
- Keys always by IP: The limiter may execute before auth context is set. Either keep IP fallback (current) or parse JWT manually within `keyGenerator` if per-user is required at limiter stage.

### Future Enhancements (Optional)

- Use Durable Objects store for stronger consistency across PoPs.
- Add endpoint-specific rules (e.g., import/export, media upload) with different thresholds.
- Add admin allowlist or dynamic limits via config.

### Quick Reference

- POST `/api/authjs/signin`: 10 / 180s per IP (prefix `rl:auth:`)
- POST `/api/authjs/callback/credentials`: 10 / 180s per IP (prefix `rl:auth:`)
- `/api/admin/*`, `/api/auth/*`, `/api/account/*`: 2000 / 180s per user (fallback IP) (prefix `rl:api:`)
- Heavy: import/export/upload/bulk media: 120 / 180s per user (fallback IP) (prefix `rl:api:heavy:`)
- `/api/authjs/*` (GET): excluded from general limiter
- `/`: health – not limited
