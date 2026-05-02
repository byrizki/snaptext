"use client";

import { UploadProgress } from "@/components/demo/upload-progress";
import { ScanningView } from "@/components/demo/scanning-view";
import { ResultsView } from "@/components/demo/results-view";
import { ErrorView } from "@/components/demo/error-view";
import type {
	OcrStatus,
	OcrResult,
	UploadPhase,
} from "@/hooks/use-ocr-pipeline";

interface DemoActiveWorkspaceProps {
	status: OcrStatus;
	uploadProgress: number;
	uploadPhase: UploadPhase;
	runId: string | null;
	result: OcrResult | null;
	error: string | null;
	currentFile: File | null;
	onReset: () => void;
	onStop?: () => void;
}
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

function PdfPane({ pdfUrl, filename }: { pdfUrl?: string; filename: string }) {
	const stableUrlRef = useRef<string | null>(null);
	if (pdfUrl) stableUrlRef.current = pdfUrl;
	const displayUrl = stableUrlRef.current;

	return (
		<motion.div
			initial={{ opacity: 0, x: -8 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.35, ease: "easeOut" }}
			className="h-full flex flex-col rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg overflow-hidden"
		>
			<div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
				<div className="flex gap-1.5">
					<span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
					<span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
					<span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
				</div>
				<span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium truncate ml-1">
					{filename}
				</span>
			</div>
			{displayUrl ? (
				<iframe
					src={`${displayUrl}#toolbar=0`}
					className="flex-1 w-full bg-white"
					title="PDF Preview"
				/>
			) : (
				<div className="flex-1 flex flex-col gap-3 p-5">
					<div className="flex flex-col gap-2.5 flex-1">
						{Array.from({ length: 12 }).map((_, i) => (
							<div
								key={i}
								className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse"
								style={{
									width: `${[100, 85, 92, 70, 88, 60, 95, 78, 84, 65, 90, 55][i]}%`,
									animationDelay: `${i * 0.05}s`,
								}}
							/>
						))}
						<div
							className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse mt-1"
							style={{ animationDelay: "0.6s" }}
						/>
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={`b-${i}`}
								className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse"
								style={{
									width: `${[88, 72, 95, 68, 80][i]}%`,
									animationDelay: `${(i + 12) * 0.05}s`,
								}}
							/>
						))}
					</div>
				</div>
			)}
		</motion.div>
	);
}

function ResultPane({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative group h-full flex flex-col">
			<div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-emerald-500 blur-sm opacity-15 dark:opacity-20 group-hover:opacity-25 transition-opacity duration-700" />
			<div className="relative h-full rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-lg overflow-hidden flex flex-col p-5">
				{children}
			</div>
		</div>
	);
}

const TRANSITION = { duration: 0.3, ease: "easeInOut" } as const;

export function DemoActiveWorkspace({
	status,
	uploadProgress,
	uploadPhase,
	runId,
	result,
	error,
	currentFile,
	onReset,
	onStop,
}: DemoActiveWorkspaceProps) {
	const filename = result?.filename ?? currentFile?.name ?? "document.pdf";

	return (
		<div className="flex-1 flex flex-col w-[95vw] mx-auto py-4">
			<div
				className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 w-full"
				style={{ minHeight: "calc(100vh - 100px)" }}
			>
				<div className="lg:sticky lg:top-24 h-[calc(100vh-116px)] min-w-0">
					<PdfPane pdfUrl={result?.pdfUrl} filename={filename} />
				</div>

				<div className="h-[calc(100vh-116px)] w-full flex-1 min-w-0">
					<ResultPane>
						<AnimatePresence mode="wait">
							{status === "uploading" && (
								<motion.div
									key="uploading"
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -12 }}
									transition={TRANSITION}
									className="w-full h-full flex items-center justify-center"
								>
									<UploadProgress
										progress={uploadProgress}
										filename={filename}
										phase={uploadPhase}
									/>
								</motion.div>
							)}
							{status === "scanning" && (
								<motion.div
									key="scanning"
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -12 }}
									transition={TRANSITION}
									className="w-full h-full flex items-center justify-center"
								>
									<ScanningView
										filename={filename}
										runId={runId}
										pagesProcessed={result?.completedPages ?? 0}
										totalPages={result?.totalPages ?? 0}
										onStop={onStop}
									/>
								</motion.div>
							)}
							{status === "completed" && result && (
								<motion.div
									key="completed"
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -12 }}
									transition={TRANSITION}
									className="w-full h-full flex flex-col"
								>
									<ResultsView result={result} onReset={onReset} />
								</motion.div>
							)}
							{status === "error" && (
								<motion.div
									key="error"
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -12 }}
									transition={TRANSITION}
									className="w-full h-full flex items-center justify-center"
								>
									<ErrorView
										message={error ?? "An unexpected error occurred."}
										onReset={onReset}
									/>
								</motion.div>
							)}
						</AnimatePresence>
					</ResultPane>
				</div>
			</div>
		</div>
	);
}
