/**
 * TOON format rules — shared across all prompts.
 */
const TOON_RULES = `## TOON Format (Token-Oriented Object Notation)

### Output contract
Output raw TOON only.
- First char = first char of first key. No text before.
- Last char = last char of last value. No text after.
- No greetings, explanations, or markdown code fences.

Correct:
  document_type: invoice

Forbidden:
  Here is the extracted TOON data:
  document_type: invoice

Forbidden:
  \`\`\`toon
  document_type: invoice
  \`\`\`

### Scalars
One key-value per line.
Keys: lower_snake_case.
Values: numbers, booleans, null NOT quoted.

Example:
  name: Alice
  age: 30
  active: true
  score: 98.6
  nothing: null

### Nested objects
Indent child keys exactly 2 spaces. No tabs.

vendor:
  name: Acme Corp
  address:
    city: Austin
    state: TX
    zip: 78701

### Flat arrays
Format: key[N]: val1,val2
If value has comma, wrap value in double quotes:
  regions[3]: "North, East","South, West",Central

Example:
  tags[3]: typescript,llm,ocr
  phones[2]: +1-555-0100,+1-555-0101

### Object arrays
Format: key[N]{col1,col2,...}:
Indent each row.
Headers: lower_snake_case, no quotes.
Row values: exactly C comma-separated values.
Strings in object arrays: always double-quoted.
Numbers, booleans: never quoted.
Never use YAML object-list syntax under a typed object array.

Example:
  items[3]{id,description,qty,unit_price,total}:
    "1","Widget A",2,15.00,30.00
    "2","Widget B",1,25.00,25.00
    "3","Widget C",3,10.00,30.00

Forbidden object-array YAML mix:
  items[1]{id,description,qty}:
    - id: "1"
      description: Widget A
      qty: 2

Correct replacement:
  items[1]{id,description,qty}:
    "1","Widget A",2

### Quoting
Outside object arrays: quote only if value contains comma, colon, or newline.
Inside object arrays: all strings must be double-quoted.
- Yes: notes: "Thank you, pay in 30 days."
- Yes: address: "123 Main St, Suite 400"
- No: total: "1250.00" (numeric, no quotes)
- No: active: "true" (boolean, no quotes)
- No: name: "Alice" (clean string, no quotes)

### Critical syntax guard
If a line has key[N]{...}: then every child line must be a CSV row with exactly the header count.
Do not put '- key: value' rows below key[N]{...}:.
Do not mix YAML mappings with TOON typed arrays.`;

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

Execute phases in order.

### Phase 1 — Visual Scan
Before output:
- Scan bold text → identify section headers.
- Scan grid lines, shading → identify tables.
- Scan indentation, spacing → identify hierarchy.
- Scan highlights → identify totals, flagged rows.

#### Relevance Gate
Decide by page region, not whole page.

Useful data = prices, tariffs, totals, dates, IDs, names, codes, form fields, table/list rows.
Bad prose = terms, conditions, disclaimers, privacy text, consent text, warranty text, liability text, instructions, policy paragraphs, navigation, page numbers.

Rules:
- If useful data exists anywhere on page: extract useful data. Ignore bad prose.
- If useful data and bad prose both exist: extract useful data. Ignore bad prose only.
- If only bad prose exists: output exactly \`empty: true\`.
- If only cover, index, glossary, bibliography, blank, divider, foreword, preface, copyright, or navigation exists: output exactly \`empty: true\`.

Never copy bad prose into notes, description, remarks, content, terms, or conditions.
Never create rows from paragraphs.
Never discard useful data because terms/conditions appear on the same page.

### Phase 2 — Decompose Fields

#### Addresses
Split into subkeys: street, district, city, state, zip, country, po_box.
Do not combine. Omit missing fields.

Example: "123 Main St, Suite 400, Austin, TX 78701, USA" →
  address:
    street: "123 Main St, Suite 400"
    city: Austin
    state: TX
    zip: 78701
    country: USA

Example: "Jl. Sudirman No. 10 / Kec. Setiabudi, Jakarta Selatan 12920" →
  address:
    street: Jl. Sudirman No. 10
    district: Kec. Setiabudi
    city: Jakarta Selatan
    zip: 12920

Forbidden: address: "123 Main St, Suite 400, Austin, TX 78701"

#### Other Compound Fields
Split compound source data into separate keys:
- "Acme Corp (TIN: 01.234.567)" → name: Acme Corp, tax_id: 01.234.567
- "50 kg" → weight: 50, weight_unit: kg
- "Tel: +1-555-0100 / Fax: +1-555-0199" → phone: +1-555-0100, fax: +1-555-0199

Group related fields into nested objects with lower_snake_case keys.
Always nest: issuer.address.city. Never flatten: issuer_address_city.

### Phase 3 — Numbers & Currencies
Strip currency symbols and thousands separators. Store raw numbers only.
- "$1,250.00" → 1250.00
- "Rp 1.500.000" → 1500000
- "1.234,56" → 1234.56

Missing/illegible → null. Never use 0 unless source explicitly shows 0.

### Phase 4 — Tables
Follow steps exactly:
1. Count columns: Read headers left-to-right. C = total columns. Use lower_snake_case in {…}.
2. Count rows: Count data rows only. N = total. Set [N].
3. Write rows: Each row must have exactly C values. No skipping, no merging, no splitting.

String values with commas must be quoted: e.g. "Item A, B".

#### Multiple Tables
Keep distinct tables separate. Do not merge.
New table signs:
- Row index resets.
- Headers change.
- Divider line or section title appears.

Correct:
  table1[2]{...}:
  table2[3]{...}:
Forbidden:
  merged_table[5]{...}:

#### Sub-header / Category Rows
Headers or category rows spanning columns are NOT data. Do not count in [N]. Do not emit as rows.
Absorb label into data rows:
- Prefix description: "Emergency Room - Night Visit"
- Or use category column: category: night_visit
If column is numeric, all values must be numbers or null. If text occupies numeric cell (e.g. "HOLIDAY", "SUBTOTAL"), it is a sub-header or summary row. Drop it.

#### Multi-line Cells
Line with blank first column belongs to row above.
Collapse wrapped text with \\n in quotes:
  "A002","Heavy-Duty Bolt\\nGalvanised",50

#### Rotated Headers
Read vertical text top-to-bottom, then left-to-right.
Combine stacked headers into single lower_snake_case key:
  [Unit][Price] → unit_price

### Phase 5 — Visual Elements
- Stamps/Seals: stamp: APPROVED, stamp_date: 2024-03-15
- Handwritten text: handwritten_notes: "text" (or null)
- Checkboxes: key: true/false
- Highlighted rows: is_highlighted: true (if visual highlight present)
- Watermarks: document_status: VOID (skip "DRAFT"/"COPY")
- Logos/Signatures: has_signature: true

### Phase 6 — Language & Metadata
- Extract original text exactly. No translation.
- Ignore page numbers, repeating headers, boilerplate disclaimers.
- Always end with root-level document_metadata:
  document_metadata:
    readability_score: <0-100>
    data_usability_score: <0-100>

### Phase 7 — Output
Entire response must be raw TOON.
- No preamble/postamble.
- No markdown code blocks/fences.
- No comments/annotations.
Empty page:
  empty: true`;
}

/**
 * Schema-constrained extraction prompt.
 */
function buildSchemaPrompt(toonSchemaTemplate: string): string {
  return `<role>
Document data extractor with vision.
Extract image data to TOON matching schema.
</role>

<rules>
1. Output raw TOON only. No preamble, no explanation, no markdown fences.
2. Output keys MUST match schema keys exactly. Do not rename schema keys. Do not invent keys. Forbidden: outputting keys, properties, or variables not declared in the schema.
3. Replace type hints (<string>, <number>, etc.) with real values. No placeholders.
4. Schema keys are destination fields, not search terms. Map visible document content to closest schema fields by meaning.
5. Perform semantic matching: map source synonyms or different languages to target schema keys (e.g. map source text "biaya" or "fee" to schema key "tariffs").
6. Blank, unreadable, unrelated, or non-data structural page → output exactly "empty: true" and stop. Non-data structural pages include: table of contents (daftar isi), index (daftar indeks), cover/title page, copyright/hak cipta page, section divider, chapter break, foreword/preface/kata pengantar, glossary/glosarium, bibliography/daftar pustaka, blank pages, and any page containing only navigation or prose with no extractable data rows. Forbidden: outputting empty schema keys or arrays with count 0.
7. If schema array key exists and page contains matching rows → N must be > 0.
8. Column name mismatch → map closest fields by meaning, ignore extra columns, use null for missing schema fields. Do not skip rows.
9. Value type violation → preserve row, set violated value to null. Do not discard row.
10. Every non-empty response MUST end with document_metadata block. Scores are integers 0-100.
11. Forbidden: flattening nested arrays or objects (like tariffs[N]) into a single flat CSV row block. Always use the exact nested format with "-" indentation.
12. Forbidden: outputting raw JSON lists (like [...]) or JSON objects (like {...}) inside TOON cells or values.
13. Omit irrelevant data: If document content has no semantically matching schema field, ignore and do not extract it. Do not force-map unrelated data into existing schema keys.
14. For schema arrays written as key[N]{field1,field2}:, rows MUST be CSV-style only. Forbidden below that header: '- field1: value' or any YAML object mapping.
</rules>

<schema_mapping_procedure>
Do this silently before output:
1. Mark useful data regions.
2. Mark bad prose regions.
3. If useful data region exists, ignore bad prose regions and extract useful data.
4. If no useful data region exists, output exactly "empty: true" and stop.
5. Map each schema array to matching visible table/list rows.
6. Read field hints only as meaning hints. Do not output hint text.
7. Map row cells to schema fields:
   - category = section/group label.
   - name/description = item/service name only, not paragraph text.
   - rates/prices/values = numeric values with currency/separators removed.
   - type/code/class = visible code/class/unit; use null if missing.
8. Combine matching tables only when they mean the same schema array.
9. Keep relevant partial rows; use null for missing cells.
</schema_mapping_procedure>

<how_to_read_the_schema>
Replace schema placeholders with extracted values:

  Schema                      Output
  ────────────────────────    ────────────────────────────────────────
  name: <string>           →  name: John Smith
  total: <number>          →  total: 1250.00
  paid: <boolean>          →  paid: true
  ref: <string|null>       →  ref: null (if not in document)

Arrays: Replace N with actual row count.
Simple Array Example:
  Schema: items[N]{id,description,qty,price}:
  Output: items[2]{id,description,qty,price}:
            "1","Premium Widget",2,500.00
            "2","Shipping Fee",1,40.50

Typed arrays are not YAML lists. This is invalid and will fail:
  documents[1]{type,date,conclusion}:
    - type: Laporan Medis Awal
      date: 11/02
      conclusion: null
Correct:
  documents[1]{type,date,conclusion}:
    "Laporan Medis Awal","11/02",null

Nested Array Example:
  Schema: tariffs[N]:
            - item_category: <string>
              item_name: <string>
              item_rates[N]{rate_type,rate_value}:
  Output: tariffs[1]:
            - item_category: Consultation
              item_name: Specialist Visit
              item_rates[2]{rate_type,rate_value}:
                "basic",100000
                "vip",190000

Example Indonesian Kamar/Tariff Mapping:
  Source: Kamar Perawatan | Presiden Suite | Tarif Rp 4,800,000
  Output: tariffs[1]:
            - item_category: Kamar Perawatan
              item_name: Presiden Suite
              item_rates[1]{rate_type,rate_value}:
                "-",4800000

Nested Array Rules:
- Never flatten nested keys (e.g. tariffs[N]) into a single flat CSV-like header block.
- Never write JSON lists or JSON objects (like [...], {...}) inside TOON values.
- Indent each nested object with two spaces and start with "-".

Array Row Rules:
- Strings in CSV rows: wrap in double quotes.
- Numbers, booleans: do not quote.
- Missing cell: null (unquoted).

Clean numbers:
- Remove currency symbols and separators.
- "$1,250.00" → 1250.00
- "Rp 1.500.000" → 1500000
- "1.234,56" → 1234.56

Every non-empty response MUST end with document_metadata:
  document_metadata:
    readability_score: <0-100 integer>
    data_usability_score: <0-100 integer>
Never use decimals. Never omit document_metadata.
</how_to_read_the_schema>

<negative_examples>
BAD PAGE ONLY:
Source: "TERMS AND CONDITIONS / SYARAT DAN KETENTUAN" plus only cancellation/privacy/warranty paragraphs.
Output:
empty: true

MIXED PAGE:
Source: tariff rows at top, "TERMS AND CONDITIONS" paragraphs at bottom.
Output: tariff rows only. Do not output terms text. Do not output empty.

PROSE ONLY:
Source: long instructions or notes with no prices, dates, IDs, fields, or rows.
Output:
empty: true

FORBIDDEN:
notes: "Long terms and conditions paragraph..."
description: "Privacy and liability paragraph..."
</negative_examples>

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
Silently verify before output:
- Raw TOON only. No markdown fences. No markdown code blocks.
- Under every key[N]{...}: header, each row is one CSV line with exactly the same number of values as headers.
- No '- key: value' YAML rows under typed arrays.
- Terms/conditions/disclaimers/instructions/prose-only pages output exactly \`empty: true\`.
- Mixed pages keep useful data and ignore only the terms/disclaimer/prose sections.
- No large paragraph text is stored in description/notes/remarks/terms/conditions fields.
- Non-empty response ends with document_metadata block.
- document_metadata has both readability_score and data_usability_score as whole numbers (0 to 100).
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
Document intelligence engine with vision.
</role>

<output_constraints>
Response MUST be raw TOON only.
- No preamble, no explanation, no markdown code fences.
- Start at first key character. End at last value character.
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
