-- Migration: Add business_type support to MVP Pro
-- Date: 2026-05-07
-- Purpose: Add business_type, geolocation, and verification fields to barbershops table
-- Note: Keep column names as-is to avoid breaking changes

-- Step 1: Add business_type column
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'barbershop' CHECK (business_type IN ('barbershop', 'beauty_salon', 'spa', 'other'));

-- Step 2: Add geolocation columns
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Step 3: Add verification status
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'premium'));

-- Step 4: Make business_type NOT NULL with existing data
UPDATE barbershops SET business_type = 'barbershop' WHERE business_type IS NULL;
ALTER TABLE barbershops ALTER COLUMN business_type SET NOT NULL;

-- Verify migration success:
-- SELECT id, name, business_type, latitude, longitude, verification_status FROM barbershops LIMIT 5;
