import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function testSupabaseConnection() {
    const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_KEY || ''
    );

    try {
        // Test the connection
        console.log('Testing Supabase connection...');
        
        // List all tables
        const { data: tables, error: tablesError } = await supabase
            .from('character_files')
            .select('*');
            
        if (tablesError) {
            console.error('Error fetching tables:', tablesError);
            return;
        }

        console.log('Found character files:', tables);
        
        // Check if marvin exists
        const { data: marvin, error: marvinError } = await supabase
            .from('character_files')
            .select('*')
            .eq('agent_name', 'marvin')
            .single();

        if (marvinError) {
            console.error('Error fetching marvin:', marvinError);
            return;
        }

        console.log('Marvin data:', marvin);
    } catch (error) {
        console.error('Error:', error);
    }
}

testSupabaseConnection(); 