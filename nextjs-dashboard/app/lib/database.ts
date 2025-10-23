import postgres from "postgres";

// Environment variable validation
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Database configuration
const getDatabaseConfig = () => {
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!postgresUrl) {
    throw new Error(
      "Missing database URL. Please set POSTGRES_URL or DATABASE_URL environment variable."
    );
  }

  // SSL configuration based on environment
  const sslMode =
    process.env.POSTGRES_SSL_MODE ||
    (process.env.NODE_ENV === "production" ? "require" : "prefer");

  // Connection pool configuration for production
  const poolConfig = {
    ssl:
      sslMode === "require"
        ? "require"
        : sslMode === "disable"
        ? false
        : sslMode,
    max: process.env.NODE_ENV === "production" ? 20 : 10, // Max connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout
    prepare: false, // Disable prepared statements for better compatibility
  };

  return {
    url: postgresUrl,
    ...poolConfig,
  };
};

// Create database connection with proper error handling
let sql: postgres.Sql;

try {
  const config = getDatabaseConfig();
  sql = postgres(config.url, config);

  // Test connection
  sql`SELECT 1`
    .then(() => {
      console.log("✅ Database connection established successfully");
    })
    .catch((error) => {
      console.error("❌ Database connection failed:", error);
    });
} catch (error) {
  console.error("❌ Database configuration error:", error);
  throw error;
}

// Database health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await sql.end();
    console.log("Database connection closed gracefully");
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
}

export { sql };
export default sql;
