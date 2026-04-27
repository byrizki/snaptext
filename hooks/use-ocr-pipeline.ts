import { useCallback, useRef, useState } from "react";

export type OcrStatus = "idle" | "uploading" | "scanning" | "completed" | "error";

export interface OcrPageResult {
  pageNumber: number;
  rawToon: string;
  data: Record<string, unknown>;
}

export interface OcrResult {
  runId: string;
  pdfUrl: string;
  totalPages: number;
  pages: OcrPageResult[];
  merged: Record<string, unknown>;
  modelName?: string;
  createdAt?: string;
  updatedAt?: string;
  hasSchema?: boolean;
  filename?: string;
}

export interface UseOcrPipelineReturn {
  status: OcrStatus;
  uploadProgress: number;
  runId: string | null;
  result: OcrResult | null;
  error: string | null;
  currentFile: File | null;
  startOcr: (file: File, ocrModelId?: string, jsonSchema?: string) => Promise<void>;
  rerunOcr: (jobId: string, filename: string) => Promise<void>;
  viewJob: (jobId: string, filename: string) => Promise<void>;
  stopJob: (runId: string) => Promise<void>;
  reset: () => void;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 120;

export function useOcrPipeline(): UseOcrPipelineReturn {
  const [status, setStatus] = useState<OcrStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [runId, setRunId] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatusRef = useRef<string | null>(null);
  const currentIntervalRef = useRef<number>(POLL_INTERVAL_MS);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    lastStatusRef.current = null;
    currentIntervalRef.current = POLL_INTERVAL_MS;
  }, []);

  const getViewParam = useCallback(() => {
    return typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")
      ? ""
      : "?view=demo";
  }, []);

  const pollStatus = useCallback(
    async function poll(id: string, attempt = 0) {
      if (attempt >= MAX_POLL_ATTEMPTS) {
        setStatus("error");
        setError("OCR timed out. The document may be too large or complex.");
        return;
      }

      try {
        const viewParam = getViewParam();
        const response = await fetch(`/api/ocr/${id}${viewParam}`);
        const json = (await response.json()) as {
          id: string;
          runId: string;
          status: string;
          filename: string;
          totalPages: number;
          pdfUrl: string;
          createdAt: string;
          updatedAt: string;
          hasSchema: boolean;
          data: Record<string, unknown> | null;
          error: string | null;
        };

        const mappedResult: OcrResult = {
          runId: json.runId || json.id,
          pdfUrl: json.pdfUrl,
          totalPages: json.totalPages ?? 0,
          pages: [], // per-page results excluded
          merged: json.data ?? {},
          createdAt: json.createdAt,
          updatedAt: json.updatedAt,
          hasSchema: json.hasSchema,
          filename: json.filename,
        };
        setResult(mappedResult);

        if (json.status === "completed") {
          const mergedData = json.data || {};
          const hasEmptyFlag = mergedData.empty === true;
          const dataKeys = Object.keys(mergedData).filter(k => k !== 'document_metadata');
          
          if (hasEmptyFlag || dataKeys.length === 0) {
            setStatus("error");
            setError("No readable data could be extracted from this document.");
            return;
          }

          setStatus("completed");
          return;
        }

        if (json.status === "failed" || json.status === "cancelled") {
          setStatus("error");
          setError(json.error ?? "Workflow failed unexpectedly.");
          return;
        }

        // Fingerprint to detect progress: status + presence of result
        const currentFingerprint = `${json.status}-${!!json.data}`;

        // Defer with increasing timing when returning same status fingerprint
        if (currentFingerprint === lastStatusRef.current) {
          currentIntervalRef.current = Math.min(
            currentIntervalRef.current + 1500,
            15000,
          );
        } else {
          lastStatusRef.current = currentFingerprint;
          currentIntervalRef.current = POLL_INTERVAL_MS;
        }

        pollTimerRef.current = setTimeout(
          () => void poll(id, attempt + 1),
          currentIntervalRef.current,
        );
      } catch {
        pollTimerRef.current = setTimeout(
          () => void poll(id, attempt + 1),
          POLL_INTERVAL_MS,
        );
      }
    },
    [getViewParam],
  );

  const startOcr = useCallback(
    async (file: File, ocrModelId?: string, jsonSchema?: string) => {
      clearPollTimer();
      setStatus("uploading");
      setUploadProgress(0);
      setRunId(null);
      setResult(null);
      setError(null);
      setCurrentFile(file);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 8, 90));
      }, 80);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (ocrModelId) formData.append("ocrModelId", ocrModelId);
        if (jsonSchema) formData.append("jsonSchema", jsonSchema);

        const response = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const err = await response.json() as { error?: string };
          throw new Error(err.error ?? "Upload failed");
        }

        const json = await response.json() as { jobId: string; runId: string };
        const idToTrack = json.jobId || json.runId;
        setRunId(idToTrack);
        setStatus("scanning");

        await pollStatus(idToTrack);
      } catch (err) {
        clearInterval(progressInterval);
        setStatus("error");
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    },
    [clearPollTimer, pollStatus, getViewParam]
  );

  const rerunOcr = useCallback(
    async (jobId: string, filename: string) => {
      clearPollTimer();
      setStatus("scanning"); // Skip uploading phase
      setUploadProgress(100);
      setRunId(null);
      setResult(null);
      setError(null);
      // We don't have the File object, but we can mock enough for the UI to display the name
      setCurrentFile(new File([], filename));

      try {
        const response = await fetch(`/api/ocr/${jobId}/rerun`, {
          method: "POST",
        });

        if (!response.ok) {
          const err = await response.json() as { error?: string };
          throw new Error(err.error ?? "Rerun failed");
        }

        const json = await response.json() as { jobId: string; runId: string };
        const idToTrack = json.jobId || json.runId;
        setRunId(idToTrack);

        await pollStatus(idToTrack);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    },
    [clearPollTimer, pollStatus, getViewParam]
  );

  const viewJob = useCallback(
    async (jobId: string, filename: string) => {
      clearPollTimer();
      setStatus("scanning"); // Show loading UI while fetching
      setUploadProgress(100);
      setRunId(jobId);
      setResult(null);
      setError(null);
      setCurrentFile(new File([], filename));

      await pollStatus(jobId);
    },
    [clearPollTimer, pollStatus]
  );

  const stopJob = useCallback(
    async (jobId: string) => {
      clearPollTimer();
      try {
        await fetch(`/api/ocr/${jobId}/stop`, {
          method: "POST",
        });
      } catch (err) {
        console.error("Failed to stop job:", err);
      }
      setStatus("idle");
      setRunId(null);
      setResult(null);
      setError(null);
      setCurrentFile(null);
    },
    [clearPollTimer, getViewParam],
  );

  const reset = useCallback(() => {
    clearPollTimer();
    setStatus("idle");
    setUploadProgress(0);
    setRunId(null);
    setResult(null);
    setError(null);
    setCurrentFile(null);
  }, [clearPollTimer]);

  return { status, uploadProgress, runId, result, error, currentFile, startOcr, rerunOcr, viewJob, stopJob, reset };
}
