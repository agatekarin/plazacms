-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP SEQUENCE public.cities_id_seq;

CREATE SEQUENCE public.cities_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.countries_id_seq;

CREATE SEQUENCE public.countries_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.order_global_seq;

CREATE SEQUENCE public.order_global_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.shipping_settings_id_seq;

CREATE SEQUENCE public.shipping_settings_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.states_id_seq;

CREATE SEQUENCE public.states_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- public.countries definition

-- Drop table

-- DROP TABLE public.countries;

CREATE TABLE public.countries (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	iso3 bpchar(3) NOT NULL,
	iso2 bpchar(2) NOT NULL,
	phone_code varchar(255) NULL,
	capital varchar(255) NULL,
	currency varchar(255) NULL,
	currency_name varchar(255) NULL,
	currency_symbol varchar(255) NULL,
	region varchar(255) NULL,
	subregion varchar(255) NULL,
	latitude numeric(10, 8) NULL,
	longitude numeric(11, 8) NULL,
	emoji varchar(191) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT countries_iso2_key UNIQUE (iso2),
	CONSTRAINT countries_iso3_key UNIQUE (iso3),
	CONSTRAINT countries_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_countries_iso2 ON public.countries USING btree (iso2);
CREATE INDEX idx_countries_iso3 ON public.countries USING btree (iso3);
CREATE INDEX idx_countries_name ON public.countries USING btree (name);
CREATE INDEX idx_countries_region ON public.countries USING btree (region);

-- Table Triggers

create trigger trg_set_updated_at_countries before
update
    on
    public.countries for each row execute function set_updated_at();


-- public.email_settings definition

-- Drop table

-- DROP TABLE public.email_settings;

CREATE TABLE public.email_settings (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	from_name varchar(255) DEFAULT 'PlazaCMS'::character varying NOT NULL,
	from_email varchar(255) DEFAULT 'onboarding@resend.dev'::character varying NOT NULL,
	reply_to varchar(255) NULL,
	resend_api_key text NULL,
	smtp_host varchar(255) NULL,
	smtp_port int4 DEFAULT 587 NULL,
	smtp_username varchar(255) NULL,
	smtp_password varchar(255) NULL,
	smtp_encryption varchar(10) DEFAULT 'tls'::character varying NULL,
	provider varchar(20) DEFAULT 'resend'::character varying NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	webhook_url varchar(500) NULL,
	webhook_secret varchar(255) NULL,
	webhook_events _text NULL,
	CONSTRAINT email_settings_pkey PRIMARY KEY (id)
);


-- public.email_templates definition

-- Drop table

-- DROP TABLE public.email_templates;

CREATE TABLE public.email_templates (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	subject varchar(500) NOT NULL,
	"content" text NOT NULL,
	"type" varchar(50) NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	category text DEFAULT 'transactional'::text NULL,
	html_content text NULL,
	text_content text NULL,
	preview_text text NULL,
	from_name text DEFAULT 'PlazaCMS'::text NULL,
	from_email text DEFAULT 'noreply@plazacms.com'::text NULL,
	reply_to text NULL,
	tags jsonb DEFAULT '[]'::jsonb NULL,
	"version" int4 DEFAULT 1 NULL,
	is_default bool DEFAULT false NULL,
	template_data jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT email_templates_category_check CHECK ((category = ANY (ARRAY['transactional'::text, 'marketing'::text, 'system'::text, 'custom'::text]))),
	CONSTRAINT email_templates_pkey PRIMARY KEY (id),
	CONSTRAINT email_templates_type_check CHECK (((type)::text = ANY ((ARRAY['review_request'::character varying, 'review_reminder'::character varying, 'review_approved'::character varying, 'review_rejected'::character varying, 'order_confirmation'::character varying, 'order_shipped'::character varying, 'order_delivered'::character varying, 'order_refund'::character varying, 'welcome'::character varying, 'password_reset'::character varying, 'email_verification'::character varying, 'newsletter'::character varying, 'promotional'::character varying, 'abandoned_cart'::character varying, 'low_stock_alert'::character varying, 'payment_failed'::character varying, 'system_notification'::character varying, 'custom'::character varying])::text[])))
);
CREATE INDEX idx_email_templates_active ON public.email_templates USING btree (is_active);
CREATE INDEX idx_email_templates_category ON public.email_templates USING btree (category);
CREATE INDEX idx_email_templates_default ON public.email_templates USING btree (is_default) WHERE (is_default = true);
CREATE INDEX idx_email_templates_tags ON public.email_templates USING gin (tags);
CREATE INDEX idx_email_templates_type ON public.email_templates USING btree (type);


-- public.location_data_sync definition

-- Drop table

-- DROP TABLE public.location_data_sync;

CREATE TABLE public.location_data_sync (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	data_version text NOT NULL,
	sync_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	records_imported int4 NULL,
	sync_status text DEFAULT 'success'::text NULL,
	error_details text NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	table_type text DEFAULT 'combined'::text NULL,
	CONSTRAINT location_data_sync_pkey PRIMARY KEY (id),
	CONSTRAINT location_data_sync_sync_status_check CHECK ((sync_status = ANY (ARRAY['success'::text, 'failed'::text, 'partial'::text])))
);

-- Table Triggers

create trigger trg_set_updated_at_location_data_sync before
update
    on
    public.location_data_sync for each row execute function set_updated_at();


-- public.location_sync_progress definition

-- Drop table

-- DROP TABLE public.location_sync_progress;

CREATE TABLE public.location_sync_progress (
	id uuid NOT NULL,
	table_type text DEFAULT 'combined'::text NULL,
	status text NOT NULL,
	progress int4 DEFAULT 0 NOT NULL,
	message text NULL,
	records_imported int4 NULL,
	records_new int4 DEFAULT 0 NULL,
	records_updated int4 DEFAULT 0 NULL,
	started_at timestamptz DEFAULT now() NOT NULL,
	completed_at timestamptz NULL,
	"error" text NULL,
	CONSTRAINT location_sync_progress_pkey PRIMARY KEY (id)
);


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


-- public.shipping_gateways definition

-- Drop table

-- DROP TABLE public.shipping_gateways;

CREATE TABLE public.shipping_gateways (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	code varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) DEFAULT 'manual'::character varying NULL,
	logo_url text DEFAULT ''::text NULL,
	tracking_url_template text DEFAULT ''::text NULL,
	api_config jsonb DEFAULT '{}'::jsonb NULL,
	status varchar(20) DEFAULT 'active'::character varying NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT shipping_gateways_code_key UNIQUE (code),
	CONSTRAINT shipping_gateways_pkey PRIMARY KEY (id),
	CONSTRAINT shipping_gateways_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[]))),
	CONSTRAINT shipping_gateways_type_check CHECK (((type)::text = ANY ((ARRAY['manual'::character varying, 'api'::character varying, 'hybrid'::character varying])::text[])))
);
CREATE INDEX idx_shipping_gateways_code ON public.shipping_gateways USING btree (code);
CREATE INDEX idx_shipping_gateways_status ON public.shipping_gateways USING btree (status);
CREATE INDEX idx_shipping_gateways_type ON public.shipping_gateways USING btree (type);

-- Table Triggers

create trigger set_timestamp_shipping_gateways before
update
    on
    public.shipping_gateways for each row execute function trigger_set_timestamp();


-- public.shipping_settings definition

-- Drop table

-- DROP TABLE public.shipping_settings;

CREATE TABLE public.shipping_settings (
	id serial4 NOT NULL,
	default_country text NULL,
	default_currency text NULL,
	weight_unit text NULL,
	dimension_unit text NULL,
	enable_free_shipping bool DEFAULT false NULL,
	free_shipping_threshold numeric DEFAULT 0 NULL,
	max_weight_limit int4 DEFAULT 0 NULL,
	enable_shipping_zones bool DEFAULT true NULL,
	enable_shipping_calculator bool DEFAULT true NULL,
	shipping_tax_status text DEFAULT 'taxable'::text NULL,
	shipping_tax_class text DEFAULT 'standard'::text NULL,
	hide_shipping_until_address bool DEFAULT false NULL,
	enable_debug_mode bool DEFAULT false NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT shipping_settings_pkey PRIMARY KEY (id)
);


-- public.shipping_zones definition

-- Drop table

-- DROP TABLE public.shipping_zones;

CREATE TABLE public.shipping_zones (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	code varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	description text DEFAULT ''::text NULL,
	priority int4 DEFAULT 1 NULL,
	status varchar(20) DEFAULT 'active'::character varying NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT shipping_zones_code_key UNIQUE (code),
	CONSTRAINT shipping_zones_pkey PRIMARY KEY (id),
	CONSTRAINT shipping_zones_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);
CREATE INDEX idx_shipping_zones_code ON public.shipping_zones USING btree (code);
CREATE INDEX idx_shipping_zones_priority ON public.shipping_zones USING btree (priority DESC);
CREATE INDEX idx_shipping_zones_status ON public.shipping_zones USING btree (status);

-- Table Triggers

create trigger set_timestamp_shipping_zones before
update
    on
    public.shipping_zones for each row execute function trigger_set_timestamp();


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
	password_hash text NULL,
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


-- public.email_campaigns definition

-- Drop table

-- DROP TABLE public.email_campaigns;

CREATE TABLE public.email_campaigns (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	subject text NOT NULL,
	template_id uuid NULL,
	audience_segment jsonb DEFAULT '{}'::jsonb NULL,
	status text DEFAULT 'draft'::text NULL,
	campaign_type text DEFAULT 'newsletter'::text NULL,
	send_at timestamptz NULL,
	started_at timestamptz NULL,
	completed_at timestamptz NULL,
	recipient_count int4 DEFAULT 0 NULL,
	sent_count int4 DEFAULT 0 NULL,
	delivered_count int4 DEFAULT 0 NULL,
	opened_count int4 DEFAULT 0 NULL,
	clicked_count int4 DEFAULT 0 NULL,
	unsubscribed_count int4 DEFAULT 0 NULL,
	bounced_count int4 DEFAULT 0 NULL,
	complained_count int4 DEFAULT 0 NULL,
	from_name text DEFAULT 'PlazaCMS'::text NULL,
	from_email text DEFAULT 'noreply@plazacms.com'::text NULL,
	reply_to text NULL,
	tracking_enabled bool DEFAULT true NULL,
	created_by uuid NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT email_campaigns_pkey PRIMARY KEY (id),
	CONSTRAINT email_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text, 'paused'::text, 'cancelled'::text]))),
	CONSTRAINT email_campaigns_type_check CHECK ((campaign_type = ANY (ARRAY['newsletter'::text, 'promotional'::text, 'automation'::text, 'transactional'::text, 'custom'::text]))),
	CONSTRAINT email_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
	CONSTRAINT email_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL
);
CREATE INDEX idx_email_campaigns_created_by ON public.email_campaigns USING btree (created_by);
CREATE INDEX idx_email_campaigns_send_at ON public.email_campaigns USING btree (send_at);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns USING btree (status);
CREATE INDEX idx_email_campaigns_template_id ON public.email_campaigns USING btree (template_id);
CREATE INDEX idx_email_campaigns_type ON public.email_campaigns USING btree (campaign_type);

-- Table Triggers

create trigger update_email_campaigns_updated_at before
update
    on
    public.email_campaigns for each row execute function update_updated_at_column();


-- public.email_subscribers definition

-- Drop table

-- DROP TABLE public.email_subscribers;

CREATE TABLE public.email_subscribers (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	email text NOT NULL,
	status text DEFAULT 'active'::text NULL,
	"source" text DEFAULT 'website'::text NULL,
	tags jsonb DEFAULT '[]'::jsonb NULL,
	custom_fields jsonb DEFAULT '{}'::jsonb NULL,
	user_id uuid NULL,
	subscribed_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	unsubscribed_at timestamptz NULL,
	last_activity timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT email_subscribers_email_key UNIQUE (email),
	CONSTRAINT email_subscribers_pkey PRIMARY KEY (id),
	CONSTRAINT email_subscribers_source_check CHECK ((source = ANY (ARRAY['website'::text, 'import'::text, 'api'::text, 'store_signup'::text, 'admin'::text]))),
	CONSTRAINT email_subscribers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'unsubscribed'::text, 'bounced'::text, 'pending'::text]))),
	CONSTRAINT email_subscribers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_email_subscribers_email ON public.email_subscribers USING btree (email);
CREATE INDEX idx_email_subscribers_last_activity ON public.email_subscribers USING btree (last_activity);
CREATE INDEX idx_email_subscribers_status ON public.email_subscribers USING btree (status);
CREATE INDEX idx_email_subscribers_tags ON public.email_subscribers USING gin (tags);
CREATE INDEX idx_email_subscribers_user_id ON public.email_subscribers USING btree (user_id);

-- Table Triggers

create trigger update_email_subscribers_updated_at before
update
    on
    public.email_subscribers for each row execute function update_updated_at_column();


-- public.media_folders definition

-- Drop table

-- DROP TABLE public.media_folders;

CREATE TABLE public.media_folders (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	parent_id uuid NULL,
	"path" text NOT NULL,
	description text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT media_folders_path_key UNIQUE (path),
	CONSTRAINT media_folders_pkey PRIMARY KEY (id),
	CONSTRAINT media_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.media_folders(id) ON DELETE CASCADE
);
CREATE INDEX idx_media_folders_parent_id ON public.media_folders USING btree (parent_id);
CREATE INDEX idx_media_folders_path ON public.media_folders USING btree (path);

-- Table Triggers

create trigger trg_set_updated_at_media_folders before
update
    on
    public.media_folders for each row execute function set_updated_at();


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


-- public.shipping_methods definition

-- Drop table

-- DROP TABLE public.shipping_methods;

CREATE TABLE public.shipping_methods (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	zone_id uuid NULL,
	gateway_id uuid NULL,
	"name" varchar(100) NOT NULL,
	method_type varchar(20) NOT NULL,
	base_cost numeric(10, 2) DEFAULT 0 NULL,
	currency bpchar(3) DEFAULT 'USD'::bpchar NULL,
	weight_unit varchar(10) DEFAULT 'g'::character varying NULL,
	weight_threshold int4 DEFAULT 1000 NULL,
	cost_per_kg numeric(10, 2) DEFAULT 0 NULL,
	min_free_threshold numeric(10, 2) DEFAULT 0 NULL,
	max_free_weight int4 DEFAULT 0 NULL,
	max_weight_limit int4 DEFAULT 30000 NULL,
	max_dimensions jsonb DEFAULT '{}'::jsonb NULL,
	restricted_items jsonb DEFAULT '[]'::jsonb NULL,
	description text DEFAULT ''::text NULL,
	estimated_days_min int4 DEFAULT 1 NULL,
	estimated_days_max int4 DEFAULT 7 NULL,
	status varchar(20) DEFAULT 'active'::character varying NULL,
	sort_order int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	restricted_products jsonb DEFAULT '[]'::jsonb NULL,
	CONSTRAINT shipping_methods_method_type_check CHECK (((method_type)::text = ANY ((ARRAY['flat'::character varying, 'weight_based'::character varying, 'free_shipping'::character varying, 'percentage'::character varying])::text[]))),
	CONSTRAINT shipping_methods_pkey PRIMARY KEY (id),
	CONSTRAINT shipping_methods_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[]))),
	CONSTRAINT shipping_methods_weight_unit_check CHECK (((weight_unit)::text = ANY ((ARRAY['g'::character varying, 'kg'::character varying, 'lb'::character varying, 'oz'::character varying])::text[]))),
	CONSTRAINT shipping_methods_zone_id_gateway_id_name_key UNIQUE (zone_id, gateway_id, name),
	CONSTRAINT shipping_methods_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.shipping_gateways(id) ON DELETE CASCADE,
	CONSTRAINT shipping_methods_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id) ON DELETE CASCADE
);
CREATE INDEX idx_shipping_methods_currency ON public.shipping_methods USING btree (currency);
CREATE INDEX idx_shipping_methods_gateway ON public.shipping_methods USING btree (gateway_id);
CREATE INDEX idx_shipping_methods_sort ON public.shipping_methods USING btree (sort_order);
CREATE INDEX idx_shipping_methods_status ON public.shipping_methods USING btree (status);
CREATE INDEX idx_shipping_methods_type ON public.shipping_methods USING btree (method_type);
CREATE INDEX idx_shipping_methods_zone ON public.shipping_methods USING btree (zone_id);

-- Table Triggers

create trigger set_timestamp_shipping_methods before
update
    on
    public.shipping_methods for each row execute function trigger_set_timestamp();


-- public.shipping_zone_countries definition

-- Drop table

-- DROP TABLE public.shipping_zone_countries;

CREATE TABLE public.shipping_zone_countries (
	zone_id uuid NOT NULL,
	country_code bpchar(2) NOT NULL,
	country_name varchar(100) NOT NULL,
	CONSTRAINT shipping_zone_countries_pkey PRIMARY KEY (zone_id, country_code),
	CONSTRAINT shipping_zone_countries_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id) ON DELETE CASCADE
);
CREATE INDEX idx_zone_countries_country ON public.shipping_zone_countries USING btree (country_code);


-- public.states definition

-- Drop table

-- DROP TABLE public.states;

CREATE TABLE public.states (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	country_id int4 NOT NULL,
	country_code bpchar(2) NOT NULL,
	fips_code varchar(255) NULL,
	iso2 varchar(255) NULL,
	"type" varchar(191) NULL,
	latitude numeric(10, 8) NULL,
	longitude numeric(11, 8) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	state_code varchar(10) NULL,
	CONSTRAINT states_pkey PRIMARY KEY (id),
	CONSTRAINT states_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id)
);
CREATE INDEX idx_states_country ON public.states USING btree (country_id);
CREATE INDEX idx_states_country_code ON public.states USING btree (country_code);
CREATE INDEX idx_states_country_id ON public.states USING btree (country_id);
CREATE INDEX idx_states_iso2 ON public.states USING btree (iso2);
CREATE INDEX idx_states_name ON public.states USING btree (name);

-- Table Triggers

create trigger trg_set_updated_at_states before
update
    on
    public.states for each row execute function set_updated_at();


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


-- public.zone_gateways definition

-- Drop table

-- DROP TABLE public.zone_gateways;

CREATE TABLE public.zone_gateways (
	zone_id uuid NOT NULL,
	gateway_id uuid NOT NULL,
	is_available bool DEFAULT true NULL,
	priority int4 DEFAULT 1 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT zone_gateways_pkey PRIMARY KEY (zone_id, gateway_id),
	CONSTRAINT zone_gateways_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.shipping_gateways(id) ON DELETE CASCADE,
	CONSTRAINT zone_gateways_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id) ON DELETE CASCADE
);
CREATE INDEX idx_zone_gateways_available ON public.zone_gateways USING btree (is_available);
CREATE INDEX idx_zone_gateways_gateway ON public.zone_gateways USING btree (gateway_id);
CREATE INDEX idx_zone_gateways_zone ON public.zone_gateways USING btree (zone_id);


-- public.cities definition

-- Drop table

-- DROP TABLE public.cities;

CREATE TABLE public.cities (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	state_id int4 NOT NULL,
	country_id int4 NOT NULL,
	latitude numeric(10, 8) NULL,
	longitude numeric(11, 8) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT cities_pkey PRIMARY KEY (id),
	CONSTRAINT cities_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id),
	CONSTRAINT cities_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id)
);
CREATE INDEX idx_cities_coordinates ON public.cities USING btree (latitude, longitude);
CREATE INDEX idx_cities_country_id ON public.cities USING btree (country_id);
CREATE INDEX idx_cities_name ON public.cities USING btree (name);
CREATE INDEX idx_cities_name_search ON public.cities USING gin (to_tsvector('english'::regconfig, (name)::text));
CREATE INDEX idx_cities_state ON public.cities USING btree (state_id);
CREATE INDEX idx_cities_state_id ON public.cities USING btree (state_id);

-- Table Triggers

create trigger trg_set_updated_at_cities before
update
    on
    public.cities for each row execute function set_updated_at();


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
	folder_id uuid NULL,
	CONSTRAINT media_media_type_check CHECK ((media_type = ANY (ARRAY['product_image'::text, 'product_variant_image'::text, 'user_profile'::text, 'review_image'::text, 'other'::text, 'site_asset'::text]))),
	CONSTRAINT media_pkey PRIMARY KEY (id),
	CONSTRAINT media_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.media_folders(id) ON DELETE SET NULL,
	CONSTRAINT media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_media_entity_id ON public.media USING btree (entity_id);
CREATE INDEX idx_media_folder_id ON public.media USING btree (folder_id);
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
CREATE INDEX idx_payment_gateways_is_enabled ON public.payment_gateways USING btree (is_enabled);
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
	settings jsonb NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	CONSTRAINT payment_methods_gateway_id_slug_key UNIQUE (gateway_id, slug),
	CONSTRAINT payment_methods_pkey PRIMARY KEY (id),
	CONSTRAINT payment_methods_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
	CONSTRAINT payment_methods_logo_media_id_fkey FOREIGN KEY (logo_media_id) REFERENCES public.media(id) ON DELETE SET NULL
);
CREATE INDEX idx_payment_methods_enabled_gateway ON public.payment_methods USING btree (gateway_id, is_enabled);
CREATE INDEX idx_payment_methods_gateway_display ON public.payment_methods USING btree (gateway_id, display_order);
CREATE INDEX idx_payment_methods_gateway_id ON public.payment_methods USING btree (gateway_id);
CREATE INDEX idx_payment_methods_slug ON public.payment_methods USING btree (slug);

-- Table Triggers

create trigger trg_set_updated_at_payment_methods before
update
    on
    public.payment_methods for each row execute function set_updated_at();


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
	order_number text NULL,
	CONSTRAINT orders_order_number_digits_check CHECK (((order_number IS NULL) OR (order_number ~ '^[0-9]+$'::text))),
	CONSTRAINT orders_order_number_format_check CHECK (((order_number IS NULL) OR (order_number ~ '^[0-9]{10}$'::text))),
	CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text]))),
	CONSTRAINT orders_pkey PRIMARY KEY (id),
	CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text]))),
	CONSTRAINT orders_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL,
	CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_orders_carrier_id ON public.orders USING btree (carrier_id);
CREATE UNIQUE INDEX idx_orders_order_number ON public.orders USING btree (order_number);
CREATE INDEX idx_orders_payment_method_id ON public.orders USING btree (payment_method_id);
CREATE INDEX idx_orders_shipping_zone_method_id ON public.orders USING btree (shipping_zone_method_id);
CREATE INDEX idx_orders_status ON public.orders USING btree (status, payment_status, created_at DESC);
CREATE INDEX idx_orders_transaction_id ON public.orders USING btree (transaction_id);
CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);

-- Table Triggers

create trigger trg_set_updated_at_orders before
update
    on
    public.orders for each row execute function set_updated_at();
create trigger trg_set_order_number before
insert
    on
    public.orders for each row execute function set_order_number_seq();


-- public.payment_transactions definition

-- Drop table

-- DROP TABLE public.payment_transactions;

CREATE TABLE public.payment_transactions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	order_id uuid NOT NULL,
	gateway_id uuid NOT NULL,
	method_id uuid NULL,
	provider_transaction_id text NULL,
	status text NOT NULL,
	amount numeric(10, 2) NOT NULL,
	currency text NOT NULL,
	is_test bool DEFAULT false NOT NULL,
	meta jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT payment_transactions_pkey PRIMARY KEY (id),
	CONSTRAINT payment_transactions_status_check CHECK ((status = ANY (ARRAY['requires_action'::text, 'pending'::text, 'authorized'::text, 'captured'::text, 'succeeded'::text, 'failed'::text, 'canceled'::text, 'refunded'::text]))),
	CONSTRAINT payment_transactions_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.payment_gateways(id) ON DELETE RESTRICT,
	CONSTRAINT payment_transactions_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL,
	CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_payment_transactions_order ON public.payment_transactions USING btree (order_id, created_at DESC);
CREATE INDEX idx_payment_transactions_provider ON public.payment_transactions USING btree (provider_transaction_id);

-- Table Triggers

create trigger trg_set_updated_at_payment_transactions before
update
    on
    public.payment_transactions for each row execute function set_updated_at();


-- public.payment_webhook_events definition

-- Drop table

-- DROP TABLE public.payment_webhook_events;

CREATE TABLE public.payment_webhook_events (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	gateway_id uuid NULL,
	order_id uuid NULL,
	event_type text NOT NULL,
	status text NULL,
	signature text NULL,
	payload jsonb NOT NULL,
	received_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	processed bool DEFAULT false NOT NULL,
	CONSTRAINT payment_webhook_events_pkey PRIMARY KEY (id),
	CONSTRAINT payment_webhook_events_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
	CONSTRAINT payment_webhook_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL
);
CREATE INDEX idx_payment_webhook_events_gateway_received ON public.payment_webhook_events USING btree (gateway_id, received_at DESC);
CREATE INDEX idx_payment_webhook_events_order ON public.payment_webhook_events USING btree (order_id);


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
	product_type text DEFAULT 'simple'::text NOT NULL, -- Type of product: simple (no variants) or variable (has variants)
	featured_image_id uuid NULL, -- Direct reference to featured image media for faster queries
	CONSTRAINT products_pkey PRIMARY KEY (id),
	CONSTRAINT products_product_type_check CHECK ((product_type = ANY (ARRAY['simple'::text, 'variable'::text]))),
	CONSTRAINT products_sku_key UNIQUE (sku),
	CONSTRAINT products_slug_key UNIQUE (slug),
	CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['published'::text, 'private'::text, 'draft'::text, 'archived'::text]))),
	CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
	CONSTRAINT products_featured_image_id_fkey FOREIGN KEY (featured_image_id) REFERENCES public.media(id) ON DELETE SET NULL,
	CONSTRAINT products_tax_class_id_fkey FOREIGN KEY (tax_class_id) REFERENCES public.tax_classes(id) ON DELETE SET NULL,
	CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);
CREATE INDEX idx_products_featured_image_id ON public.products USING btree (featured_image_id);
CREATE INDEX idx_products_product_type ON public.products USING btree (product_type);
CREATE INDEX idx_products_slug ON public.products USING btree (slug);
CREATE INDEX idx_products_status ON public.products USING btree (status);
CREATE INDEX idx_products_vendor_id ON public.products USING btree (vendor_id);

-- Column comments

COMMENT ON COLUMN public.products.product_type IS 'Type of product: simple (no variants) or variable (has variants)';
COMMENT ON COLUMN public.products.featured_image_id IS 'Direct reference to featured image media for faster queries';

-- Table Triggers

create trigger trg_set_updated_at_products before
update
    on
    public.products for each row execute function set_updated_at();


-- public.payment_refunds definition

-- Drop table

-- DROP TABLE public.payment_refunds;

CREATE TABLE public.payment_refunds (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	transaction_id uuid NOT NULL,
	amount numeric(10, 2) NOT NULL,
	reason text NULL,
	provider_refund_id text NULL,
	status text NOT NULL,
	meta jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT payment_refunds_pkey PRIMARY KEY (id),
	CONSTRAINT payment_refunds_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text]))),
	CONSTRAINT payment_refunds_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.payment_transactions(id) ON DELETE CASCADE
);
CREATE INDEX idx_payment_refunds_tx ON public.payment_refunds USING btree (transaction_id);

-- Table Triggers

create trigger trg_set_updated_at_payment_refunds before
update
    on
    public.payment_refunds for each row execute function set_updated_at();


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
	product_id uuid NULL,
	CONSTRAINT order_items_order_id_product_variant_id_key UNIQUE (order_id, product_variant_id),
	CONSTRAINT order_items_pkey PRIMARY KEY (id),
	CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
	CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
	CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT,
	CONSTRAINT order_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT
);
CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);

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
	order_id uuid NULL,
	order_item_id uuid NULL,
	status text DEFAULT 'pending'::text NOT NULL,
	is_verified_purchase bool DEFAULT false NOT NULL,
	helpful_count int4 DEFAULT 0 NOT NULL,
	admin_response text NULL,
	admin_response_date timestamptz NULL,
	moderation_status text DEFAULT 'approved'::text NOT NULL,
	moderation_notes text NULL,
	CONSTRAINT reviews_moderation_status_check CHECK ((moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'flagged'::text]))),
	CONSTRAINT reviews_pkey PRIMARY KEY (id),
	CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
	CONSTRAINT reviews_review_type_check CHECK ((review_type = ANY (ARRAY['user'::text, 'guest'::text, 'imported'::text]))),
	CONSTRAINT reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'hidden'::text]))),
	CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL,
	CONSTRAINT reviews_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL,
	CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
	CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_reviews_moderation_status ON public.reviews USING btree (moderation_status);
CREATE INDEX idx_reviews_order_id ON public.reviews USING btree (order_id);
CREATE INDEX idx_reviews_order_item_id ON public.reviews USING btree (order_item_id);
CREATE INDEX idx_reviews_product_created ON public.reviews USING btree (product_id, created_at DESC);
CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);
CREATE INDEX idx_reviews_status ON public.reviews USING btree (status);
CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);
CREATE INDEX idx_reviews_verified_purchase ON public.reviews USING btree (is_verified_purchase);

-- Table Triggers

create trigger trg_set_updated_at_reviews before
update
    on
    public.reviews for each row execute function set_updated_at();


-- public.email_notifications definition

-- Drop table

-- DROP TABLE public.email_notifications;

CREATE TABLE public.email_notifications (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	recipient_email varchar(255) NOT NULL,
	subject varchar(500) NOT NULL,
	"content" text NOT NULL,
	order_id uuid NULL,
	order_item_id uuid NULL,
	status varchar(20) DEFAULT 'sent'::character varying NULL,
	sent_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	error_message text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	campaign_id uuid NULL,
	template_id uuid NULL,
	resend_message_id text NULL,
	resend_event_id text NULL,
	tracking_data jsonb DEFAULT '{}'::jsonb NULL,
	retry_count int4 DEFAULT 0 NULL,
	last_retry_at timestamptz NULL,
	priority text DEFAULT 'normal'::text NULL,
	CONSTRAINT email_notifications_pkey PRIMARY KEY (id),
	CONSTRAINT email_notifications_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'normal'::text, 'low'::text]))),
	CONSTRAINT email_notifications_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying, 'bounced'::character varying])::text[]))),
	CONSTRAINT email_notifications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
	CONSTRAINT email_notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL,
	CONSTRAINT email_notifications_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL,
	CONSTRAINT email_notifications_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL
);
CREATE INDEX idx_email_notifications_campaign_id ON public.email_notifications USING btree (campaign_id);
CREATE INDEX idx_email_notifications_order_id ON public.email_notifications USING btree (order_id);
CREATE INDEX idx_email_notifications_order_item_id ON public.email_notifications USING btree (order_item_id);
CREATE INDEX idx_email_notifications_priority ON public.email_notifications USING btree (priority);
CREATE INDEX idx_email_notifications_recipient ON public.email_notifications USING btree (recipient_email);
CREATE INDEX idx_email_notifications_resend_id ON public.email_notifications USING btree (resend_message_id);
CREATE INDEX idx_email_notifications_retry ON public.email_notifications USING btree (retry_count, status) WHERE ((status)::text = 'failed'::text);
CREATE INDEX idx_email_notifications_sent_at ON public.email_notifications USING btree (sent_at);
CREATE INDEX idx_email_notifications_template_id ON public.email_notifications USING btree (template_id);
CREATE INDEX idx_email_notifications_type ON public.email_notifications USING btree (type);


-- public.review_helpful_votes definition

-- Drop table

-- DROP TABLE public.review_helpful_votes;

CREATE TABLE public.review_helpful_votes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	review_id uuid NOT NULL,
	user_id uuid NULL,
	ip_address inet NULL,
	is_helpful bool NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT review_helpful_votes_pkey PRIMARY KEY (id),
	CONSTRAINT review_helpful_votes_unique_vote UNIQUE (review_id, user_id, ip_address),
	CONSTRAINT review_helpful_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE,
	CONSTRAINT review_helpful_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_review_helpful_votes_ip_address ON public.review_helpful_votes USING btree (ip_address);
CREATE INDEX idx_review_helpful_votes_review_id ON public.review_helpful_votes USING btree (review_id);
CREATE INDEX idx_review_helpful_votes_user_id ON public.review_helpful_votes USING btree (user_id);

-- Table Triggers

create trigger trg_update_review_helpful_count after
insert
    or
delete
    or
update
    on
    public.review_helpful_votes for each row execute function update_review_helpful_count();


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
CREATE INDEX idx_review_images_display_order ON public.review_images USING btree (review_id, display_order);
CREATE INDEX idx_review_images_media_id ON public.review_images USING btree (media_id);
CREATE INDEX idx_review_images_review_id ON public.review_images USING btree (review_id);


-- public.email_events definition

-- Drop table

-- DROP TABLE public.email_events;

CREATE TABLE public.email_events (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	notification_id uuid NULL,
	campaign_id uuid NULL,
	event_type text NOT NULL,
	recipient_email text NOT NULL,
	user_agent text NULL,
	ip_address text NULL,
	link_url text NULL,
	bounce_reason text NULL,
	complaint_feedback text NULL,
	resend_event_id text NULL,
	resend_message_id text NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT email_events_pkey PRIMARY KEY (id),
	CONSTRAINT email_events_type_check CHECK ((event_type = ANY (ARRAY['sent'::text, 'delivered'::text, 'opened'::text, 'clicked'::text, 'bounced'::text, 'complained'::text, 'unsubscribed'::text, 'failed'::text]))),
	CONSTRAINT email_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
	CONSTRAINT email_events_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.email_notifications(id) ON DELETE CASCADE
);
CREATE INDEX idx_email_events_campaign ON public.email_events USING btree (campaign_id);
CREATE INDEX idx_email_events_created_at ON public.email_events USING btree (created_at);
CREATE INDEX idx_email_events_notification ON public.email_events USING btree (notification_id);
CREATE INDEX idx_email_events_recipient ON public.email_events USING btree (recipient_email);
CREATE INDEX idx_email_events_resend_id ON public.email_events USING btree (resend_message_id);
CREATE INDEX idx_email_events_type ON public.email_events USING btree (event_type);


-- public.review_details source

CREATE OR REPLACE VIEW public.review_details
AS SELECT r.id,
    r.product_id,
    r.user_id,
    r.rating,
    r.comment,
    r.created_at,
    r.updated_at,
    r.reviewer_name,
    r.reviewer_email,
    r.review_type,
    r.order_id,
    r.order_item_id,
    r.status,
    r.is_verified_purchase,
    r.helpful_count,
    r.admin_response,
    r.admin_response_date,
    r.moderation_status,
    r.moderation_notes,
    p.name AS product_name,
    p.slug AS product_slug,
    u.name AS user_name,
    u.email AS user_email,
    o.order_number,
    oi.product_name AS order_item_name,
    oi.product_price AS order_item_price,
    oi.quantity AS order_item_quantity,
    COALESCE(json_agg(json_build_object('media_id', ri.media_id, 'display_order', ri.display_order) ORDER BY ri.display_order) FILTER (WHERE ri.media_id IS NOT NULL), '[]'::json) AS images
   FROM reviews r
     LEFT JOIN products p ON r.product_id = p.id
     LEFT JOIN users u ON r.user_id = u.id
     LEFT JOIN orders o ON r.order_id = o.id
     LEFT JOIN order_items oi ON r.order_item_id = oi.id
     LEFT JOIN review_images ri ON r.id = ri.review_id
  GROUP BY r.id, p.name, p.slug, u.name, u.email, o.order_number, oi.product_name, oi.product_price, oi.quantity;


-- public.review_stats source

CREATE OR REPLACE VIEW public.review_stats
AS SELECT p.id AS product_id,
    p.name AS product_name,
    count(r.id) AS total_reviews,
    avg(r.rating) AS average_rating,
    count(
        CASE
            WHEN r.rating = 5 THEN 1
            ELSE NULL::integer
        END) AS five_star_count,
    count(
        CASE
            WHEN r.rating = 4 THEN 1
            ELSE NULL::integer
        END) AS four_star_count,
    count(
        CASE
            WHEN r.rating = 3 THEN 1
            ELSE NULL::integer
        END) AS three_star_count,
    count(
        CASE
            WHEN r.rating = 2 THEN 1
            ELSE NULL::integer
        END) AS two_star_count,
    count(
        CASE
            WHEN r.rating = 1 THEN 1
            ELSE NULL::integer
        END) AS one_star_count,
    count(
        CASE
            WHEN r.is_verified_purchase = true THEN 1
            ELSE NULL::integer
        END) AS verified_reviews_count,
    count(
        CASE
            WHEN r.status = 'approved'::text THEN 1
            ELSE NULL::integer
        END) AS approved_reviews_count,
    count(
        CASE
            WHEN r.status = 'pending'::text THEN 1
            ELSE NULL::integer
        END) AS pending_reviews_count
   FROM products p
     LEFT JOIN reviews r ON p.id = r.product_id
  GROUP BY p.id, p.name;



-- DROP FUNCTION public.armor(bytea);

CREATE OR REPLACE FUNCTION public.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

-- DROP FUNCTION public.armor(bytea, _text, _text);

CREATE OR REPLACE FUNCTION public.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

-- DROP FUNCTION public.calc_shipping_cost(uuid, numeric, int4);

CREATE OR REPLACE FUNCTION public.calc_shipping_cost(p_method_id uuid, p_cart_total numeric, p_total_weight_g integer)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  method_rec RECORD;
  final_cost DECIMAL(10,2) := 0;
  weight_kg DECIMAL(10,3);
  extra_weight_kg DECIMAL(10,3);
BEGIN
  -- Get method details
  SELECT * INTO method_rec FROM shipping_methods WHERE id = p_method_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN NULL; -- Method not found or inactive
  END IF;
  
  -- Check weight limits
  IF p_total_weight_g > method_rec.max_weight_limit THEN
    RETURN NULL; -- Exceeds weight limit
  END IF;
  
  -- Check free shipping eligibility
  IF method_rec.method_type = 'free_shipping' 
     OR (method_rec.min_free_threshold > 0 AND p_cart_total >= method_rec.min_free_threshold
         AND (method_rec.max_free_weight = 0 OR p_total_weight_g <= method_rec.max_free_weight)) THEN
    RETURN 0;
  END IF;
  
  -- Calculate based on method type
  CASE method_rec.method_type
    WHEN 'flat' THEN
      final_cost := method_rec.base_cost;
      
    WHEN 'weight_based' THEN
      final_cost := method_rec.base_cost;
      
      -- Add extra cost for weight over threshold
      IF p_total_weight_g > method_rec.weight_threshold THEN
        extra_weight_kg := CEIL((p_total_weight_g - method_rec.weight_threshold)::DECIMAL / 1000);
        final_cost := final_cost + (extra_weight_kg * method_rec.cost_per_kg);
      END IF;
      
    WHEN 'percentage' THEN
      final_cost := p_cart_total * (method_rec.base_cost / 100);
      
    ELSE
      final_cost := method_rec.base_cost;
  END CASE;
  
  RETURN final_cost;
END;
$function$
;

-- DROP FUNCTION public.crypt(text, text);

CREATE OR REPLACE FUNCTION public.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$
;

-- DROP FUNCTION public.dearmor(text);

CREATE OR REPLACE FUNCTION public.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$
;

-- DROP FUNCTION public.decrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$
;

-- DROP FUNCTION public.decrypt_iv(bytea, bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$
;

-- DROP FUNCTION public.digest(text, text);

CREATE OR REPLACE FUNCTION public.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

-- DROP FUNCTION public.digest(bytea, text);

CREATE OR REPLACE FUNCTION public.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

-- DROP FUNCTION public.encrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$
;

-- DROP FUNCTION public.encrypt_iv(bytea, bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$
;

-- DROP FUNCTION public.gen_random_bytes(int4);

CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$
;

-- DROP FUNCTION public.gen_random_uuid();

CREATE OR REPLACE FUNCTION public.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$
;

-- DROP FUNCTION public.gen_salt(text);

CREATE OR REPLACE FUNCTION public.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$
;

-- DROP FUNCTION public.gen_salt(text, int4);

CREATE OR REPLACE FUNCTION public.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$
;

-- DROP FUNCTION public.generate_order_number_seq();

CREATE OR REPLACE FUNCTION public.generate_order_number_seq()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_seq bigint;
  v_date text;
BEGIN
  v_seq := nextval('public.order_global_seq');
  v_date := TO_CHAR(CURRENT_DATE, 'DDMMYY');
  RETURN v_seq::text || v_date;
END;
$function$
;

-- DROP FUNCTION public.hmac(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

-- DROP FUNCTION public.hmac(text, text, text);

CREATE OR REPLACE FUNCTION public.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

-- DROP FUNCTION public.pgp_armor_headers(in text, out text, out text);

CREATE OR REPLACE FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$
;

-- DROP FUNCTION public.pgp_key_id(bytea);

CREATE OR REPLACE FUNCTION public.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt(text, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt(text, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt_bytea(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt(text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt(text, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt_bytea(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

-- DROP FUNCTION public.set_order_number_seq();

CREATE OR REPLACE FUNCTION public.set_order_number_seq()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number_seq();
  END IF;
  RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.trigger_set_timestamp();

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.update_review_helpful_count();

CREATE OR REPLACE FUNCTION public.update_review_helpful_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update helpful_count in reviews table
  UPDATE public.reviews 
  SET helpful_count = (
    SELECT COUNT(*) 
    FROM public.review_helpful_votes 
    WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
    AND is_helpful = true
  )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

-- DROP FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
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