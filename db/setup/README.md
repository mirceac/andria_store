# Local Development Setup

## Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v16 or higher)
- Git

## Database Setup

### Using Neon Database (Recommended)
1. Sign up for a free account at https://neon.tech
2. Create a new project
3. Get your connection string from the dashboard
4. Use the connection string in your .env file (it should look like: `postgres://user:pass@ep-cool-name-123456.region.aws.neon.tech/neondb`)

### Using Local PostgreSQL (Alternative)
#### Windows Users
1. Navigate to PostgreSQL bin directory:
```bash
cd C:\Program Files\PostgreSQL\16\bin
```

2. Create the database:
```bash
./createdb -U postgres andria_store
```

3. Run the database setup script (adjust the path to match your setup):
```bash
./psql -U postgres -d andria_store -f C:\andria_store\db\setup\database.sql
```

#### Other Platforms
##### Option 1: Using psql
1. Start psql:
```bash
psql postgres
```

2. Create the database:
```sql
CREATE DATABASE ecommerce_db;
```

3. Exit psql:
```sql
\q
```

4. Run the database setup script:
```bash
psql -d ecommerce_db -f setup/database.sql
```

##### Option 2: Using createdb (if available)
If you have PostgreSQL's createdb command in your PATH:
```bash
createdb ecommerce_db
psql -d ecommerce_db -f setup/database.sql
```

## Application Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
# Database (Use ONE of these formats)
# For Neon:
DATABASE_URL=postgres://user:pass@ep-cool-name-123456.region.aws.neon.tech/neondb
# For local PostgreSQL:
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/andria_store

# Session
SESSION_SECRET=your_random_secret_string_here

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Troubleshooting Database Connection
If you encounter database connection issues:

1. Check your DATABASE_URL format:
   - For Neon: Should start with `postgres://`
   - For local PostgreSQL: Should start with `postgresql://`

2. Verify the connection:
   - For Neon: Test the connection in the Neon dashboard
   - For local: Try connecting with `psql` command

3. Common issues:
   - Wrong password in connection string
   - Database server not running
   - Firewall blocking connection
   - VPN interfering with connection

For more help, check the server logs or contact support.

## Default Admin Account
Username: admin
Password: admin

## Testing Stripe Integration
1. Use Stripe test cards for payments:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002

2. Webhook testing:
   - Use Stripe CLI for local webhook testing:
     ```bash
     stripe listen --forward-to localhost:5000/api/webhook
     ```
   - Or configure your webhook endpoint in Stripe Dashboard (test mode)

## Note
This setup is for development purposes only. For production, ensure:
- Secure password hashing
- Environment variable protection
- Production-grade database configuration
- Proper session management