const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const createTables = async () => {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Initializing database tables...');
        
        // Create licenses table
        await client.query(`
            CREATE TABLE IF NOT EXISTS licenses (
                id SERIAL PRIMARY KEY,
                license_key VARCHAR(255) UNIQUE NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                product_id VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
                features JSONB NOT NULL DEFAULT '[]',
                max_activations INTEGER DEFAULT 1,
                current_activations INTEGER DEFAULT 0,
                issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                suspended_at TIMESTAMP WITH TIME ZONE NULL,
                suspended_reason TEXT NULL,
                last_checked TIMESTAMP WITH TIME ZONE NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create activations table for tracking license usage
        await client.query(`
            CREATE TABLE IF NOT EXISTS license_activations (
                id SERIAL PRIMARY KEY,
                license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
                device_fingerprint VARCHAR(255) NOT NULL,
                ip_address INET,
                user_agent TEXT,
                activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}'
            );
        `);
        
        // Create license_history table for audit trail
        await client.query(`
            CREATE TABLE IF NOT EXISTS license_history (
                id SERIAL PRIMARY KEY,
                license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                old_status VARCHAR(50),
                new_status VARCHAR(50),
                reason TEXT,
                performed_by VARCHAR(255),
                performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB DEFAULT '{}'
            );
        `);
        
        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
            CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(customer_email);
            CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
            CREATE INDEX IF NOT EXISTS idx_licenses_expires ON licenses(expires_at);
            CREATE INDEX IF NOT EXISTS idx_activations_license ON license_activations(license_id);
            CREATE INDEX IF NOT EXISTS idx_activations_device ON license_activations(device_fingerprint);
            CREATE INDEX IF NOT EXISTS idx_history_license ON license_history(license_id);
        `);
        
        // Create function to automatically update updated_at timestamp
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        
        // Create trigger for updated_at
        await client.query(`
            DROP TRIGGER IF EXISTS update_licenses_updated_at ON licenses;
            CREATE TRIGGER update_licenses_updated_at
                BEFORE UPDATE ON licenses
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        
        // Create function to auto-expire licenses
        await client.query(`
            CREATE OR REPLACE FUNCTION update_expired_licenses()
            RETURNS INTEGER AS $$
            DECLARE
                updated_count INTEGER;
            BEGIN
                UPDATE licenses 
                SET status = 'expired'
                WHERE status = 'active' 
                AND expires_at < CURRENT_TIMESTAMP;
                
                GET DIAGNOSTICS updated_count = ROW_COUNT;
                RETURN updated_count;
            END;
            $$ language 'plpgsql';
        `);
        
        console.log('✅ Database tables created successfully!');
        console.log('📊 Tables created: licenses, license_activations, license_history');
        console.log('🔧 Functions and triggers set up for automatic maintenance');
        
    } catch (error) {
        console.error('❌ Error creating database tables:', error);
        throw error;
    } finally {
        client.release();
    }
};

const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('🔗 Database connection successful:', result.rows[0].now);
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

const main = async () => {
    console.log('🚀 Starting database initialization...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        process.exit(1);
    }
    
    // Create tables
    await createTables();
    
    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run "npm start" to start the server');
    console.log('2. Access the license generator at http://localhost:3000');
    
    process.exit(0);
};

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { createTables, testConnection }; 