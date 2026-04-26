import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const { runId } = await params;

  if (!runId) {
    return NextResponse.json({ error: "Missing runId" }, { status: 400 });
  }

  let status = "unknown";
  let workflowResult = null;

  try {
    const run = getRun(runId);
    status = await run.status;
    workflowResult = await run.returnValue;

    if (status === "failed" || status === "cancelled") {
      return NextResponse.json({ status, error: "Schema generation failed." });
    }

    if (status === "completed") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return NextResponse.json({ status, schema: (workflowResult as any)?.schema });
    }

    return NextResponse.json({ status });
  } catch (error: unknown) {
    console.error("Workflow status error:", error);
    return NextResponse.json({ status: "failed", error: "Workflow not found or failed." });
  }
}
