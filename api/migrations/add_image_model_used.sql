-- Add model_used column to generated_images table for multi-model support
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS model_used VARCHAR(50) DEFAULT NULL AFTER credits_deducted;
