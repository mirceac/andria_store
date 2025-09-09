import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';

export function initPdfWorker() {
  if (typeof window !== 'undefined') {
    // Check for the correct path - try multiple possible locations
    try {
      // The correct path should be '/pdf.worker.min.js' in production
      GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('PDF Worker initialized with /pdf.worker.min.js');
    } catch (error) {
      console.error('Error initializing PDF worker:', error);
      
      // Try alternative paths if the main one fails
      try {
        GlobalWorkerOptions.workerSrc = '/public/pdf.worker.min.js';
        console.log('PDF Worker initialized with /public/pdf.worker.min.js');
      } catch (err) {
        console.error('Failed to initialize PDF worker with alternative path:', err);
      }
    }
  }
}

export function getPdfUrl(productId: number): string {
  return `/api/products/${productId}/pdf`;
}

export async function checkPdfAvailability(productId: number): Promise<boolean> {
  try {
    const response = await fetch(getPdfUrl(productId));
    return response.ok;
  } catch (error) {
    return false;
  }
}