"use client";

import type { UploadPhase } from "@/hooks/use-ocr-pipeline";

interface UploadProgressProps {
	progress: number;
	filename: string;
	phase?: UploadPhase;
}

const PHASE_LABELS: Record<UploadPhase, string> = {
	hashing: "Analyzing…",
	uploading: "{PHASE_LABELS[phase]}",
};

export function UploadProgress({
	progress,
	filename,
	phase = "uploading",
}: UploadProgressProps) {
	return (
		<div className="flex flex-col w-full items-center">
			<div className="relative size-20 mx-auto mb-7">
				<svg className="size-full -rotate-90" viewBox="0 0 80 80">
					<circle
						cx="40"
						cy="40"
						r="34"
						fill="none"
						strokeWidth="6"
						className="stroke-zinc-100 dark:stroke-zinc-800"
					/>
					<circle
						cx="40"
						cy="40"
						r="34"
						fill="none"
						strokeWidth="6"
						strokeLinecap="round"
						strokeDasharray={`${2 * Math.PI * 34}`}
						strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
						className="stroke-blue-500 transition-all duration-300"
					/>
				</svg>
				<span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
					{progress}%
				</span>
			</div>

			<h3 className="text-xl font-bold mb-1 text-zinc-900 dark:text-white">
				Uploading…
			</h3>
			<p className="text-zinc-400 dark:text-zinc-500 text-sm truncate max-w-xs mx-auto">
				{filename}
			</p>
		</div>
	);
}
