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

        if (r >= count) {
          if ((headers && rowValues.length !== headers.length) || isKey) {
            break;
          }
        } else if (isKey) {
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
    const colonIndex = trimmedLine.indexOf(":");
    if (colonIndex !== -1) {
      const key = trimmedLine.substring(0, colonIndex).trim();
      const valueStr = trimmedLine.substring(colonIndex + 1).trim();

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

    throw createError(`Invalid TOON syntax. Expected 'key: value', 'key:', or 'key[N]:'.`, lineNum, undefined, trimmedLine);
  }

  return result;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
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
