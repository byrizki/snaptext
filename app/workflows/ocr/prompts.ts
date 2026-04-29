/**
 * TOON format rules — shared across all prompts.
 *
 * Covers syntax only. Edge cases (multi-line cells, rotated headers)
 * are handled in the extraction instructions so they aren't repeated.
 */
const TOON_RULES = `## TOON Format (Token-Oriented Object Notation)

Output TOON only — no JSON, no markdown, no code fences, no preamble, no trailing text.

### Scalars
One key-value per line. Numbers, booleans, and null stay unquoted.
Keys are always lower_snake_case — never camelCase or "Title Case".

name: Alice
age: 30
active: true
score: 98.6
nothing: null

### Nested objects
Indent child keys by exactly 2 spaces. No tabs.

vendor:
  name: Acme Corp
  address:
    city: Austin
    state: TX
    zip: 78701

### Flat arrays
Declare the count in [N], then comma-separate the values.

tags[3]: typescript,llm,ocr
phones[2]: +1-555-0100,+1-555-0101

[N] must match the exact number of values. If a value itself contains a comma,
wrap only that value in double quotes:
  regions[3]: "North, East","South, West",Central

### Object arrays
Declare [N] rows AND {col1,...,colC} headers, then write one indented row per record.

items[3]{id,description,qty,unit_price,total}:
  1,Widget A,2,15.00,30.00
  2,Widget B,1,25.00,25.00
  3,Widget C,3,10.00,30.00

Headers must be lower_snake_case and never quoted.
Every row must have exactly C values — no more, no less.

### Quoting
Wrap a value in double quotes only when it contains a comma, a colon, or a newline.
Everything else stays unquoted.

✅ notes: "Thank you for your order, please pay within 30 days."
✅ address: "123 Main St, Suite 400"
❌ total: "1250.00"   ← no special chars, don't quote
❌ active: "true"     ← boolean, never quote
❌ name: "Alice"      ← clean string, don't quote`;

/**
 * Extraction example — a single, rich worked output the model can imitate.
 */
const EXTRACTION_EXAMPLE = `## Output Example

Study this fully extracted invoice. Your output must follow the same structure.

document_type: invoice
document_id: INV-2023-001
date: 2023-10-27
due_date: 2023-11-27
is_paid: false

# monetary totals — currency symbol stripped, stored separately
subtotal: 1040.50
tax_rate: 0.19
tax_amount: 197.70
total_amount: 1238.20
currency: USD

document_metadata:
  readability_score: 95
  data_usability_score: 98

# issuer — compound source string fully decomposed into granular fields
issuer:
  name: Acme Corp
  tax_id: US123456789
  phone: +1-555-0199
  address:
    street: "123 Tech Lane, Suite 5"
    city: San Francisco
    state: CA
    zip: 94105
    country: USA

# recipient — only fields visible in the document are included
recipient:
  name: Global Logistics Ltd
  address:
    city: London
    country: UK

# line items — row 1 has a comma in description (quoted), row 2 has multi-line cell (collapsed with \\n)
items[3]{id,description,qty,unit_price,total}:
  1,"Premium Widget, Special Edition",2,500.00,1000.00
  2,"Shipping Fee\\nDomestic Only",1,40.50,40.50
  3,Tax Adjustment,1,0.00,0.00

payment_accounts[2]{bank_name,account_no,currency}:
  JPMorgan Chase,88273645,USD
  Barclays Bank,UK-99283,GBP

# vertical-header table — rotated headers read as plain text, left-to-right
quarterly_revenue[1]{q1,q2,q3}:
  120000,145000,98000

tags[3]: urgent,electronics,b2b

notes: "Thank you for your business. Please pay within 30 days."`;

/**
 * Core extraction instructions — phased pipeline from visual scan to final output.
 */
function buildExtractionInstructions(): string {
  return `## Instructions

Work through these phases in order. Don't skip any.

### Phase 1 — Visual Scan
Before writing anything, survey the entire document image:
- Bold or large text usually marks section headers, titles, or key labels.
- Grid lines, cell borders, and shading reveal table boundaries.
- Indentation and spatial grouping signal nested relationships.
- Colour highlights in cells often mark totals or flagged rows.

Identify the logical sections: document header, parties (issuer/recipient),
line items, totals, payment details, notes, and footer.

If the page contains only dense legal boilerplate or unstructured prose with
no key-value business data, output exactly:
  empty: true
Then stop.

### Phase 2 — Decompose Data
Break combined fields into the smallest meaningful units. Never store compound
data as a single blob — always split into granular child keys under a nested object.

#### Address decomposition (mandatory)
An address must always be broken into individual fields under an \`address:\` object.
Use only the fields that are actually visible; omit anything missing entirely.

Supported fields: street, district, city, state, zip, country, po_box

Examples:

"123 Main St, Suite 400, Austin, TX 78701, USA" →
  address:
    street: "123 Main St, Suite 400"
    city: Austin
    state: TX
    zip: 78701
    country: USA

"Jl. Sudirman No. 10 / Kec. Setiabudi, Jakarta Selatan 12920 / Indonesia" →
  address:
    street: Jl. Sudirman No. 10
    district: Kec. Setiabudi
    city: Jakarta Selatan
    zip: 12920
    country: Indonesia

"Musterstraße 5, 10115 Berlin, Deutschland" →
  address:
    street: Musterstraße 5
    zip: 10115
    city: Berlin
    country: Deutschland

❌ Never do this: address: "123 Main St, Suite 400, Austin, TX 78701"

#### Other decomposition
- Name + tax ID "Acme Corp (TIN: 01.234.567)" → name + tax_id as separate keys
- Amount with unit "50 kg" → weight: 50 + weight_unit: kg
- Phone + fax "Tel: +1-555-0100 / Fax: +1-555-0199" → phone + fax as separate keys

Group related fields under nested objects with lower_snake_case keys.
Use issuer.address.city — never flat keys like issuer_address_city.

### Phase 3 — Normalise Numbers & Currencies
Strip currency symbols and units from numeric fields. Store the unit or currency
in a sibling key when it adds context:
- "$1,250.00"    → amount: 1250.00 + currency: USD
- "€ 1.250,00"  → amount: 1250.00 + currency: EUR
- "Rp 1.500.000" → amount: 1500000 + currency: IDR

Remove thousands separators from all numbers:
- "1,234.56" → 1234.56
- "1.234,56" → 1234.56  (European)
- "100,000"  → 100000

For missing or illegible numeric values, use null — never 0 unless the source
explicitly shows zero.

### Phase 4 — Extract Tables
Detect tables visually using grid lines, column borders, alternating row shading,
or spatially aligned columns. For every table you find, follow this exact sequence:

**Step A — Count columns.** Scan the header row left-to-right. C = number of
columns. Declare exactly C lower_snake_case header names in {…}.

**Step B — Count rows.** Scan all data rows top-to-bottom. N = total logical
row count (see multi-line cell rule below). Set [N] to that count.

**Step C — Write every row.** Each row must have exactly C comma-separated values.
Don't stop early, don't merge separate rows, don't split one row.

**Quoting in tables:** quote only cells that contain a comma, colon, or newline.
Leave everything else unquoted.

#### Multi-line cells
A single table cell sometimes wraps across two or more visual lines. That's still
one cell in one row — don't emit extra rows for it.

How to tell: if the first column of a visual line is blank, that line belongs to
the row above. If it has a new value (new ID, date, etc.), it's a new row.

Collapse the wrapped text into a single quoted string using the \\\\n escape:
  Source:
    | A002 | Heavy-Duty Bolt      | 50 |
    |      | Galvanised, Grade 8  |    |
  → A002,"Heavy-Duty Bolt\\\\nGalvanised, Grade 8",50

#### Vertical or rotated column headers
Some tables print headers rotated 90° or stacked vertically. Ignore the rotation —
read each header top-to-bottom as plain text, then declare them left-to-right.

Stacked multi-word headers (each word on its own line) become one snake_case field:
  [Unit]  [Gross]
  [Price] [Margin]  → unit_price, gross_margin

Count data columns, not visual header lines, to determine C.

### Phase 5 — Visual Elements
You can see things that text-only OCR cannot. Handle these as follows:

- **Stamps & seals:** extract any text inside → stamp: APPROVED / stamp_date: 2024-03-15
- **Handwritten notes:** extract legible text under \`handwritten_notes\` or as
  \`<field>_handwritten\`. If illegible, use null.
- **Checkboxes:** represent as booleans → express_delivery: true (checked) / gift_wrap: false (empty)
- **Highlighted cells:** if a row is intentionally highlighted (totals, flagged items),
  add is_highlighted: true. Don't flag every row.
- **Watermarks:** ignore decorative ones ("DRAFT", "COPY"). Capture meaningful ones
  → document_status: VOID
- **Logos & signatures:** note presence only → has_signature: true / has_company_logo: true

### Phase 6 — Language & Content
- Do not translate. Extract text exactly as it appears in its original language.
- Skip decorative artefacts: page numbers, repeated headers/footers, boilerplate disclaimers.
- Always append a document_metadata block at the end:
    document_metadata:
      readability_score: <0-100, visual clarity>
      data_usability_score: <0-100, how much structured data was extractable>

### Phase 7 — Output
Output only valid TOON — nothing before the first key, nothing after the last value.

If the page has no readable content or no useful structured data:
  empty: true`;
}

/**
 * OCR extraction system prompt — used for vision model page scanning.
 */
export function buildOcrSystemPrompt(toonSchemaTemplate?: string): string {
  const schemaInstruction = toonSchemaTemplate
    ? `\n## Required Schema\n\nExtract data conforming exactly to this TOON structure:\n\n\`\`\`\n${toonSchemaTemplate}\n\`\`\`\n\n> Always append a \`document_metadata\` block (readability_score + data_usability_score) after the schema fields.\n`
    : "";

  return `You are a document intelligence engine with vision capability. You see the document image directly — use its visual layout, typography, borders, colours, and spatial structure to understand the document, not just the text.${schemaInstruction}

${TOON_RULES}

${EXTRACTION_EXAMPLE}

${buildExtractionInstructions()}`;
}
