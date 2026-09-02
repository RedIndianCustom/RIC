-- Check the actual structure of public.users table
-- Run this in Supabase SQL Editor to see what's wrong

-- 1. Show all columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Show all foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'users'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Show the actual table definition
SELECT pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND contype = 'f';

-- 4. Check if the auth user exists
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE id = 'e876d8cd-1876-499e-afee-1dede5c87f14';

-- 5. Check if public.users row exists
SELECT id, email, full_name, position
FROM public.users
WHERE id = 'e876d8cd-1876-499e-afee-1dede5c87f14';
