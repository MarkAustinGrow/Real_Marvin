-- SQL query to get the schema for the x_accounts table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'x_accounts'
ORDER BY 
    ordinal_position;

-- SQL query to get the schema for the tweets_cache table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'tweets_cache'
ORDER BY 
    ordinal_position;

-- SQL query to get the schema for the accounts_to_review table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'accounts_to_review'
ORDER BY 
    ordinal_position;

-- SQL query to get the schema for the api_usage_stats table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'api_usage_stats'
ORDER BY 
    ordinal_position;

-- SQL query to get the indexes for the x_accounts table
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'x_accounts';

-- SQL query to get the indexes for the tweets_cache table
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'tweets_cache';

-- SQL query to get the indexes for the accounts_to_review table
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'accounts_to_review';

-- SQL query to get the indexes for the api_usage_stats table
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'api_usage_stats';

-- SQL query to get the foreign key constraints for the tweets_cache table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'tweets_cache';
