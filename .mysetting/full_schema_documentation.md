# 📚 Dokumentasi Skema Database PlazaCMS

Dokumen ini menyediakan gambaran lengkap tentang semua tabel dalam skema database PlazaCMS, beserta tujuan dan kolom-kolom utamanya. Ini dirancang untuk membantu pengembang memahami struktur data dan hubungan antar entitas.

---

## ℹ️ Catatan Global

* **Trigger `updated_at`:** Banyak tabel memiliki trigger `trg_set_updated_at_*` yang memanggil fungsi `set_updated_at()` pada setiap operasi UPDATE untuk mengisi kolom `updated_at` dengan `CURRENT_TIMESTAMP`. Ini menyederhanakan audit waktu pembaruan tanpa perlu menyetel kolom tersebut di aplikasi.

---

## 🔑 Autentikasi & Otorisasi

### `users`
*   **Tujuan:** Menyimpan informasi dasar pengguna, termasuk peran (role) untuk kontrol akses.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key, ID unik pengguna.
    *   `name` (TEXT): Nama pengguna.
    *   `email` (TEXT): Email pengguna, unik.
    *   `email_verified` (TIMESTAMPTZ): Waktu verifikasi email.
    *   `image` (TEXT): URL gambar profil pengguna.
    *   `role` (TEXT): Peran pengguna ('admin', 'vendor', 'customer', 'guest').
*   **Hubungan:** Direferensikan oleh `accounts`, `sessions`, `media`, `products`, `reviews`, `user_addresses`, `carts`, `orders`.

### `accounts`
*   **Tujuan:** Menyimpan informasi akun pengguna dari berbagai penyedia autentikasi (misal: Google, GitHub) yang terhubung dengan pengguna di aplikasi.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `user_id` (UUID): Foreign Key ke `users.id`.
    *   `type` (TEXT): Tipe akun (misal: "oauth", "email").
    *   `provider` (TEXT): Nama penyedia autentikasi (misal: "google", "github").
    *   `provider_account_id` (TEXT): ID unik dari penyedia.
    *   `access_token` (TEXT): Token akses dari penyedia.
*   **Hubungan:** Mereferensikan `users`.

### `sessions`
*   **Tujuan:** Menyimpan sesi pengguna yang aktif, digunakan untuk menjaga pengguna tetap login.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `user_id` (UUID): Foreign Key ke `users.id`.
    *   `expires` (TIMESTAMPTZ): Waktu kedaluwarsa sesi.
    *   `session_token` (TEXT): Token sesi unik.
*   **Hubungan:** Mereferensikan `users`.

### `verification_tokens`
*   **Tujuan:** Menyimpan token yang digunakan untuk verifikasi email atau reset password.
*   **Kolom Penting:**
    *   `identifier` (TEXT): Pengidentifikasi (misal: email).
    *   `token` (TEXT): Token unik.
    *   `expires` (TIMESTAMPTZ): Waktu kedaluwarsa token.

---

## 🖼️ Manajemen Media

### `media`
*   **Tujuan:** Menyimpan metadata untuk semua file media (gambar, video, dll.) yang diunggah ke sistem. Ini adalah tabel pusat untuk semua aset media.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `filename` (TEXT): Nama asli file.
    *   `file_url` (TEXT): URL tempat file disimpan (misal: di Cloudflare R2).
    *   `file_type` (TEXT): Tipe MIME file (misal: "image/jpeg").
    *   `size` (INTEGER): Ukuran file dalam byte.
    *   `alt_text` (TEXT): Teks alternatif untuk gambar (untuk SEO/aksesibilitas).
    *   `uploaded_by` (UUID): Foreign Key ke `users.id` (pengguna yang mengunggah).
    *   `media_type` (TEXT): Tipe media ('product_image', 'product_variant_image', 'user_profile', 'review_image', 'other', 'site_asset').
    *   `entity_id` (UUID): ID dari entitas yang terkait dengan media (misal: product_id, user_id, review_id).
*   **Hubungan:** Direferensikan oleh `product_images`, `product_variant_images`, `review_images`, `categories`, `payment_gateways`, `payment_methods`, `shipping_carriers`, `shipping_methods`, `site_settings`.

---

## 🛍️ Produk & Kategori

### `categories`
*   **Tujuan:** Mengorganisir produk ke dalam kategori. Mendukung kategori bersarang.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `name` (TEXT): Nama kategori, unik.
    *   `slug` (TEXT): Slug URL kategori, unik.
    *   `description` (TEXT): Deskripsi kategori.
    *   `parent_id` (UUID): Foreign Key ke `categories.id` (untuk kategori induk).
    *   `image_id` (UUID): Foreign Key ke `media.id` untuk gambar kategori.
*   **Hubungan:** Direferensikan oleh `products`.

### `products`
*   **Tujuan:** Menyimpan informasi dasar tentang produk.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `name` (TEXT): Nama produk.
    *   `slug` (TEXT): Slug URL produk, unik.
    *   `description` (TEXT): Deskripsi produk.
    *   `regular_price` (NUMERIC): Harga produk tanpa diskon.
    *   `sale_price` (NUMERIC): Harga produk saat diskon.
    *   `sale_start_date` (TIMESTAMPTZ): Tanggal mulai diskon.
    *   `sale_end_date` (TIMESTAMPTZ): Tanggal berakhir diskon.
    *   `currency` (TEXT): Mata uang (misal: "USD").
    *   `stock` (INTEGER): Jumlah stok produk.
    *   `category_id` (UUID): Foreign Key ke `categories.id`.
    *   `vendor_id` (UUID): Foreign Key ke `users.id` (penjual produk).
    *   `status` (TEXT): Status produk ('published', 'private', 'draft', 'archived').
    *   `weight` (NUMERIC): Berat produk (untuk perhitungan pengiriman).
    *   `sku` (TEXT): Stock Keeping Unit produk, unik.
    *   `tax_class_id` (UUID): Foreign Key ke `tax_classes.id`.
*   **Hubungan:** Direferensikan oleh `product_images`, `product_variants`, `reviews`.

### `product_images`
*   **Tujuan:** Menghubungkan produk induk dengan gambar-gambar utamanya.
*   **Kolom Penting:**
    *   `product_id` (UUID): Foreign Key ke `products.id`.
    *   `media_id` (UUID): Foreign Key ke `media.id`.
    *   `display_order` (INTEGER): Urutan tampilan gambar.
*   **Hubungan:** Mereferensikan `products` dan `media`.

---

## 🏷️ Varian Produk & Atribut

### `product_attributes`
*   **Tujuan:** Mendefinisikan jenis atribut yang dapat dimiliki produk (misal: "Color", "Size").
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `name` (TEXT): Nama atribut, unik.
*   **Hubungan:** Direferensikan oleh `product_attribute_values`.

### `product_attribute_values`
*   **Tujuan:** Menyimpan nilai-nilai spesifik untuk setiap atribut (misal: "Red", "Blue" untuk atribut "Color").
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `attribute_id` (UUID): Foreign Key ke `product_attributes.id`.
    *   `value` (TEXT): Nilai atribut.
*   **Hubungan:** Mereferensikan `product_attributes` dan direferensikan oleh `product_variant_attribute_values`.

### `product_variants`
*   **Tujuan:** Merepresentasikan setiap kombinasi unik dari varian produk (misal: T-shirt Merah Ukuran S).
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `product_id` (UUID): Foreign Key ke `products.id`.
    *   `sku` (TEXT): Stock Keeping Unit varian, unik.
    *   `regular_price` (NUMERIC): Harga reguler varian (jika berbeda dari produk induk).
    *   `sale_price` (NUMERIC): Harga jual varian.
    *   `sale_start_date` (TIMESTAMPTZ): Tanggal mulai diskon varian.
    *   `sale_end_date` (TIMESTAMPTZ): Tanggal berakhir diskon varian.
    *   `stock` (INTEGER): Stok spesifik untuk varian ini.
    *   `status` (TEXT): Status varian ('published', 'private', 'draft', 'archived').
    *   `weight` (NUMERIC): Berat varian (jika berbeda dari produk induk).
*   **Hubungan:** Mereferensikan `products` dan direferensikan oleh `cart_items`, `order_items`, `product_variant_images`, `product_variant_attribute_values`.

### `product_variant_attribute_values`
*   **Tujuan:** Tabel penghubung (many-to-many) antara varian produk dan nilai-nilai atributnya.
*   **Kolom Penting:**
    *   `product_variant_id` (UUID): Foreign Key ke `product_variants.id`.
    *   `attribute_value_id` (UUID): Foreign Key ke `product_attribute_values.id`.
*   **Hubungan:** Mereferensikan `product_variants` dan `product_attribute_values`.

### `product_variant_images`
*   **Tujuan:** Menghubungkan varian produk dengan gambar-gambar spesifik untuk varian tersebut.
*   **Kolom Penting:**
    *   `product_variant_id` (UUID): Foreign Key ke `product_variants.id`.
    *   `media_id` (UUID): Foreign Key ke `media.id`.
    *   `display_order` (INTEGER): Urutan tampilan gambar varian.
*   **Hubungan:** Mereferensikan `product_variants` dan `media`.

---

## 🛒 Keranjang Belanja & Pesanan

### `carts`
*   **Tujuan:** Menyimpan informasi keranjang belanja pengguna atau sesi.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `user_id` (UUID): Foreign Key ke `users.id` (NULL untuk keranjang tamu).
    *   `session_id` (TEXT): ID sesi unik untuk keranjang tamu.
*   **Hubungan:** Direferensikan oleh `cart_items`.

### `cart_items`
*   **Tujuan:** Menyimpan item-item yang ada di dalam keranjang belanja.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `cart_id` (UUID): Foreign Key ke `carts.id`.
    *   `product_variant_id` (UUID): Foreign Key ke `product_variants.id` (varian produk yang ditambahkan).
    *   `quantity` (INTEGER): Jumlah item.
    *   `price_at_add` (NUMERIC): Harga item saat ditambahkan ke keranjang.
*   **Hubungan:** Mereferensikan `carts` dan `product_variants`.

### `orders`
*   **Tujuan:** Menyimpan informasi pesanan yang telah dibuat oleh pengguna.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `user_id` (UUID): Foreign Key ke `users.id`.
    *   `status` (TEXT): Status pesanan ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded').
    *   `total_amount` (NUMERIC): Total jumlah pesanan.
    *   `currency` (TEXT): Mata uang.
    *   `shipping_address` (JSONB): Detail alamat pengiriman.
    *   `billing_address` (JSONB): Detail alamat penagihan.
    *   `payment_method` (TEXT): Metode pembayaran yang dipilih (legacy/kompatibilitas).
    *   `payment_status` (TEXT): Status pembayaran ('pending', 'completed', 'failed', 'refunded').
    *   `transaction_id` (TEXT): ID transaksi dari gateway pembayaran.
    *   `shipping_provider` (TEXT): Penyedia pengiriman (misal: "FedEx").
    *   `shipping_method` (TEXT): Metode pengiriman (misal: "Standard").
    *   `shipping_cost` (NUMERIC): Biaya pengiriman.
    *   `tracking_number` (TEXT): Nomor pelacakan.
    *   `payment_method_id` (UUID): Foreign Key ke `payment_methods.id`.
    *   `shipping_zone_method_id` (UUID): Foreign Key ke `shipping_zone_methods.id`.
    *   `carrier_id` (UUID): Foreign Key ke `shipping_carriers.id`.
*   **Hubungan:** Mereferensikan `users`, `payment_methods`, `shipping_zone_methods`, `shipping_carriers`. Direferensikan oleh `order_items`.

### `order_items`
*   **Tujuan:** Menyimpan detail item-item yang termasuk dalam sebuah pesanan.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `order_id` (UUID): Foreign Key ke `orders.id`.
    *   `product_variant_id` (UUID): Foreign Key ke `product_variants.id`.
    *   `product_name` (TEXT): Nama produk saat dipesan (untuk historis).
    *   `product_price` (NUMERIC): Harga produk saat dipesan (untuk historis).
    *   `quantity` (INTEGER): Jumlah item.
*   **Hubungan:** Mereferensikan `orders` dan `product_variants`.

---

## 💬 Ulasan Produk

### `reviews`
*   **Tujuan:** Menyimpan ulasan produk dari pengguna atau tamu.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `product_id` (UUID): Foreign Key ke `products.id`.
    *   `user_id` (UUID): Foreign Key ke `users.id` (NULL jika ulasan tamu).
    *   `reviewer_name` (TEXT): Nama pengulas (untuk tamu).
    *   `reviewer_email` (TEXT): Email pengulas (untuk tamu).
    *   `review_type` (TEXT): Tipe ulasan ('user', 'guest', 'imported').
    *   `rating` (INTEGER): Peringkat (1-5).
    *   `comment` (TEXT): Komentar ulasan.
*   **Hubungan:** Mereferensikan `products` dan `users` (opsional), direferensikan oleh `review_images`.

### `review_images`
*   **Tujuan:** Menghubungkan ulasan dengan gambar-gambar yang diunggah oleh pengulas.
*   **Kolom Penting:**
    *   `review_id` (UUID): Foreign Key ke `reviews.id`.
    *   `media_id` (UUID): Foreign Key ke `media.id`.
    *   `display_order` (INTEGER): Urutan tampilan gambar ulasan.
*   **Hubungan:** Mereferensikan `reviews` dan `media`.

---

## 🏡 Alamat Pengguna

### `user_addresses`
*   **Tujuan:** Menyimpan alamat-alamat yang telah disimpan oleh pengguna untuk kemudahan checkout.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `user_id` (UUID): Foreign Key ke `users.id`.
    *   `address_name` (TEXT): Nama alamat (misal: "Rumah", "Kantor").
    *   `recipient_name` (TEXT): Nama penerima.
    *   `phone_number` (TEXT): Nomor telepon.
    *   `street_address` (TEXT): Alamat jalan.
    *   `city` (TEXT): Kota.
    *   `state` (TEXT): Provinsi/negara bagian.
    *   `postal_code` (TEXT): Kode pos.
    *   `country` (TEXT): Negara.
    *   `is_default` (BOOLEAN): Penanda alamat default.
*   **Hubungan:** Mereferensikan `users`.

---

## 📦 Konfigurasi Pengiriman

### `shipping_zones`
*   **Tujuan:** Mendefinisikan area geografis tempat metode pengiriman berlaku.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `name` (TEXT): Nama zona (misal: "Domestik", "Internasional").
*   **Hubungan:** Direferensikan oleh `shipping_zone_locations` dan `shipping_zone_methods`.

### `shipping_zone_locations`
*   **Tujuan:** Menentukan lokasi spesifik (negara, provinsi, kode pos) yang termasuk dalam suatu zona pengiriman.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `zone_id` (UUID): Foreign Key ke `shipping_zones.id`.
    *   `location_type` (TEXT): Tipe lokasi ('country', 'state', 'postcode').
    *   `location_code` (TEXT): Kode lokasi (misal: "ID", "US-CA", "12345").
*   **Hubungan:** Mereferensikan `shipping_zones`.

### `shipping_carriers`
*   **Tujuan:** Mendefinisikan penyedia jasa pengiriman (ekspedisi) seperti FedEx, UPS.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `name` (TEXT): Nama penyedia.
    *   `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo carrier.
    *   `tracking_url_template` (TEXT): Template URL untuk pelacakan.
*   **Hubungan:** Direferensikan oleh `shipping_method_carrier`.

### `shipping_methods`
*   **Tujuan:** Mendefinisikan berbagai metode pengiriman yang tersedia (misal: Flat Rate, Free Shipping).
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `name` (TEXT): Nama metode (misal: "Pengiriman Reguler").
    *   `method_type` (TEXT): Tipe metode ('flat_rate', 'free_shipping', 'local_pickup', 'table_rate').
    *   `is_enabled` (BOOLEAN): Status aktif metode.
    *   `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo metode pengiriman.
*   **Hubungan:** Direferensikan oleh `shipping_zone_methods` dan `shipping_method_carrier`.

### `shipping_zone_methods`
*   **Tujuan:** Menghubungkan metode pengiriman dengan zona pengiriman tertentu, dan menentukan biaya dasar serta syarat-syaratnya.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `zone_id` (UUID): Foreign Key ke `shipping_zones.id`.
    *   `method_id` (UUID): Foreign Key ke `shipping_methods.id`.
    *   `cost` (NUMERIC): Biaya dasar metode ini.
    *   `min_order_amount` (NUMERIC): Jumlah order minimum (untuk diskon atau threshold lainnya).
    *   `enable_free_shipping_threshold` (BOOLEAN): Mengaktifkan opsi gratis ongkir berdasarkan threshold.
    *   `free_shipping_threshold_amount` (NUMERIC): Nilai ambang batas untuk gratis ongkir.
*   **Hubungan:** Mereferensikan `shipping_zones` dan `shipping_methods`, direferensikan oleh `shipping_method_rates`.

### `shipping_method_rates`
*   **Tujuan:** Menyimpan aturan biaya pengiriman yang lebih kompleks berdasarkan kriteria seperti berat, harga, atau jumlah item.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `zone_method_id` (UUID): Foreign Key ke `shipping_zone_methods.id`.
    *   `min_value` (NUMERIC): Nilai minimum untuk aturan ini.
    *   `max_value` (NUMERIC): Nilai maksimum.
    *   `cost` (NUMERIC): Biaya untuk rentang ini.
    *   `rate_type` (TEXT): Tipe aturan ('weight', 'price', 'item_count').
*   **Hubungan:** Mereferensikan `shipping_zone_methods`.

### `shipping_method_carrier`
*   **Tujuan:** Menghubungkan metode pengiriman dengan penyedia jasa pengiriman (carrier) yang mengimplementasikannya.
*   **Kolom Penting:**
    *   `method_id` (UUID): Foreign Key ke `shipping_methods.id`.
    *   `carrier_id` (UUID): Foreign Key ke `shipping_carriers.id`.
*   **Hubungan:** Mereferensikan `shipping_methods` dan `shipping_carriers`.

---

## 💳 Konfigurasi Pembayaran

### `payment_gateways`
*   **Tujuan:** Mendefinisikan penyedia layanan pembayaran eksternal (misal: PayPal, Stripe).
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `name` (TEXT): Nama gateway.
    *   `slug` (TEXT): Slug unik.
    *   `is_enabled` (BOOLEAN): Status aktif gateway.
    *   `settings` (JSONB): Pengaturan spesifik gateway (misal: API keys).
    *   `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo gateway.
*   **Hubungan:** Direferensikan oleh `payment_methods`.

### `payment_methods`
*   **Tujuan:** Mendefinisikan metode pembayaran spesifik yang ditawarkan oleh suatu gateway.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `gateway_id` (UUID): Foreign Key ke `payment_gateways.id`.
    *   `name` (TEXT): Nama metode (misal: "Credit Card").
    *   `slug` (TEXT): Slug unik.
    *   `is_enabled` (BOOLEAN): Status aktif metode.
    *   `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo metode pembayaran.
*   **Hubungan:** Mereferensikan `payment_gateways`.

---

## 📊 Pajak

### `tax_classes`
*   **Tujuan:** Mendefinisikan kelas-kelas pajak yang berbeda yang dapat diterapkan pada produk.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `name` (TEXT): Nama kelas pajak (misal: "Standard Tax").
    *   `rate` (NUMERIC): Tingkat pajak sebagai desimal (misal: 0.10).
    *   `is_active` (BOOLEAN): Status aktif kelas pajak.
*   **Hubungan:** Direferensikan oleh `products`.

---

## ⚙️ Pengaturan Situs

### `site_settings`
*   **Tujuan:** Menyimpan konfigurasi global dan aset media terkait situs (misal: logo, favicon). Tabel ini dirancang untuk memiliki satu baris data saja.
*   **Kolom Penting:**
    *   `id` (UUID): Primary Key.
    *   `site_name` (TEXT): Nama situs/aplikasi.
    *   `site_description` (TEXT): Deskripsi situs.
    *   `contact_email` (TEXT): Email kontak situs.
    *   `contact_phone` (TEXT): Nomor telepon kontak situs.
    *   `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country` (TEXT): Detail alamat bisnis.
    *   `currency_code` (TEXT): Kode mata uang default (misal: "USD").
    *   `currency_symbol` (TEXT): Simbol mata uang default (misal: "$").
    *   `logo_media_id` (UUID): Foreign Key ke `media.id` untuk logo situs.
    *   `favicon_media_id` (UUID): Foreign Key ke `media.id` untuk favicon situs.
    *   `default_product_image_id` (UUID): Foreign Key ke `media.id` untuk gambar produk default.
    *   `default_user_avatar_id` (UUID): Foreign Key ke `media.id` untuk avatar pengguna default.
    *   `social_share_image_id` (UUID): Foreign Key ke `media.id` untuk gambar berbagi media sosial default.
    *   `other_settings` (JSONB): Kolom fleksibel untuk pengaturan lain dalam format JSON.
*   **Hubungan:** Mereferensikan `media`.