export async function computeIntegrityHash(data) {
  const encoder = new TextEncoder();
  const json = JSON.stringify(data);
  const bytes = encoder.encode(json);

  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
