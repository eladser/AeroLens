-- AeroLens Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- TRIPS TABLE
-- ============================================
-- Stores user trips (collections of tracked flights)

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON public.trips(share_token) WHERE share_token IS NOT NULL;

-- ============================================
-- TRACKED FLIGHTS TABLE
-- ============================================
-- Stores flights tracked within trips

CREATE TABLE IF NOT EXISTS public.tracked_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  callsign TEXT NOT NULL,
  icao24 TEXT,
  flight_number TEXT,
  origin_iata TEXT,
  destination_iata TEXT,
  departure_date DATE,
  departure_time TIME,
  arrival_date DATE,
  arrival_time TIME,
  airline_name TEXT,
  aircraft_type TEXT,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster trip queries
CREATE INDEX IF NOT EXISTS idx_tracked_flights_trip_id ON public.tracked_flights(trip_id);
CREATE INDEX IF NOT EXISTS idx_tracked_flights_callsign ON public.tracked_flights(callsign);

-- ============================================
-- ALERT PREFERENCES TABLE
-- ============================================
-- Stores user notification preferences

CREATE TABLE IF NOT EXISTS public.alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Notification channels
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,

  -- Alert types
  delay_predictions_enabled BOOLEAN DEFAULT TRUE,
  delay_threshold_minutes INTEGER DEFAULT 15,
  status_changes_enabled BOOLEAN DEFAULT TRUE,
  gate_changes_enabled BOOLEAN DEFAULT TRUE,
  departure_reminder_enabled BOOLEAN DEFAULT TRUE,
  departure_reminder_minutes INTEGER DEFAULT 120,
  landing_notification_enabled BOOLEAN DEFAULT FALSE,
  weather_alerts_enabled BOOLEAN DEFAULT TRUE,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '23:00',
  quiet_hours_end TIME DEFAULT '07:00',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_alert_preferences_user_id ON public.alert_preferences(user_id);

-- ============================================
-- SAVED AIRPORTS TABLE
-- ============================================
-- Stores user's favorite/home airports

CREATE TABLE IF NOT EXISTS public.saved_airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  iata_code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_home BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, iata_code)
);

CREATE INDEX IF NOT EXISTS idx_saved_airports_user_id ON public.saved_airports(user_id);

-- ============================================
-- FLIGHT HISTORY TABLE
-- ============================================
-- Stores historical flight data for analytics

CREATE TABLE IF NOT EXISTS public.flight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  callsign TEXT NOT NULL,
  icao24 TEXT,
  origin_iata TEXT,
  destination_iata TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  predicted_delay_minutes INTEGER,
  actual_delay_minutes INTEGER,
  distance_km NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flight_history_user_id ON public.flight_history(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_history_created_at ON public.flight_history(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_history ENABLE ROW LEVEL SECURITY;

-- TRIPS POLICIES
-- Users can view their own trips
CREATE POLICY "Users can view own trips" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view public trips via share token
CREATE POLICY "Anyone can view public trips" ON public.trips
  FOR SELECT USING (is_public = TRUE);

-- Users can create trips for themselves
CREATE POLICY "Users can create own trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update own trips" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- TRACKED FLIGHTS POLICIES
-- Users can view flights in their trips
CREATE POLICY "Users can view own tracked flights" ON public.tracked_flights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = tracked_flights.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Users can view flights in public trips
CREATE POLICY "Anyone can view public trip flights" ON public.tracked_flights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = tracked_flights.trip_id
      AND trips.is_public = TRUE
    )
  );

-- Users can add flights to their trips
CREATE POLICY "Users can add flights to own trips" ON public.tracked_flights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = tracked_flights.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Users can update flights in their trips
CREATE POLICY "Users can update own tracked flights" ON public.tracked_flights
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = tracked_flights.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Users can delete flights from their trips
CREATE POLICY "Users can delete own tracked flights" ON public.tracked_flights
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = tracked_flights.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ALERT PREFERENCES POLICIES
-- Users can only see their own preferences
CREATE POLICY "Users can view own alert preferences" ON public.alert_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own preferences
CREATE POLICY "Users can create own alert preferences" ON public.alert_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own alert preferences" ON public.alert_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own alert preferences" ON public.alert_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- SAVED AIRPORTS POLICIES
CREATE POLICY "Users can view own saved airports" ON public.saved_airports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own saved airports" ON public.saved_airports
  FOR ALL USING (auth.uid() = user_id);

-- FLIGHT HISTORY POLICIES
CREATE POLICY "Users can view own flight history" ON public.flight_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own flight history" ON public.flight_history
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for trips table
DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for alert_preferences table
DROP TRIGGER IF EXISTS update_alert_preferences_updated_at ON public.alert_preferences;
CREATE TRIGGER update_alert_preferences_updated_at
  BEFORE UPDATE ON public.alert_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to make a trip public and generate share token
CREATE OR REPLACE FUNCTION make_trip_public(trip_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  token := generate_share_token();

  UPDATE public.trips
  SET is_public = TRUE, share_token = token
  WHERE id = trip_uuid AND user_id = auth.uid();

  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make a trip private
CREATE OR REPLACE FUNCTION make_trip_private(trip_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.trips
  SET is_public = FALSE, share_token = NULL
  WHERE id = trip_uuid AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DEFAULT DATA / SEED
-- ============================================

-- Create default alert preferences for new users (via trigger)
CREATE OR REPLACE FUNCTION create_default_alert_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.alert_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger should be created on auth.users but that requires
-- superuser access. Instead, we'll create preferences on first access
-- from the application.
