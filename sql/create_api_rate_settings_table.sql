-- Create API rate settings table for storing rate control configuration
CREATE TABLE IF NOT EXISTS api_rate_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_name VARCHAR(50) NOT NULL UNIQUE,
    setting_value INTEGER NOT NULL,
    description TEXT,
    min_value INTEGER DEFAULT 1,
    max_value INTEGER DEFAULT 100,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_rate_settings_name ON api_rate_settings(setting_name);

-- Insert default rate settings
INSERT INTO api_rate_settings (setting_name, setting_value, description, min_value, max_value) VALUES
('account_monitoring_rate', 1, 'Number of API calls per hour for account monitoring', 1, 10),
('engagement_monitoring_rate', 1, 'Engagement monitoring mode: 1=Smart, 2=Hourly, 3=30min, 4=15min', 1, 4)
ON CONFLICT (setting_name) DO UPDATE SET
    description = EXCLUDED.description,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    updated_at = NOW();

-- Add comments to the table
COMMENT ON TABLE api_rate_settings IS 'Stores API rate control settings for the dual-control slider system';
COMMENT ON COLUMN api_rate_settings.setting_name IS 'Unique identifier for the setting';
COMMENT ON COLUMN api_rate_settings.setting_value IS 'Current value of the setting';
COMMENT ON COLUMN api_rate_settings.description IS 'Human-readable description of what this setting controls';
COMMENT ON COLUMN api_rate_settings.min_value IS 'Minimum allowed value for this setting';
COMMENT ON COLUMN api_rate_settings.max_value IS 'Maximum allowed value for this setting';
