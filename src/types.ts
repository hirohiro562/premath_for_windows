export interface SyncState {
  pdfBlobUrl: string | null;
  fileName: string | null;
  sessionCode: string | null;
  numPages: number;
  currentPage: number;
  notesByPage: Record<number, string>;
  videosByPage: Record<number, string>;
  isRunning: boolean;
  overallElapsedMs: number;
  overallStartedAt: number | null;
  slideElapsedMs: number;
  slideStartedAt: number | null;
}
