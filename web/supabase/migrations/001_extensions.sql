-- Migration: 001_extensions
-- Enable PostGIS for spatial queries (polygon search, ST_Within, ST_GeomFromGeoJSON)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
