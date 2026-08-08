// ============================================================
// Isomorphic SHA-256 using Web Crypto API
// Works in: Node 18+, all modern browsers
// NOTE: Async because SubtleCrypto.digest() is Promise-based
// ============================================================

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
