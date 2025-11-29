const { Storage } = require('@google-cloud/storage');
const credentials = require('./config/gcs-credentials.json');

const storage = new Storage({
  projectId: credentials.project_id,
  credentials: credentials
});

const bucket = storage.bucket('tax-delinquent-files');

async function reprocessFile() {
  console.log('🔍 Finding uploaded file...\n');
  
  // Find the latest uploaded file
  const [files] = await bucket.getFiles({ prefix: 'files/' });
  
  if (files.length === 0) {
    console.log('❌ No files found in storage');
    return;
  }
  
  // Sort by updated time, newest first
  files.sort((a, b) => {
    const timeA = new Date(a.metadata.updated || 0);
    const timeB = new Date(b.metadata.updated || 0);
    return timeB - timeA;
  });
  
  const latestFile = files[0];
  const filename = latestFile.metadata.metadata?.originalName || latestFile.name.split('/').pop();
  
  console.log(`📄 Found file: ${filename}`);
  console.log(`   Size: ${(parseInt(latestFile.metadata.size || 0) / 1024).toFixed(2)} KB`);
  console.log(`   Uploaded: ${new Date(latestFile.metadata.updated || latestFile.metadata.timeCreated).toLocaleString()}`);
  console.log('\n🔄 Reprocessing file...\n');
  
  // Call the reprocess endpoint
  const apiUrl = 'https://gcs-api-server-989612961740.us-central1.run.app';
  const response = await fetch(`${apiUrl}/api/reprocess-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filename: filename })
  });
  
  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Reprocessing started!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    console.log('\n⏳ Processing in background...');
    console.log('   Check the dashboard in a few moments to see the updated data.');
    console.log('   Or check Cloud Run logs to see processing progress.');
  } else {
    console.log('❌ Error reprocessing file:');
    console.log('   ', result.error || result.message);
  }
}

reprocessFile().catch(console.error);

