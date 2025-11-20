import '../config';
import express, { type Request, Response, NextFunction } from "express";
import path from 'path';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Update the static file serving
app.use('/uploads', express.static(join(__dirname, '../public/uploads')));

// Serve PDF files from public/uploads
app.use('/uploads/pdf', express.static(join(__dirname, '../public/uploads/pdf')));

// Add webhook request logging
app.use((req, res, next) => {
  if (req.path.includes('/webhook')) {
    console.log('\n=== Webhook Request Processing Started ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Path:', req.path);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Stripe-Signature:', req.headers['stripe-signature'] ? 'Present' : 'Missing');
  }
  next();
});

// Configure raw body parser specifically for /api/webhook before json parser
app.use(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  (req: Request, _, next) => {
    const rawBody = req.body;
    if (Buffer.isBuffer(rawBody)) {
      req.rawBody = rawBody;
      console.log('Raw body captured for webhook, length:', rawBody.length);
    } else {
      console.log('Warning: Raw body is not a buffer:', typeof rawBody);
    }
    next();
  }
);

// Standard middleware for other routes
// Increase limit to 10MB for profile pictures and other large uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request logging middleware for API routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error in request:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "development") {
    console.log("Starting in DEVELOPMENT mode");
    await setupVite(app, server);
  } else {
    console.log("Starting in PRODUCTION mode");
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();