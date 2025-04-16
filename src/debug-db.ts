import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function debugDatabase() {
    const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_KEY || ''
    );

    try {
        console.log('1. Testing connection...');
        console.log('URL:', process.env.SUPABASE_URL);
        
        // List all tables
        console.log('\n2. Querying character_files table...');
        const { data: allData, error: queryError } = await supabase
            .from('character_files')
            .select('id, agent_name, display_name');

        if (queryError) {
            console.error('Error querying table:', queryError);
            return;
        }

        console.log('All records found:', allData);

        // Try exact match query
        console.log('\n3. Trying exact match query for "marvin"...');
        const { data: marvinData, error: marvinError } = await supabase
            .from('character_files')
            .select('*')
            .eq('agent_name', 'marvin');

        if (marvinError) {
            console.error('Error in marvin query:', marvinError);
        } else {
            console.log('Marvin query results:', marvinData);
        }

        // Try case-insensitive search
        console.log('\n4. Trying case-insensitive search...');
        const { data: iLikeData, error: iLikeError } = await supabase
            .from('character_files')
            .select('id, agent_name, display_name')
            .ilike('agent_name', '%marvin%');

        if (iLikeError) {
            console.error('Error in ilike query:', iLikeError);
        } else {
            console.log('Case-insensitive results:', iLikeData);
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

debugDatabase(); 