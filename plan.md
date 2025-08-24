Sip 🔥 CAN bikinkan **arsitektur lengkap PlazaCMS Serverless** dengan semua teknologi yang saling terhubung, termasuk **NextAuth + RBAC**.

---

# 🏗️ Arsitektur PlazaCMS (Serverless, Open Source)

```
plazacms/
├── app/
│   ├── store/     → storefront (Next.js, Tailwind, shadcn)
│   ├── admin/     → admin dashboard (Next.js, Tailwind, shadcn, RBAC)
│   ├── api/       → API routes (Next.js Route Handlers / Edge Functions)
│   └── auth/      → login, register, reset password (NextAuth)
├── db/            → PostgreSQL schema & migrations (Prisma)
├── media/         → R2 (storage), Cloudinary (optimization)
├── lib/           → helpers (utils, auth, RBAC, DB client)
└── config/        → env, payment, cloudflare, etc.
```

---

## 🔑 Authentication & Authorization

### NextAuth

* **Provider**: Email/password, Google, GitHub (opsional).
* **Adapter**: Prisma (PostgreSQL).
* **Session Strategy**: JWT (lebih ringan, cocok serverless).
* **User Roles**: Disimpan di tabel `users` (`role = admin | vendor | customer`).

### RBAC

* Middleware cek role sebelum akses route:

  * **admin** → akses penuh ke admin panel.
  * **vendor** → kelola produk sendiri.
  * **customer** → order, cart, review.
* Implementasi dengan:

  ```ts
  // middleware.ts
  import { getToken } from "next-auth/jwt";

  export async function middleware(req) {
    const token = await getToken({ req });
    const role = token?.role || "guest";

    const adminRoutes = ["/admin"];
    if (adminRoutes.some(r => req.nextUrl.pathname.startsWith(r))) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
      }
    }
    return NextResponse.next();
  }
  ```

---

## 🗄️ Database (PostgreSQL + Prisma)

* **users** → auth (NextAuth) + role.
* **products** → simple & variable (variants JSON).
* **orders** → order data.
* **carts** → session-based cart.
* **reviews** → product reviews.
* **media** → R2/Cloudinary metadata.

---

## 💳 Payment Integration

* **PayPal Smart Button** (checkout langsung).
* **Bank Transfer** (manual upload bukti transfer).
* Bisa tambah **Stripe/Midtrans/Xendit** (opsional).

---

## 📦 Media Manager

* **R2 (Cloudflare Object Storage)** → storage utama (murah, S3-compatible).
* **Cloudinary** → CDN & image optimization (resize, lazy load).
* Struktur folder virtual:

  ```
  /media/
    /users/
    /vendors/
    /products/
    /site/
  ```

---

## 🎨 Frontend

* **Next.js (App Router)** → full stack serverless.
* **TailwindCSS + shadcn/ui** → UI modern & konsisten.
* **React Query/TanStack Query** → fetch + cache API.
* **Framer Motion** → animasi UI.

---

## ☁️ Infrastruktur

* **Vercel/Netlify** → deploy Next.js serverless.
* **Cloudflare R2** → storage.
* **Cloudinary** → CDN image optimization.
* **Supabase Auth** (opsional kalau mau ganti NextAuth).
* **Railway/Neon/Postgres Cloud** → PostgreSQL serverless.

---

## 🔐 Flow Utama

1. **User login/register** → NextAuth (JWT).
2. **Role cek** → RBAC middleware.
3. **Cart & Checkout** → disimpan di DB + session.
4. **Payment** → PayPal Smart Button atau Bank Transfer.
5. **Order Confirmed** → email/invoice.
6. **Media Upload** → ke R2, optimized by Cloudinary.
7. **Review system** → user bisa kasih rating produk.

---

⚡ Dengan stack ini:

* Semua open source ✅
* Scalable, bisa jalan serverless ✅
* RBAC jelas, multi-role CMS ✅
* Media storage murah + CDN cepat ✅

---

Mau aku bikinkan **schema database PostgreSQL (Prisma)** versi final sesuai flow di atas biar langsung bisa dipakai?
