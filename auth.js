// auth.js
// Tiny helper: turns a passphrase into a SHA-256 hash using the browser's
// built-in crypto. We never store or send the raw passphrase anywhere —
// only the hash, which is what gets checked against Firebase Database Rules.

async function hashPassphrase(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Gets a hash from localStorage if we've already asked before,
// otherwise prompts for it once and saves it for next time.
async function getOrAskHash(storageKey, promptText) {
  let hash = localStorage.getItem(storageKey);
  if (hash) return hash;

  const passphrase = prompt(promptText);
  if (!passphrase) {
    throw new Error("A passphrase is required to continue.");
  }

  hash = await hashPassphrase(passphrase);
  localStorage.setItem(storageKey, hash);
  return hash;
}

function clearSavedPassphrase(storageKey) {
  localStorage.removeItem(storageKey);
}
