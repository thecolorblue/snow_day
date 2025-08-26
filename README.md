# Story Generator GCP Function

This project contains a GCP Cloud Function for generating stories based on a given storyline.

## Setup

### Prerequisites

- Node.js (v20 or higher)
- Google Cloud SDK
- Prisma CLI

### Environment Variables

The following environment variables are required to run the GCP function. These should be set in your local environment and in the GitHub repository's secrets for automated deployment.

- `GCP_SA_KEY`: A JSON key for a Google Cloud service account with permissions to deploy Cloud Functions and access other required services. To get this key:
    1.  Go to the [GCP Console](https://console.cloud.google.com/).
    2.  Navigate to **IAM & Admin** > **Service Accounts**.
    3.  Click **Create Service Account**.
    4.  Give the service account a name and description.
    5.  Grant the service account the **Cloud Functions Admin** and **Service Account User** roles.
    6.  Click **Done**.
    7.  Click on the newly created service account.
    8.  Go to the **Keys** tab.
    9.  Click **Add Key** > **Create new key**.
    10. Select **JSON** as the key type and click **Create**.
    11. The JSON key file will be downloaded. The content of this file is the value for `GCP_SA_KEY`.
- `OPENAI_API_KEY`: Your API key for OpenAI.
- `DATABASE_URL`: The connection string for your PostgreSQL database. This should be in the format `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`.

### Google Cloud Storage Bucket

The application uses a Google Cloud Storage bucket to store the generated audio files. The `deploy.sh` script will automatically create a bucket named `story-audio-PROJECT_ID` (where `PROJECT_ID` is your GCP project ID) and set the appropriate permissions.

If you need to create the bucket manually, follow these steps:

1.  **Create the Bucket:**
    ```bash
    gsutil mb -p YOUR_PROJECT_ID -l US-CENTRAL1 gs://story-audio-YOUR_PROJECT_ID
    ```
2.  **Set Public Access:**
    ```bash
    gsutil iam ch allUsers:objectViewer gs://story-audio-YOUR_PROJECT_ID
    ```
3.  **Set Environment Variable:**
    When deploying the function, you'll need to set the `GCP_BUCKET_NAME` environment variable to the name of your bucket. The `deploy.sh` script handles this automatically.

### Local Development

1.  **Install Dependencies:**
    ```bash
    cd functions
    npm install
    ```

2.  **Run the Function Locally:**
    ```bash
    npm start
    ```

### Deployment

The function is automatically deployed to GCP when changes are pushed to the `main` branch. To deploy manually, run the following command from the `functions` directory:

```bash
./deploy.sh
```
