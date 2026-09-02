-- ============================================================
-- CHECK IF SQL FUNCTIONS EXIST
-- ============================================================
--
-- Run this in Supabase SQL Editor to verify functions exist
--
-- ============================================================

-- Check 1: List all functions in public schema
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%employee%'
ORDER BY routine_name;

-- Check 2: Specifically check for verify_employee_code
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'verify_employee_code'
        ) THEN '✅ verify_employee_code EXISTS'
        ELSE '❌ verify_employee_code NOT FOUND'
    END as status;

-- Check 3: Specifically check for mark_employee_code_used
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'mark_employee_code_used'
        ) THEN '✅ mark_employee_code_used EXISTS'
        ELSE '❌ mark_employee_code_used NOT FOUND'
    END as status;

-- Check 4: Check if employees table exists and has data
SELECT 
    COUNT(*) as employee_count,
    SUM(CASE WHEN is_used THEN 1 ELSE 0 END) as used_count,
    SUM(CASE WHEN NOT is_used THEN 1 ELSE 0 END) as available_count
FROM public.employees;

-- Check 5: Test calling the function directly
SELECT * FROM public.verify_employee_code('EMP-10001');
SELECT * FROM public.verify_employee_code('EMP-20001');



-- ============================================================
-- EXPECTED RESULTS:
-- ============================================================
--
-- Check 1: Should show verify_employee_code and mark_employee_code_used
-- Check 2: ✅ verify_employee_code EXISTS
-- Check 3: ✅ mark_employee_code_used EXISTS
-- Check 4: Should show 15 employees, 0 used, 15 available
-- Check 5: Should return Daisy Rey Daguplo data
--
-- ============================================================
-- IF FUNCTIONS DON'T EXIST:
-- ============================================================
--
-- The 006.sql script did NOT run completely or successfully.
-- You need to run it again.
--
-- ============================================================
