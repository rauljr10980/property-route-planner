// Script to extract GCS credentials for environment variables
// Run: node scripts/extract-gcs-credentials.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credsPath = path.join(__dirname, '..', 'config', 'gcs-credentials.json');

if (!fs.existsSync(credsPath)) {
  console.error('❌ Credentials file not found at:', credsPath);
  console.log('Please ensure config/gcs-credentials.json exists');
  process.exit(1);
}

try {
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

  console.log('\n📋 Copy these values to your Vercel/Netlify environment variables:\n');
  console.log('=' .repeat(70));
  console.log('\nGCS_PROJECT_ID');
  console.log('─'.repeat(70));
  console.log(creds.project_id);
  
  console.log('\nGCS_BUCKET_NAME');
  console.log('─'.repeat(70));
  console.log('tax-delinquent-files  ← Replace with your actual bucket name!');
  
  console.log('\nGCS_PRIVATE_KEY_ID');
  console.log('─'.repeat(70));
  console.log(creds.private_key_id);
  
  console.log('\nGCS_PRIVATE_KEY');
  console.log('─'.repeat(70));
  console.log('⚠️  This is a multi-line value. Copy the ENTIRE key including -----BEGIN and -----END');
  console.log('⚠️  In Vercel/Netlify, paste it exactly as shown (with \\n already included)');
  console.log(creds.private_key.substring(0, 100) + '...');
  console.log('(Full key is ' + creds.private_key.length + ' characters)');
  
  console.log('\nGCS_CLIENT_EMAIL');
  console.log('─'.repeat(70));
  console.log(creds.client_email);
  
  console.log('\nGCS_CLIENT_ID');
  console.log('─'.repeat(70));
  console.log(creds.client_id);
  
  console.log('\nGCS_CLIENT_X509_CERT_URL');
  console.log('─'.repeat(70));
  console.log(creds.client_x509_cert_url);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Credentials extracted successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Create storage bucket in Google Cloud Console');
  console.log('   2. Copy these values to Vercel/Netlify environment variables');
  console.log('   3. Replace GCS_BUCKET_NAME with your actual bucket name');
  console.log('   4. Deploy and test!\n');

} catch (error) {
  console.error('❌ Error reading credentials:', error.message);
  process.exit(1);
}

