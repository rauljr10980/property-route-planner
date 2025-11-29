const { Storage } = require('@google-cloud/storage');
const credentials = require('./config/gcs-credentials.json');

const storage = new Storage({
  projectId: credentials.project_id,
  credentials: credentials
});

const bucket = storage.bucket('tax-delinquent-files');
const file = bucket.file('data/comparison-report.json');

file.download().then(([data]) => {
  const json = JSON.parse(data.toString());
  console.log('📊 Comparison Report:');
  console.log('Upload Date:', json.uploadDate);
  console.log('\nSummary:');
  console.log(JSON.stringify(json.summary, null, 2));
  
  console.log('\n\n💀 Dead Leads (Foreclosed):', json.foreclosedProperties ? json.foreclosedProperties.length : 0);
  if (json.foreclosedProperties && json.foreclosedProperties.length > 0) {
    console.log('\nFirst 5 Dead Leads:');
    json.foreclosedProperties.slice(0, 5).forEach((fp, i) => {
      console.log(`${i+1}. CAN: ${fp.CAN || fp.identifier}, Address: ${fp.address}`);
    });
  }
  
  console.log('\n\n📋 Status Changes:', json.statusChanges ? json.statusChanges.length : 0);
  console.log('📋 Removed Properties:', json.removedProperties ? json.removedProperties.length : 0);
  console.log('📋 New Properties:', json.newProperties ? json.newProperties.length : 0);
}).catch(err => {
  console.log('❌ No comparison report found or error:', err.message);
});

