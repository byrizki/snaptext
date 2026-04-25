import { tool } from "ai";
import { z } from "zod";
import { decode, encode } from "@toon-format/toon";

export function buildMergeTools(getMerged: () => any, setMerged: (val: any) => void) {
  let pendingPatchToon = "";

  const performMerge = (toonString: string) => {
    const patch = decode(toonString.trim()) as Record<string, unknown>;
    let merged = getMerged();
    const deepMerge = (target: any, source: any) => {
      for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
          if (Array.isArray(source[key]) && Array.isArray(target[key])) {
            target[key] = target[key].concat(source[key]);
          } else {
            Object.assign(source[key], deepMerge(target[key], source[key]));
          }
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };
    merged = deepMerge(merged, patch);
    setMerged(merged);
    return `Update applied successfully. Current merged data is now:\n\`\`\`\n${encode(merged)}\n\`\`\``;
  };

  return {
    update_merged_data: tool({
      description: "Update the merged data. Pass a valid TOON string representing the updates. Arrays will be concatenated, objects will be deeply merged.",
      parameters: z.object({
        toonPatch: z.string().describe("A valid TOON string containing the new or updated fields. For arrays like line_items, provide only the new items to be appended.")
      }),
      execute: async ({ toonPatch }: any) => {
        pendingPatchToon = toonPatch;
        try {
          return performMerge(pendingPatchToon);
        } catch (err) {
          return `Failed to decode TOON patch: ${err instanceof Error ? err.message : String(err)}. You can either call update_merged_data again with the full fixed string, OR use the patch_invalid_toon tool to apply a surgical text replacement to your failed patch. Current invalid patch state:\n\`\`\`\n${pendingPatchToon}\n\`\`\``;
        }
      }
    } as any),
    patch_invalid_toon: tool({
      description: "Apply a text patch to your PREVIOUSLY FAILED update_merged_data patch to fix syntax errors.",
      parameters: z.object({
        searchString: z.string().describe("The exact text snippet that contains the error to replace."),
        replaceString: z.string().describe("The corrected text snippet to substitute.")
      }),
      execute: async ({ searchString, replaceString }: any) => {
        console.log('PatchInvalidToon called with searchString: %s, replaceString: %s', searchString, replaceString);

        if (!pendingPatchToon) {
          return `Failed: No pending invalid patch to fix. Call update_merged_data first.`;
        }
        if (!pendingPatchToon.includes(searchString)) {
          return `Failed: The exact string snippet was not found in the current invalid patch. Please ensure searchString matches exactly.`;
        }
        
        pendingPatchToon = pendingPatchToon.replace(searchString, replaceString);
        
        try {
          return performMerge(pendingPatchToon);
        } catch (err) {
          return `Patch applied successfully. However, the TOON is STILL invalid: ${err instanceof Error ? err.message : String(err)}. Please apply another patch. Current invalid patch state:\n\`\`\`\n${pendingPatchToon}\n\`\`\``;
        }
      }
    } as any)
  };
}

export function buildFixToonTool(initialToon: string, setFixedData: (val: Record<string, unknown>) => void) {
  let currentToon = initialToon;

  return tool({
    description: "Apply a text patch to the current invalid TOON string to fix syntax errors.",
    parameters: z.object({
      searchString: z.string().describe("The exact text snippet that contains the error to replace."),
      replaceString: z.string().describe("The corrected text snippet to substitute.")
    }),
    execute: async ({ searchString, replaceString }: any) => {
      console.log('[BuildFixToon] searchString: %s, replaceString: %s', searchString, replaceString);

      if (!currentToon.includes(searchString)) {
        console.log('[BuildFixToon] Failed: The exact string snippet was not found');
        return `Failed: The exact string snippet was not found. Please ensure the searchString matches exactly.`;
      }
      
      currentToon = currentToon.replace(searchString, replaceString);
      
      try {
        const trimmed = currentToon.trim();
        const data = trimmed === "empty: true" ? { empty: true } : (decode(trimmed) as Record<string, unknown>);
        setFixedData(data);
        console.log("[BuildFixToon] Patch applied successfully and TOON parsed correctly! You may now finish.");
        return "Patch applied successfully and TOON parsed correctly! You may now finish.";
      } catch (err) {
        console.log(`[BuildFixToon] Patch applied successfully. However, the TOON is STILL invalid: ${err instanceof Error ? err.message : String(err)}. Please apply another patch.`);
        return `Patch applied successfully. However, the TOON is STILL invalid: ${err instanceof Error ? err.message : String(err)}. Please apply another patch.`;
      }
    }
  } as any);
}
