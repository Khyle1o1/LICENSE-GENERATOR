const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    createRetryIntervalMillis: 200,
    reapIntervalMillis: 1000,
    allowExitOnIdle: false,
});

class LicenseDatabase {
    
    // Create a new license
    static async createLicense(licenseData) {
        const client = await pool.connect();
        
        try {
            const query = `
                INSERT INTO licenses (
                    license_key, customer_email, customer_name, product_id,
                    features, max_activations, expires_at, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            
            const values = [
                licenseData.license_key,
                licenseData.customer_email,
                licenseData.customer_name,
                licenseData.product_id,
                JSON.stringify(licenseData.features || []),
                licenseData.max_activations || 1,
                licenseData.expires_at,
                JSON.stringify(licenseData.metadata || {})
            ];
            
            const result = await client.query(query, values);
            const license = result.rows[0];
            
            // Log the creation
            await this.logLicenseAction(license.id, 'created', null, 'active', 'License generated', 'system');
            
            return license;
        } finally {
            client.release();
        }
    }
    
    // Get license by key
    static async getLicense(licenseKey) {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT *, 
                       CASE 
                           WHEN expires_at < NOW() THEN 'expired'
                           ELSE status
                       END as current_status
                FROM licenses 
                WHERE license_key = $1
            `;
            
            const result = await client.query(query, [licenseKey]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const license = result.rows[0];
            
            // Update last_checked timestamp
            await client.query(
                'UPDATE licenses SET last_checked = NOW() WHERE id = $1',
                [license.id]
            );
            
            // Auto-expire if needed
            if (license.current_status === 'expired' && license.status !== 'expired') {
                await this.updateLicenseStatus(license.id, 'expired', 'Auto-expired');
                license.status = 'expired';
            }
            
            return license;
        } finally {
            client.release();
        }
    }
    
    // Update license status
    static async updateLicenseStatus(licenseId, newStatus, reason = null, performedBy = 'system') {
        const client = await pool.connect();
        
        try {
            // Get current status
            const currentResult = await client.query(
                'SELECT status FROM licenses WHERE id = $1',
                [licenseId]
            );
            
            if (currentResult.rows.length === 0) {
                throw new Error('License not found');
            }
            
            const oldStatus = currentResult.rows[0].status;
            
            // Update status with explicit type casting and separate logic for suspended status
            let updateQuery;
            let queryParams;
            
            if (newStatus === 'suspended') {
                updateQuery = `
                    UPDATE licenses 
                    SET status = $1::VARCHAR, 
                        suspended_at = NOW(),
                        suspended_reason = $2::TEXT
                    WHERE id = $3
                    RETURNING *
                `;
                queryParams = [newStatus, reason, licenseId];
            } else {
                updateQuery = `
                    UPDATE licenses 
                    SET status = $1::VARCHAR
                    WHERE id = $2
                    RETURNING *
                `;
                queryParams = [newStatus, licenseId];
            }
            
            const result = await client.query(updateQuery, queryParams);
            
            // Log the action
            await this.logLicenseAction(licenseId, 'status_changed', oldStatus, newStatus, reason, performedBy);
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }
    
    // Suspend license
    static async suspendLicense(licenseKey, reason, performedBy = 'admin') {
        const license = await this.getLicense(licenseKey);
        if (!license) {
            throw new Error('License not found');
        }
        
        if (license.status === 'suspended') {
            throw new Error('License is already suspended');
        }
        
        return await this.updateLicenseStatus(license.id, 'suspended', reason, performedBy);
    }
    
    // Reactivate license
    static async reactivateLicense(licenseKey, performedBy = 'admin') {
        const license = await this.getLicense(licenseKey);
        if (!license) {
            throw new Error('License not found');
        }
        
        if (license.status !== 'suspended') {
            throw new Error('License is not suspended');
        }
        
        // Check if license is expired
        if (new Date(license.expires_at) < new Date()) {
            throw new Error('Cannot reactivate expired license');
        }
        
        const client = await pool.connect();
        try {
            // Clear suspension data and reactivate
            const query = `
                UPDATE licenses 
                SET status = 'active', suspended_at = NULL, suspended_reason = NULL
                WHERE id = $1
                RETURNING *
            `;
            
            const result = await client.query(query, [license.id]);
            
            // Log the action
            await this.logLicenseAction(license.id, 'reactivated', 'suspended', 'active', 'License reactivated', performedBy);
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }
    
    // Get all licenses with filters
    static async getAllLicenses(filters = {}) {
        let client;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                client = await pool.connect();
                
                let query = `
                    SELECT *, 
                           CASE 
                               WHEN expires_at < NOW() THEN 'expired'
                               ELSE status
                           END as current_status
                    FROM licenses 
                    WHERE 1=1
                `;
                const values = [];
                let paramCount = 0;
                
                if (filters.status) {
                    paramCount++;
                    query += ` AND status = $${paramCount}`;
                    values.push(filters.status);
                }
                
                if (filters.email) {
                    paramCount++;
                    query += ` AND customer_email ILIKE $${paramCount}`;
                    values.push(`%${filters.email}%`);
                }
                
                if (filters.name) {
                    paramCount++;
                    query += ` AND customer_name ILIKE $${paramCount}`;
                    values.push(`%${filters.name}%`);
                }
                
                query += ` ORDER BY created_at DESC`;
                
                if (filters.limit) {
                    paramCount++;
                    query += ` LIMIT $${paramCount}`;
                    values.push(filters.limit);
                }
                
                const result = await client.query(query, values);
                return result.rows;
                
            } catch (error) {
                console.error(`Database error on attempt ${retryCount + 1}:`, error.message);
                
                // Check if this is a connection-related error that we should retry
                const isConnectionError = error.message.includes('Connection terminated') ||
                                        error.message.includes('connection timeout') ||
                                        error.message.includes('Connection refused') ||
                                        error.message.includes('ECONNRESET') ||
                                        error.message.includes('ETIMEDOUT');
                
                if (isConnectionError && retryCount < maxRetries - 1) {
                    retryCount++;
                    console.log(`Retrying database connection (attempt ${retryCount + 1}/${maxRetries})...`);
                    
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                    continue;
                }
                
                // If not a connection error or we've exhausted retries, throw the error
                throw error;
                
            } finally {
                if (client) {
                    try {
                        client.release();
                    } catch (releaseError) {
                        console.error('Error releasing client:', releaseError.message);
                    }
                }
            }
        }
    }
    
    // Get license history
    static async getLicenseHistory(licenseId) {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT * FROM license_history 
                WHERE license_id = $1 
                ORDER BY performed_at DESC
            `;
            
            const result = await client.query(query, [licenseId]);
            return result.rows;
        } finally {
            client.release();
        }
    }
    
    // Log license action
    static async logLicenseAction(licenseId, action, oldStatus, newStatus, reason, performedBy) {
        const client = await pool.connect();
        
        try {
            const query = `
                INSERT INTO license_history (
                    license_id, action, old_status, new_status, reason, performed_by
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `;
            
            await client.query(query, [licenseId, action, oldStatus, newStatus, reason, performedBy]);
        } finally {
            client.release();
        }
    }
    
    // Check license validity
    static async checkLicenseValidity(licenseKey) {
        const license = await this.getLicense(licenseKey);
        
        if (!license) {
            return { valid: false, reason: 'License not found' };
        }
        
        if (license.status === 'suspended') {
            return { 
                valid: false, 
                reason: 'License suspended', 
                details: license.suspended_reason,
                license 
            };
        }
        
        if (license.status === 'revoked') {
            return { valid: false, reason: 'License revoked', license };
        }
        
        if (new Date(license.expires_at) < new Date()) {
            return { valid: false, reason: 'License expired', license };
        }
        
        if (license.status === 'expired') {
            return { valid: false, reason: 'License expired', license };
        }
        
        return { valid: true, license };
    }
    
    // Get license statistics
    static async getLicenseStats() {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_licenses,
                    COUNT(CASE WHEN status = 'active' AND expires_at > NOW() THEN 1 END) as active_licenses,
                    COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_licenses,
                    COUNT(CASE WHEN status = 'expired' OR expires_at <= NOW() THEN 1 END) as expired_licenses,
                    COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked_licenses,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_licenses
                FROM licenses
            `;
            
            const result = await client.query(query);
            return result.rows[0];
        } finally {
            client.release();
        }
    }
    
    // Update expired licenses (maintenance task)
    static async updateExpiredLicenses() {
        const client = await pool.connect();
        
        try {
            const result = await client.query('SELECT update_expired_licenses()');
            return result.rows[0].update_expired_licenses;
        } finally {
            client.release();
        }
    }
}

// Health check with retry logic
const healthCheck = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
        try {
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log('Database health check passed');
            return true;
        } catch (error) {
            console.error(`Database health check failed (attempt ${retryCount + 1}/${maxRetries}):`, error.message);
            
            if (retryCount < maxRetries - 1) {
                retryCount++;
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                continue;
            }
            
            console.error('Database health check failed after all retries');
            return false;
        }
    }
};

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Closing database pool...');
    try {
        await pool.end();
        console.log('Database pool closed successfully');
    } catch (error) {
        console.error('Error closing database pool:', error.message);
    }
};

// Handle process signals for graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
    LicenseDatabase,
    healthCheck,
    gracefulShutdown,
    pool
}; 