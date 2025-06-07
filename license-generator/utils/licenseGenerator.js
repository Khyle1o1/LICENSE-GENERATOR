const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Configuration - Should match frontend
const SECRET_KEY = process.env.SECRET_KEY || 'AOG-TECH-POS-SYSTEM-2024-SECRET-KEY-CHANGE-IN-PRODUCTION';
const PRODUCT_ID = process.env.PRODUCT_ID || 'AOG-TECH-POS-SYSTEM-V1';

class LicenseGenerator {
    
    // Generate HMAC-SHA256 signature
    static hmacSha256(key, message) {
        return crypto.createHmac('sha256', key).update(message).digest('hex');
    }
    
    // Generate MD5 hash (for checksum compatibility)
    static md5(message) {
        return crypto.createHash('md5').update(message).digest('hex');
    }
    
    // Generate SHA256 hash
    static sha256(message) {
        return crypto.createHash('sha256').update(message).digest('hex');
    }
    
    // Generate a license key
    static async generateLicenseKey(customerEmail, customerName, expiryDate, features = ['basic'], maxActivations = 1) {
        // Validate inputs
        if (!customerEmail || !customerName || !expiryDate) {
            throw new Error('Missing required parameters: customerEmail, customerName, expiryDate');
        }
        
        if (!(expiryDate instanceof Date)) {
            throw new Error('expiryDate must be a Date object');
        }
        
        if (expiryDate <= new Date()) {
            throw new Error('expiryDate must be in the future');
        }
        
        const data = {
            email: customerEmail.toLowerCase().trim(),
            name: customerName.trim(),
            productId: PRODUCT_ID,
            expiry: expiryDate.getTime(),
            features: Array.isArray(features) ? features : [features],
            maxActivations: parseInt(maxActivations) || 1,
            generated: Date.now(),
            version: '1.0',
            uuid: uuidv4()
        };
        
        // Create license input for hashing
        const licenseInput = `${data.email}|${data.expiry}|${data.features.join(',')}|${data.generated}|${data.uuid}`;
        const licenseHash = this.hmacSha256(SECRET_KEY, licenseInput);
        
        // Take first 20 characters and add a 5-character checksum
        const keyPart = licenseHash.substring(0, 20);
        const checksum = this.md5(licenseHash).substring(0, 5);
        const fullKey = (keyPart + checksum).toUpperCase();
        
        // Format as XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
        const formatted = this.formatLicenseKey(fullKey);
        
        return {
            licenseKey: formatted,
            data: data,
            signature: this.hmacSha256(SECRET_KEY, JSON.stringify(data))
        };
    }
    
    // Format license key with dashes
    static formatLicenseKey(key) {
        const clean = key.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        // Ensure we have exactly 25 characters
        if (clean.length !== 25) {
            throw new Error('Invalid license key length');
        }
        
        return clean.replace(/(.{5})/g, '$1-').slice(0, -1);
    }
    
    // Validate license key format
    static validateLicenseKeyFormat(licenseKey) {
        if (!licenseKey) {
            return false;
        }
        
        const clean = licenseKey.replace(/[^A-Za-z0-9]/g, '');
        
        // Should be exactly 25 characters
        if (clean.length !== 25) {
            return false;
        }
        
        // Should contain only alphanumeric characters
        if (!/^[A-Z0-9]+$/i.test(clean)) {
            return false;
        }
        
        return true;
    }
    
    // Verify license key signature (basic validation)
    static verifyLicenseKey(licenseKey, licenseData) {
        try {
            if (!this.validateLicenseKeyFormat(licenseKey)) {
                return false;
            }
            
            if (!licenseData) {
                return false;
            }
            
            // Recreate the license input
            const licenseInput = `${licenseData.email}|${licenseData.expiry}|${licenseData.features.join(',')}|${licenseData.generated}|${licenseData.uuid}`;
            const expectedHash = this.hmacSha256(SECRET_KEY, licenseInput);
            
            // Extract the key part from the license key
            const clean = licenseKey.replace(/[^A-Za-z0-9]/g, '');
            const keyPart = clean.substring(0, 20);
            const checksum = clean.substring(20, 25);
            
            // Verify key part matches
            const expectedKeyPart = expectedHash.substring(0, 20).toUpperCase();
            
            // Verify checksum
            const expectedChecksum = this.md5(expectedHash).substring(0, 5).toUpperCase();
            
            return keyPart === expectedKeyPart && checksum === expectedChecksum;
        } catch (error) {
            console.error('License verification error:', error);
            return false;
        }
    }
    
    // Generate activation key for license activation tracking
    static generateActivationKey(licenseKey, deviceFingerprint) {
        const input = `${licenseKey}|${deviceFingerprint}|${Date.now()}`;
        return this.sha256(input).substring(0, 16).toUpperCase();
    }
    
    // Create device fingerprint from request data
    static createDeviceFingerprint(userAgent, ipAddress, additionalData = {}) {
        const fingerprintData = {
            userAgent: userAgent || 'unknown',
            ipAddress: ipAddress || 'unknown',
            ...additionalData
        };
        
        const input = JSON.stringify(fingerprintData);
        return this.sha256(input).substring(0, 32);
    }
    
    // Generate batch licenses
    static async generateBatchLicenses(licenses) {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < licenses.length; i++) {
            try {
                const license = licenses[i];
                const result = await this.generateLicenseKey(
                    license.customerEmail,
                    license.customerName,
                    license.expiryDate,
                    license.features,
                    license.maxActivations
                );
                
                results.push({
                    index: i,
                    ...result,
                    originalData: license
                });
            } catch (error) {
                errors.push({
                    index: i,
                    error: error.message,
                    originalData: licenses[i]
                });
            }
        }
        
        return { results, errors };
    }
    
    // Validate license data consistency
    static validateLicenseData(licenseData) {
        const required = ['email', 'name', 'productId', 'expiry', 'features', 'maxActivations', 'generated', 'version'];
        
        for (const field of required) {
            if (licenseData[field] === undefined || licenseData[field] === null) {
                return { valid: false, error: `Missing required field: ${field}` };
            }
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(licenseData.email)) {
            return { valid: false, error: 'Invalid email format' };
        }
        
        // Validate expiry is in the future (when generated)
        if (licenseData.expiry <= licenseData.generated) {
            return { valid: false, error: 'Expiry date must be after generation date' };
        }
        
        // Validate features is an array
        if (!Array.isArray(licenseData.features)) {
            return { valid: false, error: 'Features must be an array' };
        }
        
        // Validate maxActivations is a positive integer
        if (!Number.isInteger(licenseData.maxActivations) || licenseData.maxActivations < 1) {
            return { valid: false, error: 'Max activations must be a positive integer' };
        }
        
        return { valid: true };
    }
}

module.exports = {
    LicenseGenerator,
    SECRET_KEY,
    PRODUCT_ID
}; 