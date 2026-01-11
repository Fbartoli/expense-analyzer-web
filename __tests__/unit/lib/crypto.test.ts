import { describe, it, expect } from 'vitest'
import {
  encryptData,
  decryptData,
  isValidEncryptedBackup,
  type EncryptedData,
} from '@/lib/crypto'

describe('crypto', () => {
  describe('encryptData', () => {
    it('should encrypt plaintext and return valid structure', async () => {
      const plaintext = 'Hello, World!'
      const password = 'SecurePass123!'

      const encrypted = await encryptData(plaintext, password)

      expect(encrypted).toHaveProperty('version', 1)
      expect(encrypted).toHaveProperty('salt')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('data')
      expect(encrypted).toHaveProperty('checksum')

      expect(typeof encrypted.salt).toBe('string')
      expect(encrypted.salt.length).toBeGreaterThan(0)
      expect(typeof encrypted.iv).toBe('string')
      expect(encrypted.iv.length).toBeGreaterThan(0)
      expect(typeof encrypted.data).toBe('string')
      expect(encrypted.data.length).toBeGreaterThan(0)
    })

    it('should produce different ciphertext for same plaintext', async () => {
      const plaintext = 'Same message'
      const password = 'SamePassword1!'

      const encrypted1 = await encryptData(plaintext, password)
      const encrypted2 = await encryptData(plaintext, password)

      expect(encrypted1.data).not.toBe(encrypted2.data)
      expect(encrypted1.salt).not.toBe(encrypted2.salt)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
    })

    it('should handle empty plaintext', async () => {
      const plaintext = ''
      const password = 'TestPass123!'

      const encrypted = await encryptData(plaintext, password)

      expect(encrypted.data).toBeTruthy()
    })

    it('should handle unicode content', async () => {
      const plaintext = 'Hello World!'
      const password = 'UnicodePass123!'

      const encrypted = await encryptData(plaintext, password)
      const decrypted = await decryptData(encrypted, password)

      expect(decrypted).toBe(plaintext)
    })
  })

  describe('decryptData', () => {
    it('should decrypt to original plaintext', async () => {
      const plaintext = 'Secret message for testing'
      const password = 'MyPassword123!'

      const encrypted = await encryptData(plaintext, password)
      const decrypted = await decryptData(encrypted, password)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw error for wrong password', async () => {
      const plaintext = 'Secret message'
      const correctPassword = 'CorrectPass1!'
      const wrongPassword = 'WrongPass1!'

      const encrypted = await encryptData(plaintext, correctPassword)

      await expect(decryptData(encrypted, wrongPassword)).rejects.toThrow(
        'Incorrect password or corrupted data'
      )
    })

    it('should throw error for unsupported version', async () => {
      const encrypted: EncryptedData = {
        version: 999,
        salt: 'abc',
        iv: 'def',
        data: 'ghi',
        checksum: 'jkl',
      }

      await expect(decryptData(encrypted, 'anypassword')).rejects.toThrow(
        'Unsupported backup version'
      )
    })
  })

  describe('isValidEncryptedBackup', () => {
    it('should return true for valid encrypted data structure', () => {
      const validData: EncryptedData = {
        version: 1,
        salt: 'base64salt',
        iv: 'base64iv',
        data: 'base64data',
        checksum: 'base64checksum',
      }

      expect(isValidEncryptedBackup(validData)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isValidEncryptedBackup(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isValidEncryptedBackup(undefined)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isValidEncryptedBackup('string')).toBe(false)
      expect(isValidEncryptedBackup(123)).toBe(false)
    })

    it('should return false for missing properties', () => {
      expect(isValidEncryptedBackup({ version: 1 })).toBe(false)
      expect(isValidEncryptedBackup({ version: 1, salt: 'x' })).toBe(false)
    })

    it('should return false for wrong property types', () => {
      expect(
        isValidEncryptedBackup({
          version: '1',
          salt: 'x',
          iv: 'y',
          data: 'z',
          checksum: 'c',
        })
      ).toBe(false)
    })
  })

  describe('round-trip encryption', () => {
    it('should handle JSON data correctly', async () => {
      const data = {
        analyses: [{ id: 1, name: 'Test' }],
        budgets: [{ category: 'Food', amount: 500 }],
      }
      const password = 'JsonTest123!'

      const encrypted = await encryptData(JSON.stringify(data), password)
      const decrypted = await decryptData(encrypted, password)

      expect(JSON.parse(decrypted)).toEqual(data)
    })

    it('should handle special characters', async () => {
      const plaintext = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?'
      const password = 'SpecialPass1!'

      const encrypted = await encryptData(plaintext, password)
      const decrypted = await decryptData(encrypted, password)

      expect(decrypted).toBe(plaintext)
    })
  })
})
