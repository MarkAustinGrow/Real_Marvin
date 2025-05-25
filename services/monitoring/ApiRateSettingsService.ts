import { SupabaseService } from '../supabase/SupabaseService';

export interface RateSetting {
    id: string;
    setting_name: string;
    setting_value: number;
    description?: string;
    min_value?: number;
    max_value?: number;
    updated_at: string;
    updated_by?: string;
    created_at: string;
}

export interface RateSettings {
    account_monitoring_rate: number;
    engagement_monitoring_rate: number;
}

/**
 * Service for managing API rate control settings
 * Provides persistent storage and retrieval of rate limiting configuration
 */
export class ApiRateSettingsService {
    private static instance: ApiRateSettingsService;
    private supabase: SupabaseService;
    private cache: Map<string, number> = new Map();
    private lastCacheUpdate: Date | null = null;
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    private constructor() {
        this.supabase = SupabaseService.getInstance();
    }

    public static getInstance(): ApiRateSettingsService {
        if (!ApiRateSettingsService.instance) {
            ApiRateSettingsService.instance = new ApiRateSettingsService();
        }
        return ApiRateSettingsService.instance;
    }

    /**
     * Get all rate settings from the database
     * @returns Promise<RateSettings> Current rate settings
     */
    public async getRateSettings(): Promise<RateSettings> {
        try {
            const { data, error } = await this.supabase.client
                .from('api_rate_settings')
                .select('*')
                .order('setting_name');

            if (error) {
                console.error('Error fetching rate settings:', error);
                // Return default values if database error
                return {
                    account_monitoring_rate: 1,
                    engagement_monitoring_rate: 1
                };
            }

            // Convert array to object
            const settings: RateSettings = {
                account_monitoring_rate: 1,
                engagement_monitoring_rate: 1
            };

            data.forEach((setting: RateSetting) => {
                if (setting.setting_name === 'account_monitoring_rate') {
                    settings.account_monitoring_rate = setting.setting_value;
                } else if (setting.setting_name === 'engagement_monitoring_rate') {
                    settings.engagement_monitoring_rate = setting.setting_value;
                }
                
                // Update cache
                this.cache.set(setting.setting_name, setting.setting_value);
            });

            this.lastCacheUpdate = new Date();
            return settings;
        } catch (error) {
            console.error('Exception fetching rate settings:', error);
            // Return default values if any error
            return {
                account_monitoring_rate: 1,
                engagement_monitoring_rate: 1
            };
        }
    }

    /**
     * Update rate settings in the database
     * @param settings New rate settings to save
     * @param updatedBy Optional user identifier who made the change
     * @returns Promise<boolean> Success status
     */
    public async updateRateSettings(settings: RateSettings, updatedBy: string = 'web-interface'): Promise<boolean> {
        try {
            const updates = [
                {
                    setting_name: 'account_monitoring_rate',
                    setting_value: settings.account_monitoring_rate,
                    updated_by: updatedBy,
                    updated_at: new Date().toISOString()
                },
                {
                    setting_name: 'engagement_monitoring_rate',
                    setting_value: settings.engagement_monitoring_rate,
                    updated_by: updatedBy,
                    updated_at: new Date().toISOString()
                }
            ];

            for (const update of updates) {
                const { error } = await this.supabase.client
                    .from('api_rate_settings')
                    .upsert(update, { 
                        onConflict: 'setting_name',
                        ignoreDuplicates: false 
                    });

                if (error) {
                    console.error(`Error updating setting ${update.setting_name}:`, error);
                    return false;
                }

                // Update cache
                this.cache.set(update.setting_name, update.setting_value);
            }

            this.lastCacheUpdate = new Date();
            console.log('Rate settings updated successfully:', settings);
            return true;
        } catch (error) {
            console.error('Exception updating rate settings:', error);
            return false;
        }
    }

    /**
     * Get a specific setting by name (with caching)
     * @param settingName Name of the setting to retrieve
     * @returns Promise<number> Setting value or default
     */
    public async getSetting(settingName: string): Promise<number> {
        // Check cache first
        if (this.isCacheValid() && this.cache.has(settingName)) {
            return this.cache.get(settingName)!;
        }

        try {
            const { data, error } = await this.supabase.client
                .from('api_rate_settings')
                .select('setting_value')
                .eq('setting_name', settingName)
                .single();

            if (error || !data) {
                console.error(`Error fetching setting ${settingName}:`, error);
                // Return default based on setting name
                return this.getDefaultValue(settingName);
            }

            // Update cache
            this.cache.set(settingName, data.setting_value);
            this.lastCacheUpdate = new Date();

            return data.setting_value;
        } catch (error) {
            console.error(`Exception fetching setting ${settingName}:`, error);
            return this.getDefaultValue(settingName);
        }
    }

    /**
     * Set a specific setting by name
     * @param settingName Name of the setting to update
     * @param value New value for the setting
     * @param updatedBy Optional user identifier who made the change
     * @returns Promise<boolean> Success status
     */
    public async setSetting(settingName: string, value: number, updatedBy: string = 'system'): Promise<boolean> {
        try {
            // Validate the value
            if (!this.isValidValue(settingName, value)) {
                console.error(`Invalid value ${value} for setting ${settingName}`);
                return false;
            }

            const { error } = await this.supabase.client
                .from('api_rate_settings')
                .upsert({
                    setting_name: settingName,
                    setting_value: value,
                    updated_by: updatedBy,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'setting_name',
                    ignoreDuplicates: false 
                });

            if (error) {
                console.error(`Error setting ${settingName} to ${value}:`, error);
                return false;
            }

            // Update cache
            this.cache.set(settingName, value);
            this.lastCacheUpdate = new Date();

            console.log(`Setting ${settingName} updated to ${value} by ${updatedBy}`);
            return true;
        } catch (error) {
            console.error(`Exception setting ${settingName}:`, error);
            return false;
        }
    }

    /**
     * Get all settings as raw database records
     * @returns Promise<RateSetting[]> All rate settings
     */
    public async getAllSettings(): Promise<RateSetting[]> {
        try {
            const { data, error } = await this.supabase.client
                .from('api_rate_settings')
                .select('*')
                .order('setting_name');

            if (error) {
                console.error('Error fetching all settings:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Exception fetching all settings:', error);
            return [];
        }
    }

    /**
     * Clear the cache to force fresh database reads
     */
    public clearCache(): void {
        this.cache.clear();
        this.lastCacheUpdate = null;
        console.log('Rate settings cache cleared');
    }

    /**
     * Check if the cache is still valid
     * @returns boolean True if cache is valid
     */
    private isCacheValid(): boolean {
        if (!this.lastCacheUpdate) {
            return false;
        }
        
        const now = new Date();
        const cacheAge = now.getTime() - this.lastCacheUpdate.getTime();
        return cacheAge < this.CACHE_TTL_MS;
    }

    /**
     * Get default value for a setting
     * @param settingName Name of the setting
     * @returns number Default value
     */
    private getDefaultValue(settingName: string): number {
        switch (settingName) {
            case 'account_monitoring_rate':
                return 1;
            case 'engagement_monitoring_rate':
                return 1;
            default:
                return 1;
        }
    }

    /**
     * Validate a setting value
     * @param settingName Name of the setting
     * @param value Value to validate
     * @returns boolean True if valid
     */
    private isValidValue(settingName: string, value: number): boolean {
        if (!Number.isInteger(value) || value < 1) {
            return false;
        }

        switch (settingName) {
            case 'account_monitoring_rate':
                return value >= 1 && value <= 10;
            case 'engagement_monitoring_rate':
                return value >= 1 && value <= 4;
            default:
                return value >= 1 && value <= 100;
        }
    }

    /**
     * Initialize default settings in the database if they don't exist
     * @returns Promise<boolean> Success status
     */
    public async initializeDefaults(): Promise<boolean> {
        try {
            const defaults = [
                {
                    setting_name: 'account_monitoring_rate',
                    setting_value: 1,
                    description: 'Number of API calls per hour for account monitoring',
                    min_value: 1,
                    max_value: 10
                },
                {
                    setting_name: 'engagement_monitoring_rate',
                    setting_value: 1,
                    description: 'Engagement monitoring mode: 1=Smart, 2=Hourly, 3=30min, 4=15min',
                    min_value: 1,
                    max_value: 4
                }
            ];

            for (const defaultSetting of defaults) {
                const { error } = await this.supabase.client
                    .from('api_rate_settings')
                    .upsert(defaultSetting, { 
                        onConflict: 'setting_name',
                        ignoreDuplicates: true 
                    });

                if (error) {
                    console.error(`Error initializing default setting ${defaultSetting.setting_name}:`, error);
                    return false;
                }
            }

            console.log('Default rate settings initialized successfully');
            return true;
        } catch (error) {
            console.error('Exception initializing default settings:', error);
            return false;
        }
    }
}
