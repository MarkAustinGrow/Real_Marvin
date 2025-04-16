import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../config';

export interface CharacterData {
    id: string;
    agent_name: string;
    display_name: string;
    content: {
        bio: string[];
        lore: string[];
        style: {
            all: string[];
            chat: string[];
            post: string[];
        };
        topics: string[];
        adjectives: string[];
    };
    version: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export class SupabaseService {
    private client: SupabaseClient;
    private static instance: SupabaseService;

    private constructor() {
        console.log('Initializing Supabase with URL:', config.supabase.url);
        console.log('API Key type:', config.supabase.key.startsWith('eyJ') ? 'Service Role Key' : 'Anon Key');
        this.client = createClient(
            config.supabase.url,
            config.supabase.key
        );
    }

    public static getInstance(): SupabaseService {
        if (!SupabaseService.instance) {
            SupabaseService.instance = new SupabaseService();
        }
        return SupabaseService.instance;
    }

    /**
     * Test the database connection and list all tables
     */
    private async testConnection() {
        try {
            console.log('Testing database connection...');
            
            // Get all records to verify connection
            const { data, error } = await this.client
                .from('character_files')
                .select('id, agent_name, display_name');
            
            if (error) {
                console.error('Connection test failed:', error);
                return false;
            }
            
            console.log('Characters in database:', JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Connection test failed with exception:', error);
            return false;
        }
    }

    /**
     * Retrieves character data from Supabase
     * @param agentName The name of the agent to retrieve
     * @returns Character data
     */
    public async getCharacterData(agentName: string): Promise<CharacterData> {
        try {
            // Test connection first
            const isConnected = await this.testConnection();
            if (!isConnected) {
                throw new Error('Database connection failed');
            }

            console.log(`Fetching character data for agent: ${agentName}`);
            
            // Try to find a character with matching name using a simple query
            const { data, error } = await this.client
                .from('character_files')
                .select()
                .ilike('agent_name', agentName)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned, try fuzzy search
                    console.log('No exact match found, trying fuzzy search...');
                    const { data: fuzzyData, error: fuzzyError } = await this.client
                        .from('character_files')
                        .select()
                        .ilike('agent_name', `%${agentName}%`)
                        .single();

                    if (fuzzyError) {
                        console.error('Error in fuzzy search:', fuzzyError);
                        throw fuzzyError;
                    }

                    if (!fuzzyData) {
                        throw new Error(`No character found for agent: ${agentName}`);
                    }

                    return fuzzyData;
                }
                console.error('Error in character search:', error);
                throw error;
            }

            if (!data) {
                throw new Error(`No character found for agent: ${agentName}`);
            }

            console.log('Successfully retrieved character data:', {
                id: data.id,
                agent_name: data.agent_name,
                display_name: data.display_name
            });

            return data;
        } catch (error) {
            console.error('Error fetching character data:', error);
            throw new Error('Failed to fetch character data');
        }
    }
} 