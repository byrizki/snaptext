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
# Formatting: key[N]{header1,header2}:
# Followed by N lines of comma-separated values (CSV style)
line_items[2]{id,description,qty,unit_price,total}:
  1,Widget A,2,15.00,30.00
  2,Widget B,1,25.00,25.00

### Quoting — quote values containing commas, colons, or newlines
notes[2]: "hello, world","line1\nline2"

### Important rules
- Numbers unquoted: total: 1250.00  NOT  total: "1250.00"
- Booleans unquoted: active: true  NOT  active: "true"
- Null unquoted: value: null  NOT  value: "null"
- Array count mandatory: tags[3]: a,b,c  NOT  tags: a,b,c
- Object arrays MUST have {headers}: items[2]{id,name}:  NOT  items[2]:
- Row count MUST match [N]: if line_items[3] is declared, write EXACTLY 3 rows.
- Header count MUST match columns: if {id,name} is declared, each line MUST have 2 values.
- No backticks, no markdown fences, no preamble, no trailing text. Output RAW TOON.`;

/**
 * Shared output example used in both OCR and text-extraction prompts.
 */
const EXTRACTION_EXAMPLE = `## OUTPUT EXAMPLE

document_type: "invoice"
document_id: "INV-2023-001"
date: "2023-10-27"
is_paid: false
total_amount: 1040.50
currency: "USD"

document_metadata:
  readability_score: 95
  data_usability_score: 98

issuer:
  name: "Acme Corp"
  tax_id: "US123456789"
  phone: "+1-555-0199"
  address:
    street: "123 Tech Lane"
    city: "San Francisco"
    state: "CA"
    zip: "94105"
    country: "USA"

recipient:
  name: "Global Logistics Ltd"
  address:
    city: "London"
    country: "UK"

items[3]{id, description, quantity, unit_price, total}:
  1, "Premium Widget", 2, 500.00, 1000.00
  2, "Shipping", 1, 40.50, 40.50
  3, "Tax Adjustment", 1, 0.00, 0.00

additional_accounts[2]{bank_name, account_no, currency}:
  "JPMorgan Chase", "88273645", "USD"
  "Barclays Bank", "UK-99283", "GBP"

tags[3]: "urgent", "electronics", "b2b"
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
4. Group the extracted data into proper, logical nested structures (e.g., nested objects for vendor details, customer info, etc.) and use common, standardized structural naming conventions (e.g., snake_case keys).
5. DECOMPOSE complex or combined data into granular fields whenever possible (e.g., separate currency from amount, split addresses into street/city/state/zip, separate country codes from phone numbers).
6. DO NOT TRANSLATE the page content. Extract the text exactly as it appears in its original language.
7. IF ${skipCondition}, skip it immediately by returning exactly \`empty: true\`.
8. Include a \`document_metadata\` object containing \`readability_score\` (0-100) and \`data_usability_score\` (0-100) ${metadataNote}.
9. Write TOON from top to bottom.
10. Count line items precisely — set [N] correctly.
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
