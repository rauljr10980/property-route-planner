const { Storage } = require('@google-cloud/storage');
const credentials = require('./config/gcs-credentials.json');

const storage = new Storage({
  projectId: credentials.project_id,
  credentials: credentials
});

const bucket = storage.bucket('tax-delinquent-files');
const errorFile = bucket.file('data/processing-error.json');

errorFile.download().then(([data]) => {
  const error = JSON.parse(data.toString());
  console.log('='.repeat(80));
  console.log('PROCESSING ERROR DETAILS');
  console.log('='.repeat(80));
  console.log('\n❌ Error Message:');
  console.log('   ' + error.error);
  console.log('\n📄 File Name:');
  console.log('   ' + error.filename);
  console.log('\n🕐 Timestamp:');
  console.log('   ' + new Date(error.timestamp).toLocaleString());
  if (error.stack) {
    console.log('\n📋 Stack Trace:');
    console.log(error.stack.split('\n').slice(0, 5).join('\n'));
  }
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 This error means the backend processed the file but found no valid data rows.');
  console.log('   The code now skips the first 3 rows after the header (test rows).');
  console.log('   You need to deploy the updated backend and try uploading again.\n');
});

