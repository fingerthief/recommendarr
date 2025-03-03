const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Key storage location
const KEY_FILE = path.join(__dirname, '..', 'data', '.key');
const ALGORITHM = 'aes-256-gcm';

class EncryptionService {
  constructor() {
    this.key = null;
  }
  
  // Initialize the encryption service - create or load key
  async init() {
    try {
      // Try to load existing key
      try {
        this.key = await fs.readFile(KEY_FILE);
        console.log('Loaded existing encryption key');
      } catch (err) {
        // Generate new key if not exists
        if (err.code === 'ENOENT') {
          // Generate a secure random key (32 bytes for AES-256)
          this.key = crypto.randomBytes(32);
          await fs.writeFile(KEY_FILE, this.key);
          console.log('Generated new encryption key');
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('Error initializing encryption service:', err);
      throw err;
    }
  }
  
  // Encrypt object
  encrypt(data) {
    if (!this.key) throw new Error('Encryption key not initialized');
    
    // Convert data to string
    const text = JSON.stringify(data);
    
    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag (for GCM mode)
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return everything needed for decryption
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag
    };
  }
  
  // Decrypt object
  decrypt(encryptedData) {
    if (!this.key) throw new Error('Encryption key not initialized');
    
    try {
      // Convert hex strings back to buffers
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Parse JSON
      return JSON.parse(decrypted);
    } catch (err) {
      console.error('Decryption error:', err);
      throw new Error('Failed to decrypt data');
    }
  }
}

module.exports = new EncryptionService();