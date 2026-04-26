export function jsonSchemaToToon(schema: Record<string, unknown>, indent = ""): string {
  if (!schema || typeof schema !== "object") return "";

  const lines: string[] = [];
  const type = schema.type;

  if (type === "object" && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties as Record<string, unknown>)) {
      const prop = value as Record<string, unknown>;
      const propType = prop.type;
      const desc = prop.description ? ` # ${prop.description}` : "";

      if (propType === "object") {
        lines.push(`${indent}${key}:`);
        const nested = jsonSchemaToToon(prop, indent + "  ");
        if (nested) lines.push(nested);
      } else if (propType === "array") {
        const items = prop.items as Record<string, unknown> | undefined;
        if (items && items.type === "object" && items.properties) {
          const cols = Object.keys(items.properties).join(", ");
          lines.push(`${indent}${key}[N]{${cols}}:${desc}`);
        } else {
          lines.push(`${indent}${key}[N]:${desc}`);
        }
      } else {
        lines.push(`${indent}${key}: <${propType || 'any'}>${desc}`);
      }
    }
  } else if (type === "array") {
     const items = schema.items as Record<string, unknown> | undefined;
     if (items && items.type === "object" && items.properties) {
          const cols = Object.keys(items.properties).join(", ");
          lines.push(`${indent}items[N]{${cols}}:`);
     }
  }

  return lines.filter(Boolean).join("\n");
}
