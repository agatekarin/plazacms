-- User anon untuk PostgREST
CREATE ROLE web_anon NOLOGIN;

-- User autentikasi
CREATE ROLE web_user LOGIN PASSWORD 'UserPassword';

-- Grant akses ke anon hanya select
GRANT USAGE ON SCHEMA public TO web_anon;

GRANT
SELECT
    ON ALL TABLES IN SCHEMA public TO web_anon;

-- Grant akses ke user full CRUD
GRANT USAGE ON SCHEMA public TO web_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO web_user;