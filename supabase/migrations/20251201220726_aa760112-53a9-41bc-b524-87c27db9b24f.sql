-- Make ai_analysis nullable since we're no longer using AI analysis
ALTER TABLE vendor_contracts 
ALTER COLUMN ai_analysis DROP NOT NULL;