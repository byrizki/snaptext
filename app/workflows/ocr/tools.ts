/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { decode, encode } from "@toon-format/toon";

export function buildMergeTools(getPendingPatch: () => string, setPendingPatch: (val: string) => void, getMerged: () => any, setMerged: (val: any) => void) {
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
    update_merged_data: {
      description: "Update the merged data. Pass a valid TOON string representing the updates. Arrays will be concatenated, objects will be deeply merged.",
      inputSchema: z.object({
        toonPatch: z.string().describe("A valid TOON string containing the new or updated fields. For arrays like line_items, provide only the new items to be appended.")
      }),
      execute: async ({ toonPatch }: any) => {
        setPendingPatch(toonPatch);
        try {
          return performMerge(getPendingPatch());
        } catch (err) {
          return `Failed to decode TOON patch: ${err instanceof Error ? err.message : String(err)}. You can either call update_merged_data again with the full fixed string, OR use the patch_invalid_toon tool to apply a surgical text replacement to your failed patch. Current invalid patch state:\n\`\`\`\n${getPendingPatch()}\n\`\`\``;
        }
      }
    },
    patch_invalid_toon: {
      description: "Apply a text patch to your PREVIOUSLY FAILED update_merged_data patch to fix syntax errors.",
      inputSchema: z.object({
        searchString: z.string().describe("The exact text snippet that contains the error to replace."),
        replaceString: z.string().describe("The corrected text snippet to substitute.")
      }),
      execute: async ({ searchString, replaceString }: any) => {
        console.log('PatchInvalidToon called with searchString: %s, replaceString: %s', searchString, replaceString);

        if (!getPendingPatch()) {
          return `Failed: No pending invalid patch to fix. Call update_merged_data first.`;
        }
        if (!getPendingPatch().includes(searchString)) {
          return `Failed: The exact string snippet was not found in the current invalid patch. Please ensure searchString matches exactly.`;
        }
        
        setPendingPatch(getPendingPatch().replace(searchString, replaceString));
        
        try {
          return performMerge(getPendingPatch());
        } catch (err) {
          return `Patch applied successfully. However, the TOON is STILL invalid: ${err instanceof Error ? err.message : String(err)}. Please apply another patch. Current invalid patch state:\n\`\`\`\n${getPendingPatch()}\n\`\`\``;
        }
      }
    }
  };
}

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
