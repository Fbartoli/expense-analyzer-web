/**
 * Encryption utilities using Web Crypto API
 * Uses AES-GCM for authenticated encryption
 */

// Derive a key from a password using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  // Import password as a key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Generate a random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

// Generate a random IV (initialization vector)
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12))
}

export interface EncryptedData {
  version: number
  salt: string // Base64 encoded
  iv: string // Base64 encoded
  data: string // Base64 encoded encrypted data
  checksum: string // For integrity verification
}

// Convert Uint8Array to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert Base64 to Uint8Array
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Simple checksum for data integrity
async function generateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  return arrayBufferToBase64(hashBuffer).slice(0, 16)
}

/**
 * Encrypt data with a password
 */
export async function encryptData(plaintext: string, password: string): Promise<EncryptedData> {
  const salt = generateSalt()
  const iv = generateIV()
  const key = await deriveKey(password, salt)

  const encoder = new TextEncoder()
  const plaintextBuffer = encoder.encode(plaintext)

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintextBuffer
  )

  const checksum = await generateChecksum(plaintext)

  return {
    version: 1,
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    data: arrayBufferToBase64(encryptedBuffer),
    checksum,
  }
}

/**
 * Decrypt data with a password
 */
export async function decryptData(encrypted: EncryptedData, password: string): Promise<string> {
  if (encrypted.version !== 1) {
    throw new Error('Unsupported backup version')
  }

  const salt = base64ToArrayBuffer(encrypted.salt)
  const iv = base64ToArrayBuffer(encrypted.iv)
  const encryptedData = base64ToArrayBuffer(encrypted.data)

  const key = await deriveKey(password, salt)

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      encryptedData.buffer as ArrayBuffer
    )

    const decoder = new TextDecoder()
    const plaintext = decoder.decode(decryptedBuffer)

    // Verify checksum
    const checksum = await generateChecksum(plaintext)
    if (checksum !== encrypted.checksum) {
      throw new Error('Data integrity check failed')
    }

    return plaintext
  } catch (error) {
    if (error instanceof Error && error.message === 'Data integrity check failed') {
      throw error
    }
    throw new Error('Incorrect password or corrupted data')
  }
}

/**
 * Validate that a string is a valid encrypted backup
 */
export function isValidEncryptedBackup(data: unknown): data is EncryptedData {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.version === 'number' &&
    typeof obj.salt === 'string' &&
    typeof obj.iv === 'string' &&
    typeof obj.data === 'string' &&
    typeof obj.checksum === 'string'
  )
}
