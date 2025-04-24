// Debug script to check environment variables
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Current directory:', __dirname);

// Check if .env file exists
const envPath = join(__dirname, '.env');
console.log('.env file exists:', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  console.log('.env file content:');
  console.log(fs.readFileSync(envPath, 'utf8'));
}

// Load env variables
console.log('Loading environment variables...');
dotenv.config();

// Check OAuth-related environment variables
console.log('\nEnvironment Variables:');
console.log('CLIENT_ID:', process.env.CLIENT_ID || '(not set)');
console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET ? '(is set, value hidden)' : '(not set)');
console.log('REDIRECT_URI:', process.env.REDIRECT_URI || '(not set)');
console.log('TENANT_ID:', process.env.TENANT_ID || '(not set)');

// Check if CLIENT_ID has proper format and length
if (process.env.CLIENT_ID) {
  console.log('\nCLIENT_ID details:');
  console.log('- Length:', process.env.CLIENT_ID.length);
  console.log('- Format valid:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(process.env.CLIENT_ID));
  console.log('- Has whitespace:', /\s/.test(process.env.CLIENT_ID));
  console.log('- First few chars:', process.env.CLIENT_ID.substring(0, 5) + '...');
  console.log('- Last few chars:', '...' + process.env.CLIENT_ID.substring(process.env.CLIENT_ID.length - 5));
}