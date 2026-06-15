-- Migração: IA features, PlatformConfig, iaLicensed, iaSuggestions
-- Execute no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS "platform_config" (
  "key"   TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL
);

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "ia_licensed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "ia_suggestions" JSONB;
