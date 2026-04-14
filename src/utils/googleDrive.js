const CLIENT_ID = "598760221247-c3o76qms6sbcu4k65l9fkkt4eb826567.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

export async function authenticateGoogle() {
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => resolve(tokenResponse)
    });

    tokenClient.requestAccessToken();
  });
}

export async function uploadToGoogleDrive(blob, filename) {
  const token = await authenticateGoogle();

  const metadata = {
    name: filename,
    mimeType: "application/zip"
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", blob);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`
      },
      body: form
    }
  );

  return await res.json();
}
