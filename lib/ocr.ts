import { createWorker } from "tesseract.js";
import type { Worker } from "tesseract.js";

export type OcrProgress = {
  status: string;
  progress: number;
};

const TESSERACT_VERSION = "7.0.0";
const LANGUAGES = "por+eng";

let workerPromise: Promise<Worker> | null = null;
let progressHandler: ((progress: OcrProgress) => void) | null = null;

function handleLogger(message: { status: string; progress: number }) {
  progressHandler?.({ status: message.status, progress: message.progress });
}

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(LANGUAGES, 1, {
      workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
      corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_VERSION}`,
      logger: handleLogger,
      errorHandler: (error) => console.error("Tesseract error:", error),
    });
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

export async function extractText(
  image: Blob,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  progressHandler = onProgress ?? null;
  try {
    const worker = await getWorker();
    const result = await worker.recognize(image);
    return result.data.text;
  } finally {
    progressHandler = null;
  }
}

export function terminateOcr(): void {
  const pending = workerPromise;
  workerPromise = null;
  pending?.then((worker) => worker.terminate()).catch(() => {});
}

const STATUS_LABELS: Record<string, string> = {
  "loading tesseract core": "Carregando motor OCR...",
  "initializing tesseract": "Inicializando OCR...",
  "loading language traineddata": "Carregando dados de idioma...",
  "initializing api": "Preparando reconhecimento...",
  "recognizing text": "Reconhecendo texto...",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? "Processando imagem...";
}
