import { decodeToon } from "@/lib/toon-parser";
import { z } from "zod";

type ParseResult =
  | { success: true }
  | { success: false; error: string; hint: string };

function tryParseToon(
  toon: string,
  onParsed: (rawToon: string, data: Record<string, unknown>) => void,
): ParseResult {
  try {
    const trimmed = toon.trim();
    const data =
      trimmed === "empty: true"
        ? { empty: true }
        : (decodeToon(trimmed) as Record<string, unknown>);
    onParsed(toon, data);
    console.log("✅ [TOON] Parse successful");
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.log(`❌ [TOON] Parse failed: ${err}`);
    return {
      success: false,
      error,
      hint: "Use patch_toon to fix the specific broken part — no need to re-submit the full TOON.",
    };
  }
}

export function buildToonTools(
  onParsed: (rawToon: string, data: Record<string, unknown>) => void,
  stopState?: { current: boolean },
  initialToon?: string,
) {
  let currentToon = initialToon ?? "";

  const validate_toon = {
    description:
      "Validate the current state of the TOON output in memory. Call this to check if your patches have successfully fixed the TOON.",
    inputSchema: z.object({}),
    execute: async (): Promise<ParseResult> => {
      if (stopState?.current) {
        return { success: false, error: "Workflow stopped by user", hint: "Stop processing immediately." };
      }
      console.log(`[Tool] validate_toon called (length: ${currentToon.length})`);
      return tryParseToon(currentToon, onParsed);
    },
  };

  const patch_toon = {
    description:
      "Fix a specific broken part of the previously submitted TOON by replacing an exact substring. More token-efficient than re-submitting the full output. CRITICAL: Your 'search' string MUST exactly match the characters in the current TOON, including invisible spaces and newlines.",
    inputSchema: z.object({
      search: z
        .string()
        .describe(
          "The exact substring to find. IMPORTANT: Keep this as short as possible (1-2 lines or a specific phrase) to avoid invisible whitespace mismatch errors.",
        ),
      replace: z.string().describe("The corrected replacement string"),
    }),
    execute: async ({
      search,
      replace,
    }: {
      search: string;
      replace: string;
    }): Promise<ParseResult> => {
      if (stopState?.current) {
        return { success: false, error: "Workflow stopped by user", hint: "Stop processing immediately." };
      }
      console.log(`[Tool] patch_toon called`);
      console.log(`  - Search:  "${search}"`);
      console.log(`  - Replace: "${replace}"`);

      if (!currentToon) {
        console.warn("⚠️ [Tool] patch_toon called but no TOON available");
        return {
          success: false,
          error: "No TOON available to patch.",
          hint: "There is no TOON in memory.",
        };
      }
      if (!currentToon.includes(search)) {
        console.warn("⚠️ [Tool] patch_toon failed: Search string not found");
        const contextLines = currentToon.split("\n").slice(0, 5).join("\n");
        return {
          success: false,
          error: "Search string not found in current TOON. This is usually caused by invisible indentation, trailing spaces, or quoting differences.",
          hint: `Try again with a MUCH SHORTER and more unique search string — ideally just one distinctive keyword or number from the broken line. Here are the first 5 lines of the current TOON for reference:\n${contextLines}`,
        };
      }
      currentToon = currentToon.replace(search, replace);
      console.log("🔄 [Tool] Patch applied, re-validating...");
      return tryParseToon(currentToon, onParsed);
    },
  };

  return { validate_toon, patch_toon };
}
