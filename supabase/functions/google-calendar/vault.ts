function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value); return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
async function key(value: string): Promise<CryptoKey> {
  const bytes = base64ToBytes(value);
  if (bytes.byteLength !== 32) throw new Error("connector_encryption_unavailable");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptConnectorSecret(value: string, encryptionKey: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(encryptionKey), new TextEncoder().encode(value)));
  return `${bytesToBase64(iv)}.${bytesToBase64(ciphertext)}`;
}
export async function decryptConnectorSecret(value: string, encryptionKey: string): Promise<string> {
  const [encodedIv, encodedCiphertext, extra] = value.split(".");
  if (!encodedIv || !encodedCiphertext || extra) throw new Error("connector_encryption_unavailable");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(encodedIv) }, await key(encryptionKey), base64ToBytes(encodedCiphertext));
  return new TextDecoder().decode(plaintext);
}
export async function sha256Base64Url(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return bytesToBase64(digest).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
