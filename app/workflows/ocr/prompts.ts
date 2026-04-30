/**
 * TOON format rules — shared across all prompts.
 *
 * Covers syntax only. Edge cases (multi-line cells, rotated headers)
 * are handled in the extraction instructions so they aren't repeated.
 */
const TOON_RULES = `## TOON Format (Token-Oriented Object Notation)

### Output contract — read this first
Your response MUST be raw TOON and nothing else.
- Start immediately with the first key — zero words before it.
- End immediately after the last value — zero words after it.
- No greetings, no explanations, no "Here is the extracted data:", no "---", no code fences.

❌ WRONG — any of these will fail the parser:
  Here is the extracted TOON data:
  document_type: invoice
  ...

❌ WRONG:
  \`\`\`toon
  document_type: invoice
  \`\`\`

✅ CORRECT — first character of your response is the first character of the first key:
  document_type: invoice
  ...

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
  "1","Widget A",2,15.00,30.00
  "2","Widget B",1,25.00,25.00
  "3","Widget C",3,10.00,30.00

Headers must be lower_snake_case and never quoted.
Every row must have exactly C values — no more, no less.
STRICT RULE: For object arrays, ALL string values MUST be wrapped in double quotes. Numeric and boolean values remain unquoted.

### Quoting
For normal fields, wrap a value in double quotes only when it contains a comma, a colon, or a newline.
Inside object arrays, ALL strings must be double quoted.

✅ notes: "Thank you for your order, please pay within 30 days."
✅ address: "123 Main St, Suite 400"
❌ total: "1250.00"   ← no special chars, don't quote
❌ active: "true"     ← boolean, never quote
❌ name: "Alice"      ← clean string, don't quote (if not in an object array)`;

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

# line items — ALL string values in object arrays must be quoted, row 2 has multi-line cell (collapsed with \n)
items[3]{id,description,qty,unit_price,total}:
  "1","Premium Widget, Special Edition",2,500.00,1000.00
  "2","Shipping Fee\nDomestic Only",1,40.50,40.50
  "3","Tax Adjustment",1,0.00,0.00

payment_accounts[2]{bank_name,account_no,currency}:
  "JPMorgan Chase","88273645","USD"
  "Barclays Bank","UK-99283","GBP"

# vertical-header table — rotated headers read as plain text, left-to-right
quarterly_revenue[1]{q1,q2,q3}:
  120000,145000,98000

tags[3]: urgent,electronics,b2b

notes: "Thank you for your business. Please pay within 30 days."

# --- multiple tables on one page — each gets its own key and header ---
# First table: "CONSULTATION FEES" with 3 rows
consultation_fees[3]{no,description,ed,opd,basic,standard,vip}:
  1,"CONSULTATION SPECIALIST IPD VISIT",null,null,100000,155000,190000
  2,"CONSULTATION NUTRITIONIST",null,50000,null,50000,50000
  3,"CONSULTATION SPECIALIST OPD",null,200000,null,null,null

# Second table (different structure): "SURGEON OPERATOR FEES" with 2 rows
surgeon_operator_fees[2]{no,procedure,ed,opd,basic,standard,vip}:
  1,"DOKTER OPERATOR TABLE TARIF I_1",750000,580000,580000,750000,1200000
  2,"DOKTER OPERATOR TABLE TARIF I_2",1575000,1218000,1218000,1575000,2520000

# --- sub-header rows (NIGHT/SUNDAY/HOLIDAY) become a category, not data ---
# The source table has a spanning row "NIGHT / SUNDAY / HOLIDAY" above some rows.
# That label is absorbed into the description — not written as cell values.
ed_fees[2]{no,description,category,ed,opd}:
  1,"ED CONSULTATION I_1","day",200000,200000
  2,"ED CONSULTATION I_1","night_sunday_holiday",250000,250000`;

/**
 * Core extraction instructions. This is a phased pipeline from visual scan to final output.
 */
function buildExtractionInstructions(): string {
  return `## Instructions

Work through these phases in order. Don't skip any. I'm relying on you to do this right.

### Phase 1 — Visual Scan
Before you even think about writing data, look at the page. Really look at it.
- Where's the bold text? That's usually your section header.
- See any grid lines or shading? That's where the tables hide.
- Look at the indentation. Space isn't empty; it tells you what belongs to what.
- Colour isn't an accident. Highlighted cells usually scream "totals" or "flagged rows".

Figure out the layout first: header, parties, line items, totals, payment details, notes.

If you look at the page and it's just a wall of legal text or a generic letter with no structured data, don't try to extract things that aren't there. Just output exactly:
  empty: true
And stop. Seriously, just stop.

### Phase 2 — Decompose Data
I hate messy data. Break combined fields into the smallest possible units. Never give me a giant compound blob. Split it into granular child keys under a nested object.

#### Address decomposition (mandatory)
This isn't optional. Always break addresses down into individual fields under an \`address:\` object. Use only what you actually see. If a field is missing, leave it out entirely.

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
I need raw numbers. Strip currency symbols and units. If the unit adds context, put it in a sibling key:
- "$1,250.00"    → amount: 1250.00 + currency: USD
- "€ 1.250,00"  → amount: 1250.00 + currency: EUR
- "Rp 1.500.000" → amount: 1500000 + currency: IDR

Remove thousands separators from all numbers:
- "1,234.56" → 1234.56
- "1.234,56" → 1234.56  (European)
- "100,000"  → 100000

For missing or illegible numeric values, use null. Never use 0 unless the source actually shows a zero.

### Phase 4 — Extract Tables
Tables can be tricky. Look for grid lines, column borders, alternating row shading, or just spatially aligned columns. When you find one, follow this exact sequence:

**Step A — Count columns.** Scan the header row left-to-right. C = number of columns. Declare exactly C lower_snake_case header names in {…}.

**Step B — Count rows.** Scan all data rows top-to-bottom. N = total logical row count. Set [N] to that count.

**Step C — Write every row.** Each row must have exactly C comma-separated values. Don't stop early, don't merge separate rows, don't split one row.

**Quoting in tables:** quote only cells that contain a comma, colon, or newline. Leave everything else unquoted.

#### Multiple tables on one page
A single page often has several distinct tables. They might be different fee schedules or have totally different column structures. Never merge them into one giant array. Each table gets its own TOON object array with a descriptive key name.

How to spot separate tables:
- The row numbering resets.
- A new header row appears with different columns.
- There's a bold divider line, section title, or massive gap.
- The data type totally changes (e.g. consultations above, surgical fees below).

Give each table a unique key name. Don't reuse keys.

Example — two tables on the same page:
  Source has "CONSULTATION FEES" table (45 rows, 10 columns) followed by
  "SURGEON OPERATOR FEES" table (19 rows, 10 columns) with different headers.
  → Output as two separate arrays:
    consultation_fees[45]{no,description,opd,ed,basic,...}:
      ...
    surgeon_operator_fees[19]{no,surgeon_fee,opd,ed,basic,...}:
      ...

  ❌ WRONG — merging both into one array:
    items[64]{no,description,opd,ed,...}:
      ...

#### Sub-header and category rows
Many tables contain rows that aren't data at all. They act as dividers or category labels.
You can usually spot them because:
- They span across multiple columns with a single label (like "NIGHT / SUNDAY / HOLIDAY").
- They put day names or time periods in columns that normally hold numbers.
- Most of the cells are empty.

These are NOT data rows. Don't count them in [N] and don't emit them. Instead, attach the category label to the relevant data rows.

Approach 1 — Prefix the description of subsequent rows:
  Source table has a spanning row "NIGHT / SUNDAY / HOLIDAY" followed by fee rows.
  → Prefix each subsequent row's description:
    ed_consultation_night[3]{no,description,ed,opd,...}:
      13,"ED CONSULTATION I_1 - NIGHT/SUNDAY/HOLIDAY",250000,250000,...

Approach 2 — Add a category column:
  If there are lots of category sections, just add a \`category\` column:
    fees[10]{no,description,category,opd,ed,...}:
      13,ED CONSULTATION I_1,night_sunday_holiday,250000,0,...

Bottom line: never write a day name or category into a numeric column. If you see text where a price should be, it's almost certainly a sub-header. Skip it.

#### Column type consistency
Once a column is established as numeric (prices, quantities), every value in it must be a number or null.

If you find yourself trying to write a text string into a numeric column, stop. Ask yourself: is this a sub-header row? Almost always, yes.

Common signs you've misread a sub-header:
- "SUNDAY" or "HOLIDAY" in a price column.
- "0., 0., 0." crammed into a single value.
- "REPORT & CONSULTATION RMO" sitting where a fee should be.

When you spot these, drop the row. It's just a divider.

#### Multi-line cells
Sometimes a single cell wraps across a few visual lines. It's still one row. Don't emit extra rows for it.

If the first column of a visual line is blank, that line probably belongs to the row above it.

Collapse wrapped text into a single quoted string using \\\\n:
  Source:
    | A002 | Heavy-Duty Bolt      | 50 |
    |      | Galvanised, Grade 8  |    |
  → A002,"Heavy-Duty Bolt\\\\nGalvanised, Grade 8",50

#### Vertical or rotated column headers
Sometimes people print headers sideways. Ignore the rotation. Read them top-to-bottom as plain text, then list them left-to-right.

Stacked multi-word headers become one snake_case field:
  [Unit]  [Gross]
  [Price] [Margin]  → unit_price, gross_margin

Count the actual data columns, not the visual header lines.

### Phase 5 — Visual Elements
You can see things that regular OCR misses. Handle them like this:

- **Stamps & seals:** extract the text inside → stamp: APPROVED / stamp_date: 2024-03-15
- **Handwritten notes:** pull legible text under \`handwritten_notes\`. If it's unreadable, use null.
- **Checkboxes:** treat them as booleans → express_delivery: true
- **Highlighted cells:** if a row is clearly highlighted to draw attention, add is_highlighted: true. But don't flag every single row.
- **Watermarks:** ignore the boring ones ("DRAFT", "COPY"). Capture the ones that matter → document_status: VOID
- **Logos & signatures:** just confirm they're there → has_signature: true

### Phase 6 — Language & Content
- Don't translate anything. Extract text exactly as it appears.
- Ignore the noise: page numbers, repeated headers, boring disclaimers.
- Always add a document_metadata block at the very end (root level, no indentation):
document_metadata:
  readability_score: <number> # 0-100, visual clarity
  data_usability_score: <number> # 0-100, how much structured data was extractable

### Phase 7 — Output
Your entire response is the TOON document. Nothing else.

- Do NOT write a single word before the first key.
- Do NOT write anything after the last value. No sign-offs.
- Do NOT use markdown code fences.
- Do NOT add helpful comments.

If the page is empty or completely useless, your entire response is:
  empty: true`;
}

/**
 * Builds a compact prompt for strict schema extraction.
 * We leave out the complex examples here because weaker models get confused.
 * Giving them free-form examples ruins their ability to stick to a strict schema.
 */
function buildSchemaPrompt(toonSchemaTemplate: string): string {
  return `<role>
You are an expert document data extractor with advanced vision capabilities.
Your ONLY job is to fill in the exact schema provided based on the document image.
</role>

<core_principles>
1. Look at the actual image. Use visual layout, typography, borders, and whitespace to understand structure.
2. Maintain absolute precision. Extract text exactly as it appears.
3. Never guess or hallucinate. If data is missing or illegible, use null.
</core_principles>

<output_constraints>
Your response MUST be raw TOON (Token-Oriented Object Notation) only.
- No preamble, no explanation, no markdown code fences.
- Output EXACTLY the keys listed in the schema. Nothing more, nothing less.
- Every single schema key MUST appear in your output, even if it's null.
- FORBIDDEN: Do not invent keys. The schema is a strict ALLOWLIST.
- If the document is totally unrelated to the schema, output exactly: \`empty: true\` and then stop.
</output_constraints>

<syntax_rules>
${TOON_RULES}
</syntax_rules>

<schema_task>
Read the document image and output ONLY these keys, in this exact order:

${toonSchemaTemplate}
document_metadata: # REQUIRED
  readability_score: <number> # REQUIRED, min:0, max:100, visual clarity
  data_usability_score: <number> # REQUIRED, min:0, max:100, how much structured data was extractable
</schema_task>

<extraction_rules>
- Numbers: strip currency symbols and thousands separators ("Rp 1.500.000" → 1500000, "$1,250.00" → 1250.00).
- \`document_metadata\` is a required root object and is always the LAST key.
</extraction_rules>

<example_output>
invoice_number: INV-001
seller_name: Acme Corp
buyer_name: null
document_metadata:
  readability_score: 88
  data_usability_score: 75
</example_output>`;
}

/**
 * OCR extraction system prompt for vision model page scanning.
 * Uses a compact schema-only prompt when toonSchemaTemplate is provided.
 */
export function buildOcrSystemPrompt(toonSchemaTemplate?: string): string {
  if (toonSchemaTemplate) {
    return buildSchemaPrompt(toonSchemaTemplate);
  }

  return `<role>
You are an expert document intelligence engine with advanced vision capabilities.
</role>

<core_principles>
1. Look at the actual image. Use visual layout, typography, borders, and whitespace to understand structure, not just the raw text.
2. Be absolutely precise. Extract text exactly as it appears.
3. Never guess or hallucinate. If data is missing or illegible, use null.
</core_principles>

<output_constraints>
Your response MUST be raw TOON (Token-Oriented Object Notation) only.
- No preamble or greetings.
- No explanations or reasoning.
- No markdown code fences.
- Start immediately with the first key and end immediately after the last value.
</output_constraints>

<syntax_rules>
${TOON_RULES}
</syntax_rules>

<extraction_example>
${EXTRACTION_EXAMPLE}
</extraction_example>

<extraction_pipeline>
${buildExtractionInstructions()}
</extraction_pipeline>`;
}
