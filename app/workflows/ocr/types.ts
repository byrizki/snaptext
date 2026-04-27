export interface UsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface OcrPageResult {
  pageNumber: number;
  pageBlobUrl: string;
  rawToon: string;
  data: Record<string, unknown>;
  rawMarkdown?: string;
  model: string;
  usage: UsageData;
  finishReason: string;
}

export interface OcrWorkflowResult {
  jobId: string;
  runId: string;
  pdfUrl: string;
  totalPages: number;
  pages: OcrPageResult[];
  merged: Record<string, unknown>;
}
