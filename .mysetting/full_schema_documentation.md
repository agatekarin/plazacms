# 📚 Dokumentasi Skema Database PlazaCMS

Dokumen ini menyediakan gambaran lengkap tentang semua tabel dalam skema database PlazaCMS, beserta tujuan dan kolom-kolom utamanya. Ini dirancang untuk membantu pengembang memahami struktur data dan hubungan antar entitas.

---

## ℹ️ Catatan Global

- **Trigger `updated_at`:** Banyak tabel memiliki trigger `trg_set_updated_at_*` yang memanggil fungsi `set_updated_at()` pada setiap operasi UPDATE untuk mengisi kolom `updated_at` dengan `CURRENT_TIMESTAMP`. Ini menyederhanakan audit waktu pembaruan tanpa perlu menyetel kolom tersebut di aplikasi.

---

## 🔑 Autentikasi & Otorisasi

### `users`

- **Tujuan:** Menyimpan informasi dasar pengguna, termasuk peran (role) untuk kontrol akses.
- **Kolom Penting:**
  - `id` (UUID): Primary Key, ID unik pengguna.
  - `name` (TEXT): Nama pengguna.
  - `email` (TEXT): Email pengguna, unik.
  - `email_verified` (TIMESTAMPTZ): Waktu verifikasi email.
  - `image` (TEXT): URL gambar profil pengguna.
  - `role` (TEXT): Peran pengguna ('admin', 'vendor', 'customer', 'guest').
  - `password_hash` (TEXT): Hash password pengguna.
  - `created_at` (TIMESTAMPTZ): Waktu pembuatan akun.
  - `updated_at` (TIMESTAMPTZ): Waktu terakhir update.
- **Hubungan:** Direferensikan oleh `accounts`, `sessions`, `media`, `products`, `reviews`, `user_addresses`, `carts`, `orders`.
- **Fitur Baru:** Customer Admin Management dengan address management dan order tracking.

### `accounts`

- **Tujuan:** Menyimpan informasi akun pengguna dari berbagai penyedia autentikasi (misal: Google, GitHub) yang terhubung dengan pengguna di aplikasi.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `user_id` (UUID): Foreign Key ke `users.id`.
  - `type` (TEXT): Tipe akun (misal: "oauth", "email").
  - `provider` (TEXT): Nama penyedia autentikasi (misal: "google", "github").
  - `provider_account_id` (TEXT): ID unik dari penyedia.
  - `access_token` (TEXT): Token akses dari penyedia.
- **Hubungan:** Mereferensikan `users`.

### `sessions`

- **Tujuan:** Menyimpan sesi pengguna yang aktif, digunakan untuk menjaga pengguna tetap login.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `user_id` (UUID): Foreign Key ke `users.id`.
  - `expires` (TIMESTAMPTZ): Waktu kedaluwarsa sesi.
  - `session_token` (TEXT): Token sesi unik.
- **Hubungan:** Mereferensikan `users`.

### `verification_tokens`

- **Tujuan:** Menyimpan token yang digunakan untuk verifikasi email atau reset password.
- **Kolom Penting:**
  - `identifier` (TEXT): Pengidentifikasi (misal: email).
  - `token` (TEXT): Token unik.
  - `expires` (TIMESTAMPTZ): Waktu kedaluwarsa token.

---

## 🖼️ Manajemen Media

### `media_folders`

- **Tujuan:** Menyimpan struktur folder virtual untuk mengorganisir file media. Mendukung hirarki folder dengan parent-child relationship, mirip dengan WordPress Media Library.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (TEXT): Nama folder.
  - `parent_id` (UUID): Foreign Key ke `media_folders.id` (untuk folder induk).
  - `path` (TEXT): Path lengkap folder (misal: "/products/phones/iphone"), unik.
  - `description` (TEXT): Deskripsi folder.
- **Fitur:**
  - Hirarki folder tak terbatas dengan cascading delete
  - Path unik untuk navigasi breadcrumb
  - Index optimized untuk parent lookup dan path search
- **Hubungan:** Self-referencing untuk hirarki, direferensikan oleh `media`.

### `media`

- **Tujuan:** Menyimpan metadata untuk semua file media (gambar, video, dll.) yang diunggah ke sistem. Terintegrasi dengan sistem folder virtual dan Cloudflare R2 storage dengan SEO-friendly URL structure.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `filename` (TEXT): Nama asli file.
  - `file_url` (TEXT): SEO-friendly URL di Cloudflare R2 (misal: `uploads/products/phones/2025/iphone-15-pro.jpg`).
  - `file_type` (TEXT): Tipe MIME file (misal: "image/jpeg").
  - `size` (INTEGER): Ukuran file dalam byte.
  - `alt_text` (TEXT): Teks alternatif untuk gambar (untuk SEO/aksesibilitas).
  - `uploaded_by` (UUID): Foreign Key ke `users.id` (pengguna yang mengunggah).
  - `folder_id` (UUID): Foreign Key ke `media_folders.id` (folder tempat file disimpan).
  - `media_type` (TEXT): Tipe media ('product_image', 'product_variant_image', 'user_profile', 'review_image', 'other', 'site_asset').
  - `entity_id` (UUID): ID dari entitas yang terkait dengan media (misal: product_id, user_id, review_id).
- **Enhanced URL Features:**
  - **SEO-Friendly URLs** → `uploads/folder-path/YYYY/clean-filename.ext`
  - **Folder-based Organization** → Mirror media manager folder structure
  - **Year-based Archival** → Automatic year organization untuk scalability
  - **Filename Sanitization** → Auto-cleanup special characters untuk URL safety
  - **Media Type Fallback** → Kalau no folder, gunakan media type untuk organization
- **URL Examples:**
  - Folder "Products/Phones" → `uploads/products/phones/2025/iphone-15-pro.jpg`
  - Folder "Posts" → `uploads/posts/2025/blog-article-image.jpg`
  - No folder, type "site-assets" → `uploads/site-assets/2025/logo.png`
- **Fitur:**
  - Terintegrasi dengan Cloudflare R2 untuk storage yang scalable
  - WordPress-style folder organization dengan modern URL structure
  - Automatic file path generation berdasarkan folder selection
  - Usage tracking untuk mencegah penghapusan file yang masih digunakan
  - Backward compatibility dengan existing URLs
- **Cloudinary Integration:**
  - On-demand image optimization via `MediaOptimizer` service
  - Automatic fallback ke R2 URLs jika Cloudinary unavailable
  - Preset transformations untuk thumbnails, product cards, galleries
  - CDN caching untuk performance optimization
- **Session Tracking:**
  - `uploaded_by` field untuk audit trail dan user permissions
  - `entity_id` untuk content association dan usage tracking
  - Automatic metadata population via NextAuth session
- **Hubungan:** Mereferensikan `media_folders` dan `users`, direferensikan oleh `product_images`, `product_variant_images`, `review_images`, `categories`, `payment_gateways`, `payment_methods`, `shipping_carriers`, `shipping_methods`, `site_settings`.

---

## 🛍️ Produk & Kategori

### `categories`

- **Tujuan:** Mengorganisir produk ke dalam kategori. Mendukung kategori bersarang.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (TEXT): Nama kategori, unik.
  - `slug` (TEXT): Slug URL kategori, unik.
  - `description` (TEXT): Deskripsi kategori.
  - `parent_id` (UUID): Foreign Key ke `categories.id` (untuk kategori induk).
  - `image_id` (UUID): Foreign Key ke `media.id` untuk gambar kategori.
- **Hubungan:** Direferensikan oleh `products`.

### `products` ✅ **ENHANCED**

- **Tujuan:** Data produk induk dengan review integration dan comprehensive product management.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (TEXT): Nama produk.
  - `slug` (TEXT): Slug URL produk, unik.
  - `description` (TEXT): Deskripsi produk lengkap.
  - `short_description` (TEXT): Deskripsi singkat untuk listing.
  - `regular_price` (NUMERIC): Harga produk tanpa diskon.
  - `sale_price` (NUMERIC): Harga produk saat diskon.
  - `sale_start_date` (TIMESTAMPTZ): Tanggal mulai diskon.
  - `sale_end_date` (TIMESTAMPTZ): Tanggal berakhir diskon.
  - `currency` (TEXT): Mata uang (misal: "USD").
  - `stock` (INTEGER): Jumlah stok produk.
  - `category_id` (UUID): Foreign Key ke `categories.id`.
  - `vendor_id` (UUID): Foreign Key ke `users.id` (penjual produk).
  - `status` (TEXT): Status produk ('published', 'private', 'draft', 'archived').
  - `weight` (NUMERIC): Berat produk (untuk perhitungan pengiriman).
  - `sku` (TEXT): Stock Keeping Unit produk, unik.
  - `tax_class_id` (UUID): Foreign Key ke `tax_classes.id`.
  - `featured_image_id` (UUID): Foreign Key ke `media.id` untuk featured image.
  - `product_type` (TEXT): Tipe produk ('simple', 'variable').
  - `review_count` (INTEGER): Computed field untuk jumlah approved reviews.
  - `average_rating` (NUMERIC): Computed field untuk average rating.
  - `created_at` (TIMESTAMPTZ): Waktu pembuatan.
  - `updated_at` (TIMESTAMPTZ): Waktu update terakhir.
- **Enhanced Features:**
  - **Review Integration** → Live review count dan average rating dalam product listing
  - **Featured Image** → Direct reference ke featured image untuk fast loading
  - **Product Types** → Simple vs Variable product support
  - **Short Description** → Separate field untuk product listings dan cards
  - **Comprehensive Detail API** → All related data (categories, attributes, variants, gallery, reviews) dalam single endpoint
  - **Category Integration** → Single category dengan proper foreign key relationship
  - **Variant Support** → Attributes linked through variants dengan proper many-to-many relationship
  - **Gallery Images** → Multiple images dengan display order via product_images table
  - **Database Schema Fixes** → Corrected queries untuk proper variant dan attribute relationships
- **Hubungan:** Mereferensikan `categories`, `users`, `tax_classes`, `media`. Direferensikan oleh `product_images`, `product_variants`, `reviews`, `order_items`.

### `product_images`

- **Tujuan:** Menghubungkan produk induk dengan gambar-gambar utamanya.
- **Kolom Penting:**
  - `product_id` (UUID): Foreign Key ke `products.id`.
  - `media_id` (UUID): Foreign Key ke `media.id`.
  - `display_order` (INTEGER): Urutan tampilan gambar.
- **Hubungan:** Mereferensikan `products` dan `media`.

---

## 🏷️ Varian Produk & Atribut

### `product_attributes`

- **Tujuan:** Mendefinisikan jenis atribut yang dapat dimiliki produk (misal: "Color", "Size").
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (TEXT): Nama atribut, unik.
- **Hubungan:** Direferensikan oleh `product_attribute_values`.

### `product_attribute_values`

- **Tujuan:** Menyimpan nilai-nilai spesifik untuk setiap atribut (misal: "Red", "Blue" untuk atribut "Color").
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `attribute_id` (UUID): Foreign Key ke `product_attributes.id`.
  - `value` (TEXT): Nilai atribut.
- **Hubungan:** Mereferensikan `product_attributes` dan direferensikan oleh `product_variant_attribute_values`.

### `product_variants`

- **Tujuan:** Merepresentasikan setiap kombinasi unik dari varian produk (misal: T-shirt Merah Ukuran S). Fully enhanced untuk WooCommerce-style management dengan inline editing dan bulk operations.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `product_id` (UUID): Foreign Key ke `products.id`.
  - `sku` (TEXT): Stock Keeping Unit varian, unik.
  - `regular_price` (NUMERIC): Harga reguler varian (jika berbeda dari produk induk).
  - `sale_price` (NUMERIC): Harga jual varian.
  - `sale_start_date` (TIMESTAMPTZ): Tanggal mulai diskon varian (enhanced untuk scheduling).
  - `sale_end_date` (TIMESTAMPTZ): Tanggal berakhir diskon varian (enhanced untuk scheduling).
  - `stock` (INTEGER): Stok spesifik untuk varian ini.
  - `status` (TEXT): Status varian ('published', 'private', 'draft', 'archived').
  - `weight` (NUMERIC): Berat varian (jika berbeda dari produk induk).
- **Enhanced Features:**
  - **Auto-generation dari attributes** - Generate semua kombinasi varian dari selected attributes
  - **Inline editing** - Edit langsung di table tanpa modal (WooCommerce-style)
  - **Bulk operations** - Set price, sale price, stock, status untuk multiple variants
  - **Per-variant images** - Setiap variant bisa punya gambar tersendiri
  - **Sale scheduling** - Start/end dates untuk automatic sale price activation
  - **Search & filter** - Filter by status, search by SKU/attributes
  - **Expand/collapse rows** - Show/hide variant details untuk better UX
  - **Import/Export** - JSON format untuk bulk data management
- **Hubungan:** Mereferensikan `products` dan direferensikan oleh `cart_items`, `order_items`, `product_variant_images`, `product_variant_attribute_values`.

### `product_variant_attribute_values`

- **Tujuan:** Tabel penghubung (many-to-many) antara varian produk dan nilai-nilai atributnya.
- **Kolom Penting:**
  - `product_variant_id` (UUID): Foreign Key ke `product_variants.id`.
  - `attribute_value_id` (UUID): Foreign Key ke `product_attribute_values.id`.
- **Hubungan:** Mereferensikan `product_variants` dan `product_attribute_values`.

### `product_variant_images`

- **Tujuan:** Menghubungkan varian produk dengan gambar-gambar spesifik untuk varian tersebut.
- **Kolom Penting:**
  - `product_variant_id` (UUID): Foreign Key ke `product_variants.id`.
  - `media_id` (UUID): Foreign Key ke `media.id`.
  - `display_order` (INTEGER): Urutan tampilan gambar varian.
- **Hubungan:** Mereferensikan `product_variants` dan `media`.

---

## 🛒 Keranjang Belanja & Pesanan

### `carts`

- **Tujuan:** Menyimpan informasi keranjang belanja pengguna atau sesi.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `user_id` (UUID): Foreign Key ke `users.id` (NULL untuk keranjang tamu).
  - `session_id` (TEXT): ID sesi unik untuk keranjang tamu.
- **Hubungan:** Direferensikan oleh `cart_items`.

### `cart_items`

- **Tujuan:** Menyimpan item-item yang ada di dalam keranjang belanja.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `cart_id` (UUID): Foreign Key ke `carts.id`.
  - `product_variant_id` (UUID): Foreign Key ke `product_variants.id` (varian produk yang ditambahkan).
  - `quantity` (INTEGER): Jumlah item.
  - `price_at_add` (NUMERIC): Harga item saat ditambahkan ke keranjang.
- **Hubungan:** Mereferensikan `carts` dan `product_variants`.

### `orders`

- **Tujuan:** Menyimpan informasi pesanan yang telah dibuat oleh pengguna.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `order_number` (VARCHAR): Nomor order terformat 10 digit. Format: `LPAD(nextval('public.order_global_seq')::text, 4, '0') || TO_CHAR(CURRENT_DATE, 'DDMMYY')`. Dilindungi oleh constraint `orders_order_number_format_check`.
  - `user_id` (UUID): Foreign Key ke `users.id`.
  - `status` (TEXT): Status pesanan ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded').
  - `total_amount` (NUMERIC): Total jumlah pesanan.
  - `currency` (TEXT): Mata uang.
  - `shipping_address` (JSONB): Detail alamat pengiriman.
  - `billing_address` (JSONB): Detail alamat penagihan.
  - `payment_method` (TEXT): Label metode pembayaran terdenormalisasi pada saat order dibuat (untuk histori/tampilan).
  - `payment_status` (TEXT): Status pembayaran ('pending', 'completed', 'failed', 'refunded').
  - `transaction_id` (UUID, nullable): Referensi ke `payment_transactions.id` untuk transaksi pembayaran terakhir/utama.
  - `shipping_provider` (TEXT): Label penyedia pengiriman terdenormalisasi (misal: "JNE").
  - `shipping_method` (TEXT): Label metode pengiriman terdenormalisasi (misal: "REG").
  - `shipping_cost` (NUMERIC): Biaya pengiriman.
  - `tracking_number` (TEXT): Nomor pelacakan.
  - `payment_method_id` (UUID): Foreign Key ke `payment_methods.id`.
  - `shipping_zone_method_id` (UUID): Foreign Key ke `shipping_methods.id` (catatan: sebelumnya didokumentasikan sebagai `shipping_zone_methods`).
  - `carrier_id` (UUID, opsional/deprecated): Jika masih ada tabel carrier terpisah.
- **Hubungan:** Mereferensikan `users`, `payment_methods`, `shipping_methods`. Direferensikan oleh `order_items`.

### `order_items` ✅ **ENHANCED**

- **Tujuan:** Detail item pesanan dengan review integration dan product tracking.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `order_id` (UUID): Foreign Key ke `orders.id`.
  - `product_variant_id` (UUID): Foreign Key ke `product_variants.id`.
  - `product_id` (UUID): Foreign Key ke `products.id` (untuk review requests).
  - `product_name` (TEXT): Nama produk saat dipesan (untuk historis).
  - `product_price` (NUMERIC): Harga produk saat dipesan (untuk historis).
  - `quantity` (INTEGER): Jumlah item.
  - `has_review` (BOOLEAN): Computed field untuk review status tracking.
- **Enhanced Features:**
  - **Review Integration** → Link ke product untuk review requests
  - **Review Status Tracking** → Check if customer sudah review item ini
  - **Product Reference** → Direct link ke product untuk review functionality
  - **Historical Data** → Preserve product info saat order dibuat
- **Hubungan:** Mereferensikan `orders`, `product_variants`, `products`. Direferensikan oleh `reviews` (via order_id), `email_notifications`.

---

## 💬 Review Management System ✅ **FULLY IMPLEMENTED**

### `reviews` ✅ **ENHANCED**

- **Tujuan:** Comprehensive review system dengan moderation, analytics, dan email notifications.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `product_id` (UUID): Foreign Key ke `products.id`.
  - `user_id` (UUID): Foreign Key ke `users.id` (null jika tamu).
  - `guest_name` (TEXT): Nama tamu jika user_id null.
  - `guest_email` (TEXT): Email tamu jika user_id null.
  - `rating` (INTEGER): Rating 1-5.
  - `title` (TEXT): Judul ulasan (optional).
  - `comment` (TEXT): Isi ulasan.
  - `status` (TEXT): Status ('pending', 'approved', 'rejected').
  - `moderation_status` (TEXT): Status moderasi ('none', 'flagged', 'reviewed').
  - `moderation_notes` (TEXT): Catatan moderator.
  - `admin_response` (TEXT): Response dari admin.
  - `admin_response_date` (TIMESTAMPTZ): Tanggal admin response.
  - `helpful_count` (INTEGER): Jumlah helpful votes.
  - `unhelpful_count` (INTEGER): Jumlah unhelpful votes.
  - `verified_purchase` (BOOLEAN): Apakah pembeli terverifikasi.
  - `order_id` (UUID): Foreign Key ke `orders.id` untuk verified purchases.
  - `ip_address` (TEXT): IP address untuk tracking dan spam prevention.
  - `created_at` (TIMESTAMPTZ): Waktu pembuatan.
  - `updated_at` (TIMESTAMPTZ): Waktu update terakhir.
- **Enhanced Features:**
  - **Complete Moderation System** → Admin dapat approve, reject, flag, dan respond
  - **Guest Review Support** → Tamu dapat memberikan review dengan name/email
  - **Verified Purchase Tracking** → Link ke order untuk verified buyer badges
  - **Admin Response System** → Official responses dari admin
  - **Helpful Voting System** → Users dapat vote reviews sebagai helpful/unhelpful
  - **Analytics Integration** → Comprehensive statistics dan trending data
  - **Email Notifications** → Automated review requests dan responses
- **Hubungan:** Mereferensikan `products`, `users`, `orders`, direferensikan oleh `review_images`, `review_helpful_votes`.

### `review_images` ✅ **ENHANCED**

- **Tujuan:** Gambar review terintegrasi dengan media management system.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `review_id` (UUID): Foreign Key ke `reviews.id`.
  - `media_id` (UUID): Foreign Key ke `media.id`.
  - `display_order` (INTEGER): Urutan tampilan gambar.
  - `created_at` (TIMESTAMPTZ): Waktu upload.
- **Enhanced Features:**
  - **R2 Storage Integration** → Images stored di Cloudflare R2
  - **Media Management** → Full integration dengan existing media system
  - **SEO-friendly URLs** → Proper image URLs dengan folder organization
  - **Display Ordering** → Proper sequence untuk multiple images
- **Hubungan:** Mereferensikan `reviews` dan `media`.

### `review_helpful_votes` ✅ **NEW**

- **Tujuan:** Voting system untuk helpful/unhelpful reviews dengan spam prevention.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `review_id` (UUID): Foreign Key ke `reviews.id`.
  - `user_id` (UUID): Foreign Key ke `users.id` (null jika guest).
  - `ip_address` (TEXT): IP address untuk guest tracking.
  - `is_helpful` (BOOLEAN): true = helpful, false = unhelpful.
  - `created_at` (TIMESTAMPTZ): Waktu voting.
- **Features:**
  - **User & Guest Voting** → Support untuk registered users dan guests
  - **IP-based Prevention** → Prevent duplicate voting dari same IP
  - **Automatic Counting** → Triggers update helpful_count di reviews table
  - **Vote History** → Complete audit trail untuk all votes
- **Hubungan:** Mereferensikan `reviews` dan `users`.

### `email_templates` ✅ **NEW**

- **Tujuan:** Customizable email templates untuk review notification system.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (TEXT): Template name (misal: "Review Request").
  - `subject` (TEXT): Subject line dengan variable support.
  - `content` (TEXT): HTML/text content dengan placeholders.
  - `type` (TEXT): Template type ('review_request', 'review_response').
  - `is_active` (BOOLEAN): Active status.
  - `variables` (JSONB): Available variables documentation.
  - `created_at` (TIMESTAMPTZ): Creation time.
  - `updated_at` (TIMESTAMPTZ): Last update time.
- **Features:**
  - **Variable System** → {{customer_name}}, {{product_name}}, {{review_link}}
  - **Multi-type Support** → Different templates untuk different scenarios
  - **Active/Inactive Control** → Enable/disable tanpa delete
  - **JSONB Variables** → Flexible variable definition
- **Hubungan:** Direferensikan oleh `email_notifications`.

### `email_notifications` ✅ **NEW**

- **Tujuan:** Complete audit log untuk semua review-related email notifications.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `type` (TEXT): Notification type ('review_request', 'review_response').
  - `recipient_email` (TEXT): Email penerima.
  - `subject` (TEXT): Actual subject yang dikirim.
  - `content` (TEXT): Actual content yang dikirim.
  - `template_id` (UUID): Foreign Key ke `email_templates.id`.
  - `order_id` (UUID): Foreign Key ke `orders.id` (untuk review requests).
  - `order_item_id` (UUID): Foreign Key ke `order_items.id`.
  - `review_id` (UUID): Foreign Key ke `reviews.id` (untuk responses).
  - `status` (TEXT): Delivery status ('pending', 'sent', 'failed').
  - `sent_at` (TIMESTAMPTZ): Actual send time.
  - `error_message` (TEXT): Error details jika gagal.
  - `created_at` (TIMESTAMPTZ): Creation time.
- **Features:**
  - **Complete Email Audit** → Track semua email notifications
  - **Error Logging** → Detailed error tracking untuk troubleshooting
  - **Multi-context Support** → Orders, items, reviews
  - **Delivery Status** → Monitor email delivery success
  - **Template Integration** → Link ke template yang digunakan
- **Hubungan:** Mereferensikan `email_templates`, `orders`, `order_items`, `reviews`.

---

## 🏡 Alamat Pengguna

### `user_addresses` ✅ **ENHANCED**

- **Tujuan:** Menyimpan alamat-alamat yang telah disimpan oleh pengguna untuk kemudahan checkout.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `user_id` (UUID): Foreign Key ke `users.id`.
  - `address_name` (TEXT): Nama alamat (misal: "Rumah", "Kantor").
  - `recipient_name` (TEXT): Nama penerima.
  - `phone_number` (TEXT): Nomor telepon.
  - `street_address` (TEXT): Alamat jalan.
  - `city` (TEXT): Kota.
  - `state` (TEXT): Provinsi/negara bagian.
  - `postal_code` (TEXT): Kode pos.
  - `country` (TEXT): Negara.
  - `is_default` (BOOLEAN): Penanda alamat default.
  - `created_at` (TIMESTAMPTZ): Waktu pembuatan alamat.
  - `updated_at` (TIMESTAMPTZ): Waktu terakhir update.
- **Hubungan:** Mereferensikan `users`.
- **Fitur Baru:**
  - ✅ **Country & State Selectors** dengan search functionality
  - ✅ **Admin Management** untuk CRUD operations
  - ✅ **Default Address** management
  - ✅ **Mobile-friendly** UI dengan proper validation

---

## 🌍 Sistem Manajemen Lokasi ✅ **FULLY IMPLEMENTED**

### `countries`

- **Tujuan:** Menyimpan data negara seluruh dunia untuk keperluan shipping zones, address management, dan location-based features.
- **Kolom Penting:**
  - `id` (INTEGER): Primary Key, ID negara berdasarkan standar internasional.
  - `name` (VARCHAR): Nama lengkap negara.
  - `iso2` (CHAR): Kode ISO 2 huruf negara (misal: 'US', 'ID'), unique.
  - `iso3` (CHAR): Kode ISO 3 huruf negara (misal: 'USA', 'IDN'), unique.
  - `phone_code` (VARCHAR): Kode telepon negara (misal: '1', '62').
  - `capital` (VARCHAR): Nama ibukota negara.
  - `currency` (VARCHAR): Kode mata uang utama.
  - `currency_name` (VARCHAR): Nama lengkap mata uang.
  - `currency_symbol` (VARCHAR): Simbol mata uang.
  - `region` (VARCHAR): Region geografis (misal: 'Asia', 'Europe').
  - `subregion` (VARCHAR): Sub-region (misal: 'Southeast Asia', 'Western Europe').
  - `latitude` (NUMERIC): Koordinat lintang negara.
  - `longitude` (NUMERIC): Koordinat bujur negara.
  - `emoji` (VARCHAR): Flag emoji negara.
  - `created_at` (TIMESTAMPTZ): Waktu pembuatan record.
  - `updated_at` (TIMESTAMPTZ): Waktu terakhir update.
- **Indexes:**
  - `idx_countries_iso2` untuk pencarian berdasarkan kode ISO2
  - `idx_countries_iso3` untuk pencarian berdasarkan kode ISO3
  - `idx_countries_name` untuk pencarian berdasarkan nama negara
  - `idx_countries_region` untuk filtering berdasarkan region
- **Hubungan:** Direferensikan oleh `states`, `cities`, `shipping_zone_countries`, address fields di `users`, `orders`.
- **Data:** 250 negara dengan data geografis lengkap.

### `states`

- **Tujuan:** Menyimpan data provinsi/state/region dalam negara untuk keperluan alamat detail dan shipping calculations.
- **Kolom Penting:**
  - `id` (INTEGER): Primary Key, ID state berdasarkan standar internasional.
  - `name` (VARCHAR): Nama lengkap provinsi/state.
  - `country_id` (INTEGER): Foreign Key ke `countries.id`.
  - `country_code` (VARCHAR): Kode ISO2 negara untuk reference.
  - `iso2` (VARCHAR): Kode ISO2 state jika tersedia.
  - `fips_code` (VARCHAR): Kode FIPS untuk US states.
  - `type` (VARCHAR): Tipe administrative division (misal: 'state', 'province').
  - `latitude` (NUMERIC): Koordinat lintang state.
  - `longitude` (NUMERIC): Koordinat bujur state.
  - `created_at` (TIMESTAMPTZ): Waktu pembuatan record.
  - `updated_at` (TIMESTAMPTZ): Waktu terakhir update.
- **Indexes:**
  - Index pada `country_id` untuk filtering berdasarkan negara
  - Index pada `country_code` untuk lookup performance
  - Index pada `name` untuk pencarian state
- **Hubungan:** Mereferensikan `countries`, direferensikan oleh `cities`, address fields.
- **Data:** 5,099 states/provinces dari seluruh dunia.

### `cities`

- **Tujuan:** Menyimpan data kota-kota untuk keperluan alamat detail, shipping calculations, dan location-based services.
- **Kolom Penting:**
  - `id` (INTEGER): Primary Key, ID kota berdasarkan database internasional.
  - `name` (VARCHAR): Nama kota.
  - `state_id` (INTEGER): Foreign Key ke `states.id`.
  - `country_id` (INTEGER): Foreign Key ke `countries.id`.
  - `latitude` (NUMERIC): Koordinat lintang kota.
  - `longitude` (NUMERIC): Koordinat bujur kota.
  - `created_at` (TIMESTAMPTZ): Waktu pembuatan record.
  - `updated_at` (TIMESTAMPTZ): Waktu terakhir update.
- **Indexes:**
  - Index pada `state_id` untuk filtering berdasarkan state
  - Index pada `country_id` untuk filtering berdasarkan negara
  - Index pada `name` untuk pencarian kota
- **Hubungan:** Mereferensikan `states` dan `countries`.
- **Data:** 151,165 kota dari seluruh dunia dengan koordinat geografis.

### `location_sync_progress`

- **Tujuan:** Tracking progress untuk proses import data lokasi dengan real-time monitoring.
- **Kolom Penting:**
  - `id` (UUID): Primary Key, ID unik untuk setiap proses import.
  - `table_type` (TEXT): Jenis tabel yang di-import ('countries', 'states', 'cities', 'combined').
  - `status` (TEXT): Status import ('pending', 'importing', 'completed', 'failed').
  - `progress` (INTEGER): Persentase progress (0-100).
  - `message` (TEXT): Pesan status atau error.
  - `records_imported` (INTEGER): Jumlah record yang berhasil di-import.
  - `records_new` (INTEGER): Jumlah record baru yang ditambahkan.
  - `records_updated` (INTEGER): Jumlah record yang di-update.
  - `started_at` (TIMESTAMPTZ): Waktu mulai proses import.
  - `completed_at` (TIMESTAMPTZ): Waktu selesai proses import.
  - `error` (TEXT): Detail error jika import gagal.
- **Fitur:**
  - Real-time progress tracking dengan WebSocket support
  - Chunked processing monitoring (25 rows per batch)
  - Comprehensive statistics untuk import analysis
- **Hubungan:** Standalone table untuk monitoring.

### `location_data_sync`

- **Tujuan:** Audit trail untuk proses sinkronisasi data lokasi dari sumber eksternal (GitHub CSV).
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `table_type` (TEXT): Jenis tabel yang di-sync.
  - `data_version` (TEXT): Versi data atau commit hash dari sumber.
  - `sync_date` (TIMESTAMPTZ): Waktu sinkronisasi.
  - `records_imported` (INTEGER): Total record yang berhasil di-import.
  - `sync_status` (TEXT): Status sync ('success', 'failed', 'partial').
  - `error_details` (TEXT): Detail error jika ada.
  - `updated_at` (TIMESTAMPTZ): Waktu terakhir update.
- **Fitur:**
  - Version tracking untuk data consistency
  - Audit trail untuk compliance dan debugging
  - Error logging untuk troubleshooting
- **Hubungan:** Standalone audit table.

### **🚀 Location Import System Features**

#### **Individual Table Imports**

- Separate import buttons untuk Countries, States, Cities
- No checkbox-based selection, direct table-specific imports
- Professional UI cards dengan progress indicators

#### **Chunked Processing**

- 25 rows per batch untuk rate limit compliance
- Delay between chunks untuk Cloudflare Workers/Neon optimization
- Background processing dengan Hono executionCtx.waitUntil

#### **Upsert Logic**

- `ON CONFLICT (id) DO UPDATE SET` untuk incremental updates
- No data loss - existing records preserved, missing records restored
- New vs updated record tracking dengan comprehensive statistics

#### **Database Schema Optimization**

- Removed unnecessary columns (numeric_code, tld, native, timezones, etc.)
- Optimized indexes untuk performance
- Essential columns only untuk storage efficiency

#### **Migration System**

- Node.js migration runner dengan SQL script automation
- Schema verification dengan column count validation
- Manual fallback untuk complex migrations

#### **API Endpoints**

```
POST /api/admin/locations/sync/countries  - Import countries
POST /api/admin/locations/sync/states     - Import states
POST /api/admin/locations/sync/cities     - Import cities
GET  /api/admin/locations/sync/progress/:id - Get progress status
```

#### **Performance Statistics**

- **Countries:** 250 records, ~2 seconds processing time
- **States:** 5,099 records, rapid processing
- **Cities:** 151,165 records, ~11 minutes processing time
- **Total:** 156,514 location records dengan 100% success rate

#### **Components Implemented**

- `LocationSyncPanel` → Professional location import interface dengan individual cards
- `CountrySelector` → Advanced country selection dengan search functionality
- `StateSelector` → State selection dengan country filtering dan search
- Location import endpoints di Hono backend dengan chunked processing
- Migration system dengan automated schema optimization
- Real-time progress tracking dengan comprehensive error handling

---

## 🚚 Konfigurasi Pengiriman ✅ **FULLY IMPLEMENTED**

### `shipping_zones` ✅

- **Tujuan:** Mendefinisikan zona geografis untuk pengiriman dengan prioritas dan coverage mapping.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `code` (TEXT): Kode unik zona (misal: "ASIA", "DOMESTIC").
  - `name` (TEXT): Nama zona (misal: "Asia Pacific", "Domestic Indonesia").
  - `description` (TEXT): Deskripsi zona pengiriman.
  - `priority` (INTEGER): Priority level (lower = higher priority).
  - `status` (TEXT): Status zona ('active', 'inactive').
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamp tracking.
- **Hubungan:** Direferensikan oleh `shipping_zone_countries`.

### `shipping_zone_countries` ✅

- **Tujuan:** Mapping antara zona pengiriman dengan negara yang dicakup, menggunakan ISO2 codes.
- **Kolom Penting:**
  - `zone_id` (UUID): Foreign Key ke `shipping_zones.id` (Primary Key composite).
  - `country_code` (CHAR(2)): ISO2 country code (Primary Key composite).
  - `country_name` (VARCHAR(100)): Nama negara.
- **Hubungan:** Mereferensikan `shipping_zones`.
- **Index:** `idx_zone_countries_country` pada `country_code`.

### `shipping_gateways` ✅

- **Tujuan:** Mendefinisikan penyedia layanan pengiriman (JNE, Pos Indonesia, Custom Carriers).
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (TEXT): Nama gateway (misal: "JNE", "Pos Indonesia").
  - `slug` (TEXT): URL-friendly identifier.
  - `description` (TEXT): Deskripsi gateway.
  - `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo.
  - `type` (TEXT): Tipe gateway ('manual', 'api').
  - `settings` (JSONB): Konfigurasi gateway (API keys, credentials).
  - `status` (TEXT): Status gateway ('active', 'inactive').
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamp tracking.
- **Hubungan:** Direferensikan oleh `shipping_methods`.

### `shipping_methods` ✅ **ENHANCED**

- **Tujuan:** Mendefinisikan metode pengiriman per gateway dengan aturan pricing fleksibel dan item restrictions.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `gateway_id` (UUID): Foreign Key ke `shipping_gateways.id`.
  - `zone_id` (UUID): Foreign Key ke `shipping_zones.id`.
  - `name` (TEXT): Nama metode (misal: "JNE Regular", "JNE Express").
  - `description` (TEXT): Deskripsi metode pengiriman.
  - `method_type` (TEXT): Tipe metode ('flat', 'weight_based', 'free_shipping', 'percentage').
  - `base_cost` (DECIMAL): Biaya dasar pengiriman.
  - `cost_per_kg` (DECIMAL): Biaya tambahan per kilogram.
  - `weight_threshold` (INTEGER): Weight threshold untuk perhitungan.
  - `min_free_threshold` (DECIMAL): Minimum threshold untuk free shipping.
  - `max_free_weight` (INTEGER): Maximum weight untuk free shipping.
  - `max_weight_limit` (INTEGER): Maximum weight limit.
  - `max_dimensions` (JSONB): Maximum dimensions (length, width, height).
  - `restricted_items` (JSONB): Array of restricted item names.
  - `restricted_products` (JSONB): Array of restricted product IDs.
  - `estimated_days_min` (INTEGER): Minimum delivery days.
  - `estimated_days_max` (INTEGER): Maximum delivery days.
  - `currency` (CHAR(3)): Currency code (misal: "IDR", "USD").
  - `weight_unit` (VARCHAR(10)): Weight unit ('g', 'kg', 'lb', 'oz').
  - `status` (TEXT): Status method ('active', 'inactive').
  - `sort_order` (INTEGER): Display order.
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamp tracking.
- **Hubungan:** Mereferensikan `shipping_gateways` dan `shipping_zones`.
- **Index:** Multiple indexes untuk performance optimization.
- **Fitur Baru:**
  - ✅ **Restricted Items** - Custom item restrictions
  - ✅ **Restricted Products** - Product-specific restrictions dengan ProductSelector
  - ✅ **Enhanced UI** dengan search functionality dan image display
  - ✅ **Flexible Restrictions** - Support untuk both custom items dan specific products

### `countries` ✅ **REFERENCE TABLE**

- **Tujuan:** Master data negara dunia untuk country selection dan zone assignment.
- **Kolom Penting:**
  - `id` (SERIAL): Primary Key.
  - `name` (VARCHAR(100)): Nama negara.
  - `iso2` (CHAR(2)): ISO2 country code.
  - `iso3` (CHAR(3)): ISO3 country code.
  - `currency` (VARCHAR(255)): Currency code.
  - `capital` (VARCHAR(255)): Nama ibukota.
  - `region` (VARCHAR(255)): Regional classification.
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamp tracking.
- **Hubungan:** Direferensikan oleh `shipping_zone_countries`.
- **Index:** `idx_countries_iso2`, `idx_countries_name` untuk performance.

---

## 💳 Konfigurasi Pembayaran ✅ **ENHANCED & IMPLEMENTED**

### `payment_gateways` ✅

- **Tujuan:** Mendefinisikan penyedia layanan pembayaran eksternal (PayPal, Manual Payments, QRIS, COD) dengan konfigurasi fleksibel.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (TEXT): Nama gateway (misal: "PayPal", "Manual Payments").
  - `slug` (TEXT): Slug unik untuk identifikasi.
  - `description` (TEXT): Deskripsi gateway.
  - `is_enabled` (BOOLEAN): Status aktif gateway.
  - `settings` (JSONB): ✅ Pengaturan spesifik gateway dalam format JSON fleksibel.
  - `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo gateway.
- **Enhanced Features:**
  - ✅ **PayPal Configuration:** Mode sandbox/production, environment variable references
  - ✅ **Manual Payment Support:** Offline payment methods (Bank Transfer, COD)
  - ✅ **Logo Integration:** MediaPicker support untuk gateway branding
  - ✅ **JSON Settings:** Flexible configuration dengan user-friendly forms
- **Example Settings:**

  ```json
  // PayPal Gateway
  {
    "mode": "sandbox",
    "clientIdEnv": "PAYPAL_CLIENT_ID",
    "clientSecretEnv": "PAYPAL_CLIENT_SECRET"
  }

  // Manual Payments Gateway
  {
    "supportsOffline": true
  }
  ```

- **Hubungan:** Direferensikan oleh `payment_methods`.

### `payment_methods` ✅

- **Tujuan:** Mendefinisikan metode pembayaran spesifik yang ditawarkan oleh suatu gateway dengan konfigurasi detail dan ordering.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `gateway_id` (UUID): Foreign Key ke `payment_gateways.id`.
  - `name` (TEXT): Nama metode (misal: "PayPal", "Bank Transfer", "QRIS").
  - `slug` (TEXT): Slug unik untuk identifikasi.
  - `description` (TEXT): Deskripsi metode pembayaran.
  - `is_enabled` (BOOLEAN): Status aktif metode.
  - `settings` (JSONB): ✅ Konfigurasi spesifik metode dalam format JSON.
  - `display_order` (INTEGER): ✅ Urutan tampilan di checkout (default: 0).
  - `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo metode pembayaran.
- **Enhanced Features:**
  - ✅ **Bank Transfer Forms:** User-friendly forms untuk account details, instructions
  - ✅ **QRIS Integration:** QR code image upload dengan MediaPicker integration
  - ✅ **COD Support:** Cash on Delivery dengan instructions dan delivery settings
  - ✅ **Display Ordering:** Control checkout page ordering dengan drag & drop
  - ✅ **Rich Instructions:** Text instructions untuk customer guidance
  - ✅ **Logo Display:** Per-method branding dengan MediaPicker support
- **Example Settings:**

  ```json
  // Bank Transfer Method
  {
    "instructions": "Transfer ke rekening berikut dan upload bukti transfer",
    "accounts": [
      {
        "bank": "BCA",
        "accountName": "Plaza Store",
        "accountNumber": "1234567890"
      }
    ]
  }

  // QRIS Method
  {
    "instructions": "Scan QR code berikut untuk pembayaran",
    "qr_media_id": "uuid-of-qr-image"
  }

  // COD Method
  {
    "instructions": "Bayar saat barang diterima"
  }
  ```

- **Hubungan:** Mereferensikan `payment_gateways`.

### `payment_webhook_events` ✅

- **Tujuan:** Tracking webhook events dari payment providers untuk audit dan debugging.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `gateway_id` (UUID): Foreign Key ke `payment_gateways.id`.
  - `event_type` (TEXT): Tipe event (payment.completed, payment.failed, dll).
  - `event_data` (JSONB): Raw webhook data.
  - `processed` (BOOLEAN): Status processing event.
  - `order_id` (UUID): Foreign Key ke `orders.id` (opsional).
- **Features:**
  - ✅ **Event Processing:** Track webhook processing status
  - ✅ **Audit Trail:** Complete event history untuk troubleshooting
  - ✅ **Error Handling:** Failed event replay capability
- **Hubungan:** Mereferensikan `payment_gateways` dan `orders`.

### `payment_transactions` ✅

- **Tujuan:** Detailed transaction records untuk advanced audit trails dan financial reporting.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `order_id` (UUID): Foreign Key ke `orders.id`.
  - `gateway_id` (UUID): Foreign Key ke `payment_gateways.id`.
  - `method_id` (UUID): Foreign Key ke `payment_methods.id`.
  - `provider_transaction_id` (TEXT): ID transaksi dari payment provider (misal: PayPal capture ID).
  - `amount` (NUMERIC): Transaction amount.
  - `currency` (TEXT): Currency code.
  - `status` (TEXT): Transaction status ('created', 'authorized', 'captured', 'succeeded', 'failed', 'refunded').
  - `meta` (JSONB): Payload/response lengkap dari payment gateway (menggantikan `gateway_response`).
- **Features:**
  - ✅ **Transaction Tracking:** Complete payment flow monitoring
  - ✅ **Multi-Currency Support:** International payment handling
  - ✅ **Gateway Response Storage:** Full audit trail untuk disputes
- **Hubungan:** Mereferensikan `orders`, `payment_gateways`, `payment_methods`.

### `payment_refunds` ✅

- **Tujuan:** Refund management dengan automated processing support dan comprehensive admin interface.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `transaction_id` (UUID): Foreign Key ke `payment_transactions.id`.
  - `amount` (NUMERIC): Jumlah refund (updated schema).
  - `reason` (TEXT): Alasan refund untuk audit trail.
  - `status` (TEXT): Status refund (pending, succeeded, failed).
  - `provider_refund_id` (TEXT): External refund ID dari payment provider.
  - `meta` (JSONB): Additional refund metadata dan gateway responses.
- **Enhanced Features:**
  - ✅ **Partial Refunds:** Support untuk refund sebagian dengan balance validation
  - ✅ **Automated Processing:** Integration dengan payment gateway APIs
  - ✅ **Refund Tracking:** Complete audit trail dengan provider correlation
  - ✅ **Balance Management:** Automatic prevention of over-refunding transactions
  - ✅ **Multi-Refund Support:** Multiple refunds per transaction dengan proper accounting
  - ✅ **Admin Interface:** Professional refund management UI dengan real-time processing
- **Management UI:**
  - ✅ **Refund Listing:** Comprehensive refund dashboard dengan search dan filtering
  - ✅ **Transaction Correlation:** Direct navigation ke related transactions dan orders
  - ✅ **Status Tracking:** Real-time refund status dengan color-coded indicators
  - ✅ **Manual Processing:** Admin-initiated refunds dengan validation dan confirmation
  - ✅ **Refund History:** Complete refund timeline untuk customer service
- **Hubungan:** Mereferensikan `payment_transactions`.

---

## 📦 Order & Transaction Management ✅ **FULLY IMPLEMENTED**

PlazaCMS sekarang dilengkapi dengan sistem manajemen order dan transaction yang comprehensive dan modern, setara dengan platform e-commerce terkemuka seperti Shopify dan WooCommerce. Sistem ini dibangun di atas database schema yang sudah ada dan menyediakan interface admin yang powerful untuk mengelola seluruh lifecycle order dan payment.

### **🚀 Order Management System**

#### **Core Functionality**

Sistem order management menyediakan complete CRUD operations dengan modern admin interface yang responsive dan user-friendly.

**✅ Order Listing & Search:**

- Advanced table view dengan search by order number, customer email, atau customer name
- Multi-criteria filtering: order status, payment status, date ranges
- Real-time pagination dengan configurable page sizes (defaulting to 20 items)
- Color-coded status badges untuk quick visual identification
- Responsive table design dengan horizontal scrolling pada mobile devices

**✅ Order Details View:**

- Comprehensive order information display dengan professional card-based layout
- Complete customer information: nama, email, dengan guest user support
- Detailed order items listing dengan product names, prices, quantities, dan SKUs
- Complete shipping dan billing address display dengan JSONB data rendering
- Payment transaction correlation dengan direct navigation links
- Order timeline dengan created_at dan updated_at timestamps
- Professional action buttons untuk editing dan navigation

**✅ Full Order Editing:**

- Complete order editing interface dengan real-time validation
- Order dan payment status management dengan dropdown selectors
- Order items management: add, edit, remove items dengan price calculation
- Shipping dan billing address editing dengan JSONB field management
- Payment method selection dengan integration ke payment_methods table
- Shipping carrier dan tracking number management
- Real-time total calculation berdasarkan item changes
- Form validation dengan comprehensive error handling

**✅ Order Creation:**

- Manual order creation untuk admin users
- Complete form dengan customer selection, item management, address inputs
- Automatic order number generation dengan sequential numbering
- Integration dengan existing customers atau guest order creation
- Validation untuk stock availability, customer data, dan payment methods

#### **Database Integration**

Sistem order management memanfaatkan complete database schema yang sudah ada:

**Table Utilization:**

- `orders` → Primary order data dengan comprehensive field support
- `order_items` → Order item details dengan product correlation
- `users` → Customer information dengan role-based access
- `payment_methods` → Payment method selection dan display
- `shipping_carriers` → Shipping provider information dan tracking
- `payment_transactions` → Transaction correlation untuk payment tracking

**Enhanced Fields Support:**

- `shipping_address` dan `billing_address` sebagai JSONB untuk flexible address storage
- `payment_method_id` untuk direct integration dengan payment systems
- `carrier_id` dan `tracking_number` untuk shipping management
- `status` dan `payment_status` dengan predefined enum values
- Complete audit trail dengan `created_at` dan `updated_at` timestamps

### **💳 Transaction Management System**

#### **Comprehensive Transaction Tracking**

Sistem transaction management menyediakan complete visibility ke semua payment activities dengan advanced filtering dan correlation capabilities.

**✅ Transaction Listing:**

- Professional table view dengan transaction details dan status indicators
- Search functionality: transaction ID, order number, customer information
- Multi-criteria filtering: status, payment gateway, date ranges
- Gateway correlation dengan logo display dan environment indicators (Test/Live)
- Color-coded status badges: Requires Action, Pending, Succeeded, Failed, etc.
- Customer information display dengan direct order correlation

**✅ Transaction Details:**

- Comprehensive transaction view dengan complete payment information
- Gateway response data display untuk troubleshooting dan audit
- Related order information dengan direct navigation capabilities
- Customer correlation dengan email dan contact information
- Transaction metadata display termasuk amounts, currency, dates
- Environment indicators untuk test vs live transactions

**✅ Payment Gateway Integration:**

- Support untuk multiple payment gateways dengan unified interface
- Gateway-specific transaction ID tracking dan correlation
- Payment method display dengan branding dan logos
- Transaction status management dengan gateway response handling
- Error tracking dan debugging information untuk failed transactions

#### **🔄 Advanced Refund Management**

**✅ Refund Processing Interface:**

- Dedicated refund management interface dengan comprehensive tracking
- Real-time refund balance calculation untuk preventing over-refunding
- Multiple refunds per transaction dengan proper accounting
- Refund reason tracking untuk customer service dan audit compliance
- Status management: Pending, Succeeded, Failed dengan visual indicators

**✅ Refund Dashboard:**

- Complete refund listing dengan search dan filtering capabilities
- Transaction correlation dengan direct navigation ke original transactions
- Customer information display untuk customer service workflows
- Refund amount tracking dengan original transaction amount comparison
- Gateway correlation untuk tracking provider refund IDs

**✅ Admin Refund Initiation:**

- Form-based refund creation dengan validation dan confirmation
- Real-time balance checking untuk preventing invalid refund amounts
- Reason input untuk audit trail dan customer service documentation
- Integration dengan transaction data untuk seamless refund processing
- Success/error feedback dengan comprehensive error handling

### **🎨 Modern Admin Interface**

#### **Professional UI/UX Design**

**✅ Clean Table Designs:**

- Modern table layouts dengan hover effects dan professional styling
- Responsive design dengan horizontal scrolling untuk mobile compatibility
- Professional typography dengan clear hierarchy dan readable fonts
- Color-coded status indicators dengan consistent design language
- Icon-based action buttons dengan tooltips untuk improved usability

**✅ Enhanced Navigation:**

- Sidebar integration dengan clean menu structure
- Breadcrumb navigation dengan proper linking dan context
- Cross-referencing capabilities: orders ↔ transactions ↔ customers
- Quick action buttons untuk common operations dari table rows
- Professional loading states dengan branded styling

**✅ Form Interfaces:**

- Modern form design dengan proper validation dan error states
- Real-time validation feedback dengan inline error messages
- Professional input styling dengan consistent design patterns
- Dynamic form behavior dengan conditional fields dan real-time calculations
- Success feedback dengan proper user confirmation

### **🛠️ API Architecture**

#### **RESTful API Endpoints**

**Orders Management API:**

- `GET /api/admin/orders` → List orders dengan advanced filtering dan pagination
- `POST /api/admin/orders` → Create new orders dengan complete validation
- `GET /api/admin/orders/[id]` → Retrieve specific orders dengan complete details
- `PUT /api/admin/orders/[id]` → Update orders dengan comprehensive field support
- `DELETE /api/admin/orders/[id]` → Delete orders dengan proper validation constraints

**Transactions Management API:**

- `GET /api/admin/transactions` → List transactions dengan filtering dan pagination
- `POST /api/admin/transactions` → Create manual transaction entries
- `GET /api/admin/transactions/[id]` → Retrieve transaction details dengan refunds
- `PUT /api/admin/transactions/[id]` → Update transaction metadata dan status

**Refunds Management API:**

- `GET /api/admin/transactions/refunds` → List refunds dengan comprehensive filtering
- `POST /api/admin/transactions/refunds` → Process refunds dengan validation

#### **Authentication & Authorization**

**✅ NextAuth Integration:**

- Complete integration dengan NextAuth untuk session management
- Role-based access control dengan admin-only restrictions
- User session validation di semua API endpoints
- Proper error responses untuk unauthorized access attempts

**✅ Data Security:**

- Input validation dan sanitization di semua endpoints
- SQL injection prevention dengan parameterized queries
- Proper error handling dengan informative but secure error messages
- Audit trail maintenance dengan user tracking

### **📊 Business Value & Impact**

#### **Operational Efficiency**

**✅ Streamlined Workflows:**

- Efficient order processing dengan clear action paths
- Comprehensive search dan filtering untuk quick information access
- Professional interfaces yang reduce training time untuk admin users
- Complete audit trails untuk compliance dan customer service

**✅ Customer Service Enhancement:**

- Quick access ke order dan payment information untuk customer inquiries
- Complete refund processing capabilities untuk customer satisfaction
- Order tracking information untuk shipping dan delivery updates
- Transaction troubleshooting tools untuk payment-related issues

**✅ Financial Management:**

- Complete transaction tracking untuk financial reporting
- Refund management dengan proper accounting dan balance tracking
- Payment gateway correlation untuk reconciliation processes
- Audit compliance dengan complete activity logging

#### **Scalability & Maintenance**

**✅ Modular Architecture:**

- Clean component separation untuk easy maintenance dan updates
- Reusable UI components untuk consistent user experience
- API-first design untuk future frontend integrations
- Database schema leverage untuk efficient data management

**✅ Performance Optimization:**

- Efficient pagination untuk large order datasets
- Indexed database queries untuk fast search dan filtering
- Optimized API responses dengan selective data loading
- Responsive design untuk optimal mobile dan desktop performance

---

## 📊 Pajak

### `tax_classes`

- **Tujuan:** Mendefinisikan kelas-kelas pajak yang berbeda yang dapat diterapkan pada produk.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (TEXT): Nama kelas pajak (misal: "Standard Tax").
  - `rate` (NUMERIC): Tingkat pajak sebagai desimal (misal: 0.10).
  - `is_active` (BOOLEAN): Status aktif kelas pajak.
- **Hubungan:** Direferensikan oleh `products`.

---

## ⚙️ Pengaturan Situs

### `site_settings`

- **Tujuan:** Menyimpan konfigurasi global dan aset media terkait situs (misal: logo, favicon). Tabel ini dirancang untuk memiliki satu baris data saja.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `site_name` (TEXT): Nama situs/aplikasi.
  - `site_description` (TEXT): Deskripsi situs.
  - `contact_email` (TEXT): Email kontak situs.
  - `contact_phone` (TEXT): Nomor telepon kontak situs.
  - `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country` (TEXT): Detail alamat bisnis.
  - `currency_code` (TEXT): Kode mata uang default (misal: "USD").
  - `currency_symbol` (TEXT): Simbol mata uang default (misal: "$").
  - `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo situs.
  - `favicon_media_id` (UUID): Foreign Key ke `media.id` untuk favicon situs.
  - `default_product_image_id` (UUID): Foreign Key ke `media.id` untuk gambar produk default.
  - `default_user_avatar_id` (UUID): Foreign Key ke `media.id` untuk avatar pengguna default.
  - `social_share_image_id` (UUID): Foreign Key ke `media.id` untuk gambar berbagi media sosial default.
  - `other_settings` (JSONB): Kolom fleksibel untuk pengaturan lain dalam format JSON.
- **Hubungan:** Mereferensikan `media`.

---

## 🚀 API Endpoints & Architecture

### **Payment Management API** ✅

API endpoints untuk modern payment gateway & method management:

#### **Payment Gateways**

- `GET /api/admin/payments/gateways` - List semua payment gateways dengan logo URLs
  - Query params: `enabled` (filter by status)
  - Returns: gateway list dengan logo_url hydrated dari media table
- `POST /api/admin/payments/gateways` - Create gateway baru
  - Supports: name, slug, description, is_enabled, settings (JSONB)
  - Validation: runtime validation tanpa Zod untuk better performance
- `GET /api/admin/payments/gateways/[id]` - Get specific gateway details
- `PATCH /api/admin/payments/gateways/[id]` - Update gateway configuration
  - Supports: partial updates dengan JSON settings merge
- `DELETE /api/admin/payments/gateways/[id]` - Delete gateway (dengan cascade check)

#### **Payment Methods**

- `GET /api/admin/payments/gateways/[id]/methods` - List methods untuk specific gateway
  - Returns: methods dengan logo_url dan sorted by display_order, name
- `POST /api/admin/payments/gateways/[id]/methods` - Create method baru
  - Supports: name, slug, description, is_enabled, settings, display_order, logo_media_id
- `GET /api/admin/payments/gateways/[id]/methods/[methodId]` - Get specific method
- `PATCH /api/admin/payments/gateways/[id]/methods/[methodId]` - Update method
  - Special handling: QRIS qr_media_id, Bank Transfer accounts, COD instructions
- `DELETE /api/admin/payments/gateways/[id]/methods/[methodId]` - Delete method

#### **Utility Endpoints**

- `POST /api/admin/payments/env-status` - Check environment variable status
  - Used untuk PayPal credential validation tanpa exposing actual values
  - Returns: presence status untuk array of environment variable names

### **Order & Transaction Management API** ✅

API endpoints untuk comprehensive order dan transaction management dengan modern admin interface:

#### **Orders Management**

- `GET /api/admin/orders` - List orders dengan advanced filtering dan pagination
  - Query params: `q` (search), `status`, `payment_status`, `page`, `pageSize`
  - Search functionality: order number, customer email, customer name
  - Returns: orders dengan customer info, payment methods, shipping carriers
  - Features: status filtering, pagination, comprehensive join data
- `POST /api/admin/orders` - Create new order dengan complete validation
  - Supports: customer_id, items array, shipping_address, billing_address
  - Validation: customer existence, item availability, address format
  - Auto-calculation: order total berdasarkan items dan quantities
- `GET /api/admin/orders/[id]` - Get specific order dengan complete details
  - Returns: comprehensive order data dengan customer, items, transactions
  - Includes: order_items dengan product info, payment transactions, refunds
  - Customer correlation: user info atau guest customer data
- `PUT /api/admin/orders/[id]` - Update order dengan comprehensive field support
  - Supports: status, payment_status, shipping/billing addresses
  - Advanced: order items management, payment method changes
  - Validation: status transition rules, address format, item availability
- `DELETE /api/admin/orders/[id]` - Delete order dengan proper validation constraints
  - Constraints: cannot delete shipped/delivered orders
  - Cascade handling: related order_items dan payment_transactions cleanup
  - Audit trail: maintains deletion records untuk compliance

#### **Transactions Management**

- `GET /api/admin/transactions` - List transactions dengan filtering dan pagination
  - Query params: `q` (search), `status`, `gateway_id`, `page`, `pageSize`
  - Search functionality: transaction ID, order number, customer email
  - Returns: transactions dengan order info, gateway info, customer data
  - Joins: orders, payment_gateways, payment_methods untuk comprehensive data
- `GET /api/admin/transactions/[id]` - Get transaction details dengan refunds
  - Returns: complete transaction info dengan gateway responses
  - Includes: related order information, customer data, refund history
  - Correlation: direct links ke associated orders dan customers
- `PUT /api/admin/transactions/[id]` - Update transaction metadata dan status
  - Supports: status updates, metadata modifications
  - Validation: status transition rules, gateway constraints
  - Audit trail: maintains transaction history untuk financial compliance

#### **Refunds Management**

- `GET /api/admin/transactions/refunds` - List refunds dengan comprehensive filtering
  - Query params: `q` (search), `status`, `page`, `pageSize`
  - Returns: refunds dengan transaction info, order correlation, customer data
  - Advanced joins: payment_transactions, orders, users untuk complete context
- `POST /api/admin/transactions/refunds` - Process refunds dengan validation
  - Required: transaction_id, amount, reason
  - Validation: transaction existence, refund balance, amount limits
  - Features: partial refunds, over-refunding prevention, audit trail
  - Auto-calculation: remaining refundable balance per transaction

#### **API Features & Security**

**✅ Authentication & Authorization:**

- NextAuth integration dengan admin role verification
- User session validation di semua endpoints
- Proper error responses untuk unauthorized access
- Role-based access control dengan granular permissions

**✅ Data Validation:**

- Comprehensive input validation dan sanitization
- SQL injection prevention dengan parameterized queries
- Business logic validation: order status transitions, refund limits
- Error handling dengan informative but secure error messages

**✅ Performance Optimization:**

- Efficient database queries dengan proper indexing
- Pagination support untuk large datasets
- Selective data loading untuk optimal response times
- Query optimization dengan strategic table joins

**✅ API Response Format:**

- Consistent JSON response structure
- Proper HTTP status codes untuk different scenarios
- Comprehensive error messages dengan actionable information
- Success responses dengan complete data correlation

### **Media Management API**

API endpoints untuk WordPress-style media manager dengan folder organization:

#### **Media Folders**

- `GET /api/admin/media/folders` - List all folders dengan children
- `POST /api/admin/media/folders` - Buat folder baru
- `PATCH /api/admin/media/folders/[id]` - Update folder
- `DELETE /api/admin/media/folders/[id]` - Hapus folder (cascade)

#### **Media Files**

- `GET /api/admin/media` - List media dengan pagination, search, filter
  - Query params: `folder_id`, `search`, `type`, `page`, `pageSize`
  - Returns: media items dengan folder info dan uploader name
- `POST /api/admin/media/upload` - Upload file ke R2 storage
  - Supports: drag & drop, folder selection, batch upload
  - Validation: file type, size, folder existence
  - Features: automatic `uploaded_by` tracking, `entity_id` association
  - Response: includes user name, folder info, optimized URLs
- `PATCH /api/admin/media/[id]` - Update media metadata
- `DELETE /api/admin/media/[id]` - Delete media (dengan usage check)
- `POST /api/admin/media/bulk` - Bulk operations (delete, move, update)

#### **Image Optimization Services**

- **MediaOptimizer** (`@/lib/media-optimizer.ts`) - Cloudinary URL generation

  - `getUrl()` - Generate optimized URLs dengan transformations
  - `getThumbnailUrl()` - Preset untuk thumbnails (300x300, crop fill)
  - `getProductCardUrl()` - Preset untuk product cards (400x400)
  - `getGalleryUrl()` - Preset untuk galleries (800x600)
  - Fallback: Auto-fallback ke R2 URLs jika Cloudinary unavailable

- **OptimizedImage Components** (`@/components/ui/optimized-image.tsx`)
  - `OptimizedImage` - Generic optimized image dengan custom transformations
  - `ProductThumbnail` - Preset untuk product thumbnails
  - `ProductCardImage` - Preset untuk product cards
  - `GalleryImage` - Preset untuk image galleries
  - Features: lazy loading, automatic format selection (WebP/AVIF)

#### **Product Variants API Enhanced**

- `GET /api/admin/products/[id]/variants` - List variants dengan image info
- `POST /api/admin/products/[id]/variants/generate` - Generate variants dari attributes
- `PATCH /api/admin/products/[id]/variants/[variantId]` - Update variant dengan sale dates
- `POST /api/admin/products/[id]/variants/bulk` - Bulk variant operations
- `POST /api/admin/products/[id]/variants/[variantId]/images` - Manage variant images

### **Modern Admin Layout Components**

#### **Core Layout Components**

- `ModernAdminLayout` - Main layout dengan flexbox, responsive sidebar
- `AdminSidebar` - Collapsible sidebar dengan Heroicons, auto-expand
- `AdminHeader` - Top header dengan search, notifications, user menu
- `MobileMenuButton` - Mobile-first menu toggle
- `PageContainer` - Consistent page wrapper dengan title/subtitle

#### **Media Manager Components Enhanced**

- `MediaManager` - Main WordPress-style media interface dengan collapsible sidebar
- `MediaGrid` - Grid/list view untuk media items dengan modern card design
- `FolderTree` - Hierarchical folder navigation dengan enhanced tooltips dan smooth animations
- `UploadModal` - Drag & drop upload dengan progress tracking dan modern UI
- `MediaDetailsPanel` - Media info dan editing panel dengan professional styling
- `FolderModal` - Full CRUD folder management dengan validation dan error handling
- `MediaPicker` - Enhanced modal dengan modern design patterns dan glassmorphism effects

#### **🚀 Modern UI Enhancements**

- ✅ **Collapsible Sidebar** → Space-saving interface dengan smooth CSS transitions
- ✅ **Enhanced Folder Management** → Complete CRUD operations dengan real-time validation
- ✅ **Professional Tooltips** → Rich tooltips untuk full path display pada truncated folder names
- ✅ **Modern Loading States** → Branded spinners dengan gradient backgrounds dan informative messaging
- ✅ **Enhanced Empty States** → User-friendly empty states dengan actionable CTAs dan helpful guidance
- ✅ **Responsive Grid Layout** → Adaptive columns dari 2 cols (mobile) sampai 8 cols (desktop)
- ✅ **Smart Selection UI** → Modern selection interface dengan bulk action capabilities
- ✅ **Professional Pagination** → Clean pagination dengan proper previous/next navigation dan page indicators

#### **Product Editor Components Enhanced**

- `ProductEditor` - Fully modernized tabbed interface dengan TinyMCE rich text editor integration
- Inline variations management (no modals) dengan WooCommerce-style editing
- Bulk variant operations (price, stock, dates) dengan modern UI controls
- Per-variant image management dengan enhanced MediaPicker integration
- Custom attribute creation dengan dynamic form validation
- Import/export variations (JSON format) dengan progress indicators
- `TinyMCEEditor` - Self-hosted rich text editor dengan GPL license dan custom styling

#### **Order & Transaction Management Components Enhanced** ✅

**✅ Orders Management Components:**

- `OrdersManager` - Main order listing interface dengan advanced search, filtering, dan pagination
- `OrderDetail` - Comprehensive single order view dengan customer info, items, transactions
- `OrderEditor` - Full order editing interface dengan real-time validation dan status management
- Professional table design dengan responsive layout dan mobile support
- Color-coded status badges untuk quick visual identification
- Advanced search capabilities dengan multi-criteria filtering

**✅ Transactions Management Components:**

- `TransactionsManager` - Transaction listing dengan gateway integration dan status filtering
- `TransactionDetail` - Detailed transaction view dengan gateway responses dan refund history
- `RefundsManager` - Dedicated refund management interface dengan balance tracking
- Complete audit trail displays dengan professional formatting
- Gateway correlation dengan logo displays dan environment indicators
- Real-time status updates dengan proper error handling

**✅ Component Features:**

- Modern card-based layouts dengan professional styling
- Responsive design dengan mobile-first approach
- Icon-based navigation dengan Heroicons integration
- Loading states dengan branded spinners dan animations
- Error handling dengan user-friendly messaging
- Cross-referencing capabilities antar orders, transactions, customers
- Professional form interfaces dengan real-time validation
- Comprehensive search dan filtering dengan debounced input

#### **🚀 Modern ProductEditor Features**

- ✅ **TinyMCE Rich Text Editor** → Professional content editing dengan self-hosted setup, GPL license
- ✅ **Modern Card-Based Design** → Clean sections dengan gradients, shadows, dan glassmorphism effects
- ✅ **Full Icon Integration** → Lucide React icons untuk semua UI elements dan tab navigation
- ✅ **Mobile-First Responsive** → Compact design untuk mobile, full features di desktop
- ✅ **Professional Form Components** → Enhanced inputs, selects, textareas dengan consistent styling
- ✅ **Tab Navigation Enhancement** → Icon-based tabs dengan badges dan status indicators
- ✅ **Image Management Integration** → Seamless MediaPicker integration dengan modern modal UI
- ✅ **Real-time Validation** → Inline validation dengan professional error states dan feedback
- ✅ **Auto-save Indicators** → Loading states dan success feedback untuk user confidence
- ✅ **Accessibility Improvements** → Proper ARIA labels, keyboard navigation, dan screen reader support

---

## 🔧 Technical Implementation

### **Cloudflare R2 Integration**

- **Storage Service:** `@/lib/r2-storage.ts`
- **Enhanced URL Generation:**
  - **Folder-based Paths** → Mirror media manager folder structure
  - **SEO-friendly Filenames** → Auto-sanitize special characters
  - **Year Organization** → `/YYYY/` untuk better archival
  - **Media Type Fallback** → Automatic categorization kalau no folder
- **URL Structure Examples:**
  ```
  uploads/products/phones/2025/iphone-15-pro.jpg
  uploads/posts/tech-news/2025/artikel-teknologi.jpg
  uploads/site-assets/2025/logo.png
  ```
- **Features:**
  - Automatic file path generation berdasarkan folder selection
  - Environment validation
  - Upload dengan metadata dan proper file organization
  - Delete dengan error handling dan usage checking
  - Filename sanitization untuk URL safety
  - Backward compatibility dengan existing URLs
- **Configuration:** Requires R2 credentials dalam `.env.local`

### **Authentication & Authorization**

- **NextAuth.js** dengan database sessions
- **Role-based access control** (admin, vendor, customer, guest)
- **API route protection** dengan `@/lib/auth`
- **Server-side authentication** di layout components

### **Database Optimizations**

- **UUID Primary Keys** untuk semua tabel
- **Automatic updated_at triggers** untuk audit trail
- **Strategic indexes** untuk performance (media_type, folder_id, path)
- **Cascading deletes** untuk data integrity
- **JSONB columns** untuk flexible settings

### **Frontend Architecture Enhanced**

- **Next.js 14** dengan App Router dan enhanced layouts
- **TypeScript** untuk type safety dengan comprehensive type definitions
- **TailwindCSS + shadcn/ui** untuk styling dengan custom design system
- **Lucide React** untuk consistent iconography (500+ professional icons)
- **Client/Server component separation** untuk optimal performance
- **TinyMCE** untuk rich text editing dengan self-hosted setup
- **React Hot Toast** untuk modern notification system
- **Modern CSS** dengan glassmorphism, gradients, dan smooth animations

### **🎨 Modern Design System**

#### **Color Palette & Themes**

- **Primary Blue**: Gradient dari blue-100 ke indigo-100 untuk backgrounds
- **Accent Colors**: Blue-600 untuk primary actions, red-600 untuk destructive actions
- **Neutral Grays**: Comprehensive gray scale untuk text dan borders
- **Status Colors**: Green untuk success, yellow untuk warnings, red untuk errors

#### **Component Patterns**

- **Card-based Design**: Rounded corners, subtle shadows, glassmorphism effects
- **Professional Buttons**: Multiple variants (primary, secondary, outline, ghost, danger)
- **Enhanced Form Controls**: Consistent styling dengan focus states dan validation feedback
- **Modern Tooltips**: Rich tooltips dengan arrows dan proper positioning
- **Loading States**: Branded spinners dengan gradient backgrounds
- **Empty States**: Helpful messaging dengan actionable CTAs

#### **Responsive Design**

- **Mobile-First Approach**: Designs start dari mobile dan scale up
- **Breakpoint System**: Tailwind responsive utilities (sm, md, lg, xl, 2xl)
- **Touch-Friendly**: Proper touch targets dan spacing untuk mobile devices
- **Adaptive Layouts**: Grid systems yang adjust berdasarkan screen size

---

## 📋 Development Workflow & Best Practices

### **Database Development**

- **Migration Strategy:** SQL migrations dalam `.mysetting/` folder
- **Schema Updates:** Always update this documentation saat ada perubahan schema
- **Testing:** Test di development database dulu sebelum production
- **Indexing:** Monitor query performance dan add indexes sesuai kebutuhan

### **Component Development**

- **Modular Architecture:** Break down large components menjadi reusable pieces
- **TypeScript First:** Strong typing untuk semua props dan data structures
- **Error Handling:** Comprehensive try/catch blocks dan user feedback
- **Performance:** Use React.memo, useMemo, useCallback untuk optimization

### **API Development**

- **Authentication Required:** Semua admin API routes harus protected
- **Parameter Validation:** Validate semua input parameters
- **Error Responses:** Consistent error format dengan proper HTTP status codes
- **Documentation:** Update API docs saat ada endpoint baru

### **Media Management Guidelines**

- **File Validation:** Always validate file type, size, dan name
- **Storage Optimization:** Use appropriate file formats dan compression
- **Access Control:** Check permissions sebelum upload/delete operations
- **CDN Integration:** Leverage Cloudflare R2 untuk fast delivery

### **Security Considerations**

- **RBAC Enforcement:** Check user roles di setiap sensitive operation
- **Input Sanitization:** Sanitize semua user input untuk prevent injection
- **File Upload Security:** Restrict file types dan scan untuk malware
- **Environment Variables:** Never commit sensitive credentials ke git

### **Performance Optimization**

- **Database Queries:** Use pagination untuk large datasets
- **Image Optimization:** Generate multiple sizes untuk responsive images
- **Caching Strategy:** Implement appropriate caching layers
- **Bundle Optimization:** Code splitting untuk better load times

### **Monitoring & Maintenance**

- **Error Logging:** Comprehensive error tracking dan alerting
- **Performance Monitoring:** Track API response times dan database queries
- **Storage Monitoring:** Monitor R2 usage dan costs
- **User Analytics:** Track admin user behavior untuk UX improvements

### **🚚 Shipping Management System Guidelines**

#### **Zone Configuration**

- **Geographic Coverage:** Assign countries ke zones berdasarkan shipping policies
- **Priority Management:** Set zone priorities untuk overlapping coverage handling
- **Status Control:** Enable/disable zones berdasarkan operational requirements
- **Country Selection:** Use advanced multi-select interface dengan search functionality

#### **Gateway Management**

- **Provider Configuration:** Setup shipping providers dengan API credentials
- **Logo Integration:** Upload provider logos untuk customer recognition
- **Type Classification:** Configure manual vs API-based gateways
- **Status Management:** Control gateway availability secara real-time

#### **Method Configuration**

- **Pricing Rules:** Setup flexible pricing (flat-rate, weight-based, percentage)
- **Zone Assignment:** Assign methods ke specific shipping zones
- **Weight Limits:** Configure min/max weight restrictions
- **Cost Calculation:** Setup base cost, per-kg rates, dan threshold rules
- **Delivery Estimates:** Set realistic delivery time ranges

#### **Cost Calculator Integration**

- **Real-time Calculation:** Use shipping calculator API untuk dynamic pricing
- **Multi-factor Support:** Weight, location, order value calculations
- **Threshold Management:** Free shipping thresholds dan minimum costs
- **Currency Support:** Multi-currency pricing untuk international shipping

#### **API Endpoint Usage**

- **Zone Management:** `/api/admin/shipping/zones` untuk zone CRUD operations
- **Gateway Config:** `/api/admin/shipping/gateways` untuk provider management
- **Method Setup:** `/api/admin/shipping/methods` untuk method configuration
- **Cost Calculation:** `/api/admin/shipping/calculator` untuk real-time pricing
- **Summary Data:** `/api/admin/shipping/summary` untuk dashboard statistics

### **🔧 Modern Features Troubleshooting**

#### **TinyMCE Rich Text Editor**

- **License Issues:** Ensure `licenseKey="gpl"` prop untuk open source usage
- **Self-hosted Setup:** Copy assets dengan `cp -r node_modules/tinymce/* public/tinymce/`
- **SSR Compatibility:** Use dynamic import dengan `ssr: false` untuk client-side only loading
- **Custom Styling:** Apply custom CSS via `content_style` dan `setup` functions

#### **Collapsible Sidebar & Folder Management**

- **State Management:** Ensure `isCollapsed` state is properly passed ke FolderTree component
- **Counter Accuracy:** Pass `totalMediaCount` prop dari pagination.total untuk accurate display
- **Tooltip Implementation:** Verify tooltip positioning dan z-index untuk proper overlay display
- **CRUD Operations:** Check FolderModal validation logic dan API error handling

#### **Enhanced MediaPicker**

- **Modal Layering:** Ensure proper z-index (z-50) untuk modal overlay
- **Dynamic Loading:** Use Next.js dynamic import untuk proper SSR handling
- **Touch Interactions:** Test touch events pada mobile devices untuk proper selection
- **Loading States:** Verify loading spinners dan error state handling

#### **Shipping Management System**

- **Country Selection Issues:** Ensure CommandItem components have proper `value` prop untuk cmdk compatibility
- **Zone Assignment:** Verify country-zone mapping dengan ISO2 codes untuk accurate coverage
- **Cost Calculator Errors:** Check API parameter validation dan database query performance
- **Gateway Configuration:** Validate JSONB settings fields dan API credential management
- **Method Pricing:** Test weight-based calculations dengan various cart scenarios
- **Zone Priority Logic:** Verify zone priority handling untuk overlapping country coverage

#### **Responsive Design Issues**

- **Mobile Layout:** Test collapsible sidebar behavior pada different screen sizes
- **Touch Targets:** Ensure minimum 44px touch targets untuk mobile accessibility
- **Grid Responsiveness:** Verify adaptive grid columns across breakpoints
- **Icon Display:** Check Lucide React icon loading dan fallback states

---

## 📧 Email Management System

### **Database Schema Overview**

PlazaCMS Email Management System menggunakan 4 tabel utama untuk mengelola konfigurasi email, templates, notifications, dan event tracking dengan support untuk multiple email providers.

### `email_settings`

- **Tujuan:** Menyimpan konfigurasi email provider yang aktif dengan support untuk multiple providers (Resend, SMTP, Cloudflare Email Workers).
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `from_name` (VARCHAR(255)): Nama pengirim email (misal: "PlazaCMS Store").
  - `from_email` (VARCHAR(255)): Alamat email pengirim (misal: "noreply@plazacms.com").
  - `reply_to` (VARCHAR(255)): Email untuk reply (optional).
  - `provider` (VARCHAR(50)): Provider email ("resend", "smtp", "cloudflare").
  - `resend_api_key` (TEXT): API key untuk Resend service.
  - `smtp_host` (VARCHAR(255)): SMTP server hostname.
  - `smtp_port` (INTEGER): SMTP server port (biasanya 587 atau 465).
  - `smtp_username` (VARCHAR(255)): SMTP authentication username.
  - `smtp_password` (VARCHAR(255)): SMTP authentication password.
  - `smtp_encryption` (VARCHAR(10)): Enkripsi SMTP ("tls", "ssl", "none").
  - `is_active` (BOOLEAN): Status aktif konfigurasi.
  - `webhook_url` (VARCHAR(500)): URL untuk webhook notifications.
  - `webhook_secret` (VARCHAR(255)): Secret key untuk webhook security.
  - `webhook_events` (TEXT[]): Array event yang di-track ("email.sent", "email.opened", dll).
- **Fitur:**
  - Multi-provider support dengan dynamic provider switching
  - Database-driven configuration dengan admin panel management
  - Webhook configuration untuk real-time email event tracking
  - Secure credential storage dengan masked display di UI
- **Hubungan:** Referenced by EmailService untuk dynamic configuration loading.

### `email_templates`

- **Tujuan:** Menyimpan template email untuk berbagai keperluan (welcome, order confirmation, review requests, dll.) dengan variable replacement support.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `name` (VARCHAR(255)): Nama template (misal: "Welcome Email").
  - `type` (VARCHAR(100)): Tipe template ("welcome", "order_confirmation", "review_request", dll).
  - `category` (VARCHAR(100)): Kategori template ("transactional", "marketing").
  - `subject` (TEXT): Subject line dengan variable support (misal: "Welcome to {{store_name}}!").
  - `content` (TEXT): Konten email plain text dengan variables.
  - `html_content` (TEXT): Konten email HTML format (optional).
  - `from_name` (VARCHAR(255)): Override nama pengirim untuk template ini.
  - `from_email` (VARCHAR(255)): Override email pengirim untuk template ini.
  - `reply_to` (VARCHAR(255)): Override reply-to untuk template ini.
  - `is_active` (BOOLEAN): Status aktif template.
- **Variable System:**
  - Support untuk dynamic variables: {{store_name}}, {{customer_name}}, {{order_number}}, dll.
  - Template-specific from_name/from_email overrides
  - Rich HTML content dengan TinyMCE editor integration
- **Fitur:**
  - Template preview dengan real variable replacement
  - Template testing dengan sample data
  - Category-based organization (transactional vs marketing)
  - Template-specific email configuration overrides
- **Hubungan:** Referenced by `email_notifications` untuk tracking template usage.

### `email_notifications`

- **Tujuan:** Log semua email yang dikirim sistem untuk audit trail dan analytics dengan comprehensive tracking information.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `type` (VARCHAR(100)): Tipe email ("welcome", "order_confirmation", "custom", dll).
  - `recipient_email` (VARCHAR(255)): Email penerima.
  - `subject` (TEXT): Subject line email yang dikirim.
  - `content` (TEXT): Konten email yang dikirim.
  - `template_id` (UUID): Foreign Key ke `email_templates.id` (jika menggunakan template).
  - `campaign_id` (UUID): ID campaign untuk bulk emails (optional).
  - `order_id` (UUID): Foreign Key ke `orders.id` untuk order-related emails.
  - `order_item_id` (UUID): Foreign Key ke `order_items.id` untuk item-specific emails.
  - `status` (VARCHAR(50)): Status pengiriman ("sent", "failed", "pending").
  - `resend_message_id` (VARCHAR(255)): Message ID dari provider (Resend, SMTP, dll).
  - `error_message` (TEXT): Error message jika gagal kirim.
  - `sent_at` (TIMESTAMPTZ): Waktu berhasil dikirim.
- **Analytics Features:**
  - Comprehensive email sending statistics
  - Provider-specific message ID tracking
  - Error logging dan failure analysis
  - Campaign dan order association tracking
- **Fitur:**
  - Complete audit trail untuk semua email activities
  - Support untuk bulk email campaigns
  - Integration dengan order system untuk transactional emails
  - Real-time status tracking dan error reporting
- **Hubungan:** References `email_templates`, `orders`, `order_items` untuk contextual tracking.

### `email_events`

- **Tujuan:** Track email events (opened, clicked, bounced) dari webhook notifications untuk comprehensive analytics.
- **Kolom Penting:**
  - `id` (UUID): Primary Key.
  - `notification_id` (UUID): Foreign Key ke `email_notifications.id`.
  - `event_type` (VARCHAR(50)): Tipe event ("opened", "clicked", "bounced", "complained").
  - `timestamp` (TIMESTAMPTZ): Waktu event terjadi.
  - `ip_address` (INET): IP address dari event (untuk opens/clicks).
  - `user_agent` (TEXT): User agent dari browser/email client.
  - `click_url` (TEXT): URL yang diklik (untuk click events).
  - `metadata` (JSONB): Additional event metadata dari provider.
- **Analytics Features:**
  - Real-time email engagement tracking
  - Open rate dan click rate calculations
  - Geographic dan device analytics dari IP/user agent
  - Link click tracking untuk email campaigns
- **Fitur:**
  - Webhook-driven real-time event processing
  - Comprehensive email engagement analytics
  - Support untuk multiple event types dari different providers
  - Privacy-compliant tracking dengan IP anonymization options
- **Hubungan:** References `email_notifications` untuk event association.

### **Email Service Architecture**

#### **Multi-Provider Support**

PlazaCMS Email Service mendukung 3 provider utama:

1. **Resend**

   - API-based email service
   - Built-in analytics dan webhook support
   - Easy domain verification
   - Production-ready untuk high volume

2. **SMTP (worker-mailer)**

   - Support untuk any SMTP provider (Gmail, Outlook, custom)
   - Compatible dengan Cloudflare Workers runtime
   - TCP socket-based connection
   - Cost-effective untuk moderate volume

3. **Cloudflare Email Workers**
   - Native Cloudflare Workers email sending
   - No external dependencies atau API calls
   - Best performance untuk CF Workers environment
   - Local development dengan .eml file simulation

#### **Dynamic Configuration**

```typescript
// EmailService automatically detects provider dari database
const emailService = await createEmailService(context);
// Provider switching tanpa code changes
```

#### **Template System**

- **Variable Replacement:** Dynamic content dengan {{variable}} syntax
- **Template Preview:** Real-time preview dengan sample data
- **Template Testing:** Send test emails dengan template-specific configuration
- **Multi-format Support:** Plain text dan HTML content

#### **Analytics Dashboard**

- **Overview Statistics:** Total sent, delivery rate, open rate, click rate
- **Time-based Analytics:** Daily/weekly/monthly trends dengan charts
- **Template Performance:** Template comparison dengan engagement metrics
- **Provider Analytics:** Performance comparison across different providers
- **Event Tracking:** Real-time event streams dengan webhook integration

### **API Endpoints**

#### **Email Settings Management**

- `GET /api/admin/settings/email` → Get active email configuration
- `PATCH /api/admin/settings/email` → Update email settings
- `POST /api/admin/settings/email/test` → Test email configuration

#### **Template Management**

- `GET /api/admin/emails/templates` → List all templates
- `POST /api/admin/emails/templates` → Create new template
- `GET /api/admin/emails/templates/[id]` → Get template details
- `PATCH /api/admin/emails/templates/[id]` → Update template
- `DELETE /api/admin/emails/templates/[id]` → Delete template
- `GET /api/admin/emails/templates/[id]/preview` → Preview template dengan variables

#### **Email Sending**

- `POST /api/admin/emails/send` → Send custom email
- `POST /api/admin/emails/test` → Send test email dengan template
- `POST /api/admin/emails/webhook/resend` → Resend webhook handler

#### **Analytics & Notifications**

- `GET /api/admin/emails/analytics` → Get email analytics data
- `GET /api/admin/emails/notifications` → List email notifications dengan filtering
- `GET /api/admin/emails/events` → List email events dengan analytics

### **Frontend Components**

#### **Email Settings Manager**

- Provider selection (Resend, SMTP, Cloudflare)
- Configuration forms untuk each provider
- Webhook configuration dengan auto-fill URL generation
- Test email functionality dengan real provider testing

#### **Email Templates Manager**

- Template CRUD dengan modern tabbed interface
- Rich text editor dengan TinyMCE integration
- Variable replacement preview dengan real-time updates
- Template testing dengan sample data injection

#### **Email Analytics Dashboard**

- Comprehensive analytics dengan charts dan metrics
- Time range filtering (7, 30, 90 days)
- Provider performance comparison
- Template engagement statistics
- Real-time event tracking

#### **Send Email Interface**

- Custom email composer dengan rich text editing
- Template-based email dengan variable injection
- Recipient management dengan validation
- Send testing dengan multiple providers

### **Development vs Production**

#### **Local Development**

- **Resend:** Uses sandbox emails (onboarding@resend.dev)
- **SMTP:** Real SMTP connection untuk testing
- **Cloudflare:** Emails saved as .eml files untuk inspection
- **Webhooks:** ngrok tunnel untuk local webhook testing

#### **Production Deployment**

- **Resend:** Requires domain verification di Resend dashboard
- **SMTP:** Production SMTP credentials dan authentication
- **Cloudflare:** Domain verification di CF Dashboard dengan Email Routing
- **Webhooks:** Public webhook URLs dengan SSL certificates

### **Security & Privacy**

#### **Credential Management**

- Encrypted storage untuk sensitive data (API keys, passwords)
- Masked display di admin interface ("••••••••••••••••")
- Environment variable fallbacks untuk development
- Secure webhook signature verification

#### **Privacy Compliance**

- IP anonymization options untuk event tracking
- GDPR-compliant email logging dengan retention policies
- Unsubscribe link automation dalam templates
- Customer consent tracking untuk marketing emails

### **Performance Optimization**

#### **Database Indexing**

- Optimized indexes untuk email_notifications queries
- Composite indexes untuk analytics queries
- Event timestamp indexing untuk real-time dashboard

#### **Caching Strategy**

- Email settings caching dengan database-first approach
- Template caching untuk high-frequency sending
- Analytics caching dengan configurable TTL

#### **Scalability Features**

- Async email sending dengan background processing
- Batch email support untuk campaigns
- Provider failover untuk high availability
- Rate limiting dengan respectful sending practices

---

## 🔄 Multi-SMTP Load Balancing System

### **Architecture Overview**

PlazaCMS includes an advanced multi-SMTP load balancing system that provides enterprise-grade email reliability, automatic failover, and performance optimization through intelligent distribution across multiple SMTP accounts.

### **Core Tables**

#### `smtp_accounts`

- **Purpose**: Stores multiple SMTP account configurations with encrypted credentials and performance tracking
- **Key Columns**:
  - `id` (UUID): Primary Key
  - `name` (TEXT): Account display name (e.g., "Gmail Primary", "SendGrid Backup")
  - `description` (TEXT): Optional account description
  - `host` (TEXT): SMTP server host (e.g., smtp.gmail.com)
  - `port` (INTEGER): SMTP port (587, 465, 25)
  - `username` (TEXT): SMTP username/email
  - `password_encrypted` (TEXT): AES-encrypted SMTP password
  - `encryption` (TEXT): Encryption type ('tls', 'ssl', 'none')
  - `weight` (INTEGER): Load balancing weight (1-10, higher = more emails)
  - `priority` (INTEGER): Priority level (1-1000, lower = higher priority)
  - `daily_limit` (INTEGER): Maximum emails per day for this account
  - `hourly_limit` (INTEGER): Maximum emails per hour for this account
  - `is_active` (BOOLEAN): Whether account is available for use
  - `is_healthy` (BOOLEAN): Current health status based on recent performance
  - `consecutive_failures` (INTEGER): Count of consecutive failed attempts
  - `total_success_count` (BIGINT): Total successful emails sent
  - `total_failure_count` (BIGINT): Total failed email attempts
  - `today_sent_count` (INTEGER): Emails sent today (resets daily)
  - `current_hour_sent` (INTEGER): Emails sent this hour (resets hourly)
  - `avg_response_time_ms` (INTEGER): Average response time in milliseconds
  - `last_used_at` (TIMESTAMPTZ): Last time this account was used
  - `last_error_message` (TEXT): Most recent error message
  - `last_error_at` (TIMESTAMPTZ): Time of last error
  - `cooldown_until` (TIMESTAMPTZ): Account unavailable until this time
  - `tags` (JSONB): Array of tags for organization ['primary', 'backup', 'high-volume']
  - `metadata` (JSONB): Additional account-specific configuration

#### `smtp_rotation_config`

- **Purpose**: Global configuration for the load balancing algorithm and behavior
- **Key Columns**:
  - `id` (UUID): Primary Key
  - `enabled` (BOOLEAN): Enable/disable multi-SMTP system
  - `fallback_to_single` (BOOLEAN): Use single SMTP if multi-SMTP fails
  - `strategy` (TEXT): Load balancing strategy ('round_robin', 'weighted', 'priority', 'health_based', 'least_used')
  - `max_retry_attempts` (INTEGER): Maximum retry attempts before giving up
  - `retry_delay_seconds` (INTEGER): Delay between retry attempts
  - `failure_cooldown_minutes` (INTEGER): Minutes to wait before retrying failed account
  - `health_check_interval_minutes` (INTEGER): How often to perform health checks
  - `failure_threshold` (INTEGER): Consecutive failures before marking unhealthy
  - `success_threshold` (INTEGER): Consecutive successes to mark healthy again
  - `global_daily_limit` (INTEGER): Optional global daily limit across all accounts
  - `global_hourly_limit` (INTEGER): Optional global hourly limit across all accounts
  - `prefer_healthy_accounts` (BOOLEAN): Prioritize healthy accounts over unhealthy
  - `balance_by_response_time` (BOOLEAN): Consider response time in account selection
  - `avoid_consecutive_same_account` (BOOLEAN): Try to use different accounts for consecutive emails
  - `emergency_fallback_enabled` (BOOLEAN): Use emergency account when all others fail
  - `emergency_single_account_id` (UUID): Specific account to use in emergencies
  - `track_performance_metrics` (BOOLEAN): Enable detailed performance logging
  - `log_rotation_decisions` (BOOLEAN): Log account selection decisions (for debugging)
  - `settings` (JSONB): Additional configuration options

#### `smtp_usage_logs`

- **Purpose**: Comprehensive logging of every email attempt through multi-SMTP system
- **Key Columns**:
  - `id` (UUID): Primary Key
  - `smtp_account_id` (UUID): Foreign Key to `smtp_accounts.id`
  - `email_notification_id` (UUID): Foreign Key to `email_notifications.id`
  - `recipient_email` (TEXT): Recipient email address
  - `subject` (TEXT): Email subject line
  - `status` (TEXT): Send status ('success', 'failed', 'timeout', 'rate_limited')
  - `message_id` (TEXT): Provider message ID (for tracking)
  - `response_time_ms` (INTEGER): Time taken to send email
  - `rotation_strategy` (TEXT): Strategy used for account selection
  - `was_fallback` (BOOLEAN): Whether this was a fallback attempt
  - `attempt_number` (INTEGER): Attempt number in retry sequence
  - `error_code` (TEXT): Error code from SMTP provider
  - `error_message` (TEXT): Detailed error message
  - `created_at` (TIMESTAMPTZ): Timestamp of sending attempt

#### `smtp_account_health_checks`

- **Purpose**: Track automated health monitoring of SMTP accounts
- **Key Columns**:
  - `id` (UUID): Primary Key
  - `smtp_account_id` (UUID): Foreign Key to `smtp_accounts.id`
  - `status` (TEXT): Health check result ('healthy', 'unhealthy', 'timeout', 'connection_error')
  - `response_time_ms` (INTEGER): Connection response time
  - `test_email_sent` (BOOLEAN): Whether a test email was sent
  - `test_recipient` (TEXT): Email address used for test (if any)
  - `error_message` (TEXT): Error details if health check failed
  - `checked_at` (TIMESTAMPTZ): When the health check was performed

### **Load Balancing Strategies**

#### **Round Robin** (Default)

- Fair distribution across all healthy accounts
- Each account gets equal opportunity regardless of performance
- Best for: Even distribution, preventing account overuse

#### **Weighted Distribution**

- Distribution based on account weights (1-10 scale)
- Higher weight = more emails assigned to that account
- Best for: Accounts with different capacity limits

#### **Priority-Based**

- Uses highest priority accounts first (lower number = higher priority)
- Fallback to lower priority when high-priority accounts unavailable
- Best for: Primary/backup account hierarchies

#### **Health-Based**

- Prioritizes accounts with best recent performance
- Considers success rate, response time, consecutive failures
- Best for: Optimizing delivery success rates

#### **Least Used**

- Selects account with lowest recent usage
- Balances load by avoiding overused accounts
- Best for: Preventing rate limit violations

### **Service Layer Architecture**

#### **SMTPRotationService**

- Core service handling account selection and rotation logic
- Features:
  - Real-time account health assessment
  - Rate limit tracking and enforcement
  - Performance metrics collection
  - Automatic failure recovery
  - Configurable retry strategies

#### **EmailService Integration**

- Enhanced `EmailService` with multi-SMTP provider support
- Automatic provider selection: `multi_smtp`, `resend`, `smtp`, `cloudflare`
- Seamless fallback to single-provider modes
- Performance tracking and error handling

### **Admin Interface**

#### **SMTP Accounts Management** (`/admin/settings/email/smtp-accounts`)

- Complete CRUD interface for SMTP accounts
- Real-time health monitoring and status display
- Account testing and validation
- Bulk operations and filtering
- Mobile-responsive design with card/table views

#### **Analytics Dashboard**

- Account performance metrics and usage statistics
- Load distribution visualization
- Success/failure rate analysis
- Response time monitoring
- Health trend tracking

#### **Configuration Interface**

- Web-based configuration for all rotation settings
- Strategy selection with live preview
- Rate limit configuration per account and globally
- Health monitoring settings and thresholds
- Emergency fallback configuration

### **Security Features**

#### **Credential Protection**

- AES encryption for SMTP passwords in database
- Secure credential transmission and storage
- Account isolation prevents credential leaks
- Automatic credential rotation support

#### **Rate Limit Protection**

- Per-account daily and hourly limits
- Global rate limiting across all accounts
- Automatic cooldown for exceeded limits
- Provider-specific rate limit awareness

#### **Health Isolation**

- Unhealthy accounts automatically excluded
- Individual account failures don't affect others
- Gradual recovery with success threshold verification
- Emergency isolation for problematic accounts

### **Performance Optimization**

#### **Caching Strategy**

- Configuration caching with 5-minute TTL
- Account health status caching
- Performance metrics aggregation
- Efficient database queries with proper indexing

#### **Background Processing**

- Async health checks every 5 minutes
- Automatic counter resets (daily/hourly)
- Performance metrics calculation
- Usage log cleanup and archival

#### **Monitoring & Alerting**

- Real-time account health monitoring
- Performance degradation alerts
- Rate limit approaching warnings
- Failure pattern detection

### **API Endpoints**

#### **Account Management**

- `GET /api/admin/smtp-accounts` - List accounts with filters
- `POST /api/admin/smtp-accounts` - Create new account
- `PUT /api/admin/smtp-accounts/:id` - Update account
- `DELETE /api/admin/smtp-accounts/:id` - Remove account
- `POST /api/admin/smtp-accounts/:id/test` - Test connection

#### **Analytics & Monitoring**

- `GET /api/admin/smtp-accounts/stats/overview` - Usage analytics
- `GET /api/admin/smtp-accounts/:id` - Account details with stats

#### **Configuration**

- `GET /api/admin/smtp-accounts/config` - Get rotation settings
- `POST /api/admin/smtp-accounts/config` - Update configuration

### **Integration with Email System**

#### **Provider Integration**

- Multi-SMTP as new provider type in EmailService
- Automatic selection via SMTPRotationService
- Fallback to existing providers (Resend, single SMTP, Cloudflare)
- Seamless transition for existing email functionality

#### **Performance Tracking**

- Response time monitoring for each send operation
- Success/failure logging with detailed error information
- Usage statistics integration with email analytics
- Real-time health status updates

#### **Configuration Management**

- Database-driven configuration with UI management
- Real-time settings updates without restart
- Environment variable fallbacks for development
- Production deployment with zero-downtime updates

### **Use Cases**

#### **High-Volume Sending**

- Distribute load across multiple provider accounts
- Prevent rate limit violations with automatic limiting
- Scale email capacity by adding more accounts
- Monitor and optimize sending performance

#### **Reliability & Failover**

- Automatic failover when accounts become unhealthy
- Multiple provider redundancy (Gmail + SendGrid + Outlook)
- Emergency fallback to single-provider mode
- Zero-downtime email sending even during account failures

#### **Cost Optimization**

- Balance usage across different provider pricing tiers
- Use free tier limits effectively across multiple accounts
- Priority-based sending for cost-sensitive scenarios
- Performance-based selection for optimal delivery rates

#### **Compliance & Monitoring**

- Detailed audit trail of all sending attempts
- Performance metrics for SLA compliance
- Health monitoring for proactive maintenance
- Usage tracking for billing and quota management

This multi-SMTP system provides enterprise-grade email infrastructure with automatic load balancing, health monitoring, and performance optimization - ensuring maximum email deliverability and reliability for PlazaCMS.

---

## 📮 Email API Rotation System ✅ **FULLY IMPLEMENTED**

### **Overview**

Sistem Email API Rotation adalah upgrade terbaru PlazaCMS yang mengintegrasikan API email providers (Resend, Brevo, Mailjet) dengan sistem SMTP yang sudah ada. Ini memberikan hybrid architecture yang memungkinkan intelligent load balancing antara SMTP accounts dan API providers untuk maximum email deliverability dan performance.

### **Core Architecture**

#### **Hybrid Email System**

- **SMTP Integration** → Menggunakan existing multi-SMTP system untuk traditional email sending
- **API Provider Integration** → Support untuk modern email APIs (Resend, Brevo, Mailjet)
- **Unified Interface** → Single service untuk manage semua email sending dengan automatic provider selection
- **Intelligent Load Balancing** → Smart distribution berdasarkan provider health, performance, dan configuration

#### **Provider Adapters**

- **Unified Interface** → `EmailAPIProviderAdapter` untuk consistent API across different providers
- **Cross-Platform Compatibility** → Support untuk Node.js, browser, dan Cloudflare Workers
- **Error Handling** → Robust error handling dengan automatic retry dan fallback mechanisms
- **Performance Tracking** → Response time monitoring dan success rate tracking untuk each provider

### **Database Schema**

#### **`email_api_providers`**

- **Tujuan:** Stores configuration untuk email API providers (Resend, Brevo, Mailjet)
- **Kolom Penting:**
  - `id` (UUID): Primary Key
  - `name` (VARCHAR): Friendly name untuk provider (e.g., "Resend Primary")
  - `provider_type` (VARCHAR): Type of provider ('resend', 'brevo', 'mailjet')
  - `api_key_encrypted` (TEXT): Encrypted API key
  - `api_secret_encrypted` (TEXT): Encrypted API secret (untuk Mailjet)
  - `base_url` (VARCHAR): API base URL untuk provider
  - `from_email` (VARCHAR): Default sender email address untuk provider
  - `weight` (INTEGER): Weight untuk weighted load balancing (1-100)
  - `priority` (INTEGER): Priority level untuk priority-based selection
  - `daily_limit` (INTEGER): Maximum emails per day untuk provider
  - `hourly_limit` (INTEGER): Maximum emails per hour untuk provider
  - `is_active` (BOOLEAN): Whether provider is enabled
  - `is_healthy` (BOOLEAN): Current health status
  - `last_used_at` (TIMESTAMPTZ): Last time provider was used (for round-robin)
  - `consecutive_failures` (INTEGER): Number of consecutive failed attempts
  - `total_success_count` (INTEGER): Total successful email sends
  - `total_failure_count` (INTEGER): Total failed email sends
  - `cooldown_until` (TIMESTAMPTZ): Cooldown period end time after failures
  - `today_sent_count` (INTEGER): Emails sent today (resets daily)
  - `current_hour_sent` (INTEGER): Emails sent this hour (resets hourly)
  - `avg_response_time_ms` (INTEGER): Average response time in milliseconds
  - `last_error_message` (TEXT): Last error message for debugging
  - `last_error_at` (TIMESTAMPTZ): Timestamp of last error
  - `tags` (JSONB): Additional metadata tags
  - `metadata` (JSONB): Extra configuration data
- **Features:**
  - Encrypted credential storage untuk security
  - Health monitoring dengan automatic recovery
  - Rate limiting per provider dengan daily/hourly quotas
  - Performance tracking dengan response time averages
  - Flexible configuration dengan JSONB metadata

#### **`email_api_health_checks`**

- **Tujuan:** Tracks health check results untuk API providers
- **Kolom Penting:**
  - `id` (UUID): Primary Key
  - `provider_id` (UUID): Foreign Key ke `email_api_providers.id`
  - `check_type` (VARCHAR): Type of health check ('api_test', 'send_test', 'connectivity')
  - `status` (VARCHAR): Result status ('healthy', 'unhealthy', 'degraded', 'unknown')
  - `response_time_ms` (INTEGER): Health check response time
  - `error_message` (TEXT): Error details if unhealthy
  - `metadata` (JSONB): Additional check data
  - `checked_at` (TIMESTAMPTZ): Timestamp of health check
- **Features:**
  - Comprehensive health monitoring dengan different check types
  - Historical health data untuk trend analysis
  - Performance tracking dengan response time measurement
  - Error logging untuk debugging dan troubleshooting

#### **`email_usage_logs`**

- **Tujuan:** Comprehensive logging untuk all email sending attempts (both SMTP dan API)
- **Kolom Penting:**
  - `id` (UUID): Primary Key
  - `account_id` (UUID): Foreign Key ke `smtp_accounts.id` (nullable for API providers)
  - `api_provider_id` (UUID): Foreign Key ke `email_api_providers.id` (nullable for SMTP)
  - `provider_type` (VARCHAR): Type of provider ('smtp', 'api')
  - `provider_name` (VARCHAR): Name of the provider used
  - `recipient_email` (VARCHAR): Email address of recipient
  - `subject` (VARCHAR): Email subject line
  - `status` (VARCHAR): Send status ('success', 'failed', 'timeout', 'rate_limited', 'bounced', 'deferred', 'complained')
  - `message_id` (VARCHAR): Provider-specific message ID
  - `response_time_ms` (INTEGER): Time taken to send email
  - `error_code` (VARCHAR): Error code if send failed
  - `error_message` (TEXT): Detailed error message
  - `rotation_strategy` (VARCHAR): Strategy used untuk provider selection
  - `was_fallback` (BOOLEAN): Whether this was a fallback attempt
  - `attempt_number` (INTEGER): Attempt number dalam retry sequence
  - `created_at` (TIMESTAMPTZ): Timestamp of send attempt
- **Features:**
  - Unified logging untuk both SMTP dan API providers
  - Detailed error tracking dengan codes dan messages
  - Performance analytics dengan response time tracking
  - Retry tracking dengan attempt numbering
  - Provider selection strategy logging

#### **`email_rotation_config`**

- **Tujuan:** Global configuration untuk hybrid email rotation system
- **Kolom Penting:**
  - `id` (UUID): Primary Key
  - `enabled` (BOOLEAN): Whether rotation system is enabled
  - `include_api_providers` (BOOLEAN): Whether to include API providers dalam rotation
  - `strategy` (VARCHAR): Load balancing strategy ('round_robin', 'weighted', 'priority', 'health_based', 'least_used')
  - `api_smtp_balance_ratio` (NUMERIC): Ratio of API vs SMTP usage (0.0-1.0)
  - `prefer_api_over_smtp` (BOOLEAN): Whether to prefer API providers
  - `api_fallback_to_smtp` (BOOLEAN): Allow fallback from API to SMTP
  - `smtp_fallback_to_api` (BOOLEAN): Allow fallback from SMTP to API
  - `emergency_fallback_enabled` (BOOLEAN): Enable emergency fallback mechanisms
  - `max_retry_attempts` (INTEGER): Maximum retry attempts for failed sends
  - `retry_delay_ms` (INTEGER): Delay between retry attempts
  - `circuit_breaker_threshold` (INTEGER): Failures needed to trip circuit breaker
  - `circuit_breaker_timeout_ms` (INTEGER): Circuit breaker cooldown period
  - `prefer_healthy_accounts` (BOOLEAN): Prioritize healthy providers
  - `balance_by_response_time` (BOOLEAN): Consider response time dalam selection
  - `avoid_consecutive_same_account` (BOOLEAN): Avoid using same provider consecutively
  - `track_performance_metrics` (BOOLEAN): Enable performance tracking
  - `log_rotation_decisions` (BOOLEAN): Log provider selection decisions
  - `notes` (TEXT): Configuration notes
  - `created_by` (VARCHAR): User who created configuration
  - `created_at` (TIMESTAMPTZ): Configuration creation time
  - `updated_at` (TIMESTAMPTZ): Last configuration update
- **Features:**
  - Comprehensive configuration untuk all rotation strategies
  - Circuit breaker implementation untuk automatic recovery
  - Flexible fallback mechanisms dengan bi-directional support
  - Performance optimization settings
  - Audit trail dengan creation/update tracking

### **Load Balancing Strategies**

#### **Round Robin**

- **Implementation:** Database-backed rotation state dengan persistent ordering
- **Features:** Consistent provider ordering, persistent state across restarts
- **Use Case:** Equal distribution across all providers

#### **Weighted Distribution**

- **Implementation:** Probability-based selection menggunakan provider weights
- **Features:** Configurable weights (1-100), proportional load distribution
- **Use Case:** Different capacity providers, premium/free tier mixing

#### **Priority-Based**

- **Implementation:** Hierarchical selection berdasarkan priority levels
- **Features:** Primary/secondary/tertiary tiers, automatic failover
- **Use Case:** Cost optimization, preferred provider setup

#### **Health-Based**

- **Implementation:** Dynamic selection berdasarkan real-time health status
- **Features:** Automatic unhealthy provider exclusion, performance consideration
- **Use Case:** Maximum reliability, automatic failure recovery

#### **Least Used**

- **Implementation:** Selection berdasarkan historical usage statistics
- **Features:** Automatic load leveling, usage tracking integration
- **Use Case:** Equal resource utilization, quota optimization

### **Health Monitoring System**

#### **Real-Time Health Checks**

- **Frequency:** Continuous monitoring dengan configurable intervals
- **Types:** API connectivity tests, send test emails, response time checks
- **Thresholds:** Configurable success/failure thresholds untuk each provider
- **Recovery:** Automatic recovery detection dengan gradual re-enablement

#### **Circuit Breaker Implementation**

- **Trigger:** Configurable consecutive failure threshold
- **Behavior:** Automatic provider isolation untuk cooldown period
- **Recovery:** Gradual recovery dengan health verification
- **Fallback:** Automatic fallback ke healthy providers

#### **Performance Tracking**

- **Metrics:** Response time, success rate, error patterns
- **Aggregation:** Real-time averages dengan historical trending
- **Optimization:** Performance-based provider selection
- **Alerting:** Performance degradation detection

### **Security Features**

#### **Credential Management**

- **Encryption:** AES encryption untuk API keys dan secrets dalam database
- **Storage:** Secure credential storage dengan separate encrypted fields
- **Access:** Controlled access dengan admin-only credential management
- **Rotation:** Support untuk credential rotation dan updates

#### **Provider Isolation**

- **Account Separation:** Each provider operates independently
- **Failure Isolation:** Provider failures don't affect others
- **Rate Limiting:** Individual rate limits prevent provider overuse
- **Security Boundaries:** Encrypted credentials dengan provider-specific access

### **API Management System**

#### **Provider Adapters**

##### **ResendAdapter**

- **Features:** Complete Resend API integration dengan email formatting
- **Configuration:** API key authentication, from email configuration
- **Error Handling:** Detailed error parsing dengan specific Resend error codes
- **Compatibility:** Full Resend API feature support dengan proper formatting

##### **BrevoAdapter**

- **Features:** Sendinblue/Brevo API integration dengan template support
- **Configuration:** API key authentication, sender configuration
- **Error Handling:** Brevo-specific error handling dengan status code mapping
- **Compatibility:** Modern Brevo API dengan advanced features

##### **MailjetAdapter**

- **Features:** Mailjet API v3.1 integration dengan dual authentication
- **Configuration:** API key + secret authentication, template support
- **Error Handling:** Comprehensive Mailjet error handling
- **Compatibility:** Full Mailjet feature set dengan proper message formatting

#### **Unified Provider Interface**

- **Standardization:** Common interface untuk all providers
- **Type Safety:** Full TypeScript support dengan proper typing
- **Error Handling:** Consistent error handling across providers
- **Performance:** Optimized untuk high-volume sending

### **Admin Interface Components**

#### **Email Rotation Dashboard**

- **Overview Cards:** Total emails sent, success rate, average response time, active providers
- **Provider Health:** Real-time health status dengan visual indicators
- **Performance Metrics:** Provider comparison dengan charts dan statistics
- **Recent Activity:** Live activity feed dengan detailed logging
- **Quick Actions:** Direct access ke provider management dan configuration

#### **API Provider Management**

- **CRUD Interface:** Complete create, read, update, delete untuk providers
- **Configuration Forms:** User-friendly forms untuk each provider type
- **Testing Tools:** Built-in connection testing dengan real-time results
- **Health Monitoring:** Provider health dashboard dengan historical data
- **Credential Management:** Secure credential input dengan visibility toggles

#### **Analytics & Reporting**

- **Performance Analytics:** Comprehensive charts dengan provider performance data
- **Usage Statistics:** Detailed usage tracking dengan time-based filtering
- **Health Trends:** Historical health data dengan trend analysis
- **Error Analysis:** Error pattern detection dengan detailed logging
- **Export Capabilities:** Data export untuk external analysis

#### **Configuration Management**

- **Strategy Selection:** Visual strategy selector dengan live preview
- **Load Balancing Config:** Interactive configuration untuk all strategies
- **Fallback Settings:** Comprehensive fallback mechanism configuration
- **Rate Limiting:** Per-provider dan global rate limit management
- **Testing Interface:** Configuration testing dengan real-time validation

### **Integration Architecture**

#### **Email Service Integration**

- **Provider Detection:** Automatic detection of hybrid rotation capability
- **Seamless Switching:** Transparent switching between providers
- **Fallback Mechanisms:** Multi-level fallback dari API ke SMTP
- **Configuration Driven:** Database-driven configuration dengan real-time updates

#### **SMTP System Integration**

- **Unified Service:** Single service managing both SMTP dan API providers
- **Load Balancing:** Combined load balancing across all provider types
- **Health Monitoring:** Unified health monitoring untuk SMTP dan API
- **Performance Tracking:** Combined performance metrics dan analytics

#### **Background Services**

- **Health Monitoring:** Continuous background health checks
- **Counter Management:** Automatic daily/hourly counter resets
- **Performance Calculation:** Background performance metric calculations
- **Cleanup Services:** Automatic log cleanup dan data archival

### **API Endpoints**

#### **Provider Management**

- `GET /api/admin/email-api-providers` - List all API providers dengan filtering
- `POST /api/admin/email-api-providers` - Create new API provider
- `PUT /api/admin/email-api-providers/:id` - Update provider configuration
- `DELETE /api/admin/email-api-providers/:id` - Remove API provider
- `POST /api/admin/email-api-providers/:id/test` - Test provider connection
- `POST /api/admin/email-api-providers/:id/health-check` - Manual health check
- `POST /api/admin/email-api-providers/:id/reset-counters` - Reset usage counters

#### **Rotation Configuration**

- `GET /api/admin/email-rotation-config` - Get current rotation configuration
- `PUT /api/admin/email-rotation-config` - Update rotation settings
- `POST /api/admin/email-rotation-config/test` - Test rotation configuration
- `POST /api/admin/email-rotation-config/reset` - Reset rotation state
- `GET /api/admin/email-rotation-config/stats` - Get rotation statistics
- `GET /api/admin/email-rotation-config/analytics` - Get detailed analytics
- `GET /api/admin/email-rotation-config/logs` - Get usage logs dengan filtering

#### **Health & Monitoring**

- `GET /api/admin/email-api-providers/:id/health` - Get provider health status
- `GET /api/admin/email-api-providers/:id/stats` - Get provider statistics
- `GET /api/admin/email-api-providers/health/overview` - Overall health overview

### **Performance Features**

#### **Caching Strategy**

- **Provider Cache:** In-memory caching untuk provider adapters
- **Configuration Cache:** 5-minute TTL untuk rotation configuration
- **Health Status Cache:** Real-time health status caching
- **Performance Metrics:** Aggregated metrics caching untuk faster queries

#### **Database Optimization**

- **Indexing:** Comprehensive indexes untuk fast query performance
- **Partitioning:** Log table partitioning untuk large datasets
- **Cleanup:** Automatic old log cleanup dan archival
- **Query Optimization:** Optimized queries untuk analytics dan reporting

#### **Background Processing**

- **Async Operations:** Non-blocking background health checks
- **Batch Processing:** Efficient batch operations untuk large datasets
- **Queue Management:** Email queue management dengan priority handling
- **Resource Management:** Efficient resource utilization dengan connection pooling

### **Migration & Deployment**

#### **Database Migrations**

- **Schema Updates:** Automated schema migrations untuk new tables
- **Data Migration:** Safe data migration dengan backup procedures
- **Index Creation:** Optimized index creation untuk performance
- **Compatibility:** Backward compatibility dengan existing email system

#### **Configuration Migration**

- **Settings Transfer:** Migration dari existing email settings
- **Provider Setup:** Automatic provider configuration dari existing settings
- **Validation:** Configuration validation dan error checking
- **Rollback:** Safe rollback procedures untuk deployment issues

### **Use Cases & Benefits**

#### **High Availability**

- **Provider Redundancy:** Multiple provider failover untuk maximum uptime
- **Health Monitoring:** Proactive health monitoring dengan automatic recovery
- **Circuit Breakers:** Automatic isolation of failing providers
- **Emergency Fallback:** Multi-level fallback mechanisms

#### **Performance Optimization**

- **Load Distribution:** Intelligent load balancing across providers
- **Response Time Optimization:** Performance-based provider selection
- **Rate Limit Management:** Intelligent rate limiting dengan quota optimization
- **Capacity Scaling:** Easy capacity scaling dengan additional providers

#### **Cost Management**

- **Provider Mixing:** Mix of free dan paid providers untuk cost optimization
- **Usage Optimization:** Intelligent usage distribution untuk quota maximization
- **Performance vs Cost:** Configurable balance between performance dan cost
- **Analytics:** Detailed cost analysis dengan usage tracking

#### **Reliability & Monitoring**

- **Comprehensive Logging:** Detailed logging untuk all email operations
- **Real-time Analytics:** Live performance monitoring dan analytics
- **Error Tracking:** Comprehensive error tracking dengan pattern detection
- **Health Dashboards:** Visual health monitoring dengan historical data

The Email API Rotation System provides enterprise-grade email infrastructure yang combines the reliability of SMTP dengan the modern capabilities of API providers, ensuring maximum email deliverability, performance, dan scalability untuk PlazaCMS.
