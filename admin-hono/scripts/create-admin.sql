-- Create admin user for testing
-- Password: password123 (hashed with bcrypt)

INSERT INTO public.users (email, name, password, role) 
VALUES (
  'admin@plazacms.com',
  'Admin User', 
  '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FqvVDdWEk.8xVuEqJNCyqCPLSRfsNe', -- password123
  'admin'
) 
ON CONFLICT (email) DO UPDATE SET 
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the user was created
SELECT id, email, name, role, created_at FROM public.users WHERE email = 'admin@plazacms.com';
