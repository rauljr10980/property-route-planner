const { Storage } = require('@google-cloud/storage');
const credentials = require('./config/gcs-credentials.json');

const storage = new Storage({
  projectId: credentials.project_id,
  credentials: credentials
});

const bucket = storage.bucket('tax-delinquent-files');

async function listFiles() {
  console.log('📁 Files in GCS bucket: tax-delinquent-files\n');
  console.log('='.repeat(80));
  
  try {
    // List all files
    const [files] = await bucket.getFiles();
    
    if (files.length === 0) {
      console.log('❌ No files found in bucket.\n');
      return;
    }
    
    console.log(`\n✅ Total files: ${files.length}\n`);
    
    // Group by prefix
    const filesByPrefix = {};
    files.forEach(file => {
      const prefix = file.name.split('/')[0];
      if (!filesByPrefix[prefix]) {
        filesByPrefix[prefix] = [];
      }
      filesByPrefix[prefix].push(file);
    });
    
    // List files in each prefix
    for (const [prefix, prefixFiles] of Object.entries(filesByPrefix)) {
      console.log(`\n📂 ${prefix}/ (${prefixFiles.length} files)`);
      console.log('-'.repeat(80));
      
      for (const file of prefixFiles) {
        const metadata = file.metadata;
        const size = metadata.size ? (parseInt(metadata.size) / 1024).toFixed(2) + ' KB' : 'Unknown';
        const date = metadata.updated ? new Date(metadata.updated).toLocaleString() : 'Unknown';
        
        console.log(`  📄 ${file.name}`);
        console.log(`     Size: ${size} | Updated: ${date}`);
        
        if (metadata.metadata && Object.keys(metadata.metadata).length > 0) {
          console.log(`     Metadata:`);
          for (const [key, value] of Object.entries(metadata.metadata)) {
            if (key !== 'firebaseStorageDownloadTokens') {
              const displayValue = String(value).length > 60 ? String(value).substring(0, 60) + '...' : value;
              console.log(`       ${key}: ${displayValue}`);
            }
          }
        }
        console.log('');
      }
    }
    
    // Check properties.json specifically
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Checking data/properties.json:\n');
    const propertiesFile = bucket.file('data/properties.json');
    const [exists] = await propertiesFile.exists();
    
    if (exists) {
      const [data] = await propertiesFile.download();
      const json = JSON.parse(data.toString());
      const size = (data.length / 1024).toFixed(2) + ' KB';
      console.log(`✅ data/properties.json exists (${size})`);
      console.log(`   Properties: ${json.properties ? json.properties.length.toLocaleString() : 0}`);
      console.log(`   Upload date: ${json.uploadDate || 'N/A'}`);
      console.log(`   Last updated: ${json.lastUpdated || 'N/A'}`);
    } else {
      console.log('❌ data/properties.json does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error listing files:', error.message);
    console.error(error.stack);
  }
}

listFiles();

