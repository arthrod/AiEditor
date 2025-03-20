import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

// Configure worker
GlobalWorkerOptions.workerPort = new PdfjsWorker();

export async function extractTextFromPDF(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDocument = await getDocument({ data: arrayBuffer }).promise;
  
  const pagesText: string[] = [];
  for (let i = 0; i < pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i + 1);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => (item as any).str).join(" ");
    pagesText.push(pageText);
  }
  return pagesText;
} 