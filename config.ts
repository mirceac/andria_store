import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple possible locations for .env file
const possibleEnvPaths = [
  resolve(__dirname, '.env'),           // Same directory (dev)
  resolve(__dirname, '..', '.env'),     // One level up (production dist/)
  resolve(process.cwd(), '.env'),       // Current working directory
];

let envPath = possibleEnvPaths[0];
for (const path of possibleEnvPaths) {
  if (existsSync(path)) {
    envPath = path;
    break;
  }
}

dotenvConfig({ path: envPath });

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SESSION_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} environment variable is required but not set. Please check your .env file.`);
  }
}

// Debug logging for configuration loading
console.log("Configuration loading:", {
  envPath,
  hasSessionSecret: !!process.env.SESSION_SECRET,
  isDevelopment: process.env.NODE_ENV !== 'production'
});

// Validate DATABASE_URL format
const databaseUrl = process.env.DATABASE_URL!;
if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
  throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
}

// After validation, we can safely assert these values exist
export const config = {
  databaseUrl,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  sessionSecret: process.env.SESSION_SECRET!,
  isDevelopment: process.env.NODE_ENV !== 'production',
} as const;