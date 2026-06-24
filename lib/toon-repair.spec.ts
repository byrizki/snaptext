import { describe, expect, it } from "vitest";
import { repairCommonToonSyntax, tryDecodeToonWithRepair } from "./toon-repair";

const schema = `line_items[N]{item_type,code,name,category,generic_name,dosage,quantity,unit_price,total_price,frequency,duration,service_date}: # billing rows
documents[N]{type,date,conclusion}: # documents
document_metadata:
  readability_score: <number>
  data_usability_score: <number>`;

describe("toon repair", () => {
  it("converts YAML-style rows for schema typed arrays into CSV rows", () => {
    const raw = `line_items[2]:
  - item_type: MEDICAL_SUPPLY
    name: Ruang Tambahan - Suite (Non Pasien)
    total_price: 1700000
  - item_type: PROCEDURE
    name: Recovery Room
    total_price: 510000
provider_name: Mitra Keluarga Bekasi Timur
document_metadata:
  readability_score: 95
  data_usability_score: 90`;

    const result = tryDecodeToonWithRepair(raw, schema);

    expect(result.repaired).toBe(true);
    expect(result.rawToon).toContain(
      "line_items[2]{item_type,code,name,category,generic_name,dosage,quantity,unit_price,total_price,frequency,duration,service_date}:",
    );
    expect(result.data.line_items).toEqual([
      {
        item_type: "MEDICAL_SUPPLY",
        code: null,
        name: "Ruang Tambahan - Suite (Non Pasien)",
        category: null,
        generic_name: null,
        dosage: null,
        quantity: null,
        unit_price: null,
        total_price: 1700000,
        frequency: null,
        duration: null,
        service_date: null,
      },
      {
        item_type: "PROCEDURE",
        code: null,
        name: "Recovery Room",
        category: null,
        generic_name: null,
        dosage: null,
        quantity: null,
        unit_price: null,
        total_price: 510000,
        frequency: null,
        duration: null,
        service_date: null,
      },
    ]);
  });

  it("repairs the previous documents typed-array YAML edge case", () => {
    const raw = `documents[1]:
  - type: Laporan Medis Awal
    date: 11/02
    conclusion: null
document_metadata:
  readability_score: 40
  data_usability_score: 60`;

    const result = tryDecodeToonWithRepair(raw, schema);

    expect(result.repaired).toBe(true);
    expect(result.data.documents).toEqual([
      { type: "Laporan Medis Awal", date: "11/02", conclusion: null },
    ]);
  });

  it("keeps nested object arrays unchanged", () => {
    const raw = `tariffs[1]:
  - item_category: Kamar Perawatan
    item_name: Suite
    item_rates[1]{rate_type,rate_value}:
      "-",1700000
document_metadata:
  readability_score: 95
  data_usability_score: 90`;

    const result = repairCommonToonSyntax(raw, schema);

    expect(result.repaired).toBe(false);
    expect(result.toon).toBe(raw);
  });

  it("removes earlier duplicate document_metadata blocks and keeps final metadata", () => {
    const raw = `provider_name: Example Hospital
document_metadata:
  page_number: 4
  total_pages: null
line_items[1]{item_type,code,name,category,generic_name,dosage,quantity,unit_price,total_price,frequency,duration,service_date}:
  "PROCEDURE",null,"Room",null,null,null,1,1000,1000,null,null,null
document_metadata:
  readability_score: 95
  data_usability_score: 90`;

    const result = tryDecodeToonWithRepair(raw, schema);

    expect(result.repaired).toBe(true);
    expect(result.data.document_metadata).toEqual({
      readability_score: 95,
      data_usability_score: 90,
    });
  });
});
