#!/usr/bin/env ts-node
import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.join(process.cwd(), '../configs/.env');
if (fs.existsSync(envPath)) dotenvConfig({ path: envPath });

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'vendure',
  password: process.env.DB_PASSWORD || 'vendure',
  database: process.env.DB_NAME || 'vendure',
  schema: process.env.DB_SCHEMA || 'public',
});

async function checkIndexes() {
  await ds.initialize();
  const indexes = await ds.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'ledger_journal_line' 
      AND indexname LIKE 'IDX_journal_line_meta%'
    ORDER BY indexname;
  `);
  console.log('GIN Indexes:', JSON.stringify(indexes, null, 2));
  
  const migrations = await ds.query(`
    SELECT name, timestamp FROM migrations 
    WHERE name LIKE '%1766000%' 
    ORDER BY timestamp DESC;
  `);
  console.log('\nRecent migrations:', JSON.stringify(migrations, null, 2));
  
  await ds.destroy();
}

checkIndexes().catch(console.error);

