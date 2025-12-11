
-- STEP 2: Create enum types
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE appointment_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');

-- STEP 3: Create user_profiles table (basic user info)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: Create doctors table (matches CSV format)
CREATE TABLE doctors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  works_for TEXT,
  url TEXT,
  experience INTEGER,
  price_range DECIMAL(10,2),
  available_service TEXT,
  same_as TEXT,
  aggregate_rating DECIMAL(5,2),
  lng DECIMAL(10,7),
  specialty TEXT NOT NULL,
  lat DECIMAL(10,7),
  opening_hours TEXT[], -- Array of strings like ['Mo 09:30-21:00', 'Tu 09:30-21:00']
  qualifications TEXT,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT doctors_user_profile_fkey FOREIGN KEY (id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- STEP 5: Create patients table (simple patient info)
CREATE TABLE patients (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT patients_user_profile_fkey FOREIGN KEY (id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- STEP 6: Create appointments table
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status DEFAULT 'pending',
  reason TEXT,
  doctor_notes TEXT,
  patient_notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 7: Create indexes for performance
CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_location ON doctors(lat, lng);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- STEP 8: Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS Policies

-- user_profiles: Users can view, create, and update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- doctors: Everyone can view doctors, doctors can update their own profile
CREATE POLICY "Anyone can view doctors" ON doctors
  FOR SELECT USING (true);

CREATE POLICY "Doctors can update own profile" ON doctors
  FOR UPDATE USING (auth.uid() = id);

-- patients: Patients can view, create, and update their own profile
CREATE POLICY "Patients can view own profile" ON patients
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Patients can create own profile" ON patients
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Patients can update own profile" ON patients
  FOR UPDATE USING (auth.uid() = id);

-- appointments: Patients and doctors can view their own appointments
CREATE POLICY "Patients can view their appointments" ON appointments
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their appointments" ON appointments
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can create appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their appointments" ON appointments
  FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can update appointments" ON appointments
  FOR UPDATE USING (auth.uid() = doctor_id);

-- STEP 10: Create function to prevent duplicate roles
CREATE OR REPLACE FUNCTION check_unique_user_role()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE email = NEW.email AND user_role != NEW.user_role
  ) THEN
    RAISE EXCEPTION 'Email already registered with a different role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_unique_user_role
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_unique_user_role();

-- DONE!
SELECT 'Database schema created successfully!' as message;
SELECT 'Tables created: user_profiles, doctors, patients, appointments' as info;
