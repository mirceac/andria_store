import { pdfjs } from 'react-pdf';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export const initPdfWorker = () => {
  if (typeof window === 'undefined') return;
  return pdfjs.getDocument;
};