type JsonSchemaProp = Record<string, unknown>;

function buildCommentString(prop: JsonSchemaProp, isRequired: boolean = false): string {
  const parts: string[] = [];

  if (isRequired) parts.push("REQUIRED");
  if (prop.format) parts.push(`format:${prop.format}`);
  if (Array.isArray(prop.enum)) parts.push(`enum:${prop.enum.join("|")}`);
  if (prop.pattern) parts.push(`pattern:${prop.pattern}`);
  if (prop.minimum !== undefined) parts.push(`min:${prop.minimum}`);
  if (prop.maximum !== undefined) parts.push(`max:${prop.maximum}`);
  if (prop.description) parts.push(String(prop.description));

  return parts.join(", ");
}

function buildComment(prop: JsonSchemaProp, isRequired: boolean = false): string {
  const comment = buildCommentString(prop, isRequired);
  return comment ? ` # ${comment}` : "";
}


export function jsonSchemaToToon(schema: JsonSchemaProp, indent = ""): string {
  if (!schema || typeof schema !== "object") return "";

  const lines: string[] = [];
  const type = schema.type;
  const requiredKeys = Array.isArray(schema.required) ? schema.required : [];

  if ((type === "object" || (!type && schema.properties)) && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties as Record<string, JsonSchemaProp>)) {
      const prop = value as JsonSchemaProp;
      const propTypes = [prop.type].flat().filter(Boolean) as string[];
      const baseTypes = propTypes.filter((t) => t !== "null");
      const propType = baseTypes[0];
      const isReq = requiredKeys.includes(key);
      const comment = buildComment(prop, isReq);

      if (propType === "object" || (!propType && prop.properties)) {
        lines.push(`${indent}${key}:${comment}`);
        const nested = jsonSchemaToToon(prop, indent + "  ");
        if (nested) lines.push(nested);
      } else if (propType === "array") {
        const items = prop.items as JsonSchemaProp | undefined;
        if (items && (items.type === "object" || items.properties) && items.properties) {
          const itemProps = items.properties as Record<string, JsonSchemaProp>;
          const cols = Object.keys(itemProps).join(",");
          const arrayDesc = prop.description ? `${prop.description}, ` : "";
          const itemRequiredKeys = Array.isArray(items.required) ? items.required : [];

          const colTypes = Object.entries(itemProps)
            .map(([col, colProp]) => {
              const colIsReq = itemRequiredKeys.includes(col);
              const colTypes = [colProp.type].flat().filter(Boolean) as string[];
              const base = colTypes.filter((t) => t !== "null");
              const isNullable = colTypes.includes("null") || colProp.nullable === true;
              
              // Pattern Enforcement (Show, Don't Tell): Visually hint that strings must be quoted in arrays
              let typeStr = base[0] || "any";
              if (typeStr === "string") typeStr = '"string"';
              
              const typeHint = isNullable ? `${typeStr}|null` : typeStr;
              const comment = buildCommentString(colProp as JsonSchemaProp, colIsReq);
              return `${col}:<${typeHint}>${comment ? " " + comment : ""}`;
            })
            .join(", ");
            
          const reqPrefix = isReq ? "REQUIRED, " : "";
          lines.push(`${indent}${key}[N]{${cols}}: # ${reqPrefix}${arrayDesc}{${colTypes}}`);
        } else {
          const reqPrefix = isReq ? "REQUIRED, " : "";
          const arrayDesc = prop.description ? ` ${prop.description}` : "";
          const itemType = items?.type ? String(items.type) : "any";
          lines.push(`${indent}${key}[N]: # ${reqPrefix}item_type:${itemType}${arrayDesc}`);
        }
      } else {
        const nullable = propTypes.includes("null") || prop.nullable === true;
        const typeHint = nullable ? `${propType || "any"}|null` : (propType || "any");
        lines.push(`${indent}${key}: <${typeHint}>${comment}`);
      }
    }
  } else if (type === "array") {
    const items = schema.items as JsonSchemaProp | undefined;
    if (items && (items.type === "object" || items.properties) && items.properties) {
      const cols = Object.keys(items.properties as object).join(",");
      lines.push(`${indent}items[N]{${cols}}:`);
    }
  }

  return lines.filter(Boolean).join("\n");
}
