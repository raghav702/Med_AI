# Row Level Security (RLS) Policies Documentation

## Overview

This document describes the Row Level Security (RLS) policies implemented for the doctor-patient appointment system. RLS ensures that users can only access data they are authorized to see based on their role and relationship to the data.

## User Roles

The system supports three user roles:

- **Patient**: Can book appointments and manage their own profile
- **Doctor**: Can manage their profile, availability, and appointments
- **Admin**: Has full system access for management purposes

## Policy Structure

### Helper Functions

#### `is_admin()`
Returns `true` if the current user has admin role.

#### `is_doctor()`
Returns `true` if the current user has doctor role.

#### `is_patient()`
Returns `true` if the current user has patient role.

## Table-Specific Policies

### 1. Doctors Table

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| `doctors_select_own` | SELECT | Doctors can view their own profile; Admins can view all |
| `doctors_insert_own` | INSERT | Only doctors can create their own profile |
| `doctors_update_own` | UPDATE | Doctors can update their own profile; Admins can update any |
| `doctors_delete_own` | DELETE | Doctors can delete their own profile; Admins can delete any |
| `patients_view_available_doctors` | SELECT | Patients can view doctors accepting patients |
| `admins_full_access_doctors` | ALL | Admins have complete access |

### 2. Patients Table

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| `patients_select_own` | SELECT | Patients can view their own profile; Admins can view all |
| `patients_insert_own` | INSERT | Only patients can create their own profile |
| `patients_update_own` | UPDATE | Patients can update their own profile; Admins can update any |
| `patients_delete_own` | DELETE | Patients can delete their own profile; Admins can delete any |
| `doctors_view_appointment_patients` | SELECT | Doctors can view patients they have appointments with |
| `admins_full_access_patients` | ALL | Admins have complete access |

### 3. Appointments Table

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| `doctors_view_own_appointments` | SELECT | Doctors can view their appointments |
| `patients_view_own_appointments` | SELECT | Patients can view their appointments |
| `patients_create_appointments` | INSERT | Patients can create appointments for themselves |
| `doctors_update_appointments` | UPDATE | Doctors can update their appointments |
| `patients_update_own_appointments` | UPDATE | Patients can update their pending/approved appointments |
| `doctors_delete_appointments` | DELETE | Doctors can cancel appointments |
| `patients_delete_pending_appointments` | DELETE | Patients can cancel pending appointments |
| `admins_full_access_appointments` | ALL | Admins have complete access |

### 4. Doctor Availability Table

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| `doctors_manage_own_availability` | ALL | Doctors can manage their own availability |
| `patients_view_doctor_availability` | SELECT | Patients can view available schedules |
| `admins_full_access_availability` | ALL | Admins have complete access |

### 5. Appointment Time Slots Table

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| `doctors_manage_own_time_slots` | ALL | Doctors can manage their own time slots |
| `patients_view_available_time_slots` | SELECT | Patients can view available future slots |
| `admins_full_access_time_slots` | ALL | Admins have complete access |

### 6. User Profiles Table

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| `users_view_own_profile` | SELECT | Users can view their own profile; Admins can view all |
| `users_insert_own_profile` | INSERT | Users can create their own profile |
| `users_update_own_profile` | UPDATE | Users can update their own profile; Admins can update any |
| `users_delete_own_profile` | DELETE | Users can delete their own profile; Admins can delete any |
| `doctors_view_patient_basic_info` | SELECT | Doctors can view basic info of their patients |
| `patients_view_doctor_basic_info` | SELECT | Patients can view basic doctor information |
| `admins_full_access_user_profiles` | ALL | Admins have complete access |

### 7. Medical Records Table (if exists)

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| `patients_view_own_medical_records` | SELECT | Patients can view their own records |
| `patients_insert_own_medical_records` | INSERT | Patients can create their own records |
| `patients_update_own_medical_records` | UPDATE | Patients can update their own records |
| `doctors_view_patient_medical_records` | SELECT | Doctors can view records of their patients |
| `admins_full_access_medical_records` | ALL | Admins have complete access |

## Security Features

### 1. Appointment Validation

The `validate_appointment_booking()` function ensures:
- Patients cannot book appointments with themselves
- No double-booking of time slots
- Doctor availability is respected
- Appointment conflicts are prevented

### 2. Audit Logging

All sensitive operations are logged in the `audit_logs` table:
- Table name and operation type
- User ID performing the operation
- Before and after data (for updates)
- Timestamp of the operation

### 3. Data Access Patterns

#### Doctor Access Patterns
```sql
-- Doctors can view their own appointments
SELECT * FROM appointments WHERE doctor_id = auth.uid();

-- Doctors can view patients they have appointments with
SELECT p.* FROM patients p
JOIN appointments a ON p.id = a.patient_id
WHERE a.doctor_id = auth.uid() AND a.status IN ('approved', 'completed');
```

#### Patient Access Patterns
```sql
-- Patients can view available doctors
SELECT * FROM doctors WHERE is_accepting_patients = true;

-- Patients can view their own appointments
SELECT * FROM appointments WHERE patient_id = auth.uid();
```

#### Admin Access Patterns
```sql
-- Admins have unrestricted access to all tables
SELECT * FROM doctors; -- No restrictions
SELECT * FROM patients; -- No restrictions
SELECT * FROM appointments; -- No restrictions
```

## Testing RLS Policies

Use the provided test script to verify RLS policies:

```bash
node scripts/test-rls-policies.js
```

The test script verifies:
1. Admin can access all data
2. Doctors can only access their own data and related patient information
3. Patients can only access their own data and available doctors
4. Anonymous users are blocked from all data
5. Appointment-specific access rules work correctly

## Performance Considerations

### Indexes for RLS Performance

The following indexes are created to optimize RLS policy performance:

```sql
-- User role-based queries
CREATE INDEX idx_user_profiles_role ON user_profiles(user_role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);

-- Appointment queries with RLS
CREATE INDEX idx_appointments_doctor_status_date ON appointments(doctor_id, status, appointment_date);
CREATE INDEX idx_appointments_patient_status_date ON appointments(patient_id, status, appointment_date);
```

### Query Optimization Tips

1. **Use specific filters**: Always include role-based filters in queries
2. **Limit result sets**: Use pagination for large datasets
3. **Cache frequently accessed data**: Use React Query for client-side caching
4. **Monitor query performance**: Use Supabase dashboard to monitor slow queries

## Security Best Practices

### 1. Principle of Least Privilege
- Users can only access data they need for their role
- No user can access another user's private information without proper relationship

### 2. Defense in Depth
- RLS policies are enforced at the database level
- Additional validation in application code
- Audit logging for sensitive operations

### 3. Regular Security Reviews
- Review and test RLS policies regularly
- Monitor audit logs for suspicious activity
- Update policies as requirements change

## Troubleshooting

### Common Issues

1. **Policy Not Working**: Ensure RLS is enabled on the table
2. **Access Denied**: Check user role and policy conditions
3. **Performance Issues**: Review indexes and query patterns
4. **Audit Log Gaps**: Verify triggers are properly installed

### Debugging Queries

Use these queries to debug RLS issues:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View all policies for a table
SELECT * FROM pg_policies WHERE tablename = 'appointments';

-- Check current user context
SELECT auth.uid(), auth.role();
```

## Migration Notes

When updating RLS policies:

1. **Test thoroughly**: Use the test script before deploying
2. **Backup data**: Always backup before major policy changes
3. **Gradual rollout**: Consider feature flags for policy changes
4. **Monitor performance**: Watch for performance impacts after deployment

## Compliance

These RLS policies help ensure compliance with:

- **HIPAA**: Patient data is protected and access is logged
- **GDPR**: Users can control their own data
- **SOC 2**: Access controls and audit logging are implemented