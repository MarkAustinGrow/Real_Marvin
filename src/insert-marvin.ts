import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function insertMarvinData() {
    const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_KEY || ''
    );

    try {
        console.log('Reading Marvin character data...');
        
        // Read the local character file
        const characterFilePath = path.join(__dirname, '..', 'Marvin_character.json');
        const rawData = JSON.parse(fs.readFileSync(characterFilePath, 'utf8'));
        
        // Format the data to match the schema
        const characterData = {
            id: uuidv4(), // Generate a UUID
            agent_name: rawData.agent_name.toLowerCase(), // Ensure lowercase
            display_name: rawData.display_name,
            content: rawData.content,
            version: 1,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('Formatted data:', characterData);
        console.log('Inserting Marvin data into Supabase...');
        
        // Insert the data into Supabase
        const { data, error } = await supabase
            .from('character_files')
            .insert([characterData])
            .select();
            
        if (error) {
            console.error('Error inserting data:', error);
            return;
        }

        console.log('Successfully inserted Marvin data:', data);
        
        // Verify the data was inserted
        const { data: marvin, error: marvinError } = await supabase
            .from('character_files')
            .select('*')
            .eq('agent_name', characterData.agent_name)
            .single();

        if (marvinError) {
            console.error('Error verifying data:', marvinError);
            return;
        }

        console.log('Verified Marvin data:', marvin);
    } catch (error) {
        console.error('Error:', error);
    }
}

insertMarvinData(); 