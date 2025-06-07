# License Generator - PostgreSQL Database Integration

This document explains the PostgreSQL database integration that has been added to the AOG Tech License Generator system.

## 🆕 New Features

### Database Integration
- **PostgreSQL Database**: All licenses are now stored in a PostgreSQL database
- **License Status Tracking**: Track license status (active, suspended, expired, revoked)
- **Audit Trail**: Complete history of all license actions and status changes
- **License Management**: Suspend, reactivate, and manage licenses via web interface

### License Management Interface
- **Check License Status**: Look up any license key to see its current status
- **License Table View**: Browse all licenses with filtering options
- **Statistics Dashboard**: View license statistics and metrics
- **License History**: View complete audit trail for any license

### API Endpoints
- **RESTful API**: Complete REST API for license management
- **Rate Limiting**: Built-in rate limiting for security
- **Error Handling**: Comprehensive error handling and validation

## 🏗️ Database Schema

### Tables Created

#### `licenses`
- Stores main license information
- Fields: license_key, customer_email, customer_name, status, features, expires_at, etc.
- Automatic status updates (e.g., expired licenses)

#### `license_activations`
- Tracks license usage and device activations
- Fields: license_id, device_fingerprint, ip_address, activated_at, etc.

#### `license_history`
- Complete audit trail of all license actions
- Fields: license_id, action, old_status, new_status, reason, performed_by, etc.

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database (cloud or local)
- Environment variables configured

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   Create a `.env` file with:
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   SECRET_KEY=your-secret-key-here
   PRODUCT_ID=your-product-id
   PORT=3000
   NODE_ENV=production
   ```

3. **Initialize Database**
   ```bash
   npm run init-db
   ```

4. **Start Server**
   ```bash
   npm start
   ```

5. **Access Application**
   Open http://localhost:3000 in your browser

## 📋 API Documentation

### Authentication
No authentication required for basic usage. Consider implementing authentication for production use.

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Health Check
```http
GET /api/health
```
Returns server and database status.

#### Generate License
```http
POST /api/licenses/generate
Content-Type: application/json

{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "validityDays": 365,
  "features": ["basic", "advanced"],
  "maxActivations": 1
}
```

#### Check License Status
```http
GET /api/licenses/{licenseKey}/status
```

#### Suspend License
```http
POST /api/licenses/{licenseKey}/suspend
Content-Type: application/json

{
  "reason": "Payment failure",
  "performedBy": "admin"
}
```

#### Reactivate License
```http
POST /api/licenses/{licenseKey}/reactivate
Content-Type: application/json

{
  "performedBy": "admin"
}
```

#### Get All Licenses
```http
GET /api/licenses?status=active&email=john@example.com&limit=50
```

#### Get License History
```http
GET /api/licenses/{licenseKey}/history
```

#### Get License Statistics
```http
GET /api/licenses/stats
```

#### Batch Generate Licenses
```http
POST /api/licenses/batch
Content-Type: application/json

{
  "licenses": [
    {
      "customerEmail": "customer1@example.com",
      "customerName": "Customer 1",
      "validityDays": 365,
      "features": ["basic"]
    },
    {
      "customerEmail": "customer2@example.com",
      "customerName": "Customer 2",
      "validityDays": 365,
      "features": ["advanced"]
    }
  ]
}
```

## 🎯 Usage Examples

### Using the Web Interface

1. **Generate a License**
   - Fill in customer details in the main form
   - Select validity period and features
   - Click "Generate License Key"
   - License is automatically saved to database

2. **Check License Status**
   - Go to "License Management" tab
   - Click "Check Status" sub-tab
   - Enter license key and click "Check Status"
   - View detailed status information

3. **Manage Licenses**
   - Go to "License Management" tab
   - Click "Manage Licenses" sub-tab
   - Browse all licenses with filtering
   - Use action buttons to suspend/reactivate licenses

4. **View Statistics**
   - Go to "License Management" tab
   - Click "Statistics" sub-tab
   - View license metrics and counts

### Using the API

```javascript
// Generate a license
const response = await fetch('/api/licenses/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    validityDays: 365,
    features: ['basic', 'advanced']
  })
});

// Check license status
const status = await fetch('/api/licenses/ABCDE-FGHIJ-KLMNO-PQRST-UVWXY/status');

// Suspend a license
await fetch('/api/licenses/ABCDE-FGHIJ-KLMNO-PQRST-UVWXY/suspend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'Payment overdue',
    performedBy: 'admin@company.com'
  })
});
```

## 🔧 License Status Management

### Status Types
- **active**: License is valid and can be used
- **suspended**: License is temporarily disabled
- **expired**: License has passed its expiration date
- **revoked**: License has been permanently disabled

### Status Transitions
- **active** → **suspended**: Manual suspension by admin
- **active** → **expired**: Automatic when expiry date is reached
- **suspended** → **active**: Manual reactivation by admin
- **Any status** → **revoked**: Manual revocation (permanent)

### Automatic Processes
- Licenses automatically expire when their expiry date is reached
- Database function `update_expired_licenses()` can be called periodically
- Maintenance endpoint: `POST /api/maintenance/update-expired`

## 🔒 Security Considerations

### Rate Limiting
- General API: 200 requests per 15 minutes per IP
- License generation: 50 requests per 15 minutes per IP

### Data Protection
- All license data is stored securely in PostgreSQL
- Database connections use SSL in production
- License keys use cryptographic signatures

### Best Practices
1. Use environment variables for sensitive configuration
2. Implement proper authentication for production use
3. Set up database backups
4. Monitor API usage and license generation patterns
5. Use HTTPS in production

## 📊 Database Maintenance

### Regular Tasks
1. **Update Expired Licenses**
   ```bash
   curl -X POST http://localhost:3000/api/maintenance/update-expired
   ```

2. **Database Backups**
   Set up regular PostgreSQL backups of your license database

3. **Monitor Performance**
   - Check database indexes
   - Monitor query performance
   - Review license generation patterns

### Scaling Considerations
- Database connection pooling is configured (max 10 connections)
- Indexes are created for optimal query performance
- Consider read replicas for heavy read workloads

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL environment variable
   - Verify PostgreSQL server is running
   - Check network connectivity and firewall settings

2. **License Generation Fails**
   - Check server logs for detailed error messages
   - Verify database tables exist (run `npm run init-db`)
   - Check rate limiting (wait and try again)

3. **API Returns 500 Error**
   - Check server logs
   - Verify database connection
   - Check for missing environment variables

### Debugging
- Enable verbose logging by setting `DEBUG=*` environment variable
- Check browser developer tools for frontend errors
- Monitor database query logs

## 🔄 Migration from Previous Version

If you're upgrading from the localStorage-only version:

1. **Backup Existing Data**
   - Export existing licenses from localStorage if needed

2. **Set Up Database**
   - Follow setup instructions above
   - Run database initialization

3. **Test Integration**
   - Generate a test license to verify everything works
   - Check the management interface

4. **Update Client Applications**
   - Update any client applications to use the new API endpoints
   - Test license validation with the new system

## 📞 Support

For questions or issues:
1. Check this documentation
2. Review server logs for error messages
3. Test API endpoints directly
4. Check database connectivity and status

## 🎉 Conclusion

The PostgreSQL integration provides a robust, scalable foundation for license management with comprehensive tracking, audit trails, and administrative capabilities. The system maintains backward compatibility while adding powerful new features for license lifecycle management. 