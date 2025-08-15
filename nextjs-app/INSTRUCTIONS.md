# Environment Variable Setup for Google Authentication

To enable Google authentication, you need to create a `.env.local` file in the root of the `nextjs-app` directory and add the following environment variables:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_secret
```

## How to get your Google Client ID and Secret

1.  **Go to the Google Cloud Console:** [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Create a new project** or select an existing one.
3.  **Navigate to "APIs & Services" > "Credentials".**
4.  **Click "Create Credentials" and select "OAuth client ID".**
5.  **Configure the consent screen** if you haven't already. You'll need to provide an application name, user support email, and developer contact information.
6.  **Choose "Web application"** as the application type.
7.  **Add an authorized redirect URI:**
    *   For local development, add `http://localhost:3000/api/auth/callback/google`
8.  **Click "Create"** and you will be provided with your Client ID and Client Secret.

## How to generate a `NEXTAUTH_SECRET`

You can use the following command in your terminal to generate a secret:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NEXTAUTH_SECRET`.

## Important

*   **Do not commit your `.env.local` file to version control.** This file contains sensitive information. The `.gitignore` file should already be configured to ignore `.env.local`.
*   **Restart your development server** after creating the `.env.local` file for the changes to take effect.