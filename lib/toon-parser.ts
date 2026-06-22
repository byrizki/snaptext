/**
 * Custom TOON (Token-Oriented Object Notation) Decoder
 * Provides enhanced error messages with line numbers and context.
 */

export interface ToonParseError extends Error {
  line?: number;
  column?: number;
  key?: string;
  context?: string;
}

export function decodeToon(input: string): Record<string, any> {
  const jsonData = tryDecodeJsonResponse(input);
  if (jsonData) return jsonData;

  const lines = input.split(/\r?\n/);
  const result: Record<string, any> = {};
  const stack: { obj: Record<string, any>; indent: number }[] = [{ obj: result, indent: -2 }];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      i++;
      continue;
    }

    const indent = line.search(/\S/);
    const lineNum = i + 1;

    // Pop stack if indent decreased
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const currentObj = stack[stack.length - 1].obj;

    // 1. Object Array (Tabular): key[N]{h1,h2}: or key[N]:
    const tabularMatch = trimmedLine.match(/^([\w_]+)\[(\d+)\](?:\{([^}]+)\})?:$/);
    if (tabularMatch) {
      const [, key, countStr, headersStr] = tabularMatch;
      const count = parseInt(countStr, 10);
      let headers = headersStr ? headersStr.split(",").map(h => h.trim()) : null;

      // Fallback: look for a sibling array that might be the headers (usually defined just before)
      if (!headers) {
        const keys = Object.keys(currentObj);
        const lastKey = keys[keys.length - 1];
        if (lastKey && Array.isArray(currentObj[lastKey])) {
          headers = currentObj[lastKey];
        }
      }

      const rows: any[] = [];

      i++;

      // Detect YAML-style object array: items are "- key: value" blocks (no CSV headers).
      // Peek at the next meaningful line; if it starts with "- ", use YAML parsing mode.
      if (!headers) {
        let peekYaml = i;
        while (peekYaml < lines.length && (!lines[peekYaml].trim() || lines[peekYaml].trim().startsWith("#"))) {
          peekYaml++;
        }
        if (peekYaml < lines.length && lines[peekYaml].trim().startsWith("- ")) {
          const { items, nextLine } = parseYamlObjectArray(lines, i, indent, count);
          currentObj[key] = items;
          i = nextLine;
          continue;
        }
      }

      let r = 0;
      let stoppedAtEof = false;
      while (i < lines.length) {
        let peek = i;
        while (peek < lines.length && (!lines[peek].trim() || lines[peek].trim().startsWith("#"))) {
          peek++;
        }
        if (peek >= lines.length) {
          i = peek;
          stoppedAtEof = true;
          break;
        }

        const rowLine = lines[peek];
        let rowValues = parseCsvLine(rowLine.trim());
        const isKey = /^\s*[\w_]+(\[\d+\](?:\{[^}]+\})?)?:/.test(rowLine);

        // Auto-correction: if we have more values than headers, try fixing unquoted commas
        if (headers && rowValues.length > headers.length) {
          rowValues = attemptToFixMismatchedColumns(rowValues, headers.length);
        }

        // Stop when we hit a new TOON key declaration at this or outer indent level.
        // After [N] declared rows are consumed we keep accepting rows as long as column
        // count matches — the LLM often miscounts [N] and we should not silently drop rows.
        if (isKey) {
          break;
        }
        if (r >= count && headers && rowValues.length !== headers.length) {
          break;
        }

        i = peek;

        if (headers) {
          if (rowValues.length > headers.length) {
            const surplus = rowValues.length - headers.length;
            const ratio = surplus / headers.length;
            if (ratio > 0.2) {
              throw createError(
                `Column mismatch in '${key}' at row ${r + 1}. ` +
                `Expected ${headers.length} columns (${headers.join(",")}), but got ${rowValues.length} values — too many. ` +
                `A value likely contains an unquoted comma. Line content: '${rowLine.trim()}' ` +
                `Quote any value containing a comma: e.g. "value, with comma".`,
                i + 1,
                key,
                rowLine.trim()
              );
            }
            console.warn(
              `[TOON] Lenient trim: '${key}' row ${r + 1} has ${rowValues.length} values, expected ${headers.length}. Trimming ${surplus} extra trailing column(s).`
            );
            rowValues.splice(headers.length);
          }
          if (rowValues.length < headers.length) {
            const missing = headers.length - rowValues.length;
            const ratio = rowValues.length / headers.length;
            if (ratio < 0.5) {
              throw createError(
                `Row ${r + 1} of '${key}' has only ${rowValues.length} of ${headers.length} expected values \u2014 likely a truncated or broken line. ` +
                `Line content: '${rowLine.trim()}'`,
                i + 1,
                key,
                rowLine.trim()
              );
            }
            console.warn(
              `[TOON] Lenient pad: '${key}' row ${r + 1} has ${rowValues.length} values, expected ${headers.length}. Padding ${missing} missing trailing column(s) with null.`
            );
            while (rowValues.length < headers.length) rowValues.push("null");
          }

          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = castValue(rowValues[idx]);
          });
          rows.push(rowObj);
        } else {
          // No headers: parse as raw array of values
          rows.push(rowValues.map(v => castValue(v)));
        }

        r++;
        i++;
      }

      if (r < count) {
        if (stoppedAtEof) {
          // True EOF mid-table — genuine truncation, throw.
          throw createError(
            `Unexpected end of input. Expected ${count} rows for object array '${key}', but only parsed ${r} before EOF — output may be truncated.`,
            lineNum,
            key
          );
        }
        // Stopped at next TOON key — LLM miscounted [N]. Accept what was parsed.
        console.warn(
          `[TOON] Lenient row count: '${key}' declared [${count}] rows but only ${r} were found before next key. Accepting ${r} rows.`
        );
      }

      currentObj[key] = rows;
      continue;
    }

    // 2. Flat Array: key[N]: val1,val2
    const flatArrayMatch = trimmedLine.match(/^([\w_]+)\[(\d+)\]:\s*(.*)$/);
    if (flatArrayMatch) {
      const [, key, countStr, valStr] = flatArrayMatch;
      const count = parseInt(countStr, 10);
      let rowValues = valStr ? parseCsvLine(valStr) : [];
      if (rowValues.length > count) {
        rowValues = attemptToFixMismatchedColumns(rowValues, count);
      }
      const values = rowValues.map(v => castValue(v));

      if (values.length !== count) {
        console.warn(
          `[TOON] Lenient array count: '${key}' declared [${count}] items but found ${values.length}. Accepting found items.`
        );
      }

      currentObj[key] = values;
      i++;
      continue;
    }

    // 3. Scalar or Object Start: key: value or key:
    // Also tolerates YAML-style list items ("- key: value") emitted by some LLMs.
    let scalarLine = trimmedLine;
    if (scalarLine.startsWith("- ")) {
      scalarLine = scalarLine.slice(2).trim();
    }
    const colonIndex = scalarLine.indexOf(":");
    if (colonIndex !== -1) {
      const key = scalarLine.substring(0, colonIndex).trim();
      const valueStr = scalarLine.substring(colonIndex + 1).trim();

      if (valueStr === "") {
        // Object start
        const newObj = {};
        currentObj[key] = newObj;
        stack.push({ obj: newObj, indent });
      } else {
        // Scalar
        currentObj[key] = castValue(valueStr);
      }
      i++;
      continue;
    }

    // Unrecognised line — skip with a warning rather than aborting the parse.
    // Common causes: model-emitted separators ("--- TOON END ---"), stray markdown,
    // or other non-TOON artefacts that should not corrupt the rest of the output.
    console.warn(`[TOON] Skipping unrecognised line ${lineNum}: ${trimmedLine}`);
    i++;
    continue;
  }

  return result;
}

function tryDecodeJsonResponse(input: string): Record<string, unknown> | null {
  const trimmed = input.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  if (!candidate.startsWith("{") && !candidate.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      console.warn("[TOON] Parsed JSON response emitted instead of TOON.");
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Not JSON; fall through to the TOON parser for its lenient handling.
  }

  return null;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '\\' && inQuotes && i + 1 < line.length) {
      const next = line[i + 1];
      // Handle escape sequences inside quoted strings
      if (next === '"') {
        current += '"';
        i++;
        continue;
      }
      if (next === 'n') {
        current += '\\n'; // preserve \n as literal escape for castValue to handle later
        i++;
        continue;
      }
      if (next === '\\') {
        current += '\\';
        i++;
        continue;
      }
    }

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // RFC 4180-style doubled-quote escape
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses a YAML-style object array:
 *
 *   offices[2]:
 *     - name: HANOI OFFICE
 *       address:
 *         city: Hanoi
 *     - name: HO CHI MINH OFFICE
 *       address:
 *         city: Hochiminh
 *
 * Each "- " item is collected into its own set of lines, indentation is
 * normalised relative to the item start, then decodeToon is called
 * recursively to produce a plain object for each item.
 */
function parseYamlObjectArray(
  lines: string[],
  startLine: number,
  arrayIndent: number,
  maxItems: number,
): { items: Record<string, any>[]; nextLine: number } {
  const items: Record<string, any>[] = [];
  let i = startLine;

  while (i < lines.length && items.length < maxItems) {
    // Skip blank lines and comments
    while (i < lines.length && (!lines[i].trim() || lines[i].trim().startsWith("#"))) {
      i++;
    }
    if (i >= lines.length) break;

    const line = lines[i];
    const lineIndent = line.search(/\S/);
    const trimmed = line.trim();

    // Exited the array scope (lower or equal indent to array declaration)
    if (lineIndent <= arrayIndent) break;

    // Each item must start with "- "
    if (!trimmed.startsWith("- ")) break;

    const itemIndent = lineIndent;

    // Build the lines for this item.
    // First line: strip "- " prefix, re-add spacing so relative indent is preserved.
    const itemLines: string[] = [
      " ".repeat(itemIndent) + trimmed.slice(2).trim(),
    ];
    i++;

    // Collect all continuation lines that belong to this item (indent > itemIndent)
    while (i < lines.length) {
      const nextRaw = lines[i];
      const nextTrimmed = nextRaw.trim();
      if (!nextTrimmed || nextTrimmed.startsWith("#")) {
        i++;
        continue;
      }
      const nextIndent = nextRaw.search(/\S/);
      if (nextIndent <= itemIndent) break;
      itemLines.push(nextRaw);
      i++;
    }

    // Normalise: strip itemIndent leading spaces so decodeToon sees root-level keys.
    const normalised = itemLines.map((l) => {
      if (!l.trim()) return "";
      return l.slice(itemIndent);
    });

    try {
      const obj = decodeToon(normalised.join("\n"));
      items.push(obj);
    } catch (e) {
      console.warn(`[TOON] Skipping malformed YAML-style array item: ${e}`);
    }
  }

  return { items, nextLine: i };
}

function castValue(val: string): any {
  let result = val;
  let wasQuoted = false;

  // Remove surrounding quotes if they exist
  if (result.startsWith('"') && result.endsWith('"') && result.length >= 2) {
    result = result.slice(1, -1).replace(/""/g, '"');
    wasQuoted = true;
  }

  // Only perform type coercion if the value was not explicitly quoted
  if (!wasQuoted) {
    if (result === "null") return null;
    if (result === "true") return true;
    if (result === "false") return false;
    if (!isNaN(Number(result)) && result !== "") return Number(result);
  }
  
  // Handle escaped newlines
  if (result.includes("\\n")) {
    result = result.replace(/\\n/g, "\n");
  }
  
  return result;
}

const COMMON_SUFFIXES = ["ltd", "inc", "co", "corp", "corporation", "branch", "llc", "limited"];

function calculateMergeScore(v1: string, v2: string): number {
  const v2Lower = v2.toLowerCase();
  // 1. Check for common business suffixes/continuations at start of v2
  if (COMMON_SUFFIXES.some(s => v2Lower.startsWith(s))) return 100;
  
  // 2. Check if both contain spaces (likely multi-word text fields)
  if (v1.includes(" ") && v2.includes(" ")) return 50;
  
  // 3. Check if v2 starts with a lowercase letter (likely a continuation)
  if (/^[a-z]/.test(v2)) return 30;
  
  return 0;
}

function attemptToFixMismatchedColumns(values: string[], targetCount: number): string[] {
  let result = [...values];
  
  // Phase 1: Fix numeric thousand separators (high certainty)
  let i = 0;
  while (result.length > targetCount && i < result.length - 1) {
    const curr = result[i];
    const next = result[i + 1];
    if (/^\d+$/.test(curr) && /^\d{3}$/.test(next)) {
      result[i] = curr + next;
      result.splice(i + 1, 1);
    } else {
      i++;
    }
  }

  // Phase 2: Fix unquoted commas in text fields (heuristic)
  while (result.length > targetCount) {
    let bestIdx = -1;
    let highestScore = -1;

    for (let j = 0; j < result.length - 1; j++) {
      const score = calculateMergeScore(result[j], result[j + 1]);
      if (score > highestScore) {
        highestScore = score;
        bestIdx = j;
      }
    }

    if (bestIdx !== -1 && highestScore > 0) {
      result[bestIdx] = result[bestIdx] + ", " + result[bestIdx + 1];
      result.splice(bestIdx + 1, 1);
    } else {
      // Fallback: if we still have extra columns and it's a small surplus, 
      // assume they belong to the last column (common for descriptions/addresses)
      if (result.length > targetCount && result.length <= targetCount + 2) {
        const lastIdx = targetCount - 1;
        const merged = result.slice(lastIdx).join(", ");
        return [...result.slice(0, lastIdx), merged];
      }
      break; 
    }
  }
  
  return result;
}

function createError(message: string, line: number, key?: string, context?: string): ToonParseError {
  const error = new Error(`TOON Decode Error (Line ${line}): ${message}`) as ToonParseError;
  error.line = line;
  error.key = key;
  error.context = context;
  return error;
}
