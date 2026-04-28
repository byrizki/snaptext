/**
 * TOON format rules — shared across all prompts.
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
# BEFORE writing any object array, do these steps:
#   STEP 1 — Count the columns in the image table header. That number is C.
#   STEP 2 — Count ALL data rows visible in the image. That number is N.
#   STEP 3 — Declare key[N]{col1,...,colC}: then write exactly N rows,
#             each with exactly C comma-separated values.
line_items[2]{id,description,qty,unit_price,total}:
  1,Widget A,2,15.00,30.00
  2,Widget B,1,25.00,25.00

### Quoting — MANDATORY double-quote rule
You MUST wrap any string value in double quotes if it contains a comma, colon, or newline.
Failure to quote such strings WILL corrupt the parser. No exceptions.

#### Flat array — element with a comma MUST be quoted
tags[3]: "hello, world","foo,bar",plain

#### Scalar value — value with a comma MUST be quoted
notes: "Thank you for your order, please pay within 30 days."
address: "123 Main St, Suite 400"

#### Object array row — quote ONLY the cell that contains a comma
line_items[2]{id,description,qty,unit_price,total}:
  1,"Widget A, Special Edition",2,15.00,30.00
  2,Widget B,1,25.00,25.00

#### Value with a newline — MUST be quoted
notes[2]: "hello, world","line1\nline2"

### Important rules
- Numbers unquoted: total: 1250.00  NOT  total: "1250.00"
- Booleans unquoted: active: true  NOT  active: "true"
- Null unquoted: value: null  NOT  value: "null"
- Array count mandatory: tags[3]: a,b,c  NOT  tags: a,b,c
- Object arrays MUST have {headers}: items[2]{id,name}:  NOT  items[2]:
- Row count MUST match [N]: count ALL rows in the image FIRST, then set [N]. Write every single row — do not stop early.
- Header count MUST match columns: count the image header columns FIRST, then declare exactly that many in {…}. Every row MUST have the same number of comma-separated values as there are headers.
- Headers must NEVER be quoted: {id,description,total}  NOT  {"id","description","total"}
- COMMA IN VALUE → MUST QUOTE: notes: "Acme Corp, Inc."  NOT  notes: Acme Corp, Inc.
- COMMA IN ARRAY CELL → MUST QUOTE: 1,"Widget A, Pro",2  NOT  1,Widget A, Pro,2
- No backticks, no markdown fences, no preamble, no trailing text. Output RAW TOON.`;

/**
 * Shared output example used in both OCR and text-extraction prompts.
 */
const EXTRACTION_EXAMPLE = `## OUTPUT EXAMPLE

# Plain scalars — no quotes needed unless the value contains a comma, colon, or newline
document_type: invoice
document_id: INV-2023-001
date: 2023-10-27
is_paid: false
total_amount: 1040.50
currency: USD

document_metadata:
  readability_score: 95
  data_usability_score: 98

# Nested objects — plain string values, no quotes needed
issuer:
  name: Acme Corp
  tax_id: US123456789
  phone: +1-555-0199
  address:
    street: 123 Tech Lane
    city: San Francisco
    state: CA
    zip: 94105
    country: USA

recipient:
  name: Global Logistics Ltd
  address:
    city: London
    country: UK

# Object array — row 1: description contains a comma → quoted; others plain
items[3]{id,description,quantity,unit_price,total}:
  1,"Premium Widget, Special Edition",2,500.00,1000.00
  2,Shipping,1,40.50,40.50
  3,Tax Adjustment,1,0.00,0.00

# Object array — bank names contain no comma → plain; account numbers plain
additional_accounts[2]{bank_name,account_no,currency}:
  JPMorgan Chase,88273645,USD
  Barclays Bank,UK-99283,GBP

# Flat array — plain tags, no commas inside values → no quotes
tags[3]: urgent,electronics,b2b

# Scalar — value contains a comma → MUST be quoted
notes: "Thank you for your business. Please pay within 30 days."`;

/**
 * Shared extraction instruction steps.
 */
function buildExtractionInstructions(): string {
  const readVerb = "read the entire image";
  const skipCondition =
    "the page is primarily terms and conditions, dense legal jargon, or large unstructured text blocks without key-value business data";
  const metadataNote =
    "assessing the visual quality and structured data value of the page";
  const noContentNote =
    "the page has NO readable content or lacks useful structured data";

  return `## INSTRUCTIONS

1. Carefully ${readVerb} before writing anything.
2. Identify all sections: header, parties, line items, totals, notes, footer.
3. Extract ONLY useful, structured business data. EXCLUDE generic page headers/footers (e.g. "Page 1 of 2"), unreadable text, watermarks, or boilerplate disclaimers.
4. Group extracted data into logical nested structures using snake_case keys.
5. DECOMPOSE combined data into granular fields (e.g., split address into street/city/state/zip, separate currency from amount).
6. DO NOT TRANSLATE — extract text exactly as it appears in its original language.
7. IF ${skipCondition}, return exactly \`empty: true\` and stop.
8. Include a \`document_metadata\` object with \`readability_score\` (0-100) and \`data_usability_score\` (0-100) ${metadataNote}.
9. For EVERY table in the document, follow this sequence before writing:
   a. Count the columns in the image header row → that is C. Declare exactly C headers in {…}. Do NOT quote headers.
   b. Count ALL data rows visible in the image → that is N. Set [N] to that exact count.
   c. Write EVERY row completely — do NOT stop early. Each row MUST have exactly C comma-separated values.
   d. If any cell value contains a comma, wrap ONLY that cell in double quotes.
10. Do NOT quote plain scalar values that contain no comma, colon, or newline.
11. Output ONLY TOON — nothing before or after.

If ${noContentNote}: output exactly \`empty: true\``;
}

/**
 * OCR extraction system prompt — used for vision model page scanning.
 */
export function buildOcrSystemPrompt(toonSchemaTemplate?: string): string {
  const schemaInstruction = toonSchemaTemplate
    ? `\n## REQUIRED SCHEMA\n\nYou MUST extract data conforming EXACTLY to the following TOON structure.\n\n\`\`\`\n${toonSchemaTemplate}\n\`\`\`\n\n> **ALWAYS append** a \`document_metadata\` block (\`readability_score\` + \`data_usability_score\`) after the schema fields, even when a custom schema is provided.\n`
    : "";

  return `You are a document OCR engine. Read the document image and output ALL visible data in TOON format.${schemaInstruction}

${TOON_RULES}

---

${EXTRACTION_EXAMPLE}

---

${buildExtractionInstructions()}`;
}
