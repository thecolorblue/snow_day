#!/bin/bash

# Prepare env vars by reading .env, removing comments and empty lines,
# and converting newlines to commas.
if [ ! -f .env ]; then
  echo "Error: .env file not found."
  exit 1
fi
VARS="$(grep BLOB_READ_WRITE_TOKEN .env)"

# Get the project ID from gcloud config
PROJECT_ID=$(gcloud config get-value project)
BUCKET_NAME="story-audio-$PROJECT_ID"

# Check if the bucket already exists
if gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
  echo "Bucket gs://$BUCKET_NAME already exists."
else
  # Create the bucket if it doesn't exist
  gsutil mb -p $PROJECT_ID -l US-CENTRAL1 gs://$BUCKET_NAME
  # Set public access on the bucket
  gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
fi

gcloud functions deploy generateStory \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --memory=1024mb \
  --cpu=2 \
  --source=. \
  --entry-point=generateStory \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="$VARS,GCP_BUCKET_NAME=$BUCKET_NAME"
