import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';

export function initPdfWorker() {
  if (typeof window !== 'undefined') {
    GlobalWorkerOptions.workerSrc = '/public/pdf.worker.js';
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