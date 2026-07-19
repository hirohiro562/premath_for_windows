import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ url }).promise;
}

export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  boxWidth: number,
  boxHeight: number,
  renderScale = 1,
): Promise<void> {
  const page = await doc.getPage(pageNumber);
  const dpr = window.devicePixelRatio || 1;
  const baseViewport = page.getViewport({ scale: 1 });
  const fitScale = Math.min(boxWidth / baseViewport.width, boxHeight / baseViewport.height);
  const cssWidth = baseViewport.width * fitScale;
  const cssHeight = baseViewport.height * fitScale;
  const viewport = page.getViewport({ scale: fitScale * dpr * renderScale });

  // pdf.js fills the canvas white before it starts painting content, and a
  // complex page can take several frames to finish — rendering straight into
  // the visible canvas shows that white fill as a flash between slides.
  // Rendering into a detached canvas and blitting the finished bitmap over
  // in one drawImage() call makes the swap atomic from the viewer's side.
  const offscreen = document.createElement('canvas');
  offscreen.width = viewport.width;
  offscreen.height = viewport.height;
  const offscreenContext = offscreen.getContext('2d');
  if (!offscreenContext) return;
  await page.render({ canvasContext: offscreenContext, viewport, canvas: offscreen }).promise;

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(offscreen, 0, 0);
}
