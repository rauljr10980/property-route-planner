#!/bin/bash
# Enable versioning on GCS bucket for data backup
# Run this script to enable versioning on your GCS bucket

BUCKET_NAME="${GCS_BUCKET_NAME:-tax-delinquent-files}"

echo "Enabling versioning on bucket: $BUCKET_NAME"

# Enable versioning
gsutil versioning set on gs://$BUCKET_NAME

# Set lifecycle policy to keep versions for 30 days (adjust as needed)
cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 30,
          "isLive": false,
          "numNewerVersions": 5
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME

echo "✅ Versioning enabled on bucket: $BUCKET_NAME"
echo "✅ Lifecycle policy set: Keep 5 versions, delete after 30 days"

