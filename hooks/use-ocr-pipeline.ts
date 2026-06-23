import { useCallback, useRef, useState } from "react";
import { put } from "@vercel/blob/client";

export type OcrStatus =
	| "idle"
	| "uploading"
	| "scanning"
	| "completed"
	| "error";

export interface OcrPageResult {
	pageNumber: number;
	rawToon: string;
	data: Record<string, unknown>;
}

export interface OcrResult {
	runId: string;
	pdfUrl: string;
	totalPages: number;
	completedPages: number;
	pages: OcrPageResult[];
	merged: Record<string, unknown>;
	modelName?: string;
	createdAt?: string;
	updatedAt?: string;
	hasSchema?: boolean;
	schema?: string;
	filename?: string;
}

export interface UploadedFileData {
	pdfUrl: string;
	fileHash: string;
	filename: string;
	fileSize: number;
	/** When true, the same file is already being processed — skip re-upload */
	deduplicated: boolean;
	existingJobId?: string;
}

export interface UseOcrPipelineReturn {
	status: OcrStatus;
	uploadProgress: number;
	uploadPhase: UploadPhase;
	runId: string | null;
	result: OcrResult | null;
	error: string | null;
	currentFile: File | null;
	uploadedFileData: UploadedFileData | null;
	uploadFile: (file: File) => Promise<void>;
	submitScan: (ocrModelId?: string, jsonSchema?: string) => Promise<void>;
	startOcr: (
		file: File,
		ocrModelId?: string,
		jsonSchema?: string,
	) => Promise<void>;
	rerunOcr: (jobId: string, filename: string) => Promise<void>;
	viewJob: (jobId: string, filename: string) => Promise<void>;
	stopJob: (runId: string) => Promise<void>;
	reset: () => void;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 120;

export type UploadPhase = "hashing" | "uploading";

/** Spawn a web worker to compute SHA-256 off the main thread */
function hashViaWorker(buffer: ArrayBuffer): Promise<string> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL("./hash.worker.ts", import.meta.url), {
			type: "module",
		});
		worker.onmessage = (e: MessageEvent<string>) => {
			resolve(e.data);
			worker.terminate();
		};
		worker.onerror = () => {
			reject(new Error("Hash worker failed"));
			worker.terminate();
		};
		worker.postMessage(buffer);
	});
}

export function useOcrPipeline(): UseOcrPipelineReturn {
	const [status, setStatus] = useState<OcrStatus>("idle");
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadPhase, setUploadPhase] = useState<UploadPhase>("hashing");
	const [runId, setRunId] = useState<string | null>(null);
	const [result, setResult] = useState<OcrResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [currentFile, setCurrentFile] = useState<File | null>(null);
	const [uploadedFileData, setUploadedFileData] =
		useState<UploadedFileData | null>(null);

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
		return typeof window !== "undefined" &&
			window.location.pathname.startsWith("/dashboard")
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
					metadata: {
						totalPages: number;
						completedPages: number;
						pdfUrl: string;
						createdAt: string;
						updatedAt: string;
						hasSchema: boolean;
						schema?: string;
						modelName?: string;
					};
					data: Record<string, unknown> | null;
					error: string | null;
				};

				if (json.status === "failed" || json.status === "cancelled") {
					setStatus("error");
					setError(json.error ?? "Workflow failed unexpectedly.");
					return;
				}

				const mappedResult: OcrResult = {
					runId: json.runId || json.id,
					pdfUrl: json.metadata?.pdfUrl ?? "",
					totalPages: json.metadata?.totalPages ?? 0,
					completedPages: json.metadata?.completedPages ?? 0,
					pages: [],
					merged: json.data ?? {},
					createdAt: json.metadata?.createdAt,
					updatedAt: json.metadata?.updatedAt,
					hasSchema: json.metadata?.hasSchema,
					schema: json.metadata?.schema,
					filename: json.filename,
					modelName: json.metadata?.modelName,
				};
				setResult(mappedResult);

				if (json.status === "completed") {
					const mergedData = json.data || {};
					const hasEmptyFlag = mergedData.empty === true;
					const dataKeys = Object.keys(mergedData).filter(
						(k) => k !== "document_metadata",
					);

					if (hasEmptyFlag || dataKeys.length === 0) {
						setStatus("error");
						setError("No readable data could be extracted from this document.");
						return;
					}

					setStatus("completed");
					return;
				}

				// Fingerprint to detect progress: status + presence of result + completed pages
				const currentFingerprint = `${json.status}-${!!json.data}-${json.metadata.completedPages}`;

				// Defer with exponentially increasing timing when returning same status fingerprint
				if (currentFingerprint === lastStatusRef.current) {
					currentIntervalRef.current = Math.min(
						currentIntervalRef.current * 1.5,
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

	/**
	 * Step 1: Hash the file and upload it to blob storage.
	 * Sets status to "uploading" and stores the result in uploadedFileData.
	 * Does NOT start the OCR scan job.
	 */
	const uploadFile = useCallback(
		async (file: File) => {
			clearPollTimer();
			setStatus("uploading");
			setUploadProgress(0);
			setRunId(null);
			setResult(null);
			setError(null);
			setCurrentFile(file);
			setUploadedFileData(null);

			try {
				setUploadPhase("hashing");
				const fileBuffer = await file.arrayBuffer();
				const fileHash = await hashViaWorker(fileBuffer);

				const uploadUrlRes = await fetch("/api/ocr/upload-url", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						filename: file.name,
						fileSize: file.size,
						fileHash,
						ocrModelId: null,
						jsonSchema: null,
					}),
				});

				if (!uploadUrlRes.ok) {
					const err = (await uploadUrlRes.json()) as { error?: string };
					throw new Error(err.error ?? "Failed to obtain upload URL");
				}

				const uploadUrlData = (await uploadUrlRes.json()) as {
					token?: string;
					pathname?: string;
					deduplicated?: boolean;
					jobId?: string;
					runId?: string;
					pdfUrl?: string;
				};

				if (uploadUrlData.deduplicated) {
					setUploadProgress(100);
					setUploadedFileData({
						pdfUrl: uploadUrlData.pdfUrl ?? "",
						fileHash,
						filename: file.name,
						fileSize: file.size,
						deduplicated: true,
						existingJobId: uploadUrlData.jobId || uploadUrlData.runId,
					});
					// Stay in uploading state but show complete — user still needs to press scan
					setStatus("idle");
					return;
				}

				const { token, pathname } = uploadUrlData;

				setUploadPhase("uploading");

				const blobResult = await put(pathname!, file, {
					access: "public",
					token: token!,
					contentType: "application/pdf",
					onUploadProgress: (e) => {
						setUploadProgress(e.percentage);
					},
				});

				setUploadedFileData({
					pdfUrl: blobResult.url,
					fileHash,
					filename: file.name,
					fileSize: file.size,
					deduplicated: false,
				});

				setUploadProgress(100);
				setStatus("idle");
			} catch (err) {
				setStatus("error");
				setError(
					err instanceof Error ? err.message : "An unexpected error occurred.",
				);
			}
		},
		[clearPollTimer],
	);

	/**
	 * Step 2: Submit the OCR scan job using previously uploaded file data.
	 * Must call uploadFile first to populate uploadedFileData.
	 */
	const submitScan = useCallback(
		async (ocrModelId?: string, jsonSchema?: string) => {
			if (!uploadedFileData || !currentFile) {
				setStatus("error");
				setError("No file uploaded. Please select a file first.");
				return;
			}

			setStatus("scanning");

			try {
				if (uploadedFileData.deduplicated && uploadedFileData.existingJobId) {
					const idToTrack = uploadedFileData.existingJobId;
					setRunId(idToTrack);
					await pollStatus(idToTrack);
					return;
				}

				const jobRes = await fetch("/api/ocr", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						pdfUrl: uploadedFileData.pdfUrl,
						filename: uploadedFileData.filename,
						fileSize: uploadedFileData.fileSize,
						fileHash: uploadedFileData.fileHash,
						ocrModelId: ocrModelId ?? null,
						jsonSchema: jsonSchema ?? null,
					}),
				});

				if (!jobRes.ok) {
					const err = (await jobRes.json()) as { error?: string };
					throw new Error(err.error ?? "Failed to create OCR job");
				}

				const jobData = (await jobRes.json()) as {
					jobId: string;
					runId: string;
				};
				const idToTrack = jobData.jobId || jobData.runId;
				setRunId(idToTrack);

				await pollStatus(idToTrack);
			} catch (err) {
				setStatus("error");
				setError(
					err instanceof Error ? err.message : "An unexpected error occurred.",
				);
			}
		},
		[uploadedFileData, currentFile, pollStatus],
	);

	/**
	 * Combined: upload then immediately submit scan.
	 * Preserved for backward compatibility.
	 */
	const startOcr = useCallback(
		async (file: File, ocrModelId?: string, jsonSchema?: string) => {
			clearPollTimer();
			setStatus("uploading");
			setUploadProgress(0);
			setRunId(null);
			setResult(null);
			setError(null);
			setCurrentFile(file);
			setUploadedFileData(null);

			try {
				setUploadPhase("hashing");
				const fileBuffer = await file.arrayBuffer();
				const fileHash = await hashViaWorker(fileBuffer);

				const uploadUrlRes = await fetch("/api/ocr/upload-url", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						filename: file.name,
						fileSize: file.size,
						fileHash,
						ocrModelId: ocrModelId ?? null,
						jsonSchema: jsonSchema ?? null,
					}),
				});

				if (!uploadUrlRes.ok) {
					const err = (await uploadUrlRes.json()) as { error?: string };
					throw new Error(err.error ?? "Failed to obtain upload URL");
				}

				const uploadUrlData = (await uploadUrlRes.json()) as {
					token?: string;
					pathname?: string;
					uploadUrl?: string;
					deduplicated?: boolean;
					jobId?: string;
					runId?: string;
					pdfUrl?: string;
				};

				if (uploadUrlData.deduplicated) {
					setUploadProgress(100);
					const idToTrack = uploadUrlData.jobId || uploadUrlData.runId!;
					setRunId(idToTrack);
					setStatus("scanning");
					await pollStatus(idToTrack);
					return;
				}

				const { token, pathname } = uploadUrlData;

				setUploadPhase("uploading");

				const blobResult = await put(pathname!, file, {
					access: "public",
					token: token!,
					contentType: "application/pdf",
					onUploadProgress: (e) => {
						setUploadProgress(e.percentage);
					},
				});

				const pdfUrl = blobResult.url;

				const jobRes = await fetch("/api/ocr", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						pdfUrl,
						filename: file.name,
						fileSize: file.size,
						fileHash,
						ocrModelId: ocrModelId ?? null,
						jsonSchema: jsonSchema ?? null,
					}),
				});

				if (!jobRes.ok) {
					const err = (await jobRes.json()) as { error?: string };
					throw new Error(err.error ?? "Failed to create OCR job");
				}

				const jobData = (await jobRes.json()) as {
					jobId: string;
					runId: string;
				};
				const idToTrack = jobData.jobId || jobData.runId;
				setRunId(idToTrack);
				setStatus("scanning");

				await pollStatus(idToTrack);
			} catch (err) {
				setStatus("error");
				setError(
					err instanceof Error ? err.message : "An unexpected error occurred.",
				);
			}
		},
		[clearPollTimer, pollStatus, getViewParam],
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
					const err = (await response.json()) as { error?: string };
					throw new Error(err.error ?? "Rerun failed");
				}

				const json = (await response.json()) as {
					jobId: string;
					runId: string;
				};
				const idToTrack = json.jobId || json.runId;
				setRunId(idToTrack);

				await pollStatus(idToTrack);
			} catch (err) {
				setStatus("error");
				setError(
					err instanceof Error ? err.message : "An unexpected error occurred.",
				);
			}
		},
		[clearPollTimer, pollStatus],
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
		[clearPollTimer, pollStatus],
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
			setStatus("error");
			setError("Job stopped by user.");
		},
		[clearPollTimer],
	);

	const reset = useCallback(() => {
		clearPollTimer();
		setStatus("idle");
		setUploadProgress(0);
		setRunId(null);
		setResult(null);
		setError(null);
		setCurrentFile(null);
		setUploadedFileData(null);
	}, [clearPollTimer]);

	return {
		status,
		uploadProgress,
		uploadPhase,
		runId,
		result,
		error,
		currentFile,
		uploadedFileData,
		uploadFile,
		submitScan,
		startOcr,
		rerunOcr,
		viewJob,
		stopJob,
		reset,
	};
}
