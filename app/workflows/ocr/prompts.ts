/**
 * TOON format rules — shared across all prompts.
 */
const TOON_RULES = `## TOON Format (Token-Oriented Object Notation)

### Output contract
Your response MUST be raw TOON and nothing else.
- First character = first character of the first key. Nothing before it.
- Last character = last character of the last value. Nothing after it.
- No greetings, no explanations, no "Here is the extracted data:", no code fences.

WRONG:
  Here is the extracted TOON data:
  document_type: invoice

WRONG:
  \`\`\`toon
  document_type: invoice
  \`\`\`

CORRECT:
  document_type: invoice

### Scalars
One key-value per line. Numbers, booleans, and null stay unquoted.
Keys are always lower_snake_case.

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

If a value contains a comma, wrap only that value in double quotes:
  regions[3]: "North, East","South, West",Central


### Object arrays
Declare [N] rows AND {col1,...,colC} headers, then write one indented row per record.

items[3]{id,description,qty,unit_price,total}:
  "1","Widget A",2,15.00,30.00
  "2","Widget B",1,25.00,25.00
  "3","Widget C",3,10.00,30.00

Headers must be lower_snake_case and never quoted.
Every row must have exactly C values — no more, no less.
ALL string values in object arrays MUST be wrapped in double quotes.
Numeric and boolean values remain unquoted.

### Quoting
Outside object arrays: quote only when the value contains a comma, colon, or newline.
Inside object arrays: ALL strings must be double-quoted, always.

CORRECT: notes: "Thank you for your order, please pay within 30 days."
CORRECT: address: "123 Main St, Suite 400"
WRONG:   total: "1250.00"   -- numeric, don't quote
WRONG:   active: "true"     -- boolean, never quote
WRONG:   name: "Alice"      -- clean string outside array, don't quote`;

/**
 * A single, rich worked example the model can imitate.
 */
const EXTRACTION_EXAMPLE = `## Output Example

document_type: invoice
document_id: INV-2023-001
date: 2023-10-27
due_date: 2023-11-27
is_paid: false
subtotal: 1040.50
tax_rate: 0.19
tax_amount: 197.70
total_amount: 1238.20
currency: USD
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
recipient:
  name: Global Logistics Ltd
  address:
    city: London
    country: UK
items[3]{id,description,qty,unit_price,total}:
  "1","Premium Widget, Special Edition",2,500.00,1000.00
  "2","Shipping Fee\nDomestic Only",1,40.50,40.50
  "3","Tax Adjustment",1,0.00,0.00
payment_accounts[2]{bank_name,account_no,currency}:
  "JPMorgan Chase","88273645","USD"
  "Barclays Bank","UK-99283","GBP"
quarterly_revenue[1]{q1,q2,q3}:
  120000,145000,98000
tags[3]: urgent,electronics,b2b
notes: "Thank you for your business. Please pay within 30 days."
consultation_fees[3]{no,description,ed,opd,basic,standard,vip}:
  1,"CONSULTATION SPECIALIST IPD VISIT",null,null,100000,155000,190000
  2,"CONSULTATION NUTRITIONIST",null,50000,null,50000,50000
  3,"CONSULTATION SPECIALIST OPD",null,200000,null,null,null
surgeon_operator_fees[2]{no,procedure,ed,opd,basic,standard,vip}:
  1,"DOKTER OPERATOR TABLE TARIF I_1",750000,580000,580000,750000,1200000
  2,"DOKTER OPERATOR TABLE TARIF I_2",1575000,1218000,1218000,1575000,2520000
ed_fees[2]{no,description,category,ed,opd}:
  1,"ED CONSULTATION I_1","day",200000,200000
  2,"ED CONSULTATION I_1","night_sunday_holiday",250000,250000
document_metadata:
  readability_score: 95
  data_usability_score: 98`;

function buildExtractionInstructions(): string {
  return `## Extraction Pipeline

Work through these phases in order.

### Phase 1 — Visual Scan
Before writing any data:
- Locate bold text → section headers.
- Locate grid lines, shading → tables.
- Note indentation and whitespace → hierarchy.
- Note colour highlights → totals or flagged rows.

If the document is a plain letter or wall of text with no structured data:
  empty: true
Stop there. Output nothing else.

### Phase 2 — Decompose Fields

#### Addresses — always split into granular subkeys
Supported fields: street, district, city, state, zip, country, po_box
Omit any field not present in the source.

"123 Main St, Suite 400, Austin, TX 78701, USA" →
  address:
    street: "123 Main St, Suite 400"
    city: Austin
    state: TX
    zip: 78701
    country: USA

"Jl. Sudirman No. 10 / Kec. Setiabudi, Jakarta Selatan 12920" →
  address:
    street: Jl. Sudirman No. 10
    district: Kec. Setiabudi
    city: Jakarta Selatan
    zip: 12920

WRONG: address: "123 Main St, Suite 400, Austin, TX 78701"

#### Other compound fields
- "Acme Corp (TIN: 01.234.567)" → name: Acme Corp + tax_id: 01.234.567
- "50 kg" → weight: 50 + weight_unit: kg
- "Tel: +1-555-0100 / Fax: +1-555-0199" → phone: +1-555-0100 + fax: +1-555-0199

Group related fields into nested objects with lower_snake_case keys.
Use issuer.address.city — never flat keys like issuer_address_city.

### Phase 3 — Numbers and Currencies
Strip currency symbols and thousands separators. Store raw numbers.

"$1,250.00"    → amount: 1250.00, currency: USD
"€ 1.250,00"  → amount: 1250.00, currency: EUR
"Rp 1.500.000" → amount: 1500000, currency: IDR
"1,234.56"     → 1234.56
"1.234,56"     → 1234.56

Missing or illegible: null. Never use 0 unless the source shows a zero.

### Phase 4 — Tables

**Step A — Count columns.** Read header row left-to-right. C = number of columns. Use lower_snake_case in {…}.
**Step B — Count rows.** Count all data rows. N = total. Set [N].
**Step C — Write every row.** Each row must have exactly C values. No skipping, no merging, no splitting.

String cells with commas must be quoted: "Widget A, B" counts as one value.

#### Multiple tables on one page
Each distinct table gets its own TOON key — never merge them.

Signs of a separate table:
- Row numbering resets.
- New header row with different columns appears.
- Bold divider line or section title between tables.

CORRECT — two separate arrays:
  consultation_fees[45]{no,description,opd,ed,basic,...}:
    ...
  surgeon_operator_fees[19]{no,procedure,opd,ed,basic,...}:
    ...

WRONG — merged:
  items[64]{no,description,opd,ed,...}:
    ...

#### Sub-header / category rows
Rows that span columns as labels are NOT data rows. Don't count them in [N], don't emit them.

Absorb the label into subsequent rows:
- Prefix the description: "ED CONSULTATION I_1 - NIGHT/SUNDAY/HOLIDAY"
- Or add a category column: category: night_sunday_holiday

Once a column is numeric, every value must be a number or null.
If you find text where a price belongs — day names, "HOLIDAY", "REPORT & CONSULTATION" — it's a sub-header row. Drop it.

#### Multi-line cells
A blank first column on a visual line means it belongs to the row above.
Collapse wrapped text with \\n inside a quoted string:

  Source:
    | A002 | Heavy-Duty Bolt      | 50 |
    |      | Galvanised, Grade 8  |    |
  → A002,"Heavy-Duty Bolt\nGalvanised, Grade 8",50

#### Rotated / vertical column headers
Read top-to-bottom as plain text, then list left-to-right.
Stacked multi-word headers → one snake_case field:
  [Unit][Price] → unit_price

### Phase 5 — Visual Elements
- Stamps and seals: stamp: APPROVED, stamp_date: 2024-03-15
- Handwritten notes: handwritten_notes: <text or null>
- Checkboxes: express_delivery: true
- Highlighted rows: is_highlighted: true (only clearly highlighted ones)
- Watermarks: document_status: VOID (skip "DRAFT", "COPY")
- Logos / signatures: has_signature: true

### Phase 6 — Language and Metadata
- Extract text exactly as it appears. No translation.
- Ignore page numbers, repeated headers, boilerplate disclaimers.
- Always end with a root-level document_metadata block:

document_metadata:
  readability_score: <0–100>
  data_usability_score: <0–100>

### Phase 7 — Output
Your entire response is the TOON document.
- No text before the first key.
- No text after the last value.
- No markdown code fences.
- No inline comments or annotations.

Empty or useless page:
  empty: true`;
}

/**
 * Schema-constrained extraction prompt.
 * Used when a JSON schema is provided — model fills in only the declared keys.
 */
function buildSchemaPrompt(toonSchemaTemplate: string): string {
  return `<role>
You are a document data extractor with vision capabilities.
Extract data from the document image and output it as TOON following the schema below.
</role>

<critical_rules>
1. Output raw TOON only — no preamble, no explanation, no code fences.
2. Output the schema keys as the final TOON keys. Do not invent new output keys.
3. The schema shows TYPE HINTS like <string>, <number>, <boolean>. Do NOT copy them into your output.
   Replace each placeholder with the actual value you read from the document.
4. The schema keys are NOT search terms. They are destination fields. First read the document visually, then map visible content into the closest schema fields by meaning.
5. Use semantic matching across languages and synonyms. Examples: tariff, tarif, biaya, harga, price, fee, rate, room charge, layanan, kamar, administrasi can all match a schema key named tariffs.
6. Empty output is rare. Only output exactly "empty: true" when the page is blank/unreadable OR contains no structured visible data at all. If there is any visible table/list with names and prices/rates/fees, output rows.
7. Do NOT output array_name[0] plus metadata as an empty result. Empty output is only "empty: true".
8. If an array key exists and the page has any table/list of compatible records, [N] must be greater than 0.
9. If document columns differ from schema fields: map closest columns, ignore extra columns, and use null for missing schema fields. Never return empty just because column labels differ.
10. If a value violates the schema type, preserve the row and set only that value to null. Do not drop the whole row or output empty.
11. For every non-empty extraction, document_metadata is mandatory even if the source document has no explicit metadata. It is your quality assessment of the page, not copied source text.
12. Never end immediately after an extracted object or array. The final root-level block must be document_metadata with both scores present.
</critical_rules>

<schema_mapping_procedure>
Before writing output, do this silently:
1. Identify all visible tables/lists and their section headings.
2. For each schema array, choose the visible table/list with the closest meaning, not exact label text.
3. For each row, map cells into schema fields:
   - category fields: section heading or group label.
   - name/description fields: service name, item name, room type, procedure, or line description.
   - rate/price/value fields: tariff/price/fee/amount columns after stripping currency and separators.
   - type/code/class fields: code, class, unit, room class, tariff type, or "standard" when no label exists.
4. If multiple visible sections match one schema array, concatenate them into the same array and keep the section heading in the category field.
5. Prefer partial extraction over empty output. A row with one null field is better than missing the row.
</schema_mapping_procedure>

<how_to_read_the_schema>
Each line in the schema is a key with a type hint. Fill in the real value:

  Schema line          Your output
  ─────────────────    ─────────────────────────
  name: <string>    →  name: John Smith
  total: <number>   →  total: 1250.00
  paid: <boolean>   →  paid: true
  ref: <string|null> → ref: null          (if not found in document)

For simple object arrays the comment shows column types. Replace N with actual row count:

  Schema:   items[N]{id,description,qty,price}: # {id:<"string">, description:<"string">, qty:<number>, price:<number>}
  Output:   items[2]{id,description,qty,price}:
              "1","Premium Widget",2,500.00
              "2","Shipping Fee",1,40.50

For nested object arrays, use one "-" item per row and keep nested keys indented:

  Schema:   tariffs[N]:
              - item_category: <string>
                item_name: <string>
                item_rates[N]{rate_type,rate_value}: # {rate_type:<"string">, rate_value:<integer>}
  Output:   tariffs[1]:
              - item_category: Consultation
                item_name: Specialist Visit
                item_rates[2]{rate_type,rate_value}:
                  "basic",100000
                  "vip",190000

Indonesian tariff tables also match this schema. Use the section title as item_category, service/room name as item_name, and put the code/class/price column into item_rates:

  Source:   Kamar Perawatan | Presiden Suite | Kode - | Tarif Rp 4,800,000
  Output:   tariffs[1]:
              - item_category: Kamar Perawatan
                item_name: Presiden Suite
                item_rates[1]{rate_type,rate_value}:
                  "-",4800000

Rules for array rows:
  - String columns in CSV rows: always wrap in double quotes
  - Number and boolean columns: never quote
  - Missing cell: null (unquoted)

Numbers: strip currency symbols and thousands separators.
  "$1,250.00" → 1250.00     "Rp 1.500.000" → 1500000     "1.234,56" → 1234.56

document_metadata is always the last key in the output and must contain exactly both fields:
  readability_score: visual/text legibility score from 0 to 100
  data_usability_score: confidence that extracted structured data is complete and usable, from 0 to 100

Metadata scores are whole numbers from 0 to 100. Never use fractions like 0.5. If you are unsure, estimate conservatively; do not omit the block.
</how_to_read_the_schema>

<syntax_rules>
${TOON_RULES}
</syntax_rules>

<schema>
${toonSchemaTemplate}
document_metadata:
  readability_score: <number 0-100> # REQUIRED, final root-level block
  data_usability_score: <number 0-100> # REQUIRED, final field in the response
</schema>

<final_output_checklist>
Before sending your answer, silently verify:
- The response is raw TOON only, with no markdown fences.
- If the page is not exactly empty: true, the last root-level key is document_metadata.
- document_metadata contains both readability_score and data_usability_score as whole numbers from 0 to 100.
</final_output_checklist>`;
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
You are a document intelligence engine with vision capabilities.
</role>

<output_constraints>
Your response MUST be raw TOON (Token-Oriented Object Notation) only.
- No preamble, no explanations, no markdown code fences.
- First character = first key. Last character = last value.
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
