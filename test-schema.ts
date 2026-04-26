import { jsonSchemaToToon } from "./lib/schema-to-toon";

const schema = {
  type: "object",
  properties: {
    vendorName: { type: "string", description: "Name of the vendor" },
    totalAmount: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          price: { type: "number" }
        }
      }
    }
  }
};

console.log(jsonSchemaToToon(schema));
