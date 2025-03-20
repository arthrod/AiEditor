
// Replace the URL-based worker config with direct import
import 'pdfjs-dist/build/pdf.worker.min.js';

// No need to set workerSrc when using direct import
// Remove the GlobalWorkerOptions.workerSrc assignment 