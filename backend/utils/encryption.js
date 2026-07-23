const crypto = require('crypto');

const getEncryptionKey = () => {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY environment variable is missing');
  }
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns string format: v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
const encryptSecret = (plaintext) => {
  if (!plaintext) return plaintext;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt an AES-256-GCM encrypted string
 */
const decryptSecret = (ciphertextData) => {
  if (!ciphertextData) return ciphertextData;

  // Unencrypted base32 fallback (if existing unencrypted secret in database)
  if (!ciphertextData.startsWith('v1:')) {
    return ciphertextData;
  }

  const key = getEncryptionKey();
  const parts = ciphertextData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encryptedText = parts[3];

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = {
  encryptSecret,
  decryptSecret,
};
