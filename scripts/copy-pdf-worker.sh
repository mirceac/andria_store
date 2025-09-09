#!/bin/bash
# Create necessary directories
mkdir -p dist/public
mkdir -p dist/public/admin
mkdir -p public

# Copy PDF worker files to the public directory
cp node_modules/pdfjs-dist/build/pdf.worker.js dist/public/
cp node_modules/pdfjs-dist/build/pdf.worker.js.map dist/public/

# Also copy minified version if available
if [ -f node_modules/pdfjs-dist/build/pdf.worker.min.js ]; then
  echo "Copying minified PDF worker..."
  cp node_modules/pdfjs-dist/build/pdf.worker.min.js dist/public/
  # Only copy map file if it exists
  if [ -f node_modules/pdfjs-dist/build/pdf.worker.min.js.map ]; then
    cp node_modules/pdfjs-dist/build/pdf.worker.min.js.map dist/public/
  fi
else
  echo "Minified PDF worker not found, creating a copy of the regular version..."
  cp node_modules/pdfjs-dist/build/pdf.worker.js dist/public/pdf.worker.min.js
  cp node_modules/pdfjs-dist/build/pdf.worker.js.map dist/public/pdf.worker.min.js.map
fi

# Also copy to the root public directory for direct access
cp dist/public/pdf.worker.min.js public/
cp dist/public/pdf.worker.js public/

# Create symbolic links from admin directory to the root files
ln -sf ../pdf.worker.js dist/public/admin/pdf.worker.js
ln -sf ../pdf.worker.js.map dist/public/admin/pdf.worker.js.map
ln -sf ../pdf.worker.min.js dist/public/admin/pdf.worker.min.js
if [ -f dist/public/pdf.worker.min.js.map ]; then
  ln -sf ../pdf.worker.min.js.map dist/public/admin/pdf.worker.min.js.map
fi

echo "PDF worker files copied to dist/public, public/ and symlinked in dist/public/admin"