const { Storage } = require('@google-cloud/storage');
const credentials = require('./config/gcs-credentials.json');

const storage = new Storage({
  projectId: credentials.project_id,
  credentials: credentials
});

const bucket = storage.bucket('tax-delinquent-files');
const file = bucket.file('data/properties.json');

file.download().then(([data]) => {
  const json = JSON.parse(data.toString());
  
  console.log('Sample properties with addresses:');
  json.properties.slice(0, 10).forEach((p, i) => {
    console.log(`\nProperty ${i + 1}:`);
    console.log('  CAN:', p.CAN);
    console.log('  ADDRSTRING:', p.ADDRSTRING ? String(p.ADDRSTRING).substring(0, 60) : 'N/A');
    console.log('  ZIP_CODE:', p.ZIP_CODE);
    console.log('  LEGALSTATUS:', p.LEGALSTATUS);
    console.log('  currentStatus:', p.currentStatus);
  });
  
  // Count properties with addresses
  const withAddresses = json.properties.filter(p => p.ADDRSTRING && String(p.ADDRSTRING).trim() && String(p.ADDRSTRING).trim() !== 'N/A');
  console.log(`\n\nProperties with valid addresses: ${withAddresses.length} / ${json.properties.length}`);
});

