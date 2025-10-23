# Production Database Deployment Guide

## Environment Variables Setup

### Required Environment Variables

```bash
# Primary database connection
POSTGRES_URL="postgresql://username:password@host:port/database_name"

# Alternative names for different platforms
DATABASE_URL="postgresql://username:password@host:port/database_name"

# SSL Configuration
POSTGRES_SSL_MODE="require" # Options: require, prefer, allow, disable
```

### Platform-Specific Setup

#### Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:
   - `POSTGRES_URL`: Your production database URL
   - `POSTGRES_SSL_MODE`: Set to "require" for most cloud databases

#### Netlify

1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Add the same variables as Vercel

#### Railway

1. Go to your Railway project
2. Navigate to Variables tab
3. Add `DATABASE_URL` with your PostgreSQL connection string

#### Heroku

1. Go to your Heroku app dashboard
2. Navigate to Settings > Config Vars
3. Add `DATABASE_URL` (Heroku automatically provides this for PostgreSQL add-ons)

## Database Providers

### Recommended Production Databases

#### 1. Neon (Recommended)

- Serverless PostgreSQL
- Automatic scaling
- Built-in connection pooling
- Free tier available

```bash
# Neon connection string format
POSTGRES_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/database_name?sslmode=require"
```

#### 2. Supabase

- PostgreSQL with additional features
- Built-in authentication
- Real-time subscriptions

```bash
# Supabase connection string format
POSTGRES_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

#### 3. PlanetScale (MySQL alternative)

- If you prefer MySQL over PostgreSQL
- Requires code changes to use MySQL driver

#### 4. AWS RDS

- Full control over PostgreSQL instance
- More complex setup but maximum flexibility

## SSL Configuration

### For Cloud Databases (Neon, Supabase, etc.)

```bash
POSTGRES_SSL_MODE="require"
```

### For Self-hosted Databases

```bash
POSTGRES_SSL_MODE="prefer"  # or "disable" if SSL is not configured
```

## Connection Pooling

The new database configuration includes:

- Maximum 20 connections in production
- 10 connections in development
- 20-second idle timeout
- 10-second connection timeout

## Health Checks

The application now includes database health checks. You can:

1. Call `/api/health` endpoint to check database connectivity
2. Monitor logs for connection status messages

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variable: POSTGRES_URL"

- **Solution**: Ensure `POSTGRES_URL` or `DATABASE_URL` is set in your deployment platform

#### 2. "SSL connection error"

- **Solution**: Check `POSTGRES_SSL_MODE` setting
- Try "prefer" instead of "require" if SSL is not properly configured

#### 3. "Connection timeout"

- **Solution**: Check if your database allows connections from your deployment platform's IP ranges
- Some databases require IP whitelisting

#### 4. "Too many connections"

- **Solution**: The new configuration limits connections, but ensure your database can handle the load
- Consider upgrading your database plan

### Testing Database Connection

1. Deploy your application
2. Check the logs for "✅ Database connection established successfully"
3. Visit `/api/seed` to test database operations
4. Monitor for any connection errors

## Migration from Development

1. **Backup your development data** (if needed)
2. **Set up production database** using one of the recommended providers
3. **Configure environment variables** in your deployment platform
4. **Deploy your application**
5. **Run database seeding** by visiting `/api/seed` endpoint
6. **Test all functionality** to ensure everything works

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong passwords** for your database
3. **Enable SSL/TLS** for all production connections
4. **Restrict database access** to your deployment platform's IP ranges
5. **Regularly rotate database credentials**
6. **Monitor database access logs**

## Performance Optimization

1. **Use connection pooling** (already implemented)
2. **Monitor database performance** using your provider's dashboard
3. **Optimize queries** - avoid N+1 queries
4. **Add database indexes** for frequently queried columns
5. **Consider read replicas** for read-heavy workloads
