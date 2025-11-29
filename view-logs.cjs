// This script helps view Cloud Run logs
// Note: Requires gcloud CLI to be installed and authenticated

console.log('📋 To view Cloud Run logs, run this command in your terminal:');
console.log('');
console.log('gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gcs-api-server" --limit 100 --format="table(timestamp,textPayload)" --freshness=30m');
console.log('');
console.log('Or view logs in the Cloud Console:');
console.log('https://console.cloud.google.com/run/detail/us-central1/gcs-api-server/logs?project=tax-delinquent-software');
console.log('');
console.log('Look for messages containing:');
console.log('  - "Starting data processing"');
console.log('  - "Header row found"');
console.log('  - "Row X: Valid data row"');
console.log('  - "No data found after processing"');
console.log('  - "Sample rows from data start"');

