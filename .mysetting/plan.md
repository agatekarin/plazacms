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

- **Provider**: Email/password, Google, GitHub (opsional).
- **Adapter**: PostgreSQL.
- **Session Strategy**: JWT (lebih ringan, cocok serverless).
- **User Roles**: Disimpan di tabel `users` (`role = admin | vendor | customer`).

### RBAC

- Middleware cek role sebelum akses route:

  - **admin** → akses penuh ke admin panel.
  - **vendor** → kelola produk sendiri.
  - **customer** → order, cart, review.

- Implementasi dengan:

  ```ts
  // middleware.ts
  import { getToken } from "next-auth/jwt";

  export async function middleware(req) {
    const token = await getToken({ req });
    const role = token?.role || "guest";

    const adminRoutes = ["/admin"];
    if (adminRoutes.some((r) => req.nextUrl.pathname.startsWith(r))) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
      }
    }
    return NextResponse.next();
  }
  ```

---

## 🗄️ Database (PostgreSQL) ✅ **ENHANCED**

### **Core Tables**

- **users** → Autentikasi (NextAuth) + peran (admin, vendor, customer, guest).
- **accounts**, **sessions**, **verification_tokens** → NextAuth.js tables.

### **Media Management** 📁

- **media_folders** ✅ → Virtual folder hierarchy untuk organization.
- **media** ✅ → Enhanced dengan `folder_id`, metadata file media dengan R2 storage.

### **Product Management** 🛍️

- **products** ✅ → Enhanced dengan modern product editor support.
- **product_attributes** → Jenis atribut produk (misal: "Ukuran", "Warna").
- **product_attribute_values** → Nilai spesifik untuk atribut (misal: "Merah", "XL").
- **product_variants** ✅ → Enhanced dengan sale scheduling, inline management.
- **product_variant_attribute_values** → Mapping varian ke atribut values.
- **product_images** → Gambar produk induk.
- **product_variant_images** ✅ → Enhanced per-variant image management.
- **categories** → Product categories dengan hierarchy support.

### **E-commerce Core**

- **carts** → Keranjang belanja (berbasis pengguna atau sesi).
- **cart_items** → Item di keranjang belanja (mereferensikan varian produk).
- **orders** → Data pesanan lengkap dengan shipping/billing addresses.
- **order_items** → Item di pesanan (mereferensikan varian produk).
- **user_addresses** → Alamat yang disimpan pengguna untuk checkout.

### **Reviews & Ratings**

- **reviews** → Ulasan produk (user/guest) dengan kemampuan upload gambar.
- **review_images** → Gambar yang diunggah oleh pengulas.

### **Shipping System** ✅ **FULLY IMPLEMENTED**

- **shipping_zones** ✅ → Geographic shipping zones dengan country coverage mapping.
- **shipping_zone_countries** ✅ → Country-zone mapping dengan ISO2 code support.
- **shipping_gateways** ✅ → Shipping service providers (JNE, Pos Indonesia, dll).
- **shipping_methods** ✅ → Delivery methods per gateway (Regular, Express, Same Day).
- **tax_classes** → Tax rate classes untuk shipping calculations.

### **Payment Integration** ✅ **ENHANCED**

- **payment_gateways** ✅ → Penyedia layanan pembayaran eksternal dengan settings JSONB.
- **payment_methods** ✅ → Metode pembayaran spesifik per gateway dengan display order & settings.
- **payment_webhook_events** ✅ → Event tracking untuk webhook processing.
- **payment_transactions** ✅ → Transaction audit trail dengan status tracking.
- **payment_refunds** ✅ → Refund management dengan automated processing.

### **Site Configuration**

- **site_settings** → Pengaturan global situs dan aset media.

---

## 💳 Payment Integration ✅ **FULLY IMPLEMENTED**

### **Modern Payment Management System** 🎯

- **Sistem Gateway & Metode Pembayaran Dinamis:** ✅ Mendukung integrasi dengan berbagai penyedia pembayaran (PayPal, Bank Transfer, QRIS, COD) melalui tabel `payment_gateways`.
- **Metode Pembayaran Fleksibel:** ✅ Setiap gateway dapat menawarkan berbagai metode pembayaran yang dapat dikonfigurasi dan diaktifkan/dinonaktifkan melalui tabel `payment_methods`.
- **Logo Pembayaran:** ✅ Opsi pembayaran dapat menampilkan logo atau ikon yang relevan untuk memudahkan identifikasi pengguna.

### **Admin Payment Management Features** 🚀

- ✅ **Modern Tabbed Interface** → "Gateways" dan "Methods" tabs untuk organized navigation
- ✅ **Gateway Management** → Full CRUD dengan logo support, PayPal environment settings
- ✅ **Method Management** → Per-gateway methods dengan instructions, display order, QRIS support
- ✅ **Non-Developer Forms** → User-friendly forms untuk Bank Transfer dan COD settings
- ✅ **QRIS Image Support** → Upload dan preview QR code images untuk QRIS payments
- ✅ **Toggle Controls** → Modern toggle switches untuk enable/disable functionality
- ✅ **Environment Variable Check** → Built-in checker untuk PayPal credentials
- ✅ **JSON Settings Editor** → Advanced raw JSON editing untuk developer customization
- ✅ **Mobile-Responsive Design** → Full mobile support dengan horizontal scrolling tables
- ✅ **Icon-Only Actions** → Clean UI dengan icon-based action buttons

### **Payment Method Types Supported**

- ✅ **PayPal** → Sandbox/Production modes dengan environment variable setup
- ✅ **Bank Transfer** → Account details, instructions, bank information forms
- ✅ **QRIS** → QR code image upload dengan MediaPicker integration
- ✅ **Cash on Delivery (COD)** → Simple instructions dan delivery settings
- ✅ **Custom Methods** → JSON-based configuration untuk any payment provider

### **Database Enhancements**

- ✅ **payment_gateways.settings** → JSONB field untuk flexible gateway configuration
- ✅ **payment_methods.settings** → JSONB field untuk method-specific configurations
- ✅ **payment_methods.display_order** → Ordering untuk checkout display
- ✅ **Logo Media Integration** → Both gateways dan methods support logo uploads
- ✅ **Comprehensive Indexing** → Performance optimization untuk payment queries

---

## 🚚 Shipping Management System ✅ **FULLY IMPLEMENTED**

### **Modern Shipping Configuration** 🎯

- **Multi-Zone Shipping** → Geographic zone-based shipping dengan country coverage mapping.
- **Gateway Integration** → Multiple shipping providers (JNE, Pos Indonesia, custom carriers).
- **Flexible Method Management** → Per-gateway shipping methods dengan weight/price rules.
- **Cost Calculator API** → Real-time shipping cost calculation based on location & cart data.
- **Admin Interface** → Professional shipping management UI dengan modern controls.

### **Database Structure**

- **`shipping_zones`** → Geographic shipping zones dengan priority system.
- **`shipping_zone_countries`** → Country-to-zone mapping dengan ISO2 codes.
- **`shipping_gateways`** → Shipping service providers dengan configuration settings.
- **`shipping_methods`** → Delivery methods per gateway dengan pricing rules.

### **Admin Shipping Management Features** 🚀

- ✅ **Modern Zone Management** → Create/edit shipping zones dengan country coverage
- ✅ **Country Selection Interface** → Advanced multi-select dengan search functionality
- ✅ **Gateway Management** → Full CRUD untuk shipping service providers
- ✅ **Method Configuration** → Per-gateway shipping methods dengan flexible pricing
- ✅ **Cost Calculator** → Real-time shipping calculation dengan multiple factors
- ✅ **Settings Management** → Global shipping preferences dan configurations
- ✅ **Mobile-Responsive Design** → Full mobile support dengan optimized UI
- ✅ **API Integration Ready** → RESTful endpoints untuk all shipping operations

### **Shipping Features Implemented**

- ✅ **Zone-Based Shipping** → Assign countries ke specific shipping zones
- ✅ **Priority System** → Zone priority untuk overlapping coverage
- ✅ **Multiple Gateways** → Support multiple shipping providers simultaneously
- ✅ **Flexible Methods** → Weight-based, flat-rate, percentage-based pricing
- ✅ **Cost Calculation** → API endpoint untuk real-time shipping cost calculation
- ✅ **Admin Interface** → Professional management interface untuk all shipping settings
- ✅ **Country Database** → Complete world countries database dengan ISO codes
- ✅ **Search & Filter** → Advanced filtering untuk zones, gateways, dan methods

### **API Endpoints**

- `/api/admin/shipping/zones` → Zone management dengan country assignment
- `/api/admin/shipping/gateways` → Shipping provider configuration
- `/api/admin/shipping/methods` → Delivery method management
- `/api/admin/shipping/calculator` → Real-time cost calculation
- `/api/admin/shipping/summary` → Overview statistics dan data

### **Components Implemented**

- `ShippingZonesManager` → Zone management dengan country selection
- `ShippingGatewaysManager` → Gateway CRUD dengan modern UI
- `ShippingMethodsManager` → Method configuration interface
- `ShippingCalculator` → Cost calculation tool
- `CountrySelector` → Advanced country selection component
- `ZoneCreateForm` → Zone creation dengan country assignment

---

## 📦 Media Manager ✅ **FULLY ENHANCED & MODERN**

### **WordPress-Style Media Library** 🎯

- **Cloudflare R2** → Penyimpanan utama (murah, S3-compatible, fully integrated).
- **SEO-Friendly URL Structure** → `uploads/folder-path/YYYY/clean-filename.ext`
- **Folder-based Organization** → Hierarchical virtual folders dengan URL mirroring.
- **Advanced Upload System** → Drag & drop, batch upload, progress tracking.
- **Media Management** → Grid/list view, search, filter, bulk operations.
- **Modern CMS Interface** → Clean, professional UI dengan full icon integration.

### **Database Structure**

- **`media_folders`** → Virtual folder hierarchy dengan cascading delete.
- **`media`** → Enhanced dengan `folder_id` untuk organization.
- **Sistem Kategorisasi Media:** Media dikategorikan berdasarkan `media_type` dan folder organization.

### **Features Implemented**

- ✅ **SEO-Friendly URLs** → Clean, readable URLs mirror folder structure
- ✅ **Folder Tree Navigation** → Create, rename, delete folders
- ✅ **Drag & Drop Upload** → Multiple files, folder selection
- ✅ **Media Grid/List View** → Responsive layout, pagination
- ✅ **Search & Filter** → By type, folder, name
- ✅ **Bulk Operations** → Delete, move, update metadata
- ✅ **Usage Tracking** → Prevent deletion of used media
- ✅ **Breadcrumb Navigation** → Full folder path display
- ✅ **File Validation** → Type, size, security checks
- ✅ **Filename Sanitization** → Auto-cleanup special characters
- ✅ **Year-based Organization** → Automatic archival structure

### **🚀 NEW: Modern UI Enhancements**

- ✅ **Collapsible Sidebar** → Space-saving sidebar dengan smooth transitions
- ✅ **Enhanced Folder Management** → Full CRUD dengan FolderModal component
- ✅ **Professional Tooltips** → Rich tooltips untuk truncated folder names
- ✅ **Modern Loading States** → Branded spinners dengan smooth animations
- ✅ **Enhanced Empty States** → User-friendly empty states dengan actionable CTAs
- ✅ **Improved Grid/List Views** → Professional card designs dengan hover effects
- ✅ **Smart Selection UI** → Modern selection interface dengan bulk actions
- ✅ **Responsive Grid Layout** → Adaptive columns dari 2 sampai 8 cols
- ✅ **Professional Pagination** → Modern pagination dengan proper navigation
- ✅ **Lucide Icons Integration** → Consistent iconography throughout interface

### **URL Structure Examples**

```
Old: uploads/2025/08/-1a9a5265-b641-463f-818e-f327a-1756520267430-aa2zjt.jpg
New: uploads/products/phones/2025/iphone-15-pro-max.jpg

Folder "Posts" → uploads/posts/2025/blog-article-image.jpg
Folder "Products/Electronics" → uploads/products/electronics/2025/laptop-gaming.jpg
No folder, type "site-assets" → uploads/site-assets/2025/logo.png
```

### **API Endpoints**

- `/api/admin/media` → List, search, filter media
- `/api/admin/media/upload` → R2 upload with folder-based path generation
- `/api/admin/media/folders` → CRUD folder operations
- `/api/admin/media/bulk` → Bulk operations
- `/api/admin/media/[id]` → Single media CRUD

### **Components Implemented**

- `MediaManager` → Main WordPress-style interface
- `MediaGrid` → Grid/list view dengan selection
- `FolderTree` → Hierarchical navigation
- `UploadModal` → Advanced upload dengan progress
- `MediaDetailsPanel` → Media info dan editing

---

## 🎨 Frontend ✅ **ENHANCED & IMPLEMENTED**

### **Modern Admin Panel** 🚀

- **Next.js 14 (App Router)** → Full stack serverless dengan enhanced layout.
- **TailwindCSS + shadcn/ui** → UI modern & konsisten.
- **Heroicons** → Professional icon library untuk admin interface.
- **Mobile-First Responsive** → Perfect di semua device sizes.

### **Admin Layout Architecture**

- ✅ **ModernAdminLayout** → Flexbox-based layout dengan responsive sidebar
- ✅ **AdminSidebar** → Collapsible sidebar dengan auto-expand navigation
- ✅ **AdminHeader** → Top header dengan search, notifications, user menu
- ✅ **MobileMenuButton** → Mobile-optimized menu toggle
- ✅ **PageContainer** → Consistent page wrapper untuk semua admin pages

### **Admin Dashboard Features**

- ✅ **Modern Dashboard** → Overview stats, quick actions, recent activity
- ✅ **Responsive Navigation** → Auto-collapse sidebar di mobile
- ✅ **User Profile Integration** → Session management dengan NextAuth
- ✅ **Professional UI/UX** → Setara dengan Shopify/WordPress admin

### **Product Management Enhanced** 🛍️

- ✅ **WooCommerce-Style Product Editor** → Modern tabbed interface
- ✅ **Inline Variants Management** → No modals, direct table editing
- ✅ **Bulk Variant Operations** → Price, stock, status updates
- ✅ **Per-Variant Images** → Individual image management
- ✅ **Auto-Variant Generation** → From selected attributes
- ✅ **Sale Scheduling** → Start/end dates untuk variants
- ✅ **Import/Export** → JSON format untuk bulk management

### **🚀 NEW: Modern CMS Product Editor**

- ✅ **TinyMCE Rich Text Editor** → Professional content editing dengan self-hosted setup
- ✅ **Modern Card-Based Design** → Clean sections dengan gradients dan shadows
- ✅ **Full Icon Integration** → Lucide React icons untuk semua UI elements
- ✅ **Mobile-First Responsive** → Compact design untuk mobile, full features di desktop
- ✅ **Professional Form Components** → Enhanced inputs, selects, textareas dengan consistent styling
- ✅ **Tab Navigation Enhancement** → Icon-based tabs dengan badges dan status indicators
- ✅ **Image Management Integration** → Seamless MediaPicker integration dengan modern UI
- ✅ **Real-time Validation** → Inline validation dengan professional error states
- ✅ **Auto-save Indicators** → Loading states dan success feedback
- ✅ **Accessibility Improvements** → Proper ARIA labels dan keyboard navigation

### **Enhanced MediaPicker Integration**

- ✅ **Modern Modal Design** → Glass-morphism effects dengan backdrop blur
- ✅ **Professional Toolbar** → Search, filters, view toggles dengan icons
- ✅ **Enhanced Grid Experience** → Smooth hover effects, better selection states
- ✅ **Smart Loading States** → Branded spinners dengan informative messaging
- ✅ **Improved Upload Flow** → Better progress indication dan error handling

### **Components Architecture Enhanced**

- `ProductEditor` → Fully modernized tabbed interface dengan TinyMCE integration
- `MediaPicker` → Enhanced modal dengan modern UI patterns
- `InlineVariationsTab` → WooCommerce-style variant management dengan better UX
- `BulkVariantActions` → Multi-select operations dengan modern controls
- `VariantImagePicker` → Per-variant image selection dengan enhanced UI
- `AttributeSelector` → Dynamic attribute/value management dengan better UX
- `TinyMCEEditor` → Self-hosted rich text editor dengan custom styling

---

## ☁️ Infrastruktur ✅ **ENHANCED**

- **Vercel/Netlify** → Deploy Next.js serverless.
- **Cloudflare R2** ✅ → Storage (fully integrated dengan API).
- **PostgreSQL Cloud** → Database serverless (Railway/Neon/Supabase).

### **Cloudflare R2 Integration** 🔗

- ✅ **AWS SDK Integration** → `@aws-sdk/client-s3` dan `@aws-sdk/lib-storage`
- ✅ **Storage Service** → `@/lib/r2-storage.ts` untuk upload/delete operations
- ✅ **SEO-Friendly Path Generation** → `uploads/folder-path/YYYY/clean-filename.ext`
- ✅ **Folder-based Organization** → Mirror media manager folder structure
- ✅ **Filename Sanitization** → Auto-cleanup special characters untuk URL safety
- ✅ **Environment Configuration** → R2 credentials validation
- ✅ **Error Handling** → Comprehensive error catching dan logging

### **Cloudinary CDN Integration** 🖼️

- ✅ **On-Demand Optimization** → Fetch dari R2, transform, cache di Cloudinary
- ✅ **MediaOptimizer Service** → `@/lib/media-optimizer.ts` untuk URL generation
- ✅ **OptimizedImage Components** → React components dengan preset transformations
- ✅ **Fallback Support** → Auto-fallback ke R2 URLs jika Cloudinary unavailable
- ✅ **Preset Functions** → Thumbnail, product card, gallery optimizations
- ✅ **Security Configuration** → Cloudinary fetch domains dan restrictions setup

### **Storage Features**

- ✅ **Direct Upload** → Langsung ke R2 tanpa intermediary
- ✅ **File Validation** → Type, size, dan security checks
- ✅ **Metadata Storage** → Database records untuk tracking
- ✅ **Usage Tracking** → Prevent deletion of referenced files
- ✅ **Batch Operations** → Multiple file uploads dan deletions

---

## 🔐 Flow Utama

1.  **User login/register** → NextAuth (JWT).
2.  **Role cek** → RBAC middleware.
3.  **Manajemen Alamat** → Pengguna dapat menyimpan dan mengelola alamat untuk pengisian otomatis saat checkout.
4.  **Pilihan Produk & Varian** → Pengguna memilih produk dan varian spesifik (misal: ukuran, warna), dengan gambar, harga, dan stok yang sesuai.
5.  **Cart & Checkout** → Item (varian produk) ditambahkan ke keranjang. Proses checkout melibatkan pemilihan alamat tersimpan, opsi pengiriman, dan metode pembayaran. Order number di-generate di DB sesuai constraint 10 digit.
6.  **Pilihan Pengiriman Dinamis** ✅ → Pengguna memilih metode pengiriman berdasarkan zona geografis, shipping gateway, dan aturan biaya (flat-rate, weight-based, percentage-based).
7.  **Pilihan Pembayaran Dinamis** → Pengguna memilih metode pembayaran dari berbagai gateway yang tersedia (misal: PayPal, Bank Transfer, COD). Untuk PayPal tanpa webhook: create PayPal order → capture → update `payment_transactions` (status `captured`, `provider_transaction_id`, `meta` penuh) → set `orders.payment_status = 'completed'` dan link `orders.transaction_id`.
8.  **Order Confirmed** → Halaman sukses menampilkan `order_number` dan ringkasan item (termasuk varian image/label). Email/invoice (optional) menyusul.
9.  **Media Upload** ✅ → Gambar produk, varian, ulasan diunggah langsung ke Cloudflare R2 dengan folder organization.
10. **Review system** → Pengguna terdaftar atau tamu dapat memberikan ulasan produk dengan rating, komentar, dan kemampuan mengunggah gambar.
11. **Admin Management** ✅ → Modern admin panel dengan responsive layout, inline editing, bulk operations.

---

⚡ **IMPLEMENTATION STATUS:**

### **✅ COMPLETED FEATURES**

- ✅ **Semua open source** → Next.js, PostgreSQL, TailwindCSS, Lucide React
- ✅ **Scalable serverless architecture** → Vercel/Netlify ready
- ✅ **RBAC authentication** → NextAuth.js dengan multi-role support
- ✅ **Modern Admin Panel** → Responsive layout, collapsible sidebar, mobile-first
- ✅ **WordPress-style Media Manager** → SEO-friendly URLs, folder organization, drag & drop, bulk operations
- ✅ **Cloudflare R2 Storage** → Direct upload, file validation, usage tracking
- ✅ **WooCommerce-style Product Management** → Inline variants, bulk actions, sale scheduling
- ✅ **Enhanced Product Variants** → Auto-generation, per-variant images, import/export
- ✅ **Database Schema** → Comprehensive PostgreSQL schema dengan optimizations
- ✅ **Cloudinary CDN** → Image optimization dengan R2 integration
- ✅ **Session Management** → NextAuth dengan proper user ID tracking
- ✅ **Media Metadata** → Uploaded by tracking dan entity associations
- ✅ **Payment Management System** → Multi-gateway support dengan modern admin interface
- ✅ **QRIS Payment Integration** → QR code image upload dan preview system
- ✅ **PayPal Configuration** → Environment-based sandbox/production setup
- ✅ **Order Management System** → Complete order lifecycle management dengan full CRUD operations
- ✅ **Transaction Management** → Comprehensive payment transaction tracking dan refund processing
- ✅ **Modern Admin Interface** → Professional order & transaction management UI setara Shopify/WooCommerce
- ✅ **Shipping Management System** → Complete shipping configuration dengan zone-based delivery dan multi-gateway support
- ✅ **Shipping Calculator** → Real-time shipping cost calculation API dengan location-based pricing
- ✅ **Country Database Integration** → Complete world countries database dengan ISO code mapping

### **🚀 NEW: Modern CMS Features**

- ✅ **TinyMCE Rich Text Editor** → Self-hosted, GPL license, professional content editing
- ✅ **Modern UI Components** → Card-based design, gradients, shadows, glassmorphism
- ✅ **Lucide Icons Integration** → 500+ professional icons throughout admin interface
- ✅ **Enhanced MediaManager** → Collapsible sidebar, smart tooltips, modern pagination
- ✅ **Folder Management CRUD** → Full create, edit, delete dengan validation
- ✅ **Professional Loading States** → Branded spinners, smooth animations
- ✅ **Enhanced Empty States** → Actionable CTAs, helpful messaging
- ✅ **Mobile-First Design** → Compact layouts, touch-friendly controls
- ✅ **Accessibility Improvements** → ARIA labels, keyboard navigation, screen reader support
- ✅ **Modern Form Validation** → Real-time validation, inline error messages
- ✅ **Professional Tooltips** → Rich tooltips dengan proper positioning
- ✅ **Responsive Grid Systems** → Adaptive layouts dari mobile ke desktop

### **✅ COMPLETED: Order & Transaction Management**

- ✅ **Modern Order Management System** → Full CRUD operations dengan powerful admin interface
- ✅ **Transaction Management System** → Comprehensive transaction tracking dan management
- ✅ **Refund Management System** → Complete refund processing dengan status tracking
- ✅ **Modern Admin Interface** → Clean, professional UI setara dengan Shopify/WooCommerce
- ✅ **Advanced Filtering & Search** → Multi-criteria filtering dengan pagination
- ✅ **Real-time Status Management** → Dynamic status updates dengan color-coded badges
- ✅ **Full Edit Capabilities** → Complete order editing termasuk items, addresses, shipping
- ✅ **API Integration Ready** → RESTful API endpoints untuk semua operations

### **✅ COMPLETED: Customer Admin Management**

- ✅ **Customer List Management** → Advanced customer listing dengan search, filtering, dan pagination
- ✅ **Customer Detail View** → Comprehensive customer information dengan tabs (Info, Addresses, Orders, Activity)
- ✅ **Customer Edit Interface** → Full customer editing dengan address management
- ✅ **Address Management System** → CRUD operations untuk customer addresses
- ✅ **Country & State Selectors** → Advanced dropdown selectors dengan search functionality
- ✅ **Modern UI Components** → Professional customer management interface
- ✅ **API Endpoints** → Complete RESTful API untuk customer operations
- ✅ **Mobile-Friendly Design** → Responsive customer management interface
- ✅ **Data Aggregation** → Customer statistics (address count, order count, total spent)
- ✅ **Order History Integration** → Customer order tracking dan history
- ✅ **Address Validation** → Proper address form validation dan management

### **✅ COMPLETED: Enhanced Shipping Methods**

- ✅ **Restricted Items System** → Custom item restrictions untuk shipping methods
- ✅ **Restricted Products System** → Product-specific restrictions dengan ProductSelector
- ✅ **ProductSelector Component** → Advanced product selection dengan search dan image display
- ✅ **RestrictedItemsSelector** → Tabbed interface untuk custom items dan product selection
- ✅ **Enhanced UI** → Search functionality, image display, dan multi-select capabilities
- ✅ **API Integration** → Support untuk both `restricted_items` dan `restricted_products`
- ✅ **Database Schema** → Enhanced `shipping_methods` table dengan `restricted_products` JSONB column
- ✅ **Backward Compatibility** → Support untuk existing `restricted_items` functionality
- ✅ **Modern UX** → Professional interface setara dengan shipping zones country selection

### **✅ COMPLETED: Review Management System**

- ✅ **Complete Review System** → Comprehensive product review management dengan image upload support
- ✅ **Review Database Schema** → Enhanced tables: `reviews`, `review_images`, `review_helpful_votes`
- ✅ **Email Notification System** → Template-based email notifications untuk review requests dan responses
- ✅ **Review Analytics** → Advanced analytics dengan rating distribution, trends, dan statistics
- ✅ **Admin Review Management** → Professional review moderation interface dengan bulk operations
- ✅ **Customer Review Integration** → Customer-facing APIs untuk submitting dan viewing reviews
- ✅ **Media Integration** → Review images integrated dengan existing R2 media management
- ✅ **Import/Export System** → Bulk review operations dengan CSV/JSON support dan image handling
- ✅ **Product Integration** → Review counts dan ratings integrated dalam product management
- ✅ **Order Integration** → Review requests dari completed orders dengan "Request Review" functionality
- ✅ **Customer Integration** → Review history integrated dalam customer management system
- ✅ **Helpful Voting System** → Users dapat vote reviews sebagai helpful/unhelpful dengan IP tracking
- ✅ **Advanced Filtering** → Filter by status, rating, product, user, date range dengan search
- ✅ **Modern Table Interface** → Professional table layout dengan inline actions dan bulk operations
- ✅ **Review Moderation** → Approve, reject, edit reviews dengan admin response system

### **✅ COMPLETED: Product Detail System**

- ✅ **Product Detail Page** → Comprehensive product information display dengan modern layout
- ✅ **Enhanced Hono API** → Complete product detail endpoint dengan all related data
- ✅ **Database Schema Fixes** → Corrected queries untuk proper variant dan attribute relationships
- ✅ **Category Integration** → Single category display dengan proper foreign key relationship
- ✅ **Attribute System** → Attributes linked through variants dengan proper many-to-many relationships
- ✅ **Variant Management** → Complete variant display dengan SKU, price, stock, dan status
- ✅ **Gallery Images** → Product image gallery dengan proper media integration
- ✅ **Review Statistics** → Live review count dan average rating display
- ✅ **Featured Image** → Product featured image dengan Cloudflare R2 URL integration
- ✅ **API Response Structure** → Comprehensive JSON response dengan all product relationships
- ✅ **Frontend Interface** → Modern product detail UI dengan responsive design
- ✅ **Type Safety** → Complete TypeScript interfaces matching API response structure

### **📝 READY FOR IMPLEMENTATION**

- ✅ **Shipping Management System** → Complete zone-based shipping dengan multi-gateway support
- ✅ **Payment Management System** → PayPal, Bank Transfer, QRIS, COD dengan admin management
- ✅ **Review Management System** → Complete review system dengan analytics, moderation, dan integration
- 🔄 **Store frontend** → Customer-facing e-commerce interface dengan shipping & payment integration

### **🚀 PRODUCTION READY COMPONENTS**

- **Admin Dashboard** → Modern overview dengan stats dan quick actions
- **Product Editor** → Full CRUD dengan tabbed interface, TinyMCE integration
- **Media Manager** → Enterprise-grade file management dengan modern UI
- **User Management** → Role-based access control
- **API Endpoints** → RESTful API untuk semua operations
- **Rich Text Editor** → Self-hosted TinyMCE dengan GPL license
- **Folder Management** → Complete CRUD dengan validation dan error handling
- **Media Picker** → Modern modal dengan enhanced UX
- **Responsive Components** → Mobile-first design patterns
- **Icon System** → Lucide React integration dengan 500+ icons
- **Payment Management** → Complete admin interface untuk gateway & method configuration
- **QRIS Integration** → QR code upload, preview, dan MediaPicker integration
- **Order Management** → Full CRUD order system dengan advanced filtering dan search capabilities
- **Transaction Management** → Complete payment transaction tracking dengan refund processing
- **Order Editor** → Comprehensive order editing dengan items, addresses, dan status management
- **Transaction Details** → Professional transaction view dengan gateway integration dan refund history
- **Shipping Management** → Complete zone-based shipping configuration dengan country assignment
- **Shipping Calculator** → Real-time shipping cost calculation dengan location-based pricing
- **Gateway Configuration** → Shipping provider management dengan method configuration
- **Zone Management** → Geographic shipping zones dengan multi-country support
- **Method Configuration** → Flexible shipping method setup dengan pricing rules
- **Customer Management** → Complete customer admin interface dengan address management
- **Country & State Selectors** → Advanced dropdown selectors dengan search functionality
- **ProductSelector Component** → Reusable product selection dengan search dan image display
- **RestrictedItemsSelector** → Tabbed interface untuk shipping method restrictions
- **AddressManager Component** → Reusable address management dengan CRUD operations
- **CustomerCard Component** → Professional customer summary display
- **Enhanced API Endpoints** → Complete customer management API dengan aggregation
- **Review Management System** → Complete review admin interface dengan analytics dan moderation
- **Review Analytics Component** → Advanced analytics dengan charts dan statistics
- **Review Import/Export** → Bulk operations dengan CSV/JSON support dan image handling
- **Customer Review Integration** → APIs untuk customer review submission dan viewing
- **Email Notification System** → Template-based review request dan response emails
- **Product Detail Page** → Comprehensive product information dengan review integration
- **Enhanced Hono API** → Complete product detail endpoint dengan all relationships

---

## 🛠️ Quick Troubleshooting Guide

### **Common Issues & Solutions**

#### **1. NextAuth Port Conflicts**

```bash
# Problem: NextAuth redirects ke port 3000 instead of 3001
# Solution: Set environment variables
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-generated-secret-here
```

#### **2. Cloudinary 401 Errors**

```bash
# Problem: Cloudinary tidak bisa fetch R2 URLs
# Solution: Cloudinary Dashboard → Security Settings:
# 1. Remove "Fetched URL" dari Restricted image types
# 2. Add "img.plazaku.my.id" ke Allowed fetch domains
```

#### **3. uploaded_by Field Empty**

```bash
# Problem: Session user ID tidak tersimpan
# Solution: Check NextAuth callbacks di auth.ts:
# - jwt() callback harus set token.id = user.id
# - session() callback harus set session.user.id = token.id
```

#### **4. Media Upload Failures**

```bash
# Problem: R2 upload errors
# Solution: Verify .env.local:
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://img.plazaku.my.id
```

#### **5. Module Resolution Errors**

```bash
# Problem: Can't resolve '@/lib/...' imports
# Solution: Check tsconfig.json paths:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### **6. TinyMCE License Key Issues**

```bash
# Problem: "TinyMCE license key has not been provided"
# Solution: Add GPL license to Editor component:
<Editor
  licenseKey="gpl"
  // ... other props
/>

# For self-hosted setup:
# 1. Copy TinyMCE assets: cp -r node_modules/tinymce/* public/tinymce/
# 2. Set base_url in init config: base_url: '/tinymce'
# 3. Use licenseKey="gpl" prop for open source usage
```

#### **7. Folder Tree UI Issues**

```bash
# Problem: Folder names truncated, no collapse functionality
# Solution: Check FolderTree props and styling:
# 1. Ensure isCollapsed prop is passed correctly
# 2. Check totalMediaCount prop for counter accuracy
# 3. Verify tooltip implementation for long folder names
# 4. Confirm expand/collapse state management
```

#### **8. MediaPicker Modal Issues**

```bash
# Problem: MediaPicker not opening or styling broken
# Solution: Check modal implementation:
# 1. Verify dynamic import for SSR compatibility
# 2. Check z-index layering (z-50 for modals)
# 3. Ensure backdrop click handling works correctly
# 4. Verify loading states and error handling
```

### **Environment Setup Checklist**

#### **Required .env.local Variables:**

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-32-char-secret
AUTH_SECRET=your-32-char-secret

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-domain.com

# Cloudinary (Optional)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

#### **Development Commands:**

```bash
# Start admin panel
cd admin && pnpm run dev

# Check linting
cd admin && pnpm run lint

# Database migration
psql -d your_db -f .mysetting/schema.sql

# Install TinyMCE for rich text editing
cd admin && pnpm add @tinymce/tinymce-react tinymce

# Copy TinyMCE assets for self-hosting
cd admin && cp -r node_modules/tinymce/* public/tinymce/
```

#### **📦 Key Dependencies Added:**

```json
{
  "dependencies": {
    "@tinymce/tinymce-react": "^6.3.0",
    "tinymce": "^8.0.2",
    "lucide-react": "^0.303.0",
    "react-hot-toast": "^2.4.1"
  }
}
```

---

**🎯 PlazaCMS sekarang memiliki modern CMS foundation yang powerful dengan:**

✨ **Professional admin panel** setara Shopify/WordPress dengan modern UI/UX
🚀 **Rich text editing** dengan TinyMCE self-hosted integration  
📁 **Enterprise-grade media management** dengan folder organization
💳 **Complete payment system** dengan multi-gateway support dan modern admin interface
📦 **Full order management** dengan comprehensive CRUD operations dan advanced filtering
🔄 **Transaction management** dengan refund processing dan complete audit trail
🚚 **Complete shipping system** dengan zone-based delivery dan real-time cost calculation
🌍 **Geographic shipping zones** dengan country coverage mapping dan priority system
⚡ **Shipping cost calculator** dengan location-based pricing dan multiple factors
⭐ **Complete review management** dengan analytics, moderation, dan email notifications
📊 **Review analytics dashboard** dengan rating trends dan comprehensive statistics
💬 **Customer review integration** dengan image upload dan helpful voting system
🎯 **Product detail system** dengan comprehensive information dan review integration
🔗 **Enhanced API endpoints** dengan proper database relationships dan type safety
🎨 **Modern design system** dengan Lucide icons dan responsive layouts
📱 **Mobile-first approach** untuk optimal experience di semua devices
🔧 **Production-ready components** dengan comprehensive error handling

**Ready untuk development store frontend!** Order, Payment, Shipping & Review management sudah complete! 🎉
