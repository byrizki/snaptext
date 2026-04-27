/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { decode, encode } from "@toon-format/toon";


export function buildFixToonTool(getInitialToon: () => string, setFixedData: (val: Record<string, unknown>) => void) {
  return {
    description: "Apply a text patch to the current invalid TOON string to fix syntax errors.",
    inputSchema: z.object({
      searchString: z.string().describe("The exact text snippet that contains the error to replace."),
      replaceString: z.string().describe("The corrected text snippet to substitute.")
    }),
    execute: async ({ searchString, replaceString, ...rest }: any) => {
      console.log('[BuildFixToon] searchString: %s, replaceString: %s', searchString, replaceString);
      console.log('[BuildFixToon] Rest: %s', JSON.stringify(rest));

      if (!getInitialToon().includes(searchString)) {
        console.log('[BuildFixToon] Failed: The exact string snippet was not found');
        return `Failed: The exact string snippet was not found. Please ensure the searchString matches exactly.`;
      }
      
      try {
        const trimmed = getInitialToon().replace(searchString, replaceString).trim();
        const data = trimmed === "empty: true" ? { empty: true } : (decode(trimmed) as Record<string, unknown>);
        setFixedData(data);
        console.log("[BuildFixToon] Patch applied successfully and TOON parsed correctly! You may now finish.");
        return "Patch applied successfully and TOON parsed correctly! You may now finish.";
      } catch (err) {
        console.log(`[BuildFixToon] Patch applied successfully. However, the TOON is STILL invalid: ${err instanceof Error ? err.message : String(err)}. Please apply another patch.`);
        return `Patch applied successfully. However, the TOON is STILL invalid: ${err instanceof Error ? err.message : String(err)}. Please apply another patch.`;
      }
    }
  };
}
