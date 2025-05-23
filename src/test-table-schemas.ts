import { SupabaseService } from '../services/supabase/SupabaseService';
import fs from 'fs';
import path from 'path';

/**
 * Script to retrieve and display the schema information for the X-Scraping tables
 * Can also create the tables if they don't exist
 */
async function getTableSchemas(createIfNotExist: boolean = false) {
  try {
    // Initialize Supabase service
    const supabaseService = SupabaseService.getInstance();
    
    if (createIfNotExist) {
      console.log('Creating X-Scraping tables if they don\'t exist...');
      
      // Read the SQL script to create the tables
      const sqlFilePath = path.join(__dirname, '..', 'sql', 'create_x_scraping_tables.sql');
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      
      // Execute the SQL script
      const { data: createResult, error: createError } = await supabaseService.client.rpc('exec_sql', {
        sql_query: sqlContent
      });
      
      if (createError) {
        console.error('Error creating tables:', createError);
      } else {
        console.log('Tables created or already exist.');
      }
    }
    
    console.log('\nRetrieving table schemas from Supabase...');
    
    // Read the SQL queries from the file
    const sqlFilePath = path.join(__dirname, '..', 'sql', 'get-table-schemas.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL content into individual queries
    const queries = sqlContent
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0 && !query.startsWith('--'));
    
    // Execute each query
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      // Determine which query we're executing based on the comment above it
      let queryDescription = '';
      if (query.includes('x_accounts') && query.includes('information_schema.columns')) {
        queryDescription = 'x_accounts table schema';
      } else if (query.includes('tweets_cache') && query.includes('information_schema.columns')) {
        queryDescription = 'tweets_cache table schema';
      } else if (query.includes('accounts_to_review') && query.includes('information_schema.columns')) {
        queryDescription = 'accounts_to_review table schema';
      } else if (query.includes('api_usage_stats') && query.includes('information_schema.columns')) {
        queryDescription = 'api_usage_stats table schema';
      } else if (query.includes('x_accounts') && query.includes('pg_indexes')) {
        queryDescription = 'x_accounts table indexes';
      } else if (query.includes('tweets_cache') && query.includes('pg_indexes')) {
        queryDescription = 'tweets_cache table indexes';
      } else if (query.includes('accounts_to_review') && query.includes('pg_indexes')) {
        queryDescription = 'accounts_to_review table indexes';
      } else if (query.includes('api_usage_stats') && query.includes('pg_indexes')) {
        queryDescription = 'api_usage_stats table indexes';
      } else if (query.includes('tweets_cache') && query.includes('FOREIGN KEY')) {
        queryDescription = 'tweets_cache table foreign keys';
      }
      
      console.log(`\n=== ${queryDescription} ===\n`);
      
      // Execute the query
      const { data, error } = await supabaseService.client.rpc('exec_sql', {
        sql_query: query + ';'
      });
      
      if (error) {
        console.error(`Error executing query for ${queryDescription}:`, error);
        continue;
      }
      
      // Display the results
      if (data && data.length > 0) {
        console.table(data);
      } else {
        console.log('No results returned.');
      }
    }
    
    console.log('\nSchema retrieval completed.');
  } catch (error) {
    console.error('Error retrieving table schemas:', error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  // Check if we should create the tables
  const createTables = process.argv.includes('--create');
  getTableSchemas(createTables);
}

export { getTableSchemas };
