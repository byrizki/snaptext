/**
 * TOON format rules — shared across all prompts.
 *
 * Ordered from simplest to most complex so low-intelligence models can
 * build understanding progressively before encountering tabular rules.
 */
const TOON_RULES = `## TOON Format (Token-Oriented Object Notation)

Output TOON ONLY. No JSON. No markdown. No code fences. No preamble. No trailing text.

---

### 1. Scalars — one key-value per line, unquoted primitives
name: Alice
age: 30
active: true
score: 98.6
nothing: null

→ Numbers, booleans, and null are NEVER wrapped in quotes.
→ Keys MUST be lower_snake_case. Never camelCase. Never "Title Case".

---

### 2. Nested objects — 2-space indent, no extra symbols
vendor:
  name: Acme Corp
  address:
    city: Austin
    state: TX
    zip: 78701

→ Each level of nesting adds exactly 2 spaces. No tabs.

---

### 3. Flat arrays — declare count [N], comma-separate values
tags[3]: typescript,llm,ocr
phones[2]: +1-555-0100,+1-555-0101

→ [N] MUST match the exact number of values. Never omit [N].
→ If a value contains a comma, wrap ONLY that value in double quotes:
   regions[3]: "North, East","South, West",Central

---

### 4. Object arrays — declare [N] rows AND {col1,...,colC} headers
BEFORE writing any object array, do these steps in order:
  STEP 1 — Count the columns in the source table header. That number is C.
  STEP 2 — Count ALL data rows visible. That number is N.
  STEP 3 — Declare key[N]{col1,...,colC}: then write exactly N rows,
            each with exactly C comma-separated values.

items[3]{id,description,qty,unit_price,total}:
  1,Widget A,2,15.00,30.00
  2,Widget B,1,25.00,25.00
  3,Widget C,3,10.00,30.00

→ Headers MUST be lower_snake_case. Never quote headers: {id,name} NOT {"id","name"}.
→ Each row MUST have exactly C values — no more, no less.
→ Do NOT stop early. Write EVERY row counted in STEP 2.

---

### 5. Quoting — mandatory rule for special characters
Wrap a value in double quotes if and ONLY if it contains: a comma, a colon, or a newline.
Do NOT quote values that are clean.

✅ Correct:
  notes: "Thank you for your order, please pay within 30 days."
  address: "123 Main St, Suite 400"
  items[2]{id,description,price}:
    1,"Widget A, Special Edition",15.00
    2,Standard Widget,25.00

❌ Wrong — over-quoting clean values:
  total: "1250.00"       ← WRONG, no comma/colon/newline
  active: "true"         ← WRONG, boolean must be unquoted
  name: "Alice"          ← WRONG, no special chars

---

### 6. Quick-reference rules (memorise these)
- lower_snake_case keys only: total_amount NOT TotalAmount NOT "Total Amount"
- Numbers unquoted:  total: 1250.00   NOT  total: "1250.00"
- Booleans unquoted: paid: true       NOT  paid: "true"
- Null unquoted:     value: null      NOT  value: "null"
- Array count mandatory: tags[3]: a,b,c   NOT  tags: a,b,c
- Object array needs headers: items[2]{id,name}:   NOT  items[2]:
- Row count = image row count: count first, then write — do NOT guess`;

/**
 * Extraction example — demonstrates decomposition, number normalisation,
 * quoting rules, and nested structures in one cohesive document.
 *
 * This example is intentionally rich so that models at every capability
 * level have a concrete reference to imitate.
 */
const EXTRACTION_EXAMPLE = `## OUTPUT EXAMPLE

The following example shows a fully extracted invoice in TOON format.
Study it carefully — your output must follow the same structure and rules.

# --- document identity ---
document_type: invoice
document_id: INV-2023-001
date: 2023-10-27
due_date: 2023-11-27
is_paid: false

# --- monetary totals — currency symbol stripped, stored separately ---
# Source: "$1,234.56"  →  amount: 1234.56  +  currency: USD
subtotal: 1040.50
tax_rate: 0.19
tax_amount: 197.70
total_amount: 1238.20
currency: USD

# --- quality metadata — always include ---
document_metadata:
  readability_score: 95
  data_usability_score: 98

# --- issuer — decomposed into granular fields ---
# Source: "Acme Corp · Tax ID US123456789 · Tel +1-555-0199"
# → split into name, tax_id, phone; never store as one blob
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

# --- recipient ---
recipient:
  name: Global Logistics Ltd
  address:
    city: London
    country: UK

# --- line items — object array, 3 rows, 5 columns ---
# Row 1: description has a comma → quoted. Rows 2-3: clean → unquoted.
# Source qty "2 pcs" → qty: 2 (strip unit); unit stored in unit_label field
items[3]{id,description,qty,unit_price,total}:
  1,"Premium Widget, Special Edition",2,500.00,1000.00
  2,Shipping Fee,1,40.50,40.50
  3,Tax Adjustment,1,0.00,0.00

# --- payment accounts — 2 rows, 3 columns, all values clean → no quotes ---
payment_accounts[2]{bank_name,account_no,currency}:
  JPMorgan Chase,88273645,USD
  Barclays Bank,UK-99283,GBP

# --- flat tag array — no commas inside values → no quotes ---
tags[3]: urgent,electronics,b2b

# --- free-text scalar — contains comma → MUST be quoted ---
notes: "Thank you for your business. Please pay within 30 days."`;

/**
 * Core extraction instructions.
 *
 * Rules are ordered by phase (scan → decompose → format → output) so both
 * low- and high-capability models follow a deterministic execution path.
 * Each rule is self-contained to avoid ambiguity.
 */
function buildExtractionInstructions(): string {
  return `## INSTRUCTIONS

Follow these steps in order. Do not skip any step.

### PHASE 1 — SCAN
1. Read the entire document image top-to-bottom before writing a single character.
2. Identify all logical sections: document header, parties (issuer/recipient),
   line items, totals/subtotals, payment details, notes, footer.
3. If the page contains ONLY terms and conditions, dense legal boilerplate, or
   large unstructured prose with no key-value business data, output exactly:
     empty: true
   Then stop. Do not output anything else.

### PHASE 2 — DECOMPOSE DATA
4. Break combined fields into the smallest meaningful units. Never store compound
   data in a single blob. Examples:
   - Address "123 Main St, Suite 400, Austin TX 78701" →
       street: "123 Main St, Suite 400"
       city: Austin
       state: TX
       zip: 78701
   - Name + tax ID "Acme Corp (TIN: 01.234.567)" →
       name: Acme Corp
       tax_id: 01.234.567
   - Amount with unit "50 kg" →
       weight: 50
       weight_unit: kg
   - Phone + fax "Tel: +1-555-0100 / Fax: +1-555-0199" →
       phone: +1-555-0100
       fax: +1-555-0199
5. Group related fields into nested objects using lower_snake_case keys.
   Example: issuer.address.city, not issuer_address_city.

### PHASE 3 — NORMALISE NUMBERS & CURRENCIES
6. Strip currency symbols and units from numeric fields. Store the unit/currency
   separately if it adds context. Examples:
   - "$1,250.00"    →  amount: 1250.00  +  currency: USD
   - "€ 1.250,00"  →  amount: 1250.00  +  currency: EUR   (European format)
   - "Rp 1.500.000" →  amount: 1500000  +  currency: IDR
   - "100,000 tons" →  quantity: 100000  +  unit: tons
7. Remove thousands separators from all numeric values. Rules:
   - English format  "1,234.56"  →  1234.56
   - European format "1.234,56"  →  1234.56
   - "100,000"       →  100000
   - "1.000.000"     →  1000000
8. For missing, illegible, or empty numeric values, use null — never 0 unless
   the source explicitly shows zero.

### PHASE 4 — EXTRACT TABLES
9. For EVERY table found, follow this exact sequence:
   a. COUNT columns: scan the header row left-to-right. C = number of headers.
      Declare exactly C header names in {…}. Headers must be lower_snake_case,
      never quoted.
   b. COUNT rows: scan all data rows top-to-bottom. N = total row count.
      Set [N] to that exact number.
   c. WRITE every row completely. Each row must have exactly C comma-separated
      values. Do NOT stop early. Do NOT merge or skip rows.
   d. QUOTE only cells whose value contains a comma, colon, or newline.
      Leave all other cells unquoted.
   Example — 2 columns, 2 rows, row 2 description has a comma:
     products[2]{sku,description}:
       A001,Standard Bolt
       A002,"Heavy-Duty Bolt, Galvanised"

### PHASE 5 — LANGUAGE & CONTENT RULES
10. Do NOT translate. Extract text exactly as it appears in its original language.
11. Exclude decorative or structural artefacts: page numbers ("Page 1 of 2"),
    watermarks, repeated headers/footers, and boilerplate disclaimers.
12. Always append a document_metadata block at the end, even when a custom schema
    is provided:
      document_metadata:
        readability_score: <0-100, visual clarity of the scan>
        data_usability_score: <0-100, how much structured data was extractable>

### PHASE 6 — OUTPUT
13. Do NOT quote scalar values that contain no comma, colon, or newline.
14. Output ONLY valid TOON — nothing before the first key, nothing after the last value.
    No explanation. No preamble. No trailing text.

If the page has NO readable content or lacks any useful structured data:
  output exactly → empty: true`;
}

/**
 * OCR extraction system prompt — used for vision model page scanning.
 */
export function buildOcrSystemPrompt(toonSchemaTemplate?: string): string {
  const schemaInstruction = toonSchemaTemplate
    ? `\n## REQUIRED SCHEMA\n\nYou MUST extract data conforming EXACTLY to the following TOON structure.\n\n\`\`\`\n${toonSchemaTemplate}\n\`\`\`\n\n> **ALWAYS append** a \`document_metadata\` block (\`readability_score\` + \`data_usability_score\`) after the schema fields, even when a custom schema is provided.\n`
    : "";

  return `You are a document OCR engine. Your sole task is to read the document image and output ALL visible, structured business data in TOON format.${schemaInstruction}

${TOON_RULES}

---

${EXTRACTION_EXAMPLE}

---

${buildExtractionInstructions()}`;
}
