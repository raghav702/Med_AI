# How to Apply RLS Policies

## Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your project: `lydxcnvyzqaumfmfktor`

2. **Access SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query" to create a new SQL script

3. **Apply RLS Policies**
   - Copy the entire content from `scripts/apply-rls-policies.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

4. **Verify Application**
   - Run the verification script: `node scripts/verify-rls-basic.js`
   - All tests should pass after applying the policies

## Method 2: Using Supabase CLI (If Docker is available)

1. **Start Local Development**
   ```bash
   npx supabase start
   ```

2. **Apply Migration**
   ```bash
   npx supabase db push
   ```

3. **Reset Database (if needed)**
   ```bash
   npx supabase db reset
   ```

## Method 3: Using Service Role Key (Advanced)

If you have the service role key, you can apply policies programmatically:

1. **Add Service Role Key to .env.local**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. **Run Application Script**
   ```bash
   node scripts/apply-rls-programmatically.js
   ```

## Current Status

Based on the verification results:

- ✅ **Tables Exist**: All required tables are present
- ✅ **Helper Functions**: RLS helper functions are available  
- ❌ **RLS Policies**: Not all policies are applied correctly
- ❌ **Anonymous Access**: `user_profiles` table is accessible to anonymous users

## What Needs to be Fixed

1. **Enable RLS on user_profiles table**
2. **Apply comprehensive RLS policies for all tables**
3. **Add admin-level access policies**
4. **Configure audit logging**

## Expected Behavior After Fix

- Anonymous users should be blocked from all tables
- Only authenticated users with proper roles can access their own data
- Admins have full access to all data
- Doctors can view patient data only for their appointments
- Patients can view available doctors and their own data

## Verification

After applying the RLS policies, run:

```bash
node scripts/verify-rls-basic.js
```

Expected output:
```
============================================================
OVERALL STATUS: ✅ PASS
============================================================
```

## Troubleshooting

### Common Issues

1. **"Could not find table" errors**: Tables exist but RLS is blocking access (this is correct)
2. **"Anonymous access allowed"**: RLS policies are not applied or incorrect
3. **"Function does not exist"**: Helper functions need to be created

### Debug Steps

1. Check if RLS is enabled on tables:
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. View existing policies:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

3. Test helper functions:
   ```sql
   SELECT is_admin(), is_doctor(), is_patient();
   ```