Sip 🔥 CAN bikinkan **arsitektur lengkap PlazaCMS Serverless** dengan semua teknologi yang saling terhubung, termasuk **NextAuth + RBAC**.

---

# 🏗️ Arsitektur PlazaCMS (Serverless, Open Source)

```
plazacms/
│   ├── store/                 # Next.js storefront (user facing)
│   │   ├── pages/             # Halaman untuk pembeli
│   │   ├── components/        # Komponen spesifik store
│   │   ├── lib/               # Helper khusus store
│   │   └── next.config.js
│   │
│   ├── admin/                 # Next.js admin dashboard
│   │   ├── pages/             # Halaman admin CRUD produk, order, dsb
│   │   ├── components/        # Komponen spesifik admin
│   │   ├── lib/               # Helper khusus admin
│   │   └── next.config.js

```

---

## 🔑 Authentication & Authorization

### NextAuth

* **Provider**: Email/password, Google, GitHub (opsional).
* **Adapter**: PostgreSQL.
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

## 🗄️ Database (PostgreSQL)

*   **users** → Autentikasi (NextAuth) + peran (admin, vendor, customer, guest).
*   **products** → Informasi produk dasar (nama, slug, deskripsi), harga reguler & jual (dengan periode diskon), stok, berat, SKU, status (published, private, draft), kategori, vendor, dan kelas pajak.
*   **product_attributes** → Mendefinisikan jenis atribut produk (misal: "Ukuran", "Warna").
*   **product_attribute_values** → Nilai spesifik untuk atribut (misal: "Merah", "XL").
*   **product_variants** → Kombinasi varian produk unik (misal: T-shirt Merah XL) dengan harga, stok, berat, dan SKU sendiri.
*   **product_images** → Gambar produk induk.
*   **product_variant_images** → Gambar spesifik untuk setiap varian produk.
*   **carts** → Keranjang belanja (berbasis pengguna atau sesi).
*   **cart_items** → Item di keranjang belanja (mereferensikan varian produk).
*   **orders** → Data pesanan lengkap, termasuk detail pengiriman (penyedia, metode, biaya, nomor pelacakan) dan alamat pengiriman/penagihan.
*   **order_items** → Item di pesanan (mereferensikan varian produk).
*   **reviews** → Ulasan produk (mendukung ulasan pengguna terdaftar dan tamu), dengan kemampuan unggah gambar.
*   **review_images** → Gambar yang diunggah oleh pengulas.
*   **media** → Metadata file media (gambar, dll.) dengan tipe media dan ID entitas terkait.
*   **user_addresses** → Alamat yang disimpan pengguna untuk kemudahan checkout.
*   **tax_classes** → Kelas-kelas pajak dengan tarif yang dapat diterapkan pada produk.
*   **shipping_zones** → Area geografis untuk pengiriman.
*   **shipping_zone_locations** → Lokasi spesifik dalam zona pengiriman.
*   **shipping_carriers** → Penyedia jasa pengiriman (misal: FedEx, UPS).
*   **shipping_methods** → Metode pengiriman (misal: Flat Rate, Free Shipping, Table Rate).
*   **shipping_zone_methods** → Biaya dan aturan metode pengiriman per zona (termasuk ambang batas gratis ongkir).
*   **shipping_method_rates** → Aturan biaya pengiriman kompleks (berdasarkan berat, harga, atau jumlah item).
*   **shipping_method_carrier** → Hubungan antara metode pengiriman dan penyedia jasa.
*   **payment_gateways** → Penyedia layanan pembayaran eksternal (misal: PayPal, Stripe).
*   **payment_methods** → Metode pembayaran spesifik per gateway.
*   **site_settings** → Pengaturan global situs dan aset media terkait (logo, favicon, dll.).


---

## 💳 Payment Integration

*   **Sistem Gateway & Metode Pembayaran Dinamis:** Mendukung integrasi dengan berbagai penyedia pembayaran (misal: PayPal, Stripe, Midtrans, Xendit) melalui tabel `payment_gateways`.
*   **Metode Pembayaran Fleksibel:** Setiap gateway dapat menawarkan berbagai metode pembayaran (misal: Kartu Kredit, Transfer Bank, E-wallet) yang dapat dikonfigurasi dan diaktifkan/dinonaktifkan melalui tabel `payment_methods`.
*   **Logo Pembayaran:** Opsi pembayaran dapat menampilkan logo atau ikon yang relevan untuk memudahkan identifikasi pengguna.

---

## 📦 Media Manager

*   **R2 (Cloudflare Object Storage)** → Penyimpanan utama (murah, S3-compatible).
*   **Cloudinary** → CDN & optimasi gambar (resize, lazy load).
*   **Sistem Kategorisasi Media:** Media dikategorikan berdasarkan `media_type` (misal: 'product_image', 'user_profile', 'review_image', 'site_asset') dan terhubung ke entitas terkait melalui `entity_id`. Ini memungkinkan identifikasi mudah dan manajemen media yang tidak terpakai (orphan media).
*   **Aplikasi Media:** Media dapat diunggah dan digunakan untuk:
    *   Gambar Produk & Varian
    *   Gambar Kategori
    *   Gambar Ulasan
    *   Logo Pembayaran & Pengiriman
    *   Aset Situs (Logo situs, favicon, gambar default, dll.)

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
* **Railway/Neon/Postgres Cloud** → PostgreSQL serverless.

---

## 🔐 Flow Utama

1.  **User login/register** → NextAuth (JWT).
2.  **Role cek** → RBAC middleware.
3.  **Manajemen Alamat** → Pengguna dapat menyimpan dan mengelola alamat untuk pengisian otomatis saat checkout.
4.  **Pilihan Produk & Varian** → Pengguna memilih produk dan varian spesifik (misal: ukuran, warna), dengan gambar, harga, dan stok yang sesuai.
5.  **Cart & Checkout** → Item (varian produk) ditambahkan ke keranjang. Proses checkout melibatkan pemilihan alamat tersimpan, opsi pengiriman, dan metode pembayaran.
6.  **Pilihan Pengiriman Dinamis** → Pengguna memilih metode pengiriman berdasarkan zona, carrier, dan aturan biaya (flat, weight-based, free shipping threshold).
7.  **Pilihan Pembayaran Dinamis** → Pengguna memilih metode pembayaran dari berbagai gateway yang tersedia (misal: PayPal, Stripe, Transfer Bank).
8.  **Order Confirmed** → Email/invoice pesanan dikirim, termasuk detail pengiriman dan pembayaran.
9.  **Media Upload** → Gambar produk, varian, ulasan, atau aset situs diunggah ke R2, dioptimalkan oleh Cloudinary.
10. **Review system** → Pengguna terdaftar atau tamu dapat memberikan ulasan produk dengan rating, komentar, dan kemampuan mengunggah gambar.

---

⚡ Dengan stack ini:

*   Semua open source ✅
*   Scalable, bisa jalan serverless ✅
*   RBAC jelas, multi-role CMS ✅
*   Manajemen media yang canggih dan terorganisir ✅
*   Sistem produk dan varian yang fleksibel (harga, stok, berat, SKU, status, diskon) ✅
*   Konfigurasi pengiriman yang dinamis (zona, metode, carrier, aturan biaya, gratis ongkir) ✅
*   Integrasi pembayaran multi-gateway yang dapat disesuaikan ✅
*   Sistem ulasan produk yang lengkap (termasuk ulasan tamu dan gambar) ✅
*   Pengaturan situs terpusat ✅

---

Mau aku bikinkan **schema database PostgreSQL** versi final sesuai flow di atas biar langsung bisa dipakai?
