#!/bin/bash
mkdir -p dist/public
cp node_modules/pdfjs-dist/build/pdf.worker.js dist/public/
cp node_modules/pdfjs-dist/build/pdf.worker.js.map dist/public/
echo "PDF worker files copied to dist/public"