-- PostgreSQL schema for Soccer Academy Management System (Zambia)
-- Requires: pgcrypto for encryption utilities and citext for case-insensitive text
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Soccer Academies
CREATE TABLE IF NOT EXISTS academies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  password_hash TEXT, -- password hash for academy login
  address TEXT,
  district TEXT,
  province TEXT,
  phone TEXT,
  website TEXT,
  academy_type TEXT CHECK (academy_type IN ('youth', 'professional', 'community', 'elite')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  director_name TEXT,
  director_email TEXT,
  director_phone TEXT,
  founded_year INTEGER,
  facilities TEXT[], -- array of facilities like 'grass_field', 'artificial_turf', 'gym', 'dormitory'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff Users (RBAC)
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('superadmin', 'academy_admin', 'head_coach', 'coach', 'trainer', 'staff');
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY,
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Players: PII columns stored encrypted-at-rest (ciphertext)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY,
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  -- Player ID card (6 unique characters) for secure authentication
  player_card_id TEXT NOT NULL UNIQUE CHECK (LENGTH(player_card_id) = 6),
  
  -- NRC stored as salted hash for lookups without exposing raw NRC
  nrc_hash TEXT NOT NULL UNIQUE,
  nrc_salt TEXT NOT NULL,

  -- Additional authentication methods (optional, set after initial registration)
  email_cipher BYTEA,
  phone_auth_cipher BYTEA, -- phone number for authentication
  password_hash TEXT, -- optional password for login
  
  -- Encrypted columns (application encrypt/decrypt)
  first_name_cipher BYTEA,
  last_name_cipher BYTEA,
  gender TEXT,
  dob_cipher BYTEA,
  phone_cipher BYTEA,
  address_cipher BYTEA,
  guardian_contact_name_cipher BYTEA,
  guardian_contact_phone_cipher BYTEA,
  
  -- Player-specific details
  position TEXT, -- goalkeeper, defender, midfielder, forward
  preferred_foot TEXT CHECK (preferred_foot IN ('left', 'right', 'both')),
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  jersey_number INTEGER,
  registration_date DATE,
  guardian_info_cipher BYTEA,
  medical_info_cipher BYTEA,
  playing_history_cipher BYTEA,
  emergency_contact_cipher BYTEA,

  -- Digital card
  card_id TEXT NOT NULL UNIQUE,
  card_qr_signature TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_players_card_id ON players(card_id);

-- Coaches (extends staff_users with coach-specific information)
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  
  -- Coach-specific information
  specialization TEXT NOT NULL, -- youth_development, goalkeeping, fitness, tactics
  license_level TEXT, -- CAF C, CAF B, CAF A, CAF Pro
  experience_years INTEGER DEFAULT 0,
  playing_background TEXT,
  
  -- Contact and personal details
  date_of_birth DATE,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary DECIMAL(10,2),
  
  -- Status and availability
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_head_coach BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Additional information
  bio TEXT,
  certifications TEXT[],
  languages_spoken TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one coach record per staff user
  UNIQUE(staff_user_id)
);
CREATE INDEX IF NOT EXISTS idx_coaches_academy ON coaches(academy_id);
CREATE INDEX IF NOT EXISTS idx_coaches_staff_user ON coaches(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_coaches_employee_id ON coaches(employee_id);
CREATE INDEX IF NOT EXISTS idx_coaches_specialization ON coaches(specialization);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT NOT NULL, -- U10, U12, U14, U16, U18, Senior
  division TEXT, -- Premier, First Division, etc.
  season TEXT NOT NULL,
  head_coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  assistant_coaches UUID[], -- array of coach IDs
  max_players INTEGER DEFAULT 25,
  current_players INTEGER DEFAULT 0,
  team_color TEXT,
  home_ground TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique team per academy, age group, and season
  UNIQUE(academy_id, age_group, season)
);
CREATE INDEX IF NOT EXISTS idx_teams_academy ON teams(academy_id);
CREATE INDEX IF NOT EXISTS idx_teams_coach ON teams(head_coach_id);
CREATE INDEX IF NOT EXISTS idx_teams_age_group ON teams(age_group);
CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season);

-- Training Sessions
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  session_number TEXT NOT NULL UNIQUE,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  objectives TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('technical','tactical','physical','mental','match_preparation','recovery')),
  intensity TEXT NOT NULL DEFAULT 'medium' CHECK (intensity IN ('low','medium','high','very_high')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 90,
  location TEXT,
  equipment_needed TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_sessions_academy ON training_sessions(academy_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_coach ON training_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_team ON training_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date);

-- Team Memberships (Many-to-Many relationship between players and teams)
CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  jersey_number INTEGER,
  position TEXT,
  is_captain BOOLEAN DEFAULT FALSE,
  is_vice_captain BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure a player can only be in one team per season (handled at application level)
  UNIQUE(team_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_player ON team_memberships(player_id);

-- Player Performance Records
CREATE TABLE IF NOT EXISTS player_performance (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  performance_type TEXT NOT NULL CHECK (performance_type IN ('training', 'match', 'assessment')),
  date DATE NOT NULL,
  technical_rating INTEGER CHECK (technical_rating BETWEEN 1 AND 10),
  tactical_rating INTEGER CHECK (tactical_rating BETWEEN 1 AND 10),
  physical_rating INTEGER CHECK (physical_rating BETWEEN 1 AND 10),
  mental_rating INTEGER CHECK (mental_rating BETWEEN 1 AND 10),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 10),
  coach_notes TEXT,
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_player_performance_player ON player_performance(player_id, date DESC);

-- Training Attendance
CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'injured')),
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  notes TEXT,
  recorded_by UUID REFERENCES staff_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_attendance_player ON training_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_session ON training_attendance(session_id);

-- Matches/Games
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  home_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  away_team TEXT NOT NULL, -- opponent team name
  match_type TEXT NOT NULL CHECK (match_type IN ('friendly', 'league', 'cup', 'tournament')),
  competition_name TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  is_home_match BOOLEAN NOT NULL DEFAULT TRUE,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled', 'postponed')),
  referee TEXT,
  weather_conditions TEXT,
  attendance_count INTEGER,
  match_report TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_matches_academy ON matches(academy_id);
CREATE INDEX IF NOT EXISTS idx_matches_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);

-- Offline sync queue (server side ingestion auditing)
CREATE TABLE IF NOT EXISTS sync_ingest (
  id UUID PRIMARY KEY,
  source_academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  source_device_id TEXT,
  op_type TEXT NOT NULL CHECK (op_type IN ('create','update','delete')),
  entity TEXT NOT NULL,
  entity_id TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_ingest_processed ON sync_ingest(processed_at);

-- Academy Website Builder Tables

-- Website configurations for each academy
CREATE TABLE IF NOT EXISTS academy_websites (
  id UUID PRIMARY KEY,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  domain_name TEXT UNIQUE, -- custom domain or subdomain
  subdomain TEXT NOT NULL UNIQUE, -- sofwan subdomain like "academy-name.sofwan.com"
  title TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  theme_id UUID, -- references website_themes
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  custom_css TEXT,
  analytics_code TEXT, -- Google Analytics, etc.
  contact_email TEXT,
  contact_phone TEXT,
  social_links JSONB, -- {"facebook": "url", "twitter": "url", etc.}
  seo_settings JSONB, -- meta tags, keywords, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academy_websites_academy ON academy_websites(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_websites_subdomain ON academy_websites(subdomain);

-- Pre-built themes for academy websites
CREATE TABLE IF NOT EXISTS website_themes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  css_template TEXT NOT NULL,
  layout_config JSONB NOT NULL, -- defines available sections and components
  color_scheme JSONB, -- primary, secondary, accent colors
  font_settings JSONB, -- font families, sizes
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Website pages (home, about, teams, coaches, contact, etc.)
CREATE TABLE IF NOT EXISTS website_pages (
  id UUID PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES academy_websites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, -- URL slug like "about", "teams", "coaches"
  title TEXT NOT NULL,
  meta_description TEXT,
  content JSONB NOT NULL, -- page content in structured format
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(website_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_website_pages_website ON website_pages(website_id, sort_order);

-- Website components/sections (hero, teams, coaches, matches, etc.)
CREATE TABLE IF NOT EXISTS website_components (
  id UUID PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL, -- "hero", "teams", "coaches", "matches", "contact_form"
  component_data JSONB NOT NULL, -- component-specific data
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_website_components_page ON website_components(page_id, sort_order);

-- Website media/assets
CREATE TABLE IF NOT EXISTS website_media (
  id UUID PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES academy_websites(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_website_media_website ON website_media(website_id);

-- Helper function concept (Application should implement application-level encryption using key rotation).
