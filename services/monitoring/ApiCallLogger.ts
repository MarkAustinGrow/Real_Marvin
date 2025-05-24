import { SupabaseService } from '../supabase/SupabaseService';

export interface ApiCallLog {
    endpoint: string;
    method: string;
    response_code: number;
    rate_limit_remaining?: number;
    rate_limit_limit?: number;
    rate_limit_reset?: Date;
    user_limit_remaining?: number;
    user_limit_total?: number;
    user_limit_reset?: Date;
    request_details?: any;
    error_message?: string;
    service: string;
    execution_time_ms?: number;
}

/**
 * Service for logging all API calls to track usage and debug rate limiting issues
 */
export class ApiCallLogger {
    private static instance: ApiCallLogger;
    private supabase: SupabaseService;

    private constructor() {
        this.supabase = SupabaseService.getInstance();
    }

    public static getInstance(): ApiCallLogger {
        if (!ApiCallLogger.instance) {
            ApiCallLogger.instance = new ApiCallLogger();
        }
        return ApiCallLogger.instance;
    }

    /**
     * Log an API call to the database
     * @param logData The API call data to log
     */
    public async logApiCall(logData: ApiCallLog): Promise<void> {
        try {
            const { error } = await this.supabase.client
                .from('api_call_details')
                .insert({
                    endpoint: logData.endpoint,
                    method: logData.method,
                    response_code: logData.response_code,
                    rate_limit_remaining: logData.rate_limit_remaining,
                    rate_limit_limit: logData.rate_limit_limit,
                    rate_limit_reset: logData.rate_limit_reset?.toISOString(),
                    user_limit_remaining: logData.user_limit_remaining,
                    user_limit_total: logData.user_limit_total,
                    user_limit_reset: logData.user_limit_reset?.toISOString(),
                    request_details: logData.request_details,
                    error_message: logData.error_message,
                    service: logData.service,
                    execution_time_ms: logData.execution_time_ms
                });

            if (error) {
                console.error('Error logging API call:', error);
            }
        } catch (error) {
            console.error('Exception logging API call:', error);
        }
    }

    /**
     * Extract rate limit information from Twitter API response headers
     * @param response The response object from Twitter API
     * @returns Extracted rate limit information
     */
    public extractRateLimitInfo(response: any): {
        rate_limit_remaining?: number;
        rate_limit_limit?: number;
        rate_limit_reset?: Date;
        user_limit_remaining?: number;
        user_limit_total?: number;
        user_limit_reset?: Date;
    } {
        const rateLimitInfo: any = {};

        // Extract from response.rateLimit if available
        if (response.rateLimit) {
            rateLimitInfo.rate_limit_remaining = response.rateLimit.remaining;
            rateLimitInfo.rate_limit_limit = response.rateLimit.limit;
            if (response.rateLimit.reset) {
                rateLimitInfo.rate_limit_reset = new Date(response.rateLimit.reset * 1000);
            }
        }

        // Extract from error headers if this is an error response
        if (response.headers) {
            if (response.headers['x-rate-limit-remaining']) {
                rateLimitInfo.rate_limit_remaining = parseInt(response.headers['x-rate-limit-remaining']);
            }
            if (response.headers['x-rate-limit-limit']) {
                rateLimitInfo.rate_limit_limit = parseInt(response.headers['x-rate-limit-limit']);
            }
            if (response.headers['x-rate-limit-reset']) {
                rateLimitInfo.rate_limit_reset = new Date(parseInt(response.headers['x-rate-limit-reset']) * 1000);
            }
            if (response.headers['x-user-limit-24hour-remaining']) {
                rateLimitInfo.user_limit_remaining = parseInt(response.headers['x-user-limit-24hour-remaining']);
            }
            if (response.headers['x-user-limit-24hour-limit']) {
                rateLimitInfo.user_limit_total = parseInt(response.headers['x-user-limit-24hour-limit']);
            }
            if (response.headers['x-user-limit-24hour-reset']) {
                rateLimitInfo.user_limit_reset = new Date(parseInt(response.headers['x-user-limit-24hour-reset']) * 1000);
            }
        }

        return rateLimitInfo;
    }

    /**
     * Create a wrapper function for API calls that automatically logs them
     * @param endpoint The API endpoint being called
     * @param service The service making the call
     * @param apiCall The actual API call function
     * @returns The result of the API call
     */
    public async wrapApiCall<T>(
        endpoint: string,
        service: string,
        apiCall: () => Promise<T>,
        requestDetails?: any
    ): Promise<T> {
        const startTime = Date.now();
        let result: T | undefined;
        let error: any = null;
        let responseCode = 200;

        try {
            result = await apiCall();
            return result;
        } catch (err: any) {
            error = err;
            responseCode = err.code || err.status || 500;
            throw err;
        } finally {
            const executionTime = Date.now() - startTime;
            
            // Extract rate limit info from the result or error
            const rateLimitInfo = this.extractRateLimitInfo(error || result);

            // Log the API call
            await this.logApiCall({
                endpoint,
                method: 'GET', // Most Twitter API calls are GET
                response_code: responseCode,
                ...rateLimitInfo,
                request_details: requestDetails,
                error_message: error ? (error.message || JSON.stringify(error)) : undefined,
                service,
                execution_time_ms: executionTime
            });

            // Log to console for immediate visibility
            const status = error ? 'ERROR' : 'SUCCESS';
            const rateLimitStr = rateLimitInfo.user_limit_remaining !== undefined 
                ? ` | User Limit: ${rateLimitInfo.user_limit_remaining}/${rateLimitInfo.user_limit_total}`
                : '';
            const mainRateLimitStr = rateLimitInfo.rate_limit_remaining !== undefined
                ? ` | Rate Limit: ${rateLimitInfo.rate_limit_remaining}/${rateLimitInfo.rate_limit_limit}`
                : '';
            
            console.log(`[API LOG] ${status} | ${service} | ${endpoint} | ${executionTime}ms${rateLimitStr}${mainRateLimitStr}`);
        }
    }

    /**
     * Get API usage statistics for today
     */
    public async getTodayUsageStats(): Promise<{
        total_calls: number;
        calls_by_service: Record<string, number>;
        calls_by_endpoint: Record<string, number>;
        error_count: number;
        last_user_limit_remaining?: number;
    }> {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const { data, error } = await this.supabase.client
                .from('api_call_details')
                .select('*')
                .gte('timestamp', `${today}T00:00:00.000Z`)
                .lt('timestamp', `${today}T23:59:59.999Z`)
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('Error fetching usage stats:', error);
                return {
                    total_calls: 0,
                    calls_by_service: {},
                    calls_by_endpoint: {},
                    error_count: 0
                };
            }

            const stats = {
                total_calls: data.length,
                calls_by_service: {} as Record<string, number>,
                calls_by_endpoint: {} as Record<string, number>,
                error_count: 0,
                last_user_limit_remaining: undefined as number | undefined
            };

            // Get the most recent user limit remaining
            if (data.length > 0 && data[0].user_limit_remaining !== null) {
                stats.last_user_limit_remaining = data[0].user_limit_remaining;
            }

            // Aggregate statistics
            data.forEach(call => {
                // Count by service
                stats.calls_by_service[call.service] = (stats.calls_by_service[call.service] || 0) + 1;
                
                // Count by endpoint
                stats.calls_by_endpoint[call.endpoint] = (stats.calls_by_endpoint[call.endpoint] || 0) + 1;
                
                // Count errors
                if (call.response_code >= 400) {
                    stats.error_count++;
                }
            });

            return stats;
        } catch (error) {
            console.error('Exception fetching usage stats:', error);
            return {
                total_calls: 0,
                calls_by_service: {},
                calls_by_endpoint: {},
                error_count: 0
            };
        }
    }
}
