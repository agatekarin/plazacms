# PlazaCMS Admin API - Hono + Hyperdrive

Admin API backend untuk PlazaCMS menggunakan Hono framework dengan Cloudflare Workers dan Hyperdrive untuk koneksi database PostgreSQL yang optimal.

## 🚀 Features

- **Hono Framework**: Fast, lightweight web framework untuk Cloudflare Workers
- **Hyperdrive**: Accelerated database connections untuk PostgreSQL
- **Authentication**: JWT-based auth dengan role-based access control
- **Type Safety**: Full TypeScript dengan Zod validation
- **Database**: PostgreSQL dengan connection pooling
- **CORS**: Configured untuk frontend integration

## 📁 Project Structure

```
admin-hono/
├── src/
│   ├── index.ts              # Main app entry point
│   ├── lib/
│   │   ├── auth.ts           # Authentication utilities
│   │   └── db.ts             # Database utilities
│   ├── routes/
│   │   ├── auth.ts           # Auth endpoints
│   │   └── attributes.ts     # Attributes CRUD
│   └── types/
│       └── index.ts          # TypeScript types & schemas
├── wrangler.toml             # Cloudflare Workers config
├── package.json
└── tsconfig.json
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL database
- Cloudflare account (untuk production)

### Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Server akan berjalan di `http://127.0.0.1:8787`

### Environment Variables
Update `wrangler.toml` untuk konfigurasi:
- `JWT_SECRET`: Secret key untuk JWT tokens
- `ADMIN_EMAIL`: Default admin email
- `localConnectionString`: PostgreSQL connection string untuk development

## 📚 API Endpoints

### Health Check
```
GET / 
```

### Authentication
```
POST /api/auth/login
POST /api/auth/logout  
GET /api/auth/me
```

### Attributes (Admin only)
```
GET /api/admin/attributes              # List all attributes
POST /api/admin/attributes             # Create attribute
GET /api/admin/attributes/:id          # Get specific attribute
PUT /api/admin/attributes/:id          # Update attribute
DELETE /api/admin/attributes/:id       # Delete attribute
POST /api/admin/attributes/:id/values  # Add value to attribute
DELETE /api/admin/attributes/:id/values/:valueId  # Delete value
```

## 🔐 Authentication

API menggunakan JWT tokens dengan HTTP-only cookies. Semua admin endpoints memerlukan:
1. Valid JWT token
2. User role = "admin"

### Login Example
```bash
curl -X POST http://127.0.0.1:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@plazacms.com","password":"password"}'
```

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Product Attributes
```sql
CREATE TABLE product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID REFERENCES product_attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy
```

Pastikan Hyperdrive sudah dikonfigurasi di Cloudflare dashboard dengan ID yang sama di `wrangler.toml`.

## 🔄 Migration Status

### ✅ Completed
- [x] Project setup dengan Hono + Hyperdrive
- [x] Database layer dengan postgres client
- [x] Authentication system dengan JWT
- [x] Attributes CRUD API
- [x] Type safety dengan TypeScript + Zod

### 🚧 In Progress
- [ ] Categories API
- [ ] Products API  
- [ ] Users management API
- [ ] Orders API
- [ ] Media upload API

### 📋 Planned
- [ ] Payment gateways integration
- [ ] Shipping calculator
- [ ] Location services
- [ ] Bulk operations
- [ ] Frontend integration

## 🧪 Testing

Test endpoints menggunakan curl atau Postman:

```bash
# Health check
curl http://127.0.0.1:8787

# Get attributes (requires auth)
curl http://127.0.0.1:8787/api/admin/attributes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📝 Notes

- Development menggunakan local PostgreSQL connection
- Production menggunakan Hyperdrive untuk optimized connections
- CORS dikonfigurasi untuk admin frontend di localhost:3001
- Error handling dan logging sudah terintegrasi
