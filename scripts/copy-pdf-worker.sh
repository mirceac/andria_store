#!/bin/bash
# Create necessary directories
mkdir -p dist/public
mkdir -p dist/public/admin

# Copy PDF worker files to the public directory
cp node_modules/pdfjs-dist/build/pdf.worker.js dist/public/
cp node_modules/pdfjs-dist/build/pdf.worker.js.map dist/public/

# Create symbolic links from admin directory to the root files
ln -sf ../pdf.worker.js dist/public/admin/pdf.worker.js
ln -sf ../pdf.worker.js.map dist/public/admin/pdf.worker.js.map

echo "PDF worker files copied to dist/public and symlinked in dist/public/admin"