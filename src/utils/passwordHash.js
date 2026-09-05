// Client-side password hashing using the browser's built-in Web Crypto API
// (PBKDF2-HMAC-SHA256, 100k iterations, random 16-byte salt) - no extra
// dependency needed, works in every modern browser.
//
// This is a real improvement over the plain-text storage this app used
// before: a raw dump of coaching_users no longer hands out anyone's actual
// password. It does NOT, on its own, stop someone with the public anon key
// from reading/writing rows directly (Row Level Security is still off, and
// meaningfully turning it on needs real server-side auth - see the note
// left in code review / chat). Hashing protects the password value itself;
// it is not a substitute for access control.

const ALGO = 'pbkdf2-sha256';
const ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return window.btoa(binary);
}

function fromBase64(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveBits(password, saltBytes, iterations) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  return window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BITS
  );
}

export async function hashPassword(plainPassword) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const derived = await deriveBits(plainPassword, salt, ITERATIONS);
  return `${ALGO}$${ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

// True if a stored password value is already in our hashed format.
// Every account created before today's update has a plain-text value here
// (no $-separated pbkdf2-sha256 prefix) - useAuth.login() uses this to fall
// back to a direct comparison for those rows, then silently re-saves the
// password as a proper hash so the row is migrated the moment its owner
// next logs in. No manual SQL, no downtime, no one locked out.
export function isHashed(stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  return parts.length === 4 && parts[0] === ALGO;
}

// Returns true/false. Only ever called on values that are already known to
// be in our hashed format (isHashed() true) - see useAuth.login() for the
// legacy plain-text fallback path.
export async function verifyPassword(plainPassword, stored) {
  if (!isHashed(stored)) return false;
  const [, iterationsStr, saltB64, hashB64] = stored.split('$');
  const iterations = parseInt(iterationsStr, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  try {
    const salt = fromBase64(saltB64);
    const derived = await deriveBits(plainPassword, salt, iterations);
    return toBase64(derived) === hashB64;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}
