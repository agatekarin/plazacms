-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';
-- public.product_attributes definition

-- Drop table

-- DROP TABLE public.product_attributes;

CREATE TABLE public.product_attributes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_attributes_name_key UNIQUE (name),
	CONSTRAINT product_attributes_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_product_attributes_name ON public.product_attributes USING btree (name);

-- Table Triggers

create trigger trg_set_updated_at_product_attributes before
update
    on
    public.product_attributes for each row execute function set_updated_at();


-- public.shipping_zones definition

-- Drop table

-- DROP TABLE public.shipping_zones;

CREATE TABLE public.shipping_zones (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT shipping_zones_name_key UNIQUE (name),
	CONSTRAINT shipping_zones_pkey PRIMARY KEY (id)
);

-- Table Triggers

create trigger trg_set_updated_at_shipping_zones before
update
    on
    public.shipping_zones for each row execute function set_updated_at();


-- public.tax_classes definition

-- Drop table

-- DROP TABLE public.tax_classes;

CREATE TABLE public.tax_classes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	rate numeric(5, 4) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tax_classes_name_key UNIQUE (name),
	CONSTRAINT tax_classes_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_tax_classes_name ON public.tax_classes USING btree (name);

-- Table Triggers

create trigger trg_set_updated_at_tax_classes before
update
    on
    public.tax_classes for each row execute function set_updated_at();


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NULL,
	email text NOT NULL,
	email_verified timestamptz NULL,
	image text NULL,
	"role" text DEFAULT 'customer'::text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'vendor'::text, 'customer'::text, 'guest'::text])))
);
CREATE INDEX idx_users_email ON public.users USING btree (email);

-- Table Triggers

create trigger trg_set_updated_at_users before
update
    on
    public.users for each row execute function set_updated_at();


-- public.verification_tokens definition

-- Drop table

-- DROP TABLE public.verification_tokens;

CREATE TABLE public.verification_tokens (
	identifier text NOT NULL,
	"token" text NOT NULL,
	expires timestamptz NOT NULL,
	CONSTRAINT verification_tokens_pkey PRIMARY KEY (identifier, token),
	CONSTRAINT verification_tokens_token_key UNIQUE (token)
);


-- public.accounts definition

-- Drop table

-- DROP TABLE public.accounts;

CREATE TABLE public.accounts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	"type" text NOT NULL,
	provider text NOT NULL,
	provider_account_id text NOT NULL,
	refresh_token text NULL,
	access_token text NULL,
	expires_at int8 NULL,
	token_type text NULL,
	"scope" text NULL,
	id_token text NULL,
	session_state text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT accounts_pkey PRIMARY KEY (id),
	CONSTRAINT accounts_provider_provider_account_id_key UNIQUE (provider, provider_account_id),
	CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_accounts_user_id ON public.accounts USING btree (user_id);

-- Table Triggers

create trigger trg_set_updated_at_accounts before
update
    on
    public.accounts for each row execute function set_updated_at();


-- public.carts definition

-- Drop table

-- DROP TABLE public.carts;

CREATE TABLE public.carts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	session_id text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT carts_pkey PRIMARY KEY (id),
	CONSTRAINT carts_session_id_key UNIQUE (session_id),
	CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_carts_session_id ON public.carts USING btree (session_id);
CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);

-- Table Triggers

create trigger trg_set_updated_at_carts before
update
    on
    public.carts for each row execute function set_updated_at();


-- public.media definition

-- Drop table

-- DROP TABLE public.media;

CREATE TABLE public.media (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	filename text NOT NULL,
	file_url text NOT NULL,
	file_type text NOT NULL,
	"size" int4 NULL,
	alt_text text NULL,
	uploaded_by uuid NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	media_type text NULL,
	entity_id uuid NULL,
	CONSTRAINT media_media_type_check CHECK ((media_type = ANY (ARRAY['product_image'::text, 'product_variant_image'::text, 'user_profile'::text, 'review_image'::text, 'other'::text, 'site_asset'::text]))),
	CONSTRAINT media_pkey PRIMARY KEY (id),
	CONSTRAINT media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_media_entity_id ON public.media USING btree (entity_id);
CREATE INDEX idx_media_media_type ON public.media USING btree (media_type);

-- Table Triggers

create trigger trg_set_updated_at_media before
update
    on
    public.media for each row execute function set_updated_at();


-- public.payment_gateways definition

-- Drop table

-- DROP TABLE public.payment_gateways;

CREATE TABLE public.payment_gateways (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	slug text NOT NULL,
	description text NULL,
	is_enabled bool DEFAULT true NOT NULL,
	settings jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	logo_media_id uuid NULL,
	CONSTRAINT payment_gateways_name_key UNIQUE (name),
	CONSTRAINT payment_gateways_pkey PRIMARY KEY (id),
	CONSTRAINT payment_gateways_slug_key UNIQUE (slug),
	CONSTRAINT payment_gateways_logo_media_id_fkey FOREIGN KEY (logo_media_id) REFERENCES public.media(id) ON DELETE SET NULL
);
CREATE INDEX idx_payment_gateways_slug ON public.payment_gateways USING btree (slug);

-- Table Triggers

create trigger trg_set_updated_at_payment_gateways before
update
    on
    public.payment_gateways for each row execute function set_updated_at();


-- public.payment_methods definition

-- Drop table

-- DROP TABLE public.payment_methods;

CREATE TABLE public.payment_methods (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	gateway_id uuid NOT NULL,
	"name" text NOT NULL,
	slug text NOT NULL,
	description text NULL,
	is_enabled bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	logo_media_id uuid NULL,
	CONSTRAINT payment_methods_gateway_id_slug_key UNIQUE (gateway_id, slug),
	CONSTRAINT payment_methods_pkey PRIMARY KEY (id),
	CONSTRAINT payment_methods_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
	CONSTRAINT payment_methods_logo_media_id_fkey FOREIGN KEY (logo_media_id) REFERENCES public.media(id) ON DELETE SET NULL
);
CREATE INDEX idx_payment_methods_gateway_id ON public.payment_methods USING btree (gateway_id);
CREATE INDEX idx_payment_methods_slug ON public.payment_methods USING btree (slug);

-- Table Triggers

create trigger trg_set_updated_at_payment_methods before
update
    on
    public.payment_methods for each row execute function set_updated_at();


-- public.product_attribute_values definition

-- Drop table

-- DROP TABLE public.product_attribute_values;

CREATE TABLE public.product_attribute_values (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	attribute_id uuid NOT NULL,
	value text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_attribute_values_attribute_id_value_key UNIQUE (attribute_id, value),
	CONSTRAINT product_attribute_values_pkey PRIMARY KEY (id),
	CONSTRAINT product_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.product_attributes(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_attribute_values_attribute_id ON public.product_attribute_values USING btree (attribute_id);

-- Table Triggers

create trigger trg_set_updated_at_product_attribute_values before
update
    on
    public.product_attribute_values for each row execute function set_updated_at();


-- public.sessions definition

-- Drop table

-- DROP TABLE public.sessions;

CREATE TABLE public.sessions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	expires timestamptz NOT NULL,
	session_token text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT sessions_pkey PRIMARY KEY (id),
	CONSTRAINT sessions_session_token_key UNIQUE (session_token),
	CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);

-- Table Triggers

create trigger trg_set_updated_at_sessions before
update
    on
    public.sessions for each row execute function set_updated_at();


-- public.shipping_carriers definition

-- Drop table

-- DROP TABLE public.shipping_carriers;

CREATE TABLE public.shipping_carriers (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	tracking_url_template text NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	logo_media_id uuid NULL,
	CONSTRAINT shipping_carriers_name_key UNIQUE (name),
	CONSTRAINT shipping_carriers_pkey PRIMARY KEY (id),
	CONSTRAINT shipping_carriers_logo_media_id_fkey FOREIGN KEY (logo_media_id) REFERENCES public.media(id) ON DELETE SET NULL
);

-- Table Triggers

create trigger trg_set_updated_at_shipping_carriers before
update
    on
    public.shipping_carriers for each row execute function set_updated_at();


-- public.shipping_methods definition

-- Drop table

-- DROP TABLE public.shipping_methods;

CREATE TABLE public.shipping_methods (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	method_type text NOT NULL,
	description text NULL,
	is_enabled bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	logo_media_id uuid NULL,
	CONSTRAINT shipping_methods_method_type_check CHECK ((method_type = ANY (ARRAY['flat_rate'::text, 'free_shipping'::text, 'local_pickup'::text, 'table_rate'::text]))),
	CONSTRAINT shipping_methods_pkey PRIMARY KEY (id),
	CONSTRAINT shipping_methods_logo_media_id_fkey FOREIGN KEY (logo_media_id) REFERENCES public.media(id) ON DELETE SET NULL
);
CREATE INDEX idx_shipping_methods_method_type ON public.shipping_methods USING btree (method_type);

-- Table Triggers

create trigger trg_set_updated_at_shipping_methods before
update
    on
    public.shipping_methods for each row execute function set_updated_at();


-- public.shipping_zone_locations definition

-- Drop table

-- DROP TABLE public.shipping_zone_locations;

CREATE TABLE public.shipping_zone_locations (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	zone_id uuid NOT NULL,
	location_type text NOT NULL,
	location_code text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT shipping_zone_locations_pkey PRIMARY KEY (id),
	CONSTRAINT shipping_zone_locations_zone_id_location_type_location_code_key UNIQUE (zone_id, location_type, location_code),
	CONSTRAINT shipping_zone_locations_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id) ON DELETE CASCADE
);
CREATE INDEX idx_shipping_zone_locations_zone_id ON public.shipping_zone_locations USING btree (zone_id);

-- Table Triggers

create trigger trg_set_updated_at_shipping_zone_locations before
update
    on
    public.shipping_zone_locations for each row execute function set_updated_at();


-- public.shipping_zone_methods definition

-- Drop table

-- DROP TABLE public.shipping_zone_methods;

CREATE TABLE public.shipping_zone_methods (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	zone_id uuid NOT NULL,
	method_id uuid NOT NULL,
	"cost" numeric(10, 2) DEFAULT 0.00 NOT NULL,
	min_order_amount numeric(10, 2) DEFAULT 0.00 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	enable_free_shipping_threshold bool DEFAULT false NULL,
	free_shipping_threshold_amount numeric(10, 2) NULL,
	CONSTRAINT shipping_zone_methods_pkey PRIMARY KEY (id),
	CONSTRAINT shipping_zone_methods_zone_id_method_id_key UNIQUE (zone_id, method_id),
	CONSTRAINT shipping_zone_methods_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.shipping_methods(id) ON DELETE CASCADE,
	CONSTRAINT shipping_zone_methods_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id) ON DELETE CASCADE
);
CREATE INDEX idx_shipping_zone_methods_method_id ON public.shipping_zone_methods USING btree (method_id);
CREATE INDEX idx_shipping_zone_methods_zone_id ON public.shipping_zone_methods USING btree (zone_id);

-- Table Triggers

create trigger trg_set_updated_at_shipping_zone_methods before
update
    on
    public.shipping_zone_methods for each row execute function set_updated_at();


-- public.site_settings definition

-- Drop table

-- DROP TABLE public.site_settings;

CREATE TABLE public.site_settings (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	site_name text DEFAULT 'PlazaCMS'::text NOT NULL,
	site_description text NULL,
	contact_email text NULL,
	contact_phone text NULL,
	address_line1 text NULL,
	address_line2 text NULL,
	city text NULL,
	state text NULL,
	postal_code text NULL,
	country text NULL,
	currency_code text DEFAULT 'USD'::text NOT NULL,
	currency_symbol text DEFAULT '$'::text NOT NULL,
	logo_media_id uuid NULL,
	favicon_media_id uuid NULL,
	default_product_image_id uuid NULL,
	default_user_avatar_id uuid NULL,
	social_share_image_id uuid NULL,
	other_settings jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT site_settings_pkey PRIMARY KEY (id),
	CONSTRAINT site_settings_default_product_image_id_fkey FOREIGN KEY (default_product_image_id) REFERENCES public.media(id) ON DELETE SET NULL,
	CONSTRAINT site_settings_default_user_avatar_id_fkey FOREIGN KEY (default_user_avatar_id) REFERENCES public.media(id) ON DELETE SET NULL,
	CONSTRAINT site_settings_favicon_media_id_fkey FOREIGN KEY (favicon_media_id) REFERENCES public.media(id) ON DELETE SET NULL,
	CONSTRAINT site_settings_logo_media_id_fkey FOREIGN KEY (logo_media_id) REFERENCES public.media(id) ON DELETE SET NULL,
	CONSTRAINT site_settings_social_share_image_id_fkey FOREIGN KEY (social_share_image_id) REFERENCES public.media(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX idx_site_settings_single_row ON public.site_settings USING btree ((true));

-- Table Triggers

create trigger trg_set_updated_at_site_settings before
update
    on
    public.site_settings for each row execute function set_updated_at();


-- public.user_addresses definition

-- Drop table

-- DROP TABLE public.user_addresses;

CREATE TABLE public.user_addresses (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	address_name text NULL,
	recipient_name text NULL,
	phone_number text NULL,
	street_address text NOT NULL,
	city text NOT NULL,
	state text NULL,
	postal_code text NOT NULL,
	country text NOT NULL,
	is_default bool DEFAULT false NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
	CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_addresses_user_id ON public.user_addresses USING btree (user_id);

-- Table Triggers

create trigger trg_set_updated_at_user_addresses before
update
    on
    public.user_addresses for each row execute function set_updated_at();


-- public.categories definition

-- Drop table

-- DROP TABLE public.categories;

CREATE TABLE public.categories (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	slug text NOT NULL,
	description text NULL,
	parent_id uuid NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	image_id uuid NULL,
	CONSTRAINT categories_name_key UNIQUE (name),
	CONSTRAINT categories_pkey PRIMARY KEY (id),
	CONSTRAINT categories_slug_key UNIQUE (slug),
	CONSTRAINT categories_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL,
	CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

-- Table Triggers

create trigger trg_set_updated_at_categories before
update
    on
    public.categories for each row execute function set_updated_at();


-- public.orders definition

-- Drop table

-- DROP TABLE public.orders;

CREATE TABLE public.orders (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	status text DEFAULT 'pending'::text NOT NULL,
	total_amount numeric(10, 2) NOT NULL,
	currency text DEFAULT 'USD'::text NOT NULL,
	shipping_address jsonb NOT NULL,
	billing_address jsonb NOT NULL,
	payment_method text NULL,
	payment_status text DEFAULT 'pending'::text NOT NULL,
	transaction_id text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	shipping_provider text NULL,
	shipping_method text NULL,
	shipping_cost numeric(10, 2) DEFAULT 0.00 NOT NULL,
	tracking_number text NULL,
	payment_method_id uuid NULL,
	shipping_zone_method_id uuid NULL,
	carrier_id uuid NULL,
	CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text]))),
	CONSTRAINT orders_pkey PRIMARY KEY (id),
	CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text]))),
	CONSTRAINT orders_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id) ON DELETE SET NULL,
	CONSTRAINT orders_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL,
	CONSTRAINT orders_shipping_zone_method_id_fkey FOREIGN KEY (shipping_zone_method_id) REFERENCES public.shipping_zone_methods(id) ON DELETE SET NULL,
	CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_orders_carrier_id ON public.orders USING btree (carrier_id);
CREATE INDEX idx_orders_payment_method_id ON public.orders USING btree (payment_method_id);
CREATE INDEX idx_orders_shipping_zone_method_id ON public.orders USING btree (shipping_zone_method_id);
CREATE INDEX idx_orders_status ON public.orders USING btree (status, payment_status, created_at DESC);
CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);

-- Table Triggers

create trigger trg_set_updated_at_orders before
update
    on
    public.orders for each row execute function set_updated_at();


-- public.products definition

-- Drop table

-- DROP TABLE public.products;

CREATE TABLE public.products (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	slug text NOT NULL,
	description text NULL,
	regular_price numeric(10, 2) NOT NULL,
	currency text DEFAULT 'USD'::text NOT NULL,
	stock int4 DEFAULT 0 NOT NULL,
	category_id uuid NULL,
	vendor_id uuid NULL,
	status text DEFAULT 'draft'::text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	weight numeric(10, 2) DEFAULT 0.00 NOT NULL,
	sku text NULL,
	sale_price numeric(10, 2) NULL,
	sale_start_date timestamptz NULL,
	sale_end_date timestamptz NULL,
	tax_class_id uuid NULL,
	CONSTRAINT products_pkey PRIMARY KEY (id),
	CONSTRAINT products_sku_key UNIQUE (sku),
	CONSTRAINT products_slug_key UNIQUE (slug),
	CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['published'::text, 'private'::text, 'draft'::text, 'archived'::text]))),
	CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
	CONSTRAINT products_tax_class_id_fkey FOREIGN KEY (tax_class_id) REFERENCES public.tax_classes(id) ON DELETE SET NULL,
	CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);
CREATE INDEX idx_products_slug ON public.products USING btree (slug);
CREATE INDEX idx_products_status ON public.products USING btree (status);
CREATE INDEX idx_products_vendor_id ON public.products USING btree (vendor_id);

-- Table Triggers

create trigger trg_set_updated_at_products before
update
    on
    public.products for each row execute function set_updated_at();


-- public.reviews definition

-- Drop table

-- DROP TABLE public.reviews;

CREATE TABLE public.reviews (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	product_id uuid NOT NULL,
	user_id uuid NULL,
	rating int4 NOT NULL,
	"comment" text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	reviewer_name text NULL,
	reviewer_email text NULL,
	review_type text DEFAULT 'user'::text NOT NULL,
	CONSTRAINT reviews_pkey PRIMARY KEY (id),
	CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
	CONSTRAINT reviews_review_type_check CHECK ((review_type = ANY (ARRAY['user'::text, 'guest'::text, 'imported'::text]))),
	CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
	CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_reviews_product_created ON public.reviews USING btree (product_id, created_at DESC);
CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);
CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);

-- Table Triggers

create trigger trg_set_updated_at_reviews before
update
    on
    public.reviews for each row execute function set_updated_at();


-- public.shipping_method_carrier definition

-- Drop table

-- DROP TABLE public.shipping_method_carrier;

CREATE TABLE public.shipping_method_carrier (
	method_id uuid NOT NULL,
	carrier_id uuid NOT NULL,
	CONSTRAINT shipping_method_carrier_pkey PRIMARY KEY (method_id, carrier_id),
	CONSTRAINT shipping_method_carrier_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id) ON DELETE CASCADE,
	CONSTRAINT shipping_method_carrier_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.shipping_methods(id) ON DELETE CASCADE
);
CREATE INDEX idx_shipping_method_carrier_carrier_id ON public.shipping_method_carrier USING btree (carrier_id);
CREATE INDEX idx_shipping_method_carrier_method_id ON public.shipping_method_carrier USING btree (method_id);


-- public.shipping_method_rates definition

-- Drop table

-- DROP TABLE public.shipping_method_rates;

CREATE TABLE public.shipping_method_rates (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	zone_method_id uuid NOT NULL,
	min_value numeric(10, 2) NOT NULL,
	max_value numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	rate_type text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT shipping_method_rates_pkey PRIMARY KEY (id),
	CONSTRAINT shipping_method_rates_rate_type_check CHECK ((rate_type = ANY (ARRAY['weight'::text, 'price'::text, 'item_count'::text]))),
	CONSTRAINT shipping_method_rates_zone_method_id_fkey FOREIGN KEY (zone_method_id) REFERENCES public.shipping_zone_methods(id) ON DELETE CASCADE
);
CREATE INDEX idx_shipping_method_rates_rate_type ON public.shipping_method_rates USING btree (rate_type);
CREATE INDEX idx_shipping_method_rates_zone_method_id ON public.shipping_method_rates USING btree (zone_method_id);

-- Table Triggers

create trigger trg_set_updated_at_shipping_method_rates before
update
    on
    public.shipping_method_rates for each row execute function set_updated_at();


-- public.product_images definition

-- Drop table

-- DROP TABLE public.product_images;

CREATE TABLE public.product_images (
	product_id uuid NOT NULL,
	media_id uuid NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	CONSTRAINT product_images_pkey PRIMARY KEY (product_id, media_id),
	CONSTRAINT product_images_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE,
	CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);


-- public.product_variants definition

-- Drop table

-- DROP TABLE public.product_variants;

CREATE TABLE public.product_variants (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	product_id uuid NOT NULL,
	sku text NULL,
	stock int4 DEFAULT 0 NOT NULL,
	status text DEFAULT 'draft'::text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	weight numeric(10, 2) DEFAULT 0.00 NOT NULL,
	regular_price numeric(10, 2) NULL,
	sale_price numeric(10, 2) NULL,
	sale_start_date timestamptz NULL,
	sale_end_date timestamptz NULL,
	CONSTRAINT product_variants_pkey PRIMARY KEY (id),
	CONSTRAINT product_variants_sku_key UNIQUE (sku),
	CONSTRAINT product_variants_status_check CHECK ((status = ANY (ARRAY['published'::text, 'private'::text, 'draft'::text, 'archived'::text]))),
	CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants USING btree (sku);
CREATE INDEX idx_product_variants_status ON public.product_variants USING btree (product_id, status);

-- Table Triggers

create trigger trg_set_updated_at_product_variants before
update
    on
    public.product_variants for each row execute function set_updated_at();


-- public.review_images definition

-- Drop table

-- DROP TABLE public.review_images;

CREATE TABLE public.review_images (
	review_id uuid NOT NULL,
	media_id uuid NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	CONSTRAINT review_images_pkey PRIMARY KEY (review_id, media_id),
	CONSTRAINT review_images_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE,
	CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE
);
CREATE INDEX idx_review_images_review_id ON public.review_images USING btree (review_id);


-- public.cart_items definition

-- Drop table

-- DROP TABLE public.cart_items;

CREATE TABLE public.cart_items (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	cart_id uuid NOT NULL,
	quantity int4 NOT NULL,
	price_at_add numeric(10, 2) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	product_variant_id uuid DEFAULT uuid_nil() NOT NULL,
	CONSTRAINT cart_items_cart_id_product_variant_id_key UNIQUE (cart_id, product_variant_id),
	CONSTRAINT cart_items_pkey PRIMARY KEY (id),
	CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0)),
	CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE,
	CONSTRAINT cart_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE
);

-- Table Triggers

create trigger trg_set_updated_at_cart_items before
update
    on
    public.cart_items for each row execute function set_updated_at();


-- public.order_items definition

-- Drop table

-- DROP TABLE public.order_items;

CREATE TABLE public.order_items (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	order_id uuid NOT NULL,
	product_name text NOT NULL,
	product_price numeric(10, 2) NOT NULL,
	quantity int4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	product_variant_id uuid DEFAULT uuid_nil() NOT NULL,
	CONSTRAINT order_items_order_id_product_variant_id_key UNIQUE (order_id, product_variant_id),
	CONSTRAINT order_items_pkey PRIMARY KEY (id),
	CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
	CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
	CONSTRAINT order_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT
);

-- Table Triggers

create trigger trg_set_updated_at_order_items before
update
    on
    public.order_items for each row execute function set_updated_at();


-- public.product_variant_attribute_values definition

-- Drop table

-- DROP TABLE public.product_variant_attribute_values;

CREATE TABLE public.product_variant_attribute_values (
	product_variant_id uuid NOT NULL,
	attribute_value_id uuid NOT NULL,
	CONSTRAINT product_variant_attribute_values_pkey PRIMARY KEY (product_variant_id, attribute_value_id),
	CONSTRAINT product_variant_attribute_values_attribute_value_id_fkey FOREIGN KEY (attribute_value_id) REFERENCES public.product_attribute_values(id) ON DELETE CASCADE,
	CONSTRAINT product_variant_attribute_values_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_variant_attribute_values_attribute_value_id ON public.product_variant_attribute_values USING btree (attribute_value_id);
CREATE INDEX idx_product_variant_attribute_values_product_variant_id ON public.product_variant_attribute_values USING btree (product_variant_id);


-- public.product_variant_images definition

-- Drop table

-- DROP TABLE public.product_variant_images;

CREATE TABLE public.product_variant_images (
	product_variant_id uuid NOT NULL,
	media_id uuid NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	CONSTRAINT product_variant_images_pkey PRIMARY KEY (product_variant_id, media_id),
	CONSTRAINT product_variant_images_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE,
	CONSTRAINT product_variant_images_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_variant_images_product_variant_id ON public.product_variant_images USING btree (product_variant_id);



-- DROP FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.uuid_generate_v1();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;

-- DROP FUNCTION public.uuid_generate_v1mc();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;

-- DROP FUNCTION public.uuid_generate_v3(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;

-- DROP FUNCTION public.uuid_generate_v4();

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;

-- DROP FUNCTION public.uuid_generate_v5(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;

-- DROP FUNCTION public.uuid_nil();

CREATE OR REPLACE FUNCTION public.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;

-- DROP FUNCTION public.uuid_ns_dns();

CREATE OR REPLACE FUNCTION public.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;

-- DROP FUNCTION public.uuid_ns_oid();

CREATE OR REPLACE FUNCTION public.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;

-- DROP FUNCTION public.uuid_ns_url();

CREATE OR REPLACE FUNCTION public.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;

-- DROP FUNCTION public.uuid_ns_x500();

CREATE OR REPLACE FUNCTION public.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;