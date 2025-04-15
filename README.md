# E-commerce Platform

A modern, feature-rich e-commerce platform built with React and Express.js, delivering seamless and interactive online shopping experiences with robust backend infrastructure and comprehensive user engagement features.

## Features

- 🛍️ Product browsing with search and sorting
- 🛒 Shopping cart management
- 👤 User authentication
- 💳 Secure payments with Stripe
- 📦 Order tracking
- 🔐 Admin dashboard
  - Product management
  - Order management
  - Customer overview

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: Zustand
- **Authentication**: Passport.js
- **Payment Processing**: Stripe
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: Wouter
- **API Calls**: TanStack Query

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- Stripe account for payment processing

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Example environment variables
DATABASE_URL=postgresql://user:password@localhost:5432/your_database
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the database:
   ```bash
   npm run db:push
   ```
4. Create an admin user:
   ```bash
   curl -X POST http://localhost:5000/api/create-admin
   ```

## Development

Run the development server:

```bash
npm run dev
```

This will start:
- Frontend development server
- Backend API server
- Database connection

The application will be available at `http://localhost:5000`

## Production

To run the application in production mode:

1. Build the frontend:
   ```bash
   npm run build
   ```

## Admin Access

Default admin credentials:
- Username: `admin`
- Password: `admin`

## Available Routes

### Public Routes
- `/` - Home page with product listing
- `/auth` - Login/Register page
- `/product/:id` - Individual product page

### Protected Routes (Requires Authentication)
- `/cart` - Shopping cart
- `/orders` - Order history
- `/checkout/success` - Payment success page

### Admin Routes (Requires Admin Access)
- `/admin/products` - Product management
- `/admin/orders` - Order management

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PATCH /api/products/:id` - Update product (Admin only)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/admin/orders` - Get all orders (Admin only)
- `PATCH /api/admin/orders/:id` - Update order status (Admin only)

### Payment
- `POST /api/create-checkout-session` - Create Stripe checkout session

## Features Overview

### Product Management
- Add new products with name, description, price, and stock
- Upload product images
- Edit existing products
- Track inventory

### Shopping Cart
- Add/remove products
- Update quantities
- Persistent cart (survives page refresh)
- Real-time total calculation

### User Authentication
- Secure registration and login
- Protected routes
- Session management
- Admin privileges

### Order Management
- Order history
- Order status tracking
- Admin order management
- Status updates

### Payment Processing
- Secure checkout with Stripe
- Order confirmation
- Success/failure handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
