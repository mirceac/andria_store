import { Buffer } from "buffer";
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { db } from "@db";
import { products, orders, orderItems, users, categories } from "@db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { createCheckoutSession, stripe } from "./stripe";
import { sendOrderConfirmationEmail } from "./email.js";
import { testEmailConfiguration } from "./email.js";
import type Stripe from "stripe";
import * as express from 'express';
import type { Session } from 'express-session';
import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Extend Express Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// Update the multer file filter to handle array values for storage_type
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    console.log('Multer processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    console.log('Request body in multer:', req.body);
    
    // Handle storage_type as an array or single value
    let storageType = req.body.storage_type;
    if (Array.isArray(storageType)) {
      storageType = storageType[0]; // Take the first value if it's an array
    }
    
    console.log('Storage type in multer:', storageType);
    
    if (storageType === 'pdf') {
      if (file.mimetype !== 'application/pdf') {
        cb(new Error('Only PDF files are allowed for PDF storage'));
        return;
      }
    } else if (storageType === 'image') {
      if (!file.mimetype.startsWith('image/')) {
        cb(new Error('Only image files are allowed for image storage'));
        return;
      }
    } else {
      console.log('Invalid storage type:', storageType);
      cb(new Error(`Invalid storage type: ${storageType}`));
      return;
    }
    cb(null, true);
  }
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Modify the webhook middleware section
  app.use(
    "/api/webhook",
    express.raw({ type: "application/json" }),
    (req: Request, _, next) => {
      console.log("\n=== Webhook Request Received ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Method:", req.method);
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Raw Body Type:", req.rawBody ? typeof req.rawBody : 'undefined');
      console.log("Raw Body Length:", req.rawBody ? req.rawBody.length : 0);
      console.log("=== End Request Info ===\n");

      const rawBody = req.body;
      if (Buffer.isBuffer(rawBody)) {
        req.rawBody = rawBody;
      }
      next();
    }
  );

  // Create admin user route (will be removed in production)
  app.post("/api/create-admin", async (req, res) => {
    try {
      const [existingAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.username, "admin"))
        .limit(1);

      if (existingAdmin) {
        if (!existingAdmin.is_admin) {
          await db
            .update(users)
            .set({ is_admin: true })
            .where(eq(users.id, existingAdmin.id));
        }
        return res.json({ message: "Admin user already exists" });
      }

      const password = "admin";
      const hashedPassword = await hashPassword(password);

      const [admin] = await db
        .insert(users)
        .values({
          username: "admin",
          password: hashedPassword,
          is_admin: true,
        })
        .returning();

      res.json({ message: "Admin user created successfully", admin });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

  // External image proxy endpoint to bypass CORS restrictions
  app.get("/api/proxy/image", async (req, res) => {
    try {
      const { url, thumbnail } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL parameter is required" });
      }
      
      console.log(`Proxying image request for: ${url}, thumbnail: ${thumbnail ? 'yes' : 'no'}`);
      
      // Validate URL format to prevent server-side request forgery
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      // Make a request to the external URL
      const fetch = await import('node-fetch');
      
      // Special handling for Google Photos URLs
      let finalUrl = url;
      if (url.includes('photos.google.com') || url.includes('photos.app.goo.gl')) {
        console.log('Detected Google Photos URL, attempting to extract image ID');
        
        try {
          // For direct photo URLs with ID in path
          let photoId = null;
          
          // Try multiple patterns for Google Photos URLs
          // First pattern: /photo/{id} in the URL path
          const directMatches = url.match(/\/photo\/([A-Za-z0-9_-]+)/);
          if (directMatches && directMatches[1]) {
            photoId = directMatches[1];
            console.log('Extracted Google Photos image ID from direct URL:', photoId);
          }
          
          // Second pattern: Look for AF1QipXXXX ID in the URL
          if (!photoId) {
            const afMatches = url.match(/AF1Qip[A-Za-z0-9_-]{10,}/);
            if (afMatches) {
              photoId = afMatches[0];
              console.log('Extracted Google Photos ID using AF1Qip pattern:', photoId);
            }
          }
          
          // Third pattern: For sharing links, we need to follow the redirect
          if (!photoId && (url.includes('photos.app.goo.gl') || url.includes('goo.gl'))) {
            console.log('Detected Google Photos sharing link, following redirect');
            
            const response = await fetch.default(url, {
              method: 'HEAD',
              redirect: 'follow', // Follow redirects automatically
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            // Get the actual URL after redirects
            const finalRedirectUrl = response.url;
            console.log('Final redirect URL:', finalRedirectUrl);
            
            // Try to extract photo ID from various patterns in the redirect URL
            const redirectAfMatches = finalRedirectUrl.match(/AF1Qip[A-Za-z0-9_-]{10,}/);
            if (redirectAfMatches) {
              photoId = redirectAfMatches[0];
              console.log('Extracted Google Photos ID from redirect:', photoId);
            } else {
              const redirectPathMatches = finalRedirectUrl.match(/\/photo\/([A-Za-z0-9_-]+)/);
              if (redirectPathMatches && redirectPathMatches[1]) {
                photoId = redirectPathMatches[1];
                console.log('Extracted Google Photos image ID from redirect path:', photoId);
              }
            }
          }
          
          // If we found a photo ID, use it to construct a direct URL with authentication params
          if (photoId) {
            finalUrl = `https://lh3.googleusercontent.com/d/${photoId}=w1200`;
            console.log('Converted to direct Google Photos URL:', finalUrl);
          } else {
            console.log('Could not extract Google Photos ID, using original URL');
          }
        } catch (error) {
          console.error('Error processing Google Photos URL:', error);
          // Continue with the original URL if there's an error
        }
      }
      
      // Handle Supabase signed URLs
      if (url.includes('supabase.co/storage/v1/object/sign/')) {
        console.log('Detected Supabase signed URL, using original URL');
        // Supabase signed URLs should work directly, but we might need special headers
        finalUrl = url;
      }
      
      // Handle Dropbox URLs
      if (url.includes('dropbox.com') && !url.includes('dl=1')) {
        // Convert shared Dropbox links to direct download links
        finalUrl = url.includes('?') ? `${url}&dl=1` : `${url}?dl=1`;
        console.log('Converted Dropbox URL to direct download:', finalUrl);
      }
      
      // Handle OneDrive URLs
      if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
        // OneDrive sharing links might need to be modified for direct download
        if (!url.includes('download=1')) {
          finalUrl = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
          console.log('Modified OneDrive URL for direct download:', finalUrl);
        }
      }
      
      // Handle Google Drive URLs
      if (url.includes('drive.google.com') && url.includes('/file/d/')) {
        // Extract file ID from Google Drive URL
        const matches = url.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
        if (matches && matches[1]) {
          const fileId = matches[1];
          finalUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
          console.log('Converted Google Drive URL to direct download:', finalUrl);
        }
      }
      
      console.log('Fetching from URL:', finalUrl);
      
      // Prepare headers based on URL type
      const requestHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      };
      
      // Add specific headers based on URL type
      if (finalUrl.includes('supabase.co')) {
        // Supabase-specific headers
        requestHeaders['Cache-Control'] = 'no-cache';
        requestHeaders['Pragma'] = 'no-cache';
      } else if (finalUrl.includes('photos.google.com') || finalUrl.includes('googleusercontent.com')) {
        // Google Photos specific headers
        requestHeaders['Referer'] = 'https://photos.google.com/';
        requestHeaders['Sec-Fetch-Dest'] = 'image';
        requestHeaders['Sec-Fetch-Mode'] = 'no-cors';
        requestHeaders['Sec-Fetch-Site'] = 'cross-site';
      }
      
      const response = await fetch.default(finalUrl, {
        headers: requestHeaders
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch image from ${finalUrl}, status: ${response.status} ${response.statusText}`);
        
        // If Google Photos URL and we failed, try an alternative approach
        if (finalUrl.includes('googleusercontent.com') && response.status === 400) {
          console.log('Attempting alternative Google Photos approach...');
          
          // Try a different size parameter or format
          const altSizeUrl = finalUrl.replace('=w1200', '=s0');
          console.log('Trying alternative URL:', altSizeUrl);
          
          try {
            const altResponse = await fetch.default(altSizeUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': 'https://photos.google.com/'
              }
            });
            
            if (altResponse.ok) {
              console.log('Alternative approach succeeded!');
              const buffer = await altResponse.buffer();
              
              // Forward the response with appropriate headers
              const contentType = altResponse.headers.get('content-type') || 'image/jpeg';
              res.set('Content-Type', contentType);
              res.set('Cache-Control', 'public, max-age=86400');
              return res.send(buffer);
            } else {
              console.log('Alternative approach also failed');
            }
          } catch (e) {
            console.error('Error with alternative approach:', e);
          }
        }
        
        return res.status(response.status).json({ 
          message: `Failed to fetch image: ${response.statusText}`,
          url: finalUrl
        });
      }
      
      // Check if the response is an image or can be treated as one
      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);
      
      // More flexible content type checking
      const isImage = contentType && (
        contentType.startsWith('image/') || 
        contentType.includes('image') ||
        contentType.includes('jpeg') || 
        contentType.includes('png') || 
        contentType.includes('gif') || 
        contentType.includes('webp') ||
        contentType.includes('heic') ||
        contentType.includes('heif') ||
        // For binary data that might be images but not properly typed
        contentType.includes('application/octet-stream') ||
        contentType.includes('binary')
      );
      
      if (!isImage) {
        // Try to infer from URL if it has an image extension
        const hasImageExtension = finalUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg|heic|heif)($|\?)/i);
        
        if (!hasImageExtension) {
          console.log('Not recognized as an image by content type or extension:', {
            contentType,
            url: finalUrl
          });
          
          // For now, we'll try to process it as an image anyway
          console.log('Attempting to treat as image despite unrecognized type');
        } else {
          console.log('URL has image extension, treating as image despite content type');
        }
      }
      
      // Forward the response headers and body
      // Determine proper content type based on URL or content
      let imageContentType = 'image/jpeg'; // Default to JPEG
      
      if (contentType && contentType.startsWith('image/')) {
        imageContentType = contentType;
      } else if (finalUrl.match(/\.png($|\?)/i)) {
        imageContentType = 'image/png';
      } else if (finalUrl.match(/\.gif($|\?)/i)) {
        imageContentType = 'image/gif';
      } else if (finalUrl.match(/\.webp($|\?)/i)) {
        imageContentType = 'image/webp';
      } else if (finalUrl.match(/\.svg($|\?)/i)) {
        imageContentType = 'image/svg+xml';
      } else if (finalUrl.match(/\.(heic|heif)($|\?)/i)) {
        // For HEIC images, we'll still send as JPEG and let the browser handle it
        imageContentType = 'image/heic';
        console.log('HEIC/HEIF image detected, setting content-type to image/heic');
      }
      
      res.set('Content-Type', imageContentType);
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      const buffer = await response.buffer();
      
      // Add basic validation that we received something
      if (!buffer || buffer.length === 0) {
        console.error('Received empty buffer from URL:', finalUrl);
        return res.status(400).json({
          message: 'Received empty response from image URL',
          url: finalUrl
        });
      }

      // Check the buffer signature for HEIC/HEIF files
      const isHeic = buffer.length > 12 && 
        ((buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) || // ftyp
         (buffer[4] === 0x68 && buffer[5] === 0x65 && buffer[6] === 0x69 && buffer[7] === 0x63) || // heic
         (buffer[4] === 0x68 && buffer[5] === 0x65 && buffer[6] === 0x69 && buffer[7] === 0x66) || // heif
         (buffer[4] === 0x68 && buffer[5] === 0x65 && buffer[6] === 0x69 && buffer[7] === 0x78));  // heix
      
      if (isHeic) {
        console.log('Detected HEIC/HEIF image from buffer signature');
        // Even though it's HEIC, we'll tell browsers it's jpeg-like for better compatibility
        imageContentType = 'image/jpeg';
        console.log('Setting content-type to image/jpeg for HEIC/HEIF image to improve browser compatibility');
      }
      
      // Send detailed info about what we're returning
      console.log(`Successfully proxied image: ${finalUrl}, size: ${buffer.length} bytes, content-type: ${imageContentType}`);
      
      res.set('Content-Type', imageContentType);
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.send(buffer);
      
    } catch (error) {
      console.error("Error proxying image:", error);
      res.status(500).json({ 
        message: "Failed to proxy image", 
        error: error instanceof Error ? error.message : String(error),
        url: req.query.url
      });
    }
  });

  // External PDF proxy endpoint to bypass CORS restrictions
  app.get("/api/proxy/pdf", async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL parameter is required" });
      }
      
      console.log(`Proxying PDF request for: ${url}`);
      
      // Validate URL format to prevent server-side request forgery
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      // Make a request to the external URL
      const fetch = await import('node-fetch');
      const response = await fetch.default(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/pdf,*/*',
        },
        timeout: 10000, // 10 second timeout
      });
      
      if (!response.ok) {
        console.log(`PDF proxy failed with status: ${response.status}`);
        return res.status(response.status).json({ 
          message: `Failed to fetch PDF: ${response.statusText}` 
        });
      }
      
      // Get the content type
      const contentType = response.headers.get('content-type') || 'application/pdf';
      
      // If it's not a PDF, return an error
      if (!contentType.includes('pdf') && !contentType.includes('application/octet-stream')) {
        console.log(`PDF proxy received non-PDF content type: ${contentType}`);
        return res.status(400).json({ 
          message: "URL does not point to a PDF file" 
        });
      }
      
      // Set appropriate headers
      res.set({
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      });
      
      // Stream the PDF data
      const buffer = await response.buffer();
      res.send(buffer);
      
    } catch (error) {
      console.error("Error proxying PDF:", error);
      res.status(500).json({ 
        message: "Failed to proxy PDF", 
        error: error instanceof Error ? error.message : String(error),
        url: req.query.url
      });
    }
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const allCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          parent_id: categories.parent_id,
          is_public: categories.is_public,
          hidden: categories.hidden,
          user_id: categories.user_id,
          created_at: categories.created_at,
          username: users.username,
        })
        .from(categories)
        .leftJoin(users, eq(categories.user_id, users.id));
      
      // Filter categories based on user authentication
      const isAdmin = req.isAuthenticated?.() && req.user?.is_admin;
      const userId = req.isAuthenticated?.() ? req.user?.id : null;
      
      console.log('GET /api/categories - User:', userId, 'isAdmin:', isAdmin, 'Total categories:', allCategories.length);
      
      const filteredCategories = allCategories.filter(category => {
        // Admins see everything - NO FILTERING
        if (isAdmin) {
          console.log('  - Admin sees category:', category.id, category.name, 'hidden:', category.hidden);
          return true;
        }
        
        // Owner always sees their own categories (regardless of hidden/public status)
        if (userId && category.user_id === userId) {
          console.log('  - Owner sees their category:', category.id, category.name);
          return true;
        }
        
        // Non-owners can only see categories that are BOTH public AND not hidden
        // If is_public is explicitly false, hide from non-owners
        if (category.is_public === false) {
          console.log('  - Hiding private category:', category.id, category.name);
          return false;
        }
        
        // If category is hidden, hide from non-owners
        if (category.hidden === true) {
          console.log('  - Hiding hidden category:', category.id, category.name);
          return false;
        }
        
        // Show public categories (is_public === true OR null for legacy categories)
        if (category.is_public === true || category.is_public === null) {
          console.log('  - Showing public category:', category.id, category.name);
          return true;
        }
        
        // Default: hide
        console.log('  - Default hiding category:', category.id, category.name);
        return false;
      });
      
      console.log('GET /api/categories - Filtered to:', filteredCategories.length, 'categories');
      
      res.json(filteredCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // New endpoint for hierarchical category tree
  app.get("/api/categories/tree", async (req, res) => {
    try {
      const allCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          parent_id: categories.parent_id,
          is_public: categories.is_public,
          hidden: categories.hidden,
          user_id: categories.user_id,
          created_at: categories.created_at,
          username: users.username,
        })
        .from(categories)
        .leftJoin(users, eq(categories.user_id, users.id));
      
      // For the public tree view (sidebar menu), hide hidden categories from EVERYONE
      // This is different from /api/categories which shows all categories to admins
      const isAdmin = req.isAuthenticated?.() && req.user?.is_admin;
      const userId = req.isAuthenticated?.() ? req.user?.id : null;
      
      console.log('GET /api/categories/tree - User:', userId, 'isAdmin:', isAdmin, 'Total categories:', allCategories.length);
      
      const filteredCategories = allCategories.filter(category => {
        // ALWAYS hide categories that are marked as hidden (even from admins in public view)
        if (category.hidden === true) {
          console.log('  - Hiding hidden category from tree:', category.id, category.name);
          return false;
        }
        
        // If is_public is explicitly false, only show to owner
        if (category.is_public === false) {
          // Admin-owned private categories (user_id = null) - only admin sees them
          if (category.user_id === null && isAdmin) {
            console.log('  - Admin sees admin-owned private category in tree:', category.id, category.name);
            return true;
          }
          // User-owned private categories - only owner sees them
          if (userId && category.user_id === userId) {
            console.log('  - Owner sees their private category in tree:', category.id, category.name);
            return true;
          }
          // Hide private categories from everyone else
          console.log('  - Hiding private category from tree:', category.id, category.name);
          return false;
        }
        
        // Show public categories to everyone (is_public === true OR null for legacy categories)
        if (category.is_public === true || category.is_public === null) {
          console.log('  - Showing public category in tree:', category.id, category.name);
          return true;
        }
        
        // Default: hide
        console.log('  - Default hiding category from tree:', category.id, category.name);
        return false;
      });
      
      console.log('GET /api/categories/tree - Filtered to:', filteredCategories.length, 'categories');
      
      // Return flat array (not hierarchical) for easier consumption
      res.json(filteredCategories);
    } catch (error) {
      console.error("Error fetching category tree:", error);
      res.status(500).json({ message: "Failed to fetch category tree" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await db.select().from(categories).where(eq(categories.id, categoryId));
      
      if (category.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check access permissions
      const isAdmin = req.isAuthenticated?.() && req.user?.is_admin;
      const userId = req.isAuthenticated?.() ? req.user?.id : null;
      const isOwner = userId && category[0].user_id === userId;
      
      // Allow access if: admin, owner, or public non-hidden category
      // Treat null is_public as true (legacy categories before migration)
      const isPublic = category[0].is_public === true || category[0].is_public === null;
      const canAccess = isAdmin || isOwner || (isPublic && !category[0].hidden);
      
      if (!canAccess) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category[0]);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    // Allow both admin (for public categories) and regular users (for their own categories)
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const { name, description, parent_id, is_public, hidden, user_owned } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      // Determine if this is a public category or private category
      const isAdmin = req.user?.is_admin || false;
      const isPublicCategory = is_public === 'true' || is_public === true;
      
      // Set user_id logic:
      // - If user_owned flag is true: user_id = current user (even for admins)
      // - If user_owned flag is false/undefined and admin: user_id = null (system category)
      // - If regular user: always user_id = current user
      let userId;
      if (user_owned === true || !isAdmin) {
        userId = req.user.id; // User-owned category
      } else {
        userId = null; // System category (admin only)
      }
      
      console.log('POST /api/categories - Creating category:', { 
        name, 
        isAdmin, 
        isPublicCategory, 
        userId, 
        user_owned,
        requestUserId: req.user.id 
      });

      // Validate parent_id if provided
      if (parent_id) {
        const parentCategory = await db.select().from(categories).where(eq(categories.id, parent_id));
        if (parentCategory.length === 0) {
          return res.status(400).json({ message: "Parent category not found" });
        }
      }

      const newCategory = await db.insert(categories).values({
        name,
        description: description || null,
        parent_id: parent_id || null,
        user_id: userId,
        is_public: isPublicCategory,
        hidden: Boolean(hidden === 'true' || hidden === true),
      }).returning();

      res.status(201).json(newCategory[0] as any);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const categoryId = parseInt(req.params.id);
      
      // Get the category to check ownership
      const existingCategory = await db.select().from(categories).where(eq(categories.id, categoryId));
      
      if (existingCategory.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check if user has permission to edit this category
      const isAdmin = req.user?.is_admin || false;
      const isOwner = existingCategory[0].user_id === req.user?.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "You can only edit your own categories" });
      }

      const { name, description, parent_id, is_public, hidden } = req.body;
      
      console.log('PUT /api/categories/:id - Request body:', { name, description, parent_id, is_public, hidden });
      console.log('PUT /api/categories/:id - is_public type:', typeof is_public, 'value:', is_public);
      console.log('PUT /api/categories/:id - hidden type:', typeof hidden, 'value:', hidden);
      
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      // Validate parent_id if provided
      if (parent_id) {
        // Check if parent exists
        const parentCategory = await db.select().from(categories).where(eq(categories.id, parent_id));
        if (parentCategory.length === 0) {
          return res.status(400).json({ message: "Parent category not found" });
        }

        // Prevent circular reference (category cannot be its own parent or descendant)
        if (parent_id === categoryId) {
          return res.status(400).json({ message: "Category cannot be its own parent" });
        }

        // Check for circular reference by traversing up the parent chain
        let currentParentId = parent_id;
        while (currentParentId) {
          if (currentParentId === categoryId) {
            return res.status(400).json({ message: "Circular reference detected. Category cannot be a descendant of itself" });
          }
          const parentCheck = await db.select().from(categories).where(eq(categories.id, currentParentId));
          currentParentId = parentCheck[0]?.parent_id;
        }
      }

      // Build update object with only provided fields
      const updateData: any = {
        name,
        description: description || null,
        parent_id: parent_id || null,
      };
      
      // Update is_public and hidden if provided (handle both boolean and string values)
      if (is_public !== undefined) {
        const publicValue = (is_public === 'true' || is_public === true);
        updateData.is_public = publicValue;
        console.log('PUT /api/categories/:id - Setting is_public to:', publicValue);
      }
      if (hidden !== undefined) {
        const hiddenValue = (hidden === 'true' || hidden === true);
        updateData.hidden = hiddenValue;
        console.log('PUT /api/categories/:id - Setting hidden to:', hiddenValue);
      }

      console.log('PUT /api/categories/:id - Final update data:', updateData);

      const updatedCategory = await db.update(categories)
        .set(updateData)
        .where(eq(categories.id, categoryId))
        .returning();

      if (updatedCategory.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      console.log('PUT /api/categories/:id - Updated category:', updatedCategory[0]);

      res.json(updatedCategory[0]);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const categoryId = parseInt(req.params.id);
      
      // Get the category to check ownership
      const existingCategory = await db.select().from(categories).where(eq(categories.id, categoryId));
      
      if (existingCategory.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check if user has permission to delete this category
      const isAdmin = req.user?.is_admin || false;
      const isOwner = existingCategory[0].user_id === req.user?.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "You can only delete your own categories" });
      }
      
      // Check if any products are using this category
      const productsWithCategory = await db.select().from(products).where(eq(products.category_id, categoryId));
      
      if (productsWithCategory.length > 0) {
        console.log(`Cannot delete category ${categoryId}: ${productsWithCategory.length} products still linked`);
        console.log('Linked products:', productsWithCategory.map(p => ({ id: p.id, name: p.name })));
        const productNames = productsWithCategory.map(p => p.name).join(', ');
        return res.status(400).json({ 
          message: `Cannot remove category. ${productsWithCategory.length} product(s) still linked: ${productNames}. Please remove or reassign these products first.`,
          productCount: productsWithCategory.length,
          productIds: productsWithCategory.map(p => p.id),
          productNames: productsWithCategory.map(p => p.name)
        });
      }

      // Check if any child categories exist
      const childCategories = await db.select().from(categories).where(eq(categories.parent_id, categoryId));
      
      if (childCategories.length > 0) {
        return res.status(400).json({ 
          message: "Cannot remove category with child categories. Remove or reassign child categories first" 
        });
      }

      const deletedCategory = await db.delete(categories)
        .where(eq(categories.id, categoryId))
        .returning();

      if ((deletedCategory as any[]).length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          stock: products.stock,
          category_id: products.category_id,
          user_id: products.user_id,
          is_public: products.is_public,
          image_file: products.image_file,
          image_data: products.image_data,
          pdf_file: products.pdf_file,
          pdf_data: products.pdf_data,
          storage_url: products.storage_url,
          has_physical_variant: products.has_physical_variant,
          physical_price: products.physical_price,
          hidden: products.hidden,
          created_at: products.created_at,
          updated_at: products.updated_at,
          category_name: categories.name,
          creator_username: users.username,
        })
        .from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .leftJoin(users, eq(products.user_id, users.id));
        
      // Filter products based on user authentication
      const isAdmin = req.isAuthenticated?.() && req.user?.is_admin;
      const userId = req.isAuthenticated?.() ? req.user?.id : null;
      
      console.log('GET /api/products - User:', userId, 'isAdmin:', isAdmin, 'Total products:', allProducts.length);
      
      // Show: public products (not hidden) + user's own products (if authenticated)
      const filteredProducts = allProducts.filter(product => {
        // Admins see everything - NO FILTERING
        if (isAdmin) {
          return true;
        }
        
        // Owner always sees their own products (regardless of hidden/public status)
        if (userId && product.user_id === userId) {
          return true;
        }
        
        // Non-owners can only see products that are BOTH public AND not hidden
        // If is_public is explicitly false, hide from non-owners
        if (product.is_public === false) {
          return false;
        }
        
        // If product is hidden, hide from non-owners
        if (product.hidden === true) {
          return false;
        }
        
        // Show public products (is_public === true OR null for legacy products)
        if (product.is_public === true || product.is_public === null) {
          return true;
        }
        
        // Default: hide
        return false;
      });
      
      console.log('GET /api/products - Filtered to:', filteredProducts.length, 'products');
        
      const productsWithNumberPrice = filteredProducts.map(product => ({
        ...product,
        price: Number(product.price),
        // Ensure variant fields exist with defaults if migration hasn't run yet
        has_physical_variant: product.has_physical_variant ?? false,
        physical_price: product.physical_price ?? null,
        hidden: product.hidden ?? false,
        user_id: product.user_id ?? null,
        is_public: product.is_public ?? true, // Default to true only if null/undefined (for legacy products)
      }));
      res.json(productsWithNumberPrice);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          stock: products.stock,
          category_id: products.category_id,
          user_id: products.user_id,
          is_public: products.is_public,
          image_file: products.image_file,
          image_data: products.image_data,
          pdf_file: products.pdf_file,
          pdf_data: products.pdf_data,
          storage_url: products.storage_url,
          has_physical_variant: products.has_physical_variant,
          physical_price: products.physical_price,
          hidden: products.hidden,
          created_at: products.created_at,
          updated_at: products.updated_at,
          category_name: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .where(eq(products.id, parseInt(req.params.id)))
        .limit(1);

      if (!product) return res.status(404).json({ message: "Product not found" });
      
      // Check access permissions
      const isAdmin = req.isAuthenticated?.() && req.user?.is_admin;
      const userId = req.isAuthenticated?.() ? req.user?.id : null;
      const isOwner = userId && product.user_id === userId;
      
      // Allow access if: admin, owner, or public non-hidden product
      // Treat null is_public as true (legacy products before migration)
      const isPublic = product.is_public === true || product.is_public === null;
      const canAccess = isAdmin || isOwner || (isPublic && !product.hidden);
      
      if (!canAccess) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const productWithNumberPrice = {
        ...product,
        price: Number(product.price),
        // Ensure variant fields exist with defaults if migration hasn't run yet
        has_physical_variant: product.has_physical_variant ?? false,
        physical_price: product.physical_price ?? null,
        hidden: product.hidden ?? false,
        user_id: product.user_id ?? null,
        is_public: product.is_public ?? true,
      };
      res.json(productWithNumberPrice);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.get("/api/products/:id/pdf", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.pdf_data) {
        try {
          // Convert Buffer to string without parameters
          const base64String = product.pdf_data.toString();
          
          // Create a new Buffer from the base64 string
          const pdfBuffer = Buffer.from(base64String, 'base64');
          
          console.log('Decoded PDF buffer details:', {
            originalSize: product.pdf_data.length,
            decodedSize: pdfBuffer.length,
            // Check the first few bytes without parameters
            firstFewBytes: pdfBuffer.slice(0, 5).toString()
          });
      
          // Set headers for the response
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'inline; filename="document.pdf"'
          });
      
          // Send the decoded buffer
          return res.send(pdfBuffer);
        } catch (error) {
          console.error('Error sending PDF:', error);
          return res.status(500).send('Error processing PDF');
        }
      }

      // Fall back to file system if pdf_file exists
      if (product.pdf_file) {
        try {
          const filePath = path.join(process.cwd(), 'public', product.pdf_file);
          if (!fs.existsSync(filePath)) {
            console.log('PDF file not found:', filePath);
            return res.status(404).json({ message: "PDF file not found" });
          }

          console.log('Serving PDF from file:', filePath);
          return res.sendFile(filePath);
        } catch (err) {
          console.error('Error serving PDF file:', err);
          return res.status(500).json({ message: "Error serving PDF file" });
        }
      }

      return res.status(404).json({ message: "No PDF found for this product" });
    } catch (error) {
      console.error('Error serving PDF:', error);
      return res.status(500).json({ message: "Error serving PDF" });
    }
  });

  // Add this new route after the PDF route
  app.get("/api/products/:id/img", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Handle database-stored image
      if (product.image_data) {
        try {
          // Parse the stored image metadata
          const imageInfo = JSON.parse(product.image_data);
          console.log('Retrieved image info:', {
            contentType: imageInfo.contentType,
            dataLength: imageInfo.data.length
          });

          const imageBuffer = Buffer.from(imageInfo.data, 'base64');

          // Set proper headers using the stored content type
          res.set({
            'Content-Type': imageInfo.contentType,
            'Content-Length': imageBuffer.length,
            'Cache-Control': 'public, max-age=31557600'
          });

          return res.send(imageBuffer);
        } catch (error) {
          console.error('Error processing image data:', error);
          return res.status(500).json({ 
            message: "Error processing image",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      // Handle file system image
      if (product.image_file) {
        try {
          const filePath = path.join(process.cwd(), 'public', product.image_file);
          if (!fs.existsSync(filePath)) {
            console.error('Image file not found:', filePath);
            return res.status(404).json({ message: "Image file not found" });
          }
          
          // Get content type based on file extension
          const ext = path.extname(filePath).toLowerCase();
          const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
          
          res.set('Content-Type', contentType);
          console.log('Serving image from file:', filePath, 'Content-Type:', contentType);
          
          return res.sendFile(filePath);
        } catch (error) {
          console.error('Error serving image file:', error);
          return res.status(500).json({ message: "Error serving image file" });
        }
      }

      return res.status(404).json({ message: "No image found for this product" });
    } catch (error) {
      console.error('Error serving image:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Image download endpoint (separate from image serving)
  app.get("/api/products/:id/download/image", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Handle database-stored image download
      if (product.image_data) {
        try {
          const imageInfo = JSON.parse(product.image_data);
          const imageBuffer = Buffer.from(imageInfo.data, 'base64');
          
          // Determine file extension from content type
          let extension = 'jpg';
          if (imageInfo.contentType === 'image/png') {
            extension = 'png';
          } else if (imageInfo.contentType === 'image/gif') {
            extension = 'gif';
          } else if (imageInfo.contentType === 'image/webp') {
            extension = 'webp';
          }
          
          const filename = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;

          // Set download headers
          res.set({
            'Content-Type': imageInfo.contentType,
            'Content-Length': imageBuffer.length,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache'
          });

          return res.send(imageBuffer);
        } catch (error) {
          console.error('Error processing image download:', error);
          return res.status(500).json({ 
            message: "Error processing image download",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      // Handle file system image download
      if (product.image_file) {
        try {
          const filePath = path.join(process.cwd(), 'public', product.image_file);
          if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "Image file not found" });
          }
          
          const filename = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}.${path.extname(product.image_file)}`;
          
          res.set({
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache'
          });
          
          return res.sendFile(filePath);
        } catch (error) {
          console.error('Error serving image file download:', error);
          return res.status(500).json({ message: "Error serving image file download" });
        }
      }

      return res.status(404).json({ message: "No image found for this product" });
    } catch (error) {
      console.error('Error downloading image:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Protected admin routes
  app.post("/api/products", upload.single('file'), async (req, res) => {
    // Allow both admin (for public products) and regular users (for their own products)
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const price = parseFloat(req.body.price);
      const stock = parseInt(req.body.stock);
      const storageType = req.body.storage_type;
      const storageLocation = req.body.storage_location;
      
      // Handle variant fields
      const hasPhysicalVariant = req.body.has_physical_variant === 'true';
      const physicalPrice = hasPhysicalVariant ? parseFloat(req.body.physical_price || '0') : null;
      
      // Determine if this is a public (admin) product or user private product
      const isAdmin = req.user?.is_admin || false;
      const isPublicProduct = req.body.is_public === 'true';
      
      // Only admins can create public products
      if (isPublicProduct && !isAdmin) {
        return res.status(403).json({ message: "Only admins can create public products" });
      }
      
      // Set user_id: null for admin public products, current user for user products
      const userId = isPublicProduct ? null : req.user.id;

      // Validate category access if category_id is provided
      if (req.body.category_id) {
        const categoryId = parseInt(req.body.category_id);
        const [category] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, categoryId));
        
        if (!category) {
          return res.status(404).json({ message: "Category not found" });
        }
        
        // Check if user can use this category
        const isCategoryOwner = category.user_id === req.user.id;
        const isCategoryPublic = category.is_public !== false; // true or null
        
        // Users can only use:
        // - Public categories
        // - Their own private categories
        // - System categories (user_id = null) if they're admin
        if (!isCategoryPublic && !isCategoryOwner && !(isAdmin && category.user_id === null)) {
          return res.status(403).json({ 
            message: "You don't have permission to add products to this private category" 
          });
        }
      }

      // Add debug logging for the uploaded file
      console.log('Uploaded file details:', {
        mimetype: req.file?.mimetype,
        originalname: req.file?.originalname,
        size: req.file?.size
      });

      const productData = {
        name: req.body.name,
        description: req.body.description || null,
        price: price.toString(),
        stock: stock, // Physical stock only
        category_id: req.body.category_id ? parseInt(req.body.category_id) : null,
        user_id: userId,
        is_public: isPublicProduct,
        pdf_data: null as string | null,
        pdf_file: null as string | null,
        image_data: null as string | null,
        image_file: null as string | null,
        storage_url: req.body.storage_url || null,
        has_physical_variant: hasPhysicalVariant,
        physical_price: physicalPrice?.toString() || null,
        hidden: req.body.hidden === 'true',
      };

      if (req.file) {
        if (storageType === 'image') {
          // Handle Image storage
          if (storageLocation === 'database') {
            // Store image with its mimetype for proper content-type detection later
            const imageMetadata = {
              contentType: req.file.mimetype,
              data: req.file.buffer.toString('base64')
            };
            productData.image_data = JSON.stringify(imageMetadata);
            productData.image_file = null;
          } else {
            const fileName = `image_${Date.now()}_${req.file.originalname}`;
            const filePath = `/uploads/images/${fileName}`;
            const fullPath = path.join(process.cwd(), 'public', filePath);
            
            await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.promises.writeFile(fullPath, req.file.buffer);
            
            productData.image_file = filePath;
            productData.image_data = null;
          }
        } else if (storageType === 'pdf') {
          // Handle PDF storage
          if (storageLocation === 'database') {
            productData.pdf_data = req.file.buffer.toString('base64');
            productData.pdf_file = null;
          } else {
            const fileName = `pdf_${Date.now()}_${req.file.originalname}`;
            const filePath = `/uploads/pdfs/${fileName}`;
            const fullPath = path.join(process.cwd(), 'public', filePath);
            
            await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.promises.writeFile(fullPath, req.file.buffer);
            
            productData.pdf_file = filePath;
            productData.pdf_data = null;
          }
        }
      }

      const [product] = await db
        .insert(products)
        .values(productData)
        .returning();

      console.log('Product created:', {
        id: product.id,
        name: product.name,
        type: storageType,
        storage: storageLocation,
        storageUrl: product.storage_url,
        hasPdfData: !!product.pdf_data,
        hasPdfFile: !!product.pdf_file,
        hasImageData: !!product.image_data,
        hasImageFile: !!product.image_file
      });

      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ 
        message: "Failed to create product",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.patch("/api/products/:id", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const productId = parseInt(req.params.id);
      
      // Get the product to check ownership
      const existingProduct = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });
      
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user has permission to edit this product
      const isAdmin = req.user?.is_admin || false;
      const isOwner = existingProduct.user_id === req.user?.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "You can only edit your own products" });
      }

      const storeAsBinary = req.body.store_as_binary === 'true';
      const storageType = req.body.storage_type;
      
      // Initialize an empty update object
      const updateData: any = {};
      
      // Only include fields that are actually provided in the request
      if (req.body.name !== undefined) {
        updateData.name = req.body.name;
      }
      
      if (req.body.description !== undefined) {
        updateData.description = req.body.description || null;
      }
      
      if (req.body.price !== undefined) {
        updateData.price = req.body.price;
      }
      
      if (req.body.stock !== undefined) {
        const stockValue = parseInt(req.body.stock);
        if (!isNaN(stockValue)) {
          updateData.stock = stockValue;
        } else {
          return res.status(400).json({ 
            message: "Invalid stock value. Must be a number."
          });
        }
      }
      
      // Handle storage_url field
      if (req.body.storage_url !== undefined) {
        updateData.storage_url = req.body.storage_url || null;
      }
      
      // Handle category_id field
      if (req.body.category_id !== undefined) {
        const newCategoryId = req.body.category_id ? parseInt(req.body.category_id) : null;
        
        // Validate category access if category_id is being changed
        if (newCategoryId !== null) {
          const [category] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, newCategoryId));
          
          if (!category) {
            return res.status(404).json({ message: "Category not found" });
          }
          
          // Check if user can use this category
          const isCategoryOwner = category.user_id === req.user?.id;
          const isCategoryPublic = category.is_public !== false; // true or null
          
          // Users can only use:
          // - Public categories
          // - Their own private categories
          // - System categories (user_id = null) if they're admin
          if (!isCategoryPublic && !isCategoryOwner && !(isAdmin && category.user_id === null)) {
            return res.status(403).json({ 
              message: "You don't have permission to add products to this private category" 
            });
          }
        }
        
        updateData.category_id = newCategoryId;
      }
      
      // Handle variant fields
      if (req.body.has_physical_variant !== undefined) {
        updateData.has_physical_variant = req.body.has_physical_variant === 'true';
      }
      
      if (req.body.physical_price !== undefined) {
        const physicalPrice = parseFloat(req.body.physical_price);
        updateData.physical_price = isNaN(physicalPrice) ? null : physicalPrice.toString();
      }
      
      // Handle visibility fields
      if (req.body.is_public !== undefined) {
        updateData.is_public = req.body.is_public === 'true';
        console.log('PATCH /api/products - Setting is_public:', updateData.is_public, 'from:', req.body.is_public);
      }
      
      if (req.body.hidden !== undefined) {
        updateData.hidden = req.body.hidden === 'true';
        console.log('PATCH /api/products - Setting hidden:', updateData.hidden, 'from:', req.body.hidden);
      }

      // Handle file update if a new file is uploaded
      if (req.file) {
        console.log("File update detected:", {
          storageType: storageType,
          fileName: req.file.originalname,
          fileSize: req.file.size
        });

        if (storageType === 'pdf') {
          // Update PDF fields only, don't touch image fields
          if (storeAsBinary) {
            updateData.pdf_data = req.file.buffer.toString('base64');            
          } else {
            const fileName = `pdf_${Date.now()}_${req.file.originalname}`;
            const filePath = `/uploads/pdfs/${fileName}`;
            const fullPath = path.join(process.cwd(), 'public', filePath);
            
            await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.promises.writeFile(fullPath, req.file.buffer);
            
            updateData.pdf_file = filePath;
          }
        } else if (storageType === 'image') {
          // Update image fields only, don't touch PDF fields
          if (storeAsBinary) {
            const imageMetadata = {
              contentType: req.file.mimetype,
              data: req.file.buffer.toString('base64')
            };
            updateData.image_data = JSON.stringify(imageMetadata);            
          } else {
            const fileName = `image_${Date.now()}_${req.file.originalname}`;
            const filePath = `/uploads/images/${fileName}`;
            const fullPath = path.join(process.cwd(), 'public', filePath);
            
            await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.promises.writeFile(fullPath, req.file.buffer);
            
            updateData.image_file = filePath;            
          }          
        }
      }

      // Only proceed with update if there are fields to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      console.log("Updating product with data:", updateData);

      const [product] = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, productId))
        .returning();

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      console.log('Product updated:', {
        id: product.id,
        name: product.name,
        is_public: product.is_public,
        hidden: product.hidden,
        user_id: product.user_id,
        type: storageType,
        storage: storeAsBinary ? 'database' : 'file',
        storageUrl: product.storage_url,
        hasPdfData: !!product.pdf_data,
        hasPdfFile: !!product.pdf_file,
        hasImageData: !!product.image_data,
        hasImageFile: !!product.image_file
      });

      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  //New Delete Route
  app.delete("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(403).json({ message: "You are not authorized to delete products." });
    }

    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Get the product to check ownership
      const existingProduct = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });
      
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user has permission to delete this product
      const isAdmin = req.user?.is_admin || false;
      const isOwner = existingProduct.user_id === req.user?.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "You can only delete your own products" });
      }

      console.log(`Attempting to delete product with ID: ${productId}`);

      // Check if product has any associated orders
      const [orderItem] = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.product_id, productId))
        .limit(1);

      if (orderItem) {
        console.log(`Product ${productId} cannot be deleted - has existing orders`);
        return res.status(400).json({ 
          message: "This product has been ordered by customers and cannot be deleted.  To remove it from sale, set its stock to 0 instead.",
          type: "PRODUCT_HAS_ORDERS"
        });
      }

      const [product] = await db
        .delete(products)
        .where(eq(products.id, productId))
        .returning();

      if (!product) {
        console.log(`Product with ID ${productId} not found`);
        return res.status(404).json({ message: "Product not found" });
      }

      console.log(`Successfully deleted product: ${JSON.stringify(product)}`);
      res.json(product);
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ 
        message: "Something went wrong while deleting the product. Please try again." 
      });
    }
  });

  app.post("/api/upload-pdf", upload.single('pdf_file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }
    
    const filePath = req.file.path.replace('public/', '/');
    res.json({ path: filePath });
  });

  // User Profile routes - for managing user's own products and categories
  
  // Get user's products
  app.get("/api/users/:userId/products", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const isOwner = req.isAuthenticated?.() && req.user?.id === userId;
      const isAdmin = req.isAuthenticated?.() && req.user?.is_admin;
      
      console.log('GET /api/users/:userId/products - Requesting user:', req.user?.id, 'Target userId:', userId, 'isOwner:', isOwner, 'isAdmin:', isAdmin);
      
      // Users can view their own products, admins can view any user's products
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userProducts = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          stock: products.stock,
          category_id: products.category_id,
          user_id: products.user_id,
          is_public: products.is_public,
          image_file: products.image_file,
          image_data: products.image_data,
          pdf_file: products.pdf_file,
          pdf_data: products.pdf_data,
          storage_url: products.storage_url,
          has_physical_variant: products.has_physical_variant,
          physical_price: products.physical_price,
          hidden: products.hidden,
          created_at: products.created_at,
          updated_at: products.updated_at,
          category_name: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .where(eq(products.user_id, userId));
      
      console.log('GET /api/users/:userId/products - Found:', userProducts.length, 'products for user', userId);
        
      const productsWithNumberPrice = userProducts.map(product => ({
        ...product,
        price: Number(product.price),
        has_physical_variant: product.has_physical_variant ?? false,
        physical_price: product.physical_price ?? null,
        hidden: product.hidden ?? false,
        is_public: product.is_public ?? false,
      }));
      
      res.json(productsWithNumberPrice);
    } catch (error) {
      console.error("Error fetching user products:", error);
      res.status(500).json({ message: "Failed to fetch user products" });
    }
  });
  
  // Get user's categories
  app.get("/api/users/:userId/categories", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const isOwner = req.isAuthenticated?.() && req.user?.id === userId;
      const isAdmin = req.isAuthenticated?.() && req.user?.is_admin;
      
      console.log('GET /api/users/:userId/categories - Requesting user:', req.user?.id, 'Target userId:', userId, 'isOwner:', isOwner, 'isAdmin:', isAdmin);
      
      // Users can view their own categories, admins can view any user's categories
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          parent_id: categories.parent_id,
          is_public: categories.is_public,
          hidden: categories.hidden,
          user_id: categories.user_id,
          created_at: categories.created_at,
          username: users.username,
        })
        .from(categories)
        .leftJoin(users, eq(categories.user_id, users.id))
        .where(eq(categories.user_id, userId));
      
      console.log('GET /api/users/:userId/categories - Found:', userCategories.length, 'categories for user', userId);
        
      res.json(userCategories);
    } catch (error) {
      console.error("Error fetching user categories:", error);
      res.status(500).json({ message: "Failed to fetch user categories" });
    }
  });

  // Orders routes
  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { items, total } = req.body;
      const [order] = await db
        .insert(orders)
        .values({
          user_id: req.user.id,
          status: "pending",
          total,
        })
        .returning();

      await db.insert(orderItems).values(
        items.map((item: any) => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        }))
      );

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get basic order info with proper ordering and limits
      const userOrders = await db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          created_at: orders.created_at,
        })
        .from(orders)
        .where(eq(orders.user_id, req.user.id))
        .orderBy(desc(orders.created_at))
        .limit(50); // Limit to last 50 orders for the user

      // Batch query for all order items to reduce database calls
      const allOrderIds = userOrders.map(order => order.id);
      
      if (allOrderIds.length === 0) {
        return res.json([]);
      }

      // Get all order items in one query
      const allOrderItems = await db
        .select({
          id: orderItems.id,
          order_id: orderItems.order_id,
          quantity: orderItems.quantity,
          price: orderItems.price,
          variant_type: orderItems.variant_type,
          product: {
            id: products.id,
            name: products.name,
            image_file: products.image_file,
            // Don't load image_data to reduce payload size and query time
            pdf_file: products.pdf_file,
            // Don't load pdf_data to reduce payload size and query time  
            storage_url: products.storage_url,
          },
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.product_id, products.id))
        .where(inArray(orderItems.order_id, allOrderIds));

      // Group items by order_id
      const itemsByOrderId = allOrderItems.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {} as Record<number, typeof allOrderItems>);

      // Combine orders with their items
      const ordersWithItems = userOrders.map(order => ({
        ...order,
        items: itemsByOrderId[order.id] || [],
      }));

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Admin order management routes
  app.get("/api/admin/orders", async (req, res) => {
    console.log("\n=== Admin Orders Request ===");
    console.log("Request headers:", req.headers);
    console.log("Session:", req.session);
    console.log("User:", req.user);
    console.log("Is authenticated:", req.isAuthenticated?.());
    console.log("Is admin:", req.user?.is_admin);
    console.log("=== End Request Info ===\n");

    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.user?.is_admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Use a more efficient query by limiting data and adding proper ordering
      const ordersWithUsers = await db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          created_at: orders.created_at,
          user: {
            id: users.id,
            username: users.username,
          },
        })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .orderBy(desc(orders.created_at))
        .limit(100); // Limit to last 100 orders to prevent timeouts

      // Batch query for all order items to reduce database calls
      const allOrderIds = ordersWithUsers.map(order => order.id);
      
      if (allOrderIds.length === 0) {
        return res.json([]);
      }

      // Get all order items in one query
      const allOrderItems = await db
        .select({
          id: orderItems.id,
          order_id: orderItems.order_id,
          quantity: orderItems.quantity,
          price: orderItems.price,
          variant_type: orderItems.variant_type,
          product: {
            id: products.id,
            name: products.name,
            image_file: products.image_file,
            // Don't load image_data to reduce payload size and query time
            pdf_file: products.pdf_file,
            // Don't load pdf_data to reduce payload size and query time
            storage_url: products.storage_url,
          },
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.product_id, products.id))
        .where(inArray(orderItems.order_id, allOrderIds));

      // Group items by order_id
      const itemsByOrderId = allOrderItems.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {} as Record<number, typeof allOrderItems>);

      // Combine orders with their items
      const ordersWithItems = ordersWithUsers.map(order => ({
        ...order,
        items: itemsByOrderId[order.id] || [],
      }));

      console.log("Successfully fetched orders:", ordersWithItems.length);
      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({
        message: "Failed to fetch orders",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.patch("/api/admin/orders/:id", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.is_admin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const { status } = req.body;
      const [order] = await db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, parseInt(req.params.id)))
        .returning();

      if (!order) return res.status(404).json({ message: "Order not found" });
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Test send email endpoint (for debugging)
  app.post("/api/test-send-email", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }

    console.log("Testing email send to:", email);
    
    try {
      // Create a dummy order for testing
      const testOrder = {
        id: 999,
        total: 25.99,
        created_at: new Date(),
        items: [
          {
            quantity: 1,
            price: 25.99,
            product: {
              name: "Test Product",
              description: "This is a test product for email testing"
            }
          }
        ]
      };

      await sendOrderConfirmationEmail(testOrder as any, email);
      
      res.json({ 
        success: true,
        message: "Test email sent successfully",
        recipient: email,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Test email send failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "Test email send failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test email configuration endpoint
  app.get("/api/test-email-config", async (req, res) => {
    console.log("Testing email configuration...");
    try {
      const isValid = await testEmailConfiguration();
      res.json({ 
        success: isValid,
        message: isValid ? "Email configuration is valid" : "Email configuration failed",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Email configuration test error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Email configuration test failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Stripe routes
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { items } = req.body;
      const origin = `${req.protocol}://${req.get("host")}`;
      console.log("Creating checkout session for user:", req.user.id);
      console.log("Items:", JSON.stringify(items));

      const session = await createCheckoutSession(
        items,
        `${origin}/checkout/success`,
        `${origin}/cart`,
        req.user.id
      );

      console.log("Checkout session created:", session.id);
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Stripe webhook handler
  app.post("/api/webhook", async (req, res) => {
    console.log("\n=== Webhook Request Processing Started ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Raw Body Type:", req.rawBody ? typeof req.rawBody : 'undefined');
    console.log("Raw Body Length:", req.rawBody ? req.rawBody.length : 0);
    console.log("=== End Request Info ===\n");

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return res.sendStatus(500);
    }

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      console.error("No Stripe signature found in headers");
      return res.sendStatus(400);
    }

    if (!req.rawBody) {
      console.error("No raw body found in request");
      return res.sendStatus(400);
    }

    try {
      console.log("Attempting to verify Stripe signature...");
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("Webhook event verified, type:", event.type);
      console.log("Full event data:", JSON.stringify(event, null, 2));

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Processing checkout session:", session.id);
        console.log("Full session data:", JSON.stringify(session, null, 2));

        // Try to get more detailed session information from Stripe API
        console.log("Fetching detailed session information from Stripe API...");
        try {
          const detailedSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['customer', 'customer_details']
          });
          console.log("Detailed session data:", JSON.stringify(detailedSession, null, 2));
          console.log("Customer details from API:", JSON.stringify(detailedSession.customer_details, null, 2));
        } catch (expandError) {
          console.error("Failed to fetch detailed session:", expandError);
        }

        // Get the user ID from the session metadata
        const userId = session.client_reference_id
          ? parseInt(session.client_reference_id)
          : session.metadata?.userId
            ? parseInt(session.metadata.userId)
            : null;

        if (!userId) {
          console.error("No user ID found in session");
          return res.status(400).json({ error: "Invalid user ID" });
        }

        console.log("Creating order for user:", userId);
        try {
          // Wrap the order creation in a transaction if possible
          // Add more detailed logging
          console.log(`Starting order creation for userId: ${userId}, session: ${session.id}`);
          
          const [order] = await db
            .insert(orders)
            .values({
              user_id: userId,
              status: "pending",
              total: (session.amount_total || 0) / 100,
            })
            .returning();

          console.log("Created order:", order);

          console.log("Fetching line items for session:", session.id);
          const lineItems = await stripe.checkout.sessions.listLineItems(
            session.id,
            { expand: ["data.price.product"] }
          );
          console.log("Retrieved line items:", lineItems.data.length);

          for (const item of lineItems.data) {
            const product = item.price?.product as Stripe.Product;
            if (!product?.name) {
              console.log("No product name found in line item");
              continue;
            }

            console.log("Looking up product:", product.name);
            const [dbProduct] = await db
              .select()
              .from(products)
              .where(eq(products.name, product.name))
              .limit(1);

            if (!dbProduct) {
              console.log("Product not found in database:", product.name);
              continue;
            }

            // Get variant type from product metadata if available
            const variantType = product.metadata?.variant_type || 'digital';
            const quantity = item.quantity || 1;

            console.log("Creating order item for product:", dbProduct.name, "variant:", variantType, "quantity:", quantity);
            
            // Calculate unit price from total amount and quantity
            const unitPrice = ((item.amount_total || 0) / 100) / quantity;
            
            await db
              .insert(orderItems)
              .values({
                order_id: order.id,
                product_id: dbProduct.id,
                quantity: quantity,
                price: unitPrice, // Store unit price, not total price
                variant_type: variantType as 'digital' | 'physical',
              });
            console.log("Created order item for product:", dbProduct.name);

            // Decrease stock for physical items
            if (variantType === 'physical') {
              console.log("Decreasing stock for physical product:", dbProduct.name, "by quantity:", quantity);
              try {
                const [updatedProduct] = await db
                  .update(products)
                  .set({
                    stock: Math.max(0, (dbProduct.stock || 0) - quantity) // Ensure stock doesn't go below 0
                  })
                  .where(eq(products.id, dbProduct.id))
                  .returning();
                
                console.log("Stock updated for product:", dbProduct.name, "from", dbProduct.stock, "to", updatedProduct.stock);
              } catch (stockError) {
                console.error("Failed to update stock for product:", dbProduct.name, stockError);
                // Don't fail the entire webhook for stock update issues
              }
            }
          }

          console.log("Order processing completed successfully");
          
          // Send confirmation email
          try {
            console.log("\n=== EMAIL SENDING PROCESS STARTED ===");
            console.log("Attempting to send confirmation email...");
            console.log("Session ID:", session.id);
            
            // Try to get detailed session with customer info
            let customerEmail = session.customer_details?.email || session.customer_email;
            
            // If no email found in webhook data, fetch from Stripe API
            if (!customerEmail) {
              console.log("No email in webhook data, fetching from Stripe API...");
              try {
                const detailedSession = await stripe.checkout.sessions.retrieve(session.id, {
                  expand: ['customer', 'customer_details']
                });
                customerEmail = detailedSession.customer_details?.email || detailedSession.customer_email;
                console.log("Email from Stripe API:", customerEmail);
              } catch (apiError) {
                console.error("Failed to fetch session from Stripe API:", apiError);
              }
            }
            
            console.log("Customer details from session:", JSON.stringify(session.customer_details, null, 2));
            console.log("Customer email from customer_email field:", session.customer_email);
            console.log("Final extracted customer email:", customerEmail);
            
            if (customerEmail) {
              console.log("✓ Customer email found:", customerEmail);
              console.log("Fetching order details for email...");
              
              // Fetch the complete order with items and products for email
              const orderWithItems = await db.query.orders.findFirst({
                where: eq(orders.id, order.id),
                with: {
                  items: {
                    with: {
                      product: true
                    }
                  }
                }
              });

              console.log("Order with items query result:", JSON.stringify(orderWithItems, null, 2));

              if (orderWithItems) {
                console.log("✓ Order details fetched successfully");
                console.log(`Order has ${orderWithItems.items.length} items`);
                
                // Check email configuration
                console.log("Checking email configuration...");
                console.log("SMTP_HOST:", process.env.SMTP_HOST || "not set");
                console.log("SMTP_PORT:", process.env.SMTP_PORT || "not set");
                console.log("SMTP_USER:", process.env.SMTP_USER || "not set");
                console.log("SMTP_PASS:", process.env.SMTP_PASS ? "set (length: " + process.env.SMTP_PASS.length + ")" : "not set");
                
                // Type assertion to handle the database result
                const emailOrder = orderWithItems as any;
                console.log("Calling sendOrderConfirmationEmail...");
                await sendOrderConfirmationEmail(emailOrder, customerEmail);
                console.log("✓ Confirmation email sent successfully to:", customerEmail);
                console.log("=== EMAIL SENDING PROCESS COMPLETED ===\n");
              } else {
                console.error("✗ Could not fetch order details for email");
                console.error("Order ID used for query:", order.id);
              }
            } else {
              console.error("✗ No customer email found in Stripe session");
              console.error("Session customer_details:", session.customer_details);
              console.error("Session customer_email:", session.customer_email);
              console.error("Available session fields:", Object.keys(session));
            }
          } catch (emailError) {
            console.error("\n=== EMAIL SENDING ERROR ===");
            console.error("Failed to send confirmation email:", emailError);
            console.error("Error stack:", emailError instanceof Error ? emailError.stack : "No stack available");
            console.error("=== END EMAIL ERROR ===\n");
            // Don't fail the webhook because of email issues
          }

          res.json({ received: true, orderId: order.id });
        } catch (error) {
          // More detailed error logging
          console.error("Order creation failed:", error);
          console.error("Session data:", JSON.stringify(session));
          
          // Still return 200 to Stripe (prevents retries) but include error info
          res.status(200).json({ 
            received: true, 
            error: error instanceof Error ? error.message : "Unknown error",
            orderCreated: false
          });
        }
      } else {
        console.log("Unhandled event type:", event.type);
        res.json({ received: true });
      }
    } catch (err) {
      console.error("Webhook error:", err instanceof Error ? err.message : err);
      console.error("Full error object:", err);
      res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  // DELETE endpoint to remove specific storage type from a product
  app.delete("/api/products/:id/storage/:type", async (req, res) => {
    const { id, type } = req.params;
    
    try {
      const productId = parseInt(id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Check if product exists
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Determine which field to clear based on the storage type
      let updateData: Partial<typeof product> = {};
      
      switch (type) {
        case "image_file":
          updateData = { image_file: null };
          break;
        case "image_data":
          updateData = { image_data: null };
          break;
        case "pdf_file":
          updateData = { pdf_file: null };
          break;
        case "pdf_data":
          updateData = { pdf_data: null };
          break;
        default:
          return res.status(400).json({ message: "Invalid storage type" });
      }

      // Update the product to remove the specified storage
      await db.update(products)
        .set(updateData)
        .where(eq(products.id, productId));

      // If the file is stored in the filesystem, delete the actual file
      if (type === "image_file" && product.image_file) {
        try {
          const filePath = path.join(process.cwd(), 'uploads', path.basename(product.image_file));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          }
        } catch (fileError) {
          console.error("Error deleting image file:", fileError);
          // Continue execution even if file deletion fails
        }
      } else if (type === "pdf_file" && product.pdf_file) {
        try {
          const filePath = path.join(process.cwd(), 'uploads', path.basename(product.pdf_file));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          }
        } catch (fileError) {
          console.error("Error deleting PDF file:", fileError);
          // Continue execution even if file deletion fails
        }
      }

      // Return success response
      return res.status(200).json({
        message: `Successfully removed ${type} from product ${productId}`,
        productId,
        type
      });
    } catch (error) {
      console.error("Error removing storage:", error);
      return res.status(500).json({ message: "Server error removing storage" });
    }
  });

  // Get current user profile
  app.get("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          first_name: users.first_name,
          last_name: users.last_name,
          email: users.email,
          phone: users.phone,
          address: users.address,
          city: users.city,
          state: users.state,
          country: users.country,
          postal_code: users.postal_code,
          picture: users.picture,
          bio: users.bio,
          job_title: users.job_title,
          company: users.company,
          website: users.website,
          linkedin_url: users.linkedin_url,
          twitter_url: users.twitter_url,
          instagram_url: users.instagram_url,
          facebook_url: users.facebook_url,
          is_admin: users.is_admin,
        })
        .from(users)
        .where(eq(users.id, req.user!.id));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { 
        first_name, last_name, email, phone, 
        address, city, state, country, postal_code,
        picture, bio, job_title, company, website,
        linkedin_url, twitter_url, instagram_url, facebook_url
      } = req.body;

      // Build update object with only provided fields
      const updateData: any = {};
      if (first_name !== undefined) updateData.first_name = first_name || null;
      if (last_name !== undefined) updateData.last_name = last_name || null;
      if (email !== undefined) updateData.email = email || null;
      if (phone !== undefined) updateData.phone = phone || null;
      if (address !== undefined) updateData.address = address || null;
      if (city !== undefined) updateData.city = city || null;
      if (state !== undefined) updateData.state = state || null;
      if (country !== undefined) updateData.country = country || null;
      if (postal_code !== undefined) updateData.postal_code = postal_code || null;
      if (picture !== undefined) updateData.picture = picture || null;
      if (bio !== undefined) updateData.bio = bio || null;
      if (job_title !== undefined) updateData.job_title = job_title || null;
      if (company !== undefined) updateData.company = company || null;
      if (website !== undefined) updateData.website = website || null;
      if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url || null;
      if (twitter_url !== undefined) updateData.twitter_url = twitter_url || null;
      if (instagram_url !== undefined) updateData.instagram_url = instagram_url || null;
      if (facebook_url !== undefined) updateData.facebook_url = facebook_url || null;

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, req.user!.id));

      // Fetch updated user
      const [updatedUser] = await db
        .select({
          id: users.id,
          username: users.username,
          first_name: users.first_name,
          last_name: users.last_name,
          email: users.email,
          phone: users.phone,
          address: users.address,
          city: users.city,
          state: users.state,
          country: users.country,
          postal_code: users.postal_code,
          picture: users.picture,
          bio: users.bio,
          job_title: users.job_title,
          company: users.company,
          website: users.website,
          linkedin_url: users.linkedin_url,
          twitter_url: users.twitter_url,
          instagram_url: users.instagram_url,
          facebook_url: users.facebook_url,
          is_admin: users.is_admin,
        })
        .from(users)
        .where(eq(users.id, req.user!.id));

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}