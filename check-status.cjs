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
  
  console.log('Sample properties (first 10):');
  json.properties.slice(0, 10).forEach((p, i) => {
    console.log(`\nProperty ${i + 1}:`);
    console.log('  CAN:', p.CAN);
    console.log('  ADDRSTRING:', p.ADDRSTRING ? String(p.ADDRSTRING).substring(0, 50) : 'N/A');
    console.log('  LEGALSTATUS:', p.LEGALSTATUS);
    console.log('  currentStatus:', p.currentStatus);
  });
  
  console.log('\n\nStatus breakdown:');
  const statusCounts = { J: 0, A: 0, P: 0, null: 0 };
  json.properties.forEach(p => {
    const status = p.currentStatus || null;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  console.log('  Judgment (J):', statusCounts.J.toLocaleString());
  console.log('  Active (A):', statusCounts.A.toLocaleString());
  console.log('  Pending (P):', statusCounts.P.toLocaleString());
  console.log('  No status:', statusCounts.null.toLocaleString());
  
  // Check unique LEGALSTATUS values
  console.log('\n\nUnique LEGALSTATUS values (first 20):');
  const uniqueStatuses = [...new Set(json.properties.map(p => String(p.LEGALSTATUS || '').trim()).filter(s => s))].slice(0, 20);
  uniqueStatuses.forEach(status => {
    const count = json.properties.filter(p => String(p.LEGALSTATUS || '').trim() === status).length;
    console.log(`  "${status}": ${count.toLocaleString()} properties`);
  });
});

