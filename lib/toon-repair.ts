import { decodeToon } from "./toon-parser";

type ArraySchema = {
  key: string;
  headers: string[] | null;
};

type RepairResult = {
  toon: string;
  repaired: boolean;
  reasons: string[];
};

const TYPED_ARRAY_RE = /^\s*([\w_]+)\[(?:N|\d+)\]\{([^}]+)\}:\s*(?:#.*)?$/;
const ANY_ARRAY_RE = /^(\s*)([\w_]+)\[(?:N|\d+)\](?:\{([^}]+)\})?:\s*(?:#.*)?$/;
const SCALAR_RE = /^\s*[\w_]+:\s*/;
const ITEM_RE = /^\s*-\s+([\w_]+):\s*(.*)$/;
const CONTINUATION_RE = /^\s+([\w_]+):\s*(.*)$/;

export function tryDecodeToonWithRepair(
  rawToon: string,
  schemaTemplate?: string,
): { data: Record<string, unknown>; rawToon: string; repaired: boolean; repairLog: string[] } {
  const trimmed = rawToon.trim();
  if (trimmed === "empty: true") {
    return { data: { empty: true }, rawToon, repaired: false, repairLog: [] };
  }

  const repair = repairCommonToonSyntax(rawToon, schemaTemplate);
  if (repair.repaired) {
    try {
      return {
        data: decodeToon(repair.toon.trim()) as Record<string, unknown>,
        rawToon: repair.toon,
        repaired: true,
        repairLog: repair.reasons,
      };
    } catch {
      // Fall through to the original decode path so callers get the original parse error.
    }
  }

  return {
    data: decodeToon(trimmed) as Record<string, unknown>,
    rawToon,
    repaired: false,
    repairLog: [],
  };
}

export function repairCommonToonSyntax(rawToon: string, schemaTemplate?: string): RepairResult {
  const schemaArrays = parseSchemaArrays(schemaTemplate ?? "");
  const reasons: string[] = [];
  let toon = rawToon;

  const yamlRepair = repairYamlTypedArrays(toon, schemaArrays);
  if (yamlRepair.repaired) {
    toon = yamlRepair.toon;
    reasons.push(...yamlRepair.reasons);
  }

  const metadataRepair = repairDuplicateDocumentMetadata(toon);
  if (metadataRepair.repaired) {
    toon = metadataRepair.toon;
    reasons.push(...metadataRepair.reasons);
  }

  return { toon, repaired: reasons.length > 0, reasons };
}

function parseSchemaArrays(schemaTemplate: string): Map<string, ArraySchema> {
  const arrays = new Map<string, ArraySchema>();
  for (const line of schemaTemplate.split(/\r?\n/)) {
    const typed = line.match(TYPED_ARRAY_RE);
    if (typed) {
      arrays.set(typed[1], {
        key: typed[1],
        headers: typed[2].split(",").map((header) => header.trim()).filter(Boolean),
      });
      continue;
    }

    const any = line.match(ANY_ARRAY_RE);
    if (any && !arrays.has(any[2])) {
      arrays.set(any[2], { key: any[2], headers: any[3]?.split(",").map((h) => h.trim()).filter(Boolean) ?? null });
    }
  }
  return arrays;
}

function repairYamlTypedArrays(rawToon: string, schemaArrays: Map<string, ArraySchema>): RepairResult {
  if (schemaArrays.size === 0) return { toon: rawToon, repaired: false, reasons: [] };

  const lines = rawToon.split(/\r?\n/);
  const output: string[] = [];
  const reasons: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const headerMatch = lines[i].match(ANY_ARRAY_RE);
    const key = headerMatch?.[2];
    const schemaArray = key ? schemaArrays.get(key) : undefined;
    const schemaHeaders = schemaArray?.headers;

    if (!headerMatch || !key || !schemaHeaders?.length || headerMatch[3]) {
      output.push(lines[i]);
      i++;
      continue;
    }

    const arrayIndent = headerMatch[1].length;
    const items: Record<string, string>[] = [];
    const passthrough: string[] = [];
    let j = i + 1;
    let sawYamlItem = false;

    while (j < lines.length) {
      const line = lines[j];
      const trimmed = line.trim();
      if (!trimmed) {
        passthrough.push(line);
        j++;
        continue;
      }

      const indent = line.search(/\S/);
      if (indent <= arrayIndent && (SCALAR_RE.test(line) || ANY_ARRAY_RE.test(line))) break;

      const itemMatch = line.match(ITEM_RE);
      if (itemMatch) {
        sawYamlItem = true;
        const item: Record<string, string> = { [itemMatch[1]]: itemMatch[2].trim() };
        j++;

        while (j < lines.length) {
          const childLine = lines[j];
          const childTrimmed = childLine.trim();
          if (!childTrimmed) {
            j++;
            continue;
          }
          const childIndent = childLine.search(/\S/);
          if (childIndent <= indent) break;
          if (childTrimmed.startsWith("- ")) break;

          const childMatch = childLine.match(CONTINUATION_RE);
          if (childMatch) {
            item[childMatch[1]] = childMatch[2].trim();
          }
          j++;
        }
        items.push(item);
        continue;
      }

      passthrough.push(line);
      j++;
    }

    if (!sawYamlItem || items.length === 0) {
      output.push(lines[i]);
      output.push(...passthrough);
      i = j;
      continue;
    }

    output.push(`${headerMatch[1]}${key}[${items.length}]{${schemaHeaders.join(",")}}:`);
    for (const item of items) {
      output.push(`${headerMatch[1]}  ${schemaHeaders.map((header) => formatCsvValue(item[header])).join(",")}`);
    }
    reasons.push(`Converted YAML object array '${key}' to typed CSV rows using schema headers.`);
    i = j;
  }

  return { toon: output.join("\n"), repaired: reasons.length > 0, reasons };
}

function repairDuplicateDocumentMetadata(rawToon: string): RepairResult {
  const lines = rawToon.split(/\r?\n/);
  const documentMetadataIndices = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^document_metadata:\s*(?:#.*)?$/.test(line.trim()));

  if (documentMetadataIndices.length <= 1) return { toon: rawToon, repaired: false, reasons: [] };

  const keepIndex = documentMetadataIndices[documentMetadataIndices.length - 1].index;
  const output: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (documentMetadataIndices.some(({ index }) => index === i && index !== keepIndex)) {
      const baseIndent = lines[i].search(/\S/);
      i++;
      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) {
          i++;
          continue;
        }
        const indent = line.search(/\S/);
        if (indent <= baseIndent) {
          i--;
          break;
        }
        i++;
      }
      continue;
    }
    output.push(lines[i]);
  }

  return {
    toon: output.join("\n"),
    repaired: true,
    reasons: ["Removed earlier duplicate document_metadata block and kept the final block."],
  };
}

function formatCsvValue(value: string | undefined): string {
  if (value === undefined || value === "" || value === "null") return "null";
  const trimmed = stripInlineComment(value.trim());
  if (trimmed === "null" || trimmed === "true" || trimmed === "false") return trimmed;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return trimmed;
  return `"${unquote(trimmed).replace(/"/g, '""')}"`;
}

function stripInlineComment(value: string): string {
  const hashIndex = value.indexOf(" #");
  return hashIndex === -1 ? value : value.slice(0, hashIndex).trim();
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"');
  }
  return value;
}
