const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { LicenseDatabase, healthCheck, gracefulShutdown } = require('./utils/database');
const { LicenseGenerator } = require('./utils/licenseGenerator');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const createLicenseLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: {
        error: 'Too many license generation requests from this IP, please try again later.'
    }
});

const generalLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimit);

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'License server is running'
    });
});

// Generate new license
app.post('/api/licenses/generate', createLicenseLimit, async (req, res) => {
    try {
        const { customerEmail, customerName, validityDays, features, maxActivations } = req.body;
        
        // Validate required fields
        if (!customerEmail || !customerName || !validityDays) {
            return res.status(400).json({
                error: 'Missing required fields: customerEmail, customerName, validityDays'
            });
        }
        
        // Calculate expiry date
        const expiryDate = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
        
        // Parse features
        let licenseFeatures = ['basic'];
        if (features) {
            if (typeof features === 'string') {
                licenseFeatures = features.split(',').map(f => f.trim());
            } else if (Array.isArray(features)) {
                licenseFeatures = features;
            }
        }
        
        // Generate license key
        const result = await LicenseGenerator.generateLicenseKey(
            customerEmail,
            customerName,
            expiryDate,
            licenseFeatures,
            maxActivations || 1
        );
        
        // Save to database
        const licenseData = {
            license_key: result.licenseKey,
            customer_email: result.data.email,
            customer_name: result.data.name,
            product_id: result.data.productId,
            features: result.data.features,
            max_activations: result.data.maxActivations,
            expires_at: expiryDate,
            metadata: {
                generated_by: 'web_interface',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                signature: result.signature
            }
        };
        
        const license = await LicenseDatabase.createLicense(licenseData);
        
        res.json({
            success: true,
            license: {
                key: license.license_key,
                customer: {
                    email: license.customer_email,
                    name: license.customer_name
                },
                status: license.status,
                features: license.features,
                maxActivations: license.max_activations,
                expiresAt: license.expires_at,
                generatedAt: license.created_at
            }
        });
        
    } catch (error) {
        console.error('License generation error:', error);
        res.status(500).json({
            error: 'Failed to generate license',
            details: error.message
        });
    }
});

// Check license status
app.get('/api/licenses/:licenseKey/status', async (req, res) => {
    try {
        const { licenseKey } = req.params;
        
        if (!LicenseGenerator.validateLicenseKeyFormat(licenseKey)) {
            return res.status(400).json({
                error: 'Invalid license key format'
            });
        }
        
        const validity = await LicenseDatabase.checkLicenseValidity(licenseKey);
        
        if (!validity.license) {
            return res.status(404).json({
                error: 'License not found'
            });
        }
        
        res.json({
            licenseKey: licenseKey,
            valid: validity.valid,
            status: validity.license.status,
            reason: validity.reason,
            details: validity.details,
            license: {
                customer: {
                    email: validity.license.customer_email,
                    name: validity.license.customer_name
                },
                features: validity.license.features,
                maxActivations: validity.license.max_activations,
                currentActivations: validity.license.current_activations,
                expiresAt: validity.license.expires_at,
                issuedAt: validity.license.issued_at,
                lastChecked: validity.license.last_checked,
                suspendedAt: validity.license.suspended_at,
                suspendedReason: validity.license.suspended_reason
            }
        });
        
    } catch (error) {
        console.error('License status check error:', error);
        res.status(500).json({
            error: 'Failed to check license status',
            details: error.message
        });
    }
});

// Suspend license
app.post('/api/licenses/:licenseKey/suspend', async (req, res) => {
    try {
        const { licenseKey } = req.params;
        const { reason, performedBy } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                error: 'Suspension reason is required'
            });
        }
        
        const license = await LicenseDatabase.suspendLicense(
            licenseKey, 
            reason, 
            performedBy || 'admin'
        );
        
        res.json({
            success: true,
            message: 'License suspended successfully',
            license: {
                key: license.license_key,
                status: license.status,
                suspendedAt: license.suspended_at,
                suspendedReason: license.suspended_reason
            }
        });
        
    } catch (error) {
        console.error('License suspension error:', error);
        res.status(400).json({
            error: error.message
        });
    }
});

// Reactivate license
app.post('/api/licenses/:licenseKey/reactivate', async (req, res) => {
    try {
        const { licenseKey } = req.params;
        const { performedBy } = req.body;
        
        const license = await LicenseDatabase.reactivateLicense(
            licenseKey, 
            performedBy || 'admin'
        );
        
        res.json({
            success: true,
            message: 'License reactivated successfully',
            license: {
                key: license.license_key,
                status: license.status,
                reactivatedAt: license.updated_at
            }
        });
        
    } catch (error) {
        console.error('License reactivation error:', error);
        res.status(400).json({
            error: error.message
        });
    }
});

// Get all licenses (with filtering)
app.get('/api/licenses', async (req, res) => {
    try {
        const { status, email, name, limit } = req.query;
        
        const filters = {};
        if (status) filters.status = status;
        if (email) filters.email = email;
        if (name) filters.name = name;
        if (limit) filters.limit = parseInt(limit);
        
        const licenses = await LicenseDatabase.getAllLicenses(filters);
        
        const formattedLicenses = licenses.map(license => ({
            id: license.id,
            key: license.license_key,
            customer: {
                email: license.customer_email,
                name: license.customer_name
            },
            status: license.status,
            currentStatus: license.current_status,
            features: license.features,
            maxActivations: license.max_activations,
            currentActivations: license.current_activations,
            expiresAt: license.expires_at,
            issuedAt: license.issued_at,
            lastChecked: license.last_checked,
            suspendedAt: license.suspended_at,
            suspendedReason: license.suspended_reason,
            createdAt: license.created_at,
            updatedAt: license.updated_at
        }));
        
        res.json({
            licenses: formattedLicenses,
            count: formattedLicenses.length
        });
        
    } catch (error) {
        console.error('Get licenses error:', error);
        res.status(500).json({
            error: 'Failed to retrieve licenses',
            details: error.message
        });
    }
});

// Get license history
app.get('/api/licenses/:licenseKey/history', async (req, res) => {
    try {
        const { licenseKey } = req.params;
        
        const license = await LicenseDatabase.getLicense(licenseKey);
        if (!license) {
            return res.status(404).json({
                error: 'License not found'
            });
        }
        
        const history = await LicenseDatabase.getLicenseHistory(license.id);
        
        res.json({
            licenseKey: licenseKey,
            history: history
        });
        
    } catch (error) {
        console.error('License history error:', error);
        res.status(500).json({
            error: 'Failed to retrieve license history',
            details: error.message
        });
    }
});

// Get license statistics
app.get('/api/licenses/stats', async (req, res) => {
    try {
        const stats = await LicenseDatabase.getLicenseStats();
        
        res.json({
            statistics: {
                total: parseInt(stats.total_licenses) || 0,
                active: parseInt(stats.active_licenses) || 0,
                suspended: parseInt(stats.suspended_licenses) || 0,
                expired: parseInt(stats.expired_licenses) || 0,
                revoked: parseInt(stats.revoked_licenses) || 0,
                recent: parseInt(stats.recent_licenses) || 0
            }
        });
        
    } catch (error) {
        console.error('License stats error:', error);
        res.status(500).json({
            error: 'Failed to retrieve license statistics',
            details: error.message
        });
    }
});

// Batch generate licenses
app.post('/api/licenses/batch', createLicenseLimit, async (req, res) => {
    try {
        const { licenses } = req.body;
        
        if (!Array.isArray(licenses) || licenses.length === 0) {
            return res.status(400).json({
                error: 'Licenses array is required and must not be empty'
            });
        }
        
        if (licenses.length > 50) {
            return res.status(400).json({
                error: 'Batch size cannot exceed 50 licenses'
            });
        }
        
        // Generate all licenses
        const results = [];
        const errors = [];
        
        for (let i = 0; i < licenses.length; i++) {
            try {
                const licenseRequest = licenses[i];
                const expiryDate = new Date(Date.now() + licenseRequest.validityDays * 24 * 60 * 60 * 1000);
                
                const result = await LicenseGenerator.generateLicenseKey(
                    licenseRequest.customerEmail,
                    licenseRequest.customerName,
                    expiryDate,
                    licenseRequest.features || ['basic'],
                    licenseRequest.maxActivations || 1
                );
                
                // Save to database
                const licenseData = {
                    license_key: result.licenseKey,
                    customer_email: result.data.email,
                    customer_name: result.data.name,
                    product_id: result.data.productId,
                    features: result.data.features,
                    max_activations: result.data.maxActivations,
                    expires_at: expiryDate,
                    metadata: {
                        generated_by: 'batch_interface',
                        batch_index: i,
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        signature: result.signature
                    }
                };
                
                const license = await LicenseDatabase.createLicense(licenseData);
                results.push({
                    index: i,
                    key: license.license_key,
                    customer: licenseRequest
                });
                
            } catch (error) {
                errors.push({
                    index: i,
                    error: error.message,
                    customer: licenses[i]
                });
            }
        }
        
        res.json({
            success: true,
            generated: results.length,
            failed: errors.length,
            results: results,
            errors: errors
        });
        
    } catch (error) {
        console.error('Batch license generation error:', error);
        res.status(500).json({
            error: 'Failed to generate batch licenses',
            details: error.message
        });
    }
});

// Maintenance endpoint to update expired licenses
app.post('/api/maintenance/update-expired', async (req, res) => {
    try {
        const updatedCount = await LicenseDatabase.updateExpiredLicenses();
        
        res.json({
            success: true,
            message: `Updated ${updatedCount} expired licenses`,
            updatedCount: updatedCount
        });
        
    } catch (error) {
        console.error('Update expired licenses error:', error);
        res.status(500).json({
            error: 'Failed to update expired licenses',
            details: error.message
        });
    }
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// Start server with database connection check
const startServer = async () => {
    try {
        // Test database connection before starting server
        console.log('🔍 Testing database connection...');
        const dbHealthy = await healthCheck();
        
        if (!dbHealthy) {
            console.error('❌ Database connection failed. Please check your DATABASE_URL configuration.');
            console.error('💡 Make sure your .env file contains a valid DATABASE_URL');
            console.error('📋 Example: DATABASE_URL=postgresql://username:password@host:port/database');
            process.exit(1);
        }
        
        console.log('✅ Database connection successful');
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`🚀 License Generator Server running on port ${PORT}`);
            console.log(`📱 Web interface: http://localhost:${PORT}`);
            console.log(`🔧 API base URL: http://localhost:${PORT}/api`);
            console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'No DATABASE_URL found'}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    await gracefulShutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    await gracefulShutdown();
    process.exit(0);
});

module.exports = app; 