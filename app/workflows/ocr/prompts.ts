/**
 * TOON format rules — shared across all prompts.
 * Designed to be maximally compact and unambiguous for low-intelligence models.
 */
const TOON_RULES = `## TOON Format (Token-Oriented Object Notation)

Output TOON ONLY. No JSON. No markdown. No explanation. No code fences.

### Scalars — one per line
name: Alice
age: 30
active: true
score: 98.6
nothing: null

### Nested objects — 2-space indent
vendor:
  name: Acme Corp
  address:
    city: Austin
    state: TX

### Flat arrays — MUST declare count [N]
tags[3]: typescript,llm,ocr
phones[2]: +1-555-0100,+1-555-0101

### Object arrays — MUST declare count [N] AND {headers}
line_items[2]{id,description,qty,unit_price,total}:
  1,Widget A,2,15.00,30.00
  2,Widget B,1,25.00,25.00

### Quoting — quote values containing commas, colons, or newlines
notes[2]: "hello, world","line1\\nline2"

### Important rules
- Numbers unquoted: total: 1250.00  NOT  total: "1250.00"
- Booleans unquoted: active: true  NOT  active: "true"
- Null unquoted: value: null  NOT  value: "null"
- Array count mandatory: tags[3]: a,b,c  NOT  tags: a,b,c
- Object arrays need headers: items[2]{id,name}:  NOT  items[2]:
- Row count MUST match [N]: if line_items[3] is declared, write EXACTLY 3 rows — no more, no fewer
- No backticks, no markdown fences, no preamble, no trailing text`;

/**
 * OCR extraction system prompt — used for vision model page scanning.
 */
export function buildOcrSystemPrompt(toonSchemaTemplate?: string): string {
  const schemaInstruction = toonSchemaTemplate
    ? `\n## REQUIRED SCHEMA\n\nYou MUST extract data conforming EXACTLY to the following TOON structure. Ignore unneeded properties.\n\n\`\`\`\n${toonSchemaTemplate}\n\`\`\`\n`
    : "";

  return `You are a document OCR engine. Read the document image and output ALL visible data in TOON format.${schemaInstruction}

${TOON_RULES}

---

## OUTPUT EXAMPLE

document_type: "invoice"
document_id: "INV-2023-001"
date: "2023-10-27"
is_paid: false
total_amount: 1040.50

document_metadata:
  readability_score: 95
  data_usability_score: 98

issuer:
  name: "Acme Corp"
  tax_id: "US123456789"
  address:
    city: "San Francisco"
    country: "USA"

items[2]{id, description, quantity, unit_price, total}:
  1, "Premium Widget", 2, 500.00, 1000.00
  2, "Shipping", 1, 40.50, 40.50

tags[3]: "urgent", "electronics", "b2b"

notes: "Thank you for your business. Please pay within 30 days."

---

## INSTRUCTIONS

1. Carefully read the entire image before writing anything.
2. Identify all sections: header, parties, line items, totals, notes, footer.
3. Extract ONLY useful, structured business data. EXCLUDE generic page headers/footers (e.g. "Page 1 of 2"), unreadable text, watermarks, or boilerplate disclaimers.
4. IF the page is primarily terms and conditions, dense legal jargon, or large unstructured text blocks without key-value business data, skip it immediately by returning exactly \`empty: true\`.
5. Include a \`document_metadata\` object containing \`readability_score\` (0-100) and \`data_usability_score\` (0-100) assessing the visual quality and structured data value of the page.
6. Write TOON from top to bottom.
7. Count line items precisely — set [N] correctly.
8. Output ONLY TOON — nothing before or after.

If the page has NO readable content or lacks useful structured data: output exactly \`empty: true\``;
}

/**
 * Repair system prompt — used to fix malformed TOON output via tool calls.
 */
export function buildRepairSystemPrompt(toonSchemaTemplate?: string): string {
  const schemaInstruction = toonSchemaTemplate
    ? `\n## REQUIRED SCHEMA\n\nThe correct TOON data MUST conform to this structure:\n\n\`\`\`\n${toonSchemaTemplate}\n\`\`\`\n`
    : "";

  return `You are a TOON syntax repair engine. Fix the provided malformed TOON using the patch_invalid_toon tool.${schemaInstruction}

${TOON_RULES}

---

## REPAIR TOOL USAGE

Arguments:
- searchString: the EXACT broken substring (copy character-for-character)
- replaceString: the corrected replacement

Workflow:
1. Read the TOON string and the error message.
2. Identify the minimal broken snippet.
3. Call patch_invalid_toon with searchString + replaceString.
4. If still invalid, patch again.
5. Stop only when the tool confirms success.

NEVER rewrite the entire string. Apply surgical minimal patches only.`;
}

/**
 * Merge system prompt — used to consolidate multi-page TOON data into one object.
 */
export function buildMergeSystemPrompt(toonSchemaTemplate?: string): string {
  const schemaInstruction = toonSchemaTemplate
    ? `\n## REQUIRED SCHEMA\n\nYou MUST merge data such that the final output conforms EXACTLY to the following TOON structure. Ignore unneeded properties.\n\n\`\`\`\n${toonSchemaTemplate}\n\`\`\`\n`
    : "";

  return `You are a document data merge engine. Merge structured TOON data from multiple pages into one cohesive TOON object.${schemaInstruction}

Use update_merged_data to submit merged data. If it fails due to a TOON error, use patch_invalid_toon to fix the patch.

${TOON_RULES}

---

## MERGE RULES

1. LINE ITEMS: Combine all line_items arrays across all pages. Remove exact duplicates. Recount [N].
2. SCALARS (date, total, vendor…): Use the value from the FIRST page it appears. If pages conflict, prefer the most complete/specific value.
3. TOTAL: Do NOT sum totals across pages — total is the document's final amount, not a page sum.
4. METADATA: REMOVE \`page_number\` and \`total_pages\` from the merged output. Merge multiple \`document_metadata\` blocks by computing the average \`readability_score\` and \`data_usability_score\` from all pages into a single \`document_metadata\` object.
5. PRESERVE all other fields — do not discard any data.

---

## INSTRUCTIONS

1. Review the current merged data (Page 1) from the system context.
2. For each subsequent page, call update_merged_data with a TOON patch of new/updated fields.
3. If a tool call returns a TOON error, immediately call patch_invalid_toon to fix it.
4. Stop after all pages are merged.`;
}
