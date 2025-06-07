# Database Connection Troubleshooting Guide

## Common Connection Timeout Issues

### 1. Connection Timeout Error
**Error:** `Connection terminated due to connection timeout`

**Causes:**
- Database server is down or unreachable
- Network connectivity issues
- Database is overloaded
- Connection pool exhausted
- Firewall blocking connections

**Solutions:**
1. **Check DATABASE_URL:**
   ```bash
   # Verify your .env file contains:
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

2. **Test Database Connectivity:**
   ```bash
   # Try connecting directly with psql
   psql "postgresql://username:password@host:port/database"
   ```

3. **Restart the Server:**
   ```bash
   npm start
   ```

### 2. Connection Pool Issues
**Error:** `Connection terminated unexpectedly`

**Solutions:**
1. **Increase Pool Size:** The pool configuration has been updated to handle more connections:
   - Max connections: 20 (increased from 10)
   - Connection timeout: 10 seconds (increased from 2 seconds)
   - Idle timeout: 60 seconds (increased from 30 seconds)

2. **Check Database Server Status:**
   - Ensure PostgreSQL is running
   - Check server logs for errors
   - Verify sufficient database connections available

### 3. Network and Firewall Issues
**Solutions:**
1. **Check Network Connectivity:**
   ```bash
   # Test if database host is reachable
   ping your-database-host
   telnet your-database-host 5432
   ```

2. **Firewall Configuration:**
   - Ensure port 5432 (or your custom port) is open
   - Check both local and server-side firewalls
   - For cloud databases, verify security group/firewall rules

### 4. Environment Configuration Issues
**Common Problems:**
- Missing .env file
- Incorrect DATABASE_URL format
- Wrong credentials

**Solutions:**
1. **Create .env file:**
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   SECRET_KEY=your-secret-key-here
   PRODUCT_ID=your-product-id
   PORT=3000
   NODE_ENV=development
   ```

2. **Verify DATABASE_URL Format:**
   ```
   postgresql://[username]:[password]@[host]:[port]/[database]
   ```

### 5. Database Server Configuration
**PostgreSQL Configuration:**
1. **Check max_connections:**
   ```sql
   SHOW max_connections;
   ```

2. **Monitor Active Connections:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

3. **Check for Long-Running Queries:**
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
   ```

## Improved Error Handling Features

The application now includes:

1. **Automatic Retry Logic:**
   - Up to 3 retry attempts for connection failures
   - Exponential backoff between retries
   - Intelligent detection of connection-related errors

2. **Better Connection Pool Management:**
   - Increased timeout values
   - More robust connection handling
   - Graceful connection release

3. **Startup Database Validation:**
   - Server checks database connectivity before starting
   - Clear error messages for configuration issues
   - Graceful shutdown handling

4. **Enhanced Logging:**
   - Detailed error messages
   - Connection retry notifications
   - Database health check status

## Quick Fixes

### For Development Environment:
1. **Check if PostgreSQL is running:**
   ```bash
   # Windows
   net start postgresql
   
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

2. **Reset Database Connection:**
   ```bash
   # Stop the server
   Ctrl+C
   
   # Start again
   npm start
   ```

### For Production Environment:
1. **Check Database Server Status**
2. **Verify Connection Limits**
3. **Monitor Resource Usage**
4. **Check Application Logs**

## Getting Help

If issues persist:
1. Check the server console for detailed error messages
2. Verify all environment variables are set correctly
3. Test database connectivity independently
4. Check database server logs
5. Monitor system resources (CPU, memory, disk space)

## Prevention Tips

1. **Regular Monitoring:**
   - Monitor database connections
   - Set up alerts for connection failures
   - Monitor server resources

2. **Configuration Best Practices:**
   - Use connection pooling
   - Set appropriate timeout values
   - Implement retry logic

3. **Maintenance:**
   - Regular database maintenance
   - Monitor slow queries
   - Keep statistics up to date 