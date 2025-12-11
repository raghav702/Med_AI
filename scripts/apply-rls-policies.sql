-- Enhanced Row Level Security (RLS) Policies
-- Run this script in your Supabase SQL Editor to apply RLS policies
-- Make sure to run this as a user with sufficient privileges (service_role or postgres)

-- First, let's create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is a doctor
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND user_role = 'doctor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is a patient
CREATE OR REPLACE FUNCTION is_patient()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND user_role = 'patient'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to recreate them with admin support
-- Doctors table policies
DROP POLICY IF EXISTS "Doctors can view own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can insert own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can update own profile" ON doctors;
DROP POLICY IF EXISTS "Patients can view doctor profiles" ON doctors;

-- Patients table policies
DROP POLICY IF EXISTS "Patients can view own profile" ON patients;
DROP POLICY IF EXISTS "Patients can insert own profile" ON patients;
DROP POLICY IF EXISTS "Patients can update own profile" ON patients;
DROP POLICY IF EXISTS "Doctors can view patient profiles for their appointments" ON patients;

-- Doctor availability policies
DROP POLICY IF EXISTS "Doctors can manage own availability" ON doctor_availability;
DROP POLICY IF EXISTS "Patients can view doctor availability" ON doctor_availability;

-- Appointments table policies
DROP POLICY IF EXISTS "Doctors can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can update their appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can update their own appointments" ON appointments;

-- Time slots policies
DROP POLICY IF EXISTS "Doctors can manage own time slots" ON appointment_time_slots;
DROP POLICY IF EXISTS "Patients can view available time slots" ON appointment_time_slots;

-- ============================================================================
-- ENHANCED RLS POLICIES FOR DOCTORS TABLE
-- ============================================================================

-- Doctors can view their own profile
CREATE POLICY "doctors_select_own" ON doctors
  FOR SELECT USING (
    auth.uid() = id OR is_admin()
  );

-- Doctors can insert their own profile
CREATE POLICY "doctors_insert_own" ON doctors
  FOR INSERT WITH CHECK (
    auth.uid() = id AND is_doctor()
  );

-- Doctors can update their own profile
CREATE POLICY "doctors_update_own" ON doctors
  FOR UPDATE USING (
    auth.uid() = id OR is_admin()
  );

-- Doctors can delete their own profile
CREATE POLICY "doctors_delete_own" ON doctors
  FOR DELETE USING (
    auth.uid() = id OR is_admin()
  );

-- Patients can view doctor profiles that are accepting patients
CREATE POLICY "patients_view_available_doctors" ON doctors
  FOR SELECT USING (
    is_accepting_patients = true AND is_patient()
  );

-- Admins have full access to doctors table
CREATE POLICY "admins_full_access_doctors" ON doctors
  FOR ALL USING (is_admin());

-- ============================================================================
-- ENHANCED RLS POLICIES FOR PATIENTS TABLE
-- ============================================================================

-- Patients can view their own profile
CREATE POLICY "patients_select_own" ON patients
  FOR SELECT USING (
    auth.uid() = id OR is_admin()
  );

-- Patients can insert their own profile
CREATE POLICY "patients_insert_own" ON patients
  FOR INSERT WITH CHECK (
    auth.uid() = id AND is_patient()
  );

-- Patients can update their own profile
CREATE POLICY "patients_update_own" ON patients
  FOR UPDATE USING (
    auth.uid() = id OR is_admin()
  );

-- Patients can delete their own profile
CREATE POLICY "patients_delete_own" ON patients
  FOR DELETE USING (
    auth.uid() = id OR is_admin()
  );

-- Doctors can view patient profiles for their appointments
CREATE POLICY "doctors_view_appointment_patients" ON patients
  FOR SELECT USING (
    is_doctor() AND EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.patient_id = patients.id 
      AND appointments.doctor_id = auth.uid()
      AND appointments.status IN ('approved', 'completed')
    )
  );

-- Admins have full access to patients table
CREATE POLICY "admins_full_access_patients" ON patients
  FOR ALL USING (is_admin());

-- ============================================================================
-- ENHANCED RLS POLICIES FOR DOCTOR_AVAILABILITY TABLE
-- ============================================================================

-- Doctors can manage their own availability
CREATE POLICY "doctors_manage_own_availability" ON doctor_availability
  FOR ALL USING (
    auth.uid() = doctor_id OR is_admin()
  );

-- Patients can view available doctor schedules
CREATE POLICY "patients_view_doctor_availability" ON doctor_availability
  FOR SELECT USING (
    is_available = true AND is_patient()
  );

-- Admins have full access to availability table
CREATE POLICY "admins_full_access_availability" ON doctor_availability
  FOR ALL USING (is_admin());

-- ============================================================================
-- ENHANCED RLS POLICIES FOR APPOINTMENTS TABLE
-- ============================================================================

-- Doctors can view their appointments
CREATE POLICY "doctors_view_own_appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = doctor_id OR is_admin()
  );

-- Patients can view their appointments
CREATE POLICY "patients_view_own_appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = patient_id OR is_admin()
  );

-- Patients can create appointments for themselves
CREATE POLICY "patients_create_appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.uid() = patient_id AND is_patient()
  );

-- Doctors can update appointments (approve, reject, add notes)
CREATE POLICY "doctors_update_appointments" ON appointments
  FOR UPDATE USING (
    auth.uid() = doctor_id OR is_admin()
  );

-- Patients can update their own appointments (limited fields and conditions)
CREATE POLICY "patients_update_own_appointments" ON appointments
  FOR UPDATE USING (
    auth.uid() = patient_id 
    AND status IN ('pending', 'approved') 
    AND appointment_date > CURRENT_DATE
    AND is_patient()
  );

-- Doctors can delete appointments (cancel)
CREATE POLICY "doctors_delete_appointments" ON appointments
  FOR DELETE USING (
    auth.uid() = doctor_id OR is_admin()
  );

-- Patients can delete their own pending appointments
CREATE POLICY "patients_delete_pending_appointments" ON appointments
  FOR DELETE USING (
    auth.uid() = patient_id 
    AND status = 'pending'
    AND is_patient()
  );

-- Admins have full access to appointments table
CREATE POLICY "admins_full_access_appointments" ON appointments
  FOR ALL USING (is_admin());

-- ============================================================================
-- ENHANCED RLS POLICIES FOR APPOINTMENT_TIME_SLOTS TABLE
-- ============================================================================

-- Doctors can manage their own time slots
CREATE POLICY "doctors_manage_own_time_slots" ON appointment_time_slots
  FOR ALL USING (
    auth.uid() = doctor_id OR is_admin()
  );

-- Patients can view available time slots
CREATE POLICY "patients_view_available_time_slots" ON appointment_time_slots
  FOR SELECT USING (
    is_available = true 
    AND is_blocked = false 
    AND slot_date >= CURRENT_DATE
    AND is_patient()
  );

-- Admins have full access to time slots table
CREATE POLICY "admins_full_access_time_slots" ON appointment_time_slots
  FOR ALL USING (is_admin());

-- ============================================================================
-- ENHANCED RLS POLICIES FOR USER_PROFILES TABLE
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id OR is_admin()
  );

-- Users can insert their own profile
CREATE POLICY "users_insert_own_profile" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE USING (
    auth.uid() = id OR is_admin()
  );

-- Users can delete their own profile
CREATE POLICY "users_delete_own_profile" ON user_profiles
  FOR DELETE USING (
    auth.uid() = id OR is_admin()
  );

-- Doctors can view basic patient info for their appointments
CREATE POLICY "doctors_view_patient_basic_info" ON user_profiles
  FOR SELECT USING (
    is_doctor() AND user_role = 'patient' AND EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.patient_id = user_profiles.id 
      AND appointments.doctor_id = auth.uid()
      AND appointments.status IN ('approved', 'completed')
    )
  );

-- Patients can view basic doctor info
CREATE POLICY "patients_view_doctor_basic_info" ON user_profiles
  FOR SELECT USING (
    is_patient() AND user_role = 'doctor'
  );

-- Admins have full access to user profiles
CREATE POLICY "admins_full_access_user_profiles" ON user_profiles
  FOR ALL USING (is_admin());

-- ============================================================================
-- ENHANCED RLS POLICIES FOR MEDICAL_RECORDS TABLE (if exists)
-- ============================================================================

-- Check if medical_records table exists and add policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'medical_records') THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own records" ON medical_records;
    DROP POLICY IF EXISTS "Users can insert own records" ON medical_records;
    
    -- Patients can view their own medical records
    EXECUTE 'CREATE POLICY "patients_view_own_medical_records" ON medical_records
      FOR SELECT USING (
        auth.uid() = user_id OR is_admin()
      )';
    
    -- Patients can insert their own medical records
    EXECUTE 'CREATE POLICY "patients_insert_own_medical_records" ON medical_records
      FOR INSERT WITH CHECK (
        auth.uid() = user_id AND is_patient()
      )';
    
    -- Patients can update their own medical records
    EXECUTE 'CREATE POLICY "patients_update_own_medical_records" ON medical_records
      FOR UPDATE USING (
        auth.uid() = user_id OR is_admin()
      )';
    
    -- Doctors can view medical records for their patients (with appointments)
    EXECUTE 'CREATE POLICY "doctors_view_patient_medical_records" ON medical_records
      FOR SELECT USING (
        is_doctor() AND EXISTS (
          SELECT 1 FROM appointments 
          WHERE appointments.patient_id = medical_records.user_id 
          AND appointments.doctor_id = auth.uid()
          AND appointments.status IN (''approved'', ''completed'')
        )
      )';
    
    -- Admins have full access to medical records
    EXECUTE 'CREATE POLICY "admins_full_access_medical_records" ON medical_records
      FOR ALL USING (is_admin())';
  END IF;
END $$;

-- ============================================================================
-- SECURITY FUNCTIONS FOR ADDITIONAL VALIDATION
-- ============================================================================

-- Function to validate appointment booking rules
CREATE OR REPLACE FUNCTION validate_appointment_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if patient is trying to book with themselves (if they're also a doctor)
  IF NEW.patient_id = NEW.doctor_id THEN
    RAISE EXCEPTION 'Patients cannot book appointments with themselves';
  END IF;
  
  -- Check if the appointment time slot is available
  IF EXISTS (
    SELECT 1 FROM appointments 
    WHERE doctor_id = NEW.doctor_id 
    AND appointment_date = NEW.appointment_date 
    AND appointment_time = NEW.appointment_time 
    AND status IN ('approved', 'pending')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked or pending approval';
  END IF;
  
  -- Check if doctor is available on this day and time
  IF NOT EXISTS (
    SELECT 1 FROM doctor_availability da
    WHERE da.doctor_id = NEW.doctor_id
    AND da.day_of_week = EXTRACT(DOW FROM NEW.appointment_date)::availability_day
    AND da.start_time <= NEW.appointment_time
    AND da.end_time >= (NEW.appointment_time + (NEW.duration_minutes || ' minutes')::INTERVAL)::TIME
    AND da.is_available = true
  ) THEN
    RAISE EXCEPTION 'Doctor is not available at the requested time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointment validation
DROP TRIGGER IF EXISTS validate_appointment_booking_trigger ON appointments;
CREATE TRIGGER validate_appointment_booking_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_appointment_booking();

-- ============================================================================
-- AUDIT LOGGING SETUP
-- ============================================================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "admins_view_audit_logs" ON audit_logs
  FOR SELECT USING (is_admin());

-- Function to log sensitive operations
CREATE OR REPLACE FUNCTION log_sensitive_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log operations on sensitive tables
  IF TG_TABLE_NAME IN ('doctors', 'patients', 'appointments', 'user_profiles') THEN
    INSERT INTO audit_logs (table_name, operation, user_id, old_data, new_data)
    VALUES (
      TG_TABLE_NAME,
      TG_OP,
      auth.uid(),
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for sensitive tables
DROP TRIGGER IF EXISTS audit_doctors_trigger ON doctors;
CREATE TRIGGER audit_doctors_trigger
  AFTER INSERT OR UPDATE OR DELETE ON doctors
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();

DROP TRIGGER IF EXISTS audit_patients_trigger ON patients;
CREATE TRIGGER audit_patients_trigger
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();

DROP TRIGGER IF EXISTS audit_appointments_trigger ON appointments;
CREATE TRIGGER audit_appointments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();

DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
CREATE TRIGGER audit_user_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Create indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status_date ON appointments(doctor_id, status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status_date ON appointments(patient_id, status, appointment_date);

-- Analyze tables for query optimization
ANALYZE doctors;
ANALYZE patients;
ANALYZE appointments;
ANALYZE doctor_availability;
ANALYZE appointment_time_slots;
ANALYZE user_profiles;