const { Storage } = require('@google-cloud/storage');
const credentials = require('./config/gcs-credentials.json');

const storage = new Storage({
  projectId: credentials.project_id,
  credentials: credentials
});

const bucket = storage.bucket('tax-delinquent-files');

async function checkStatus() {
  console.log('🔍 Checking latest upload status...\n');
  
  // Check for uploaded files
  const [files] = await bucket.getFiles({ prefix: 'files/' });
  console.log(`📁 Uploaded files: ${files.length}`);
  if (files.length > 0) {
    // Sort by updated time, newest first
    files.sort((a, b) => {
      const timeA = new Date(a.metadata.updated || 0);
      const timeB = new Date(b.metadata.updated || 0);
      return timeB - timeA;
    });
    
    console.log('\n📄 Latest uploaded file:');
    const latest = files[0];
    const metadata = latest.metadata;
    console.log(`   Name: ${latest.name}`);
    console.log(`   Size: ${(parseInt(metadata.size || 0) / 1024).toFixed(2)} KB`);
    console.log(`   Uploaded: ${new Date(metadata.updated || metadata.timeCreated).toLocaleString()}`);
    if (metadata.metadata) {
      console.log(`   Original name: ${metadata.metadata.originalName || 'N/A'}`);
      console.log(`   Row count: ${metadata.metadata.rowCount || 'N/A'}`);
    }
  }
  
  // Check for properties.json
  console.log('\n📊 Properties data:');
  const propertiesFile = bucket.file('data/properties.json');
  const [exists] = await propertiesFile.exists();
  if (exists) {
    const [data] = await propertiesFile.download();
    const json = JSON.parse(data.toString());
    const [metadata] = await propertiesFile.getMetadata();
    console.log(`   ✅ Exists: ${(data.length / 1024).toFixed(2)} KB`);
    console.log(`   Properties: ${json.properties ? json.properties.length.toLocaleString() : 0}`);
    console.log(`   Upload date: ${json.uploadDate || 'N/A'}`);
    console.log(`   Last updated: ${new Date(metadata.updated).toLocaleString()}`);
  } else {
    console.log('   ❌ Does not exist');
  }
  
  // Check for error file
  console.log('\n❌ Processing errors:');
  const errorFile = bucket.file('data/processing-error.json');
  const [errorExists] = await errorFile.exists();
  if (errorExists) {
    const [data] = await errorFile.download();
    const error = JSON.parse(data.toString());
    const [metadata] = await errorFile.getMetadata();
    console.log(`   ✅ Error file exists`);
    console.log(`   Error: ${error.error}`);
    console.log(`   File: ${error.filename}`);
    console.log(`   Time: ${new Date(error.timestamp).toLocaleString()}`);
    console.log(`   Updated: ${new Date(metadata.updated).toLocaleString()}`);
  } else {
    console.log('   ✅ No error file (processing may have succeeded)');
  }
}

checkStatus().catch(console.error);

