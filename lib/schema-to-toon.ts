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

function getPrimaryType(prop: JsonSchemaProp): string | undefined {
  const propTypes = [prop.type].flat().filter(Boolean) as string[];
  return propTypes.filter((type) => type !== "null")[0];
}

function getTypeHint(prop: JsonSchemaProp): string {
  const propTypes = [prop.type].flat().filter(Boolean) as string[];
  const baseType = propTypes.filter((type) => type !== "null")[0] || "any";
  const nullable = propTypes.includes("null") || prop.nullable === true;
  return nullable ? `${baseType}|null` : baseType;
}

function isObjectSchema(prop: JsonSchemaProp): boolean {
  return getPrimaryType(prop) === "object" || Boolean(prop.properties);
}

function isArraySchema(prop: JsonSchemaProp): boolean {
  return getPrimaryType(prop) === "array";
}

function hasNestedObjectOrArray(properties: Record<string, JsonSchemaProp>): boolean {
  return Object.values(properties).some((prop) => isObjectSchema(prop) || isArraySchema(prop));
}

function renderObjectProperties(schema: JsonSchemaProp, indent: string): string[] {
  const lines: string[] = [];
  const requiredKeys = Array.isArray(schema.required) ? schema.required : [];
  const properties = schema.properties as Record<string, JsonSchemaProp> | undefined;
  if (!properties) return lines;

  for (const [key, prop] of Object.entries(properties)) {
    const isReq = requiredKeys.includes(key);
    const comment = buildComment(prop, isReq);

    if (isObjectSchema(prop)) {
      lines.push(`${indent}${key}:${comment}`);
      lines.push(...renderObjectProperties(prop, `${indent}  `));
      continue;
    }

    if (isArraySchema(prop)) {
      lines.push(...renderArrayProperty(key, prop, indent, isReq));
      continue;
    }

    lines.push(`${indent}${key}: <${getTypeHint(prop)}>${comment}`);
  }

  return lines;
}

function renderArrayProperty(
  key: string,
  prop: JsonSchemaProp,
  indent: string,
  isRequired: boolean,
): string[] {
  const items = prop.items as JsonSchemaProp | undefined;
  const reqPrefix = isRequired ? "REQUIRED, " : "";
  const arrayDesc = prop.description ? `${prop.description}, ` : "";

  if (items && isObjectSchema(items) && items.properties) {
    const itemProps = items.properties as Record<string, JsonSchemaProp>;

    // CSV object arrays are compact, but they cannot represent nested arrays/objects.
    // Use YAML-style object arrays for nested schemas so the prompt stays fillable.
    if (hasNestedObjectOrArray(itemProps)) {
      const comment = [reqPrefix && reqPrefix.slice(0, -2), prop.description]
        .filter(Boolean)
        .join(", ");
      const lines = [`${indent}${key}[N]:${comment ? ` # ${comment}` : ""}`];
      const itemIndent = `${indent}    `;
      const nestedLines = renderObjectProperties(items, itemIndent);
      if (nestedLines.length > 0) {
        lines.push(nestedLines[0].replace(itemIndent, `${indent}  - `));
        lines.push(...nestedLines.slice(1));
      }
      return lines;
    }

    const cols = Object.keys(itemProps).join(",");
    const itemRequiredKeys = Array.isArray(items.required) ? items.required : [];
    const colTypes = Object.entries(itemProps)
      .map(([col, colProp]) => {
        const colIsReq = itemRequiredKeys.includes(col);
        const baseType = getPrimaryType(colProp) || "any";
        const nullable = [colProp.type].flat().includes("null") || colProp.nullable === true;
        const typeStr = baseType === "string" ? '"string"' : baseType;
        const typeHint = nullable ? `${typeStr}|null` : typeStr;
        const comment = buildCommentString(colProp, colIsReq);
        return `${col}:<${typeHint}>${comment ? ` ${comment}` : ""}`;
      })
      .join(", ");

    return [`${indent}${key}[N]{${cols}}: # ${reqPrefix}${arrayDesc}{${colTypes}}`];
  }

  const itemType = items ? getTypeHint(items) : "any";
  return [`${indent}${key}[N]: # ${reqPrefix}item_type:${itemType}${prop.description ? ` ${prop.description}` : ""}`];
}

export function jsonSchemaToToon(schema: JsonSchemaProp, indent = ""): string {
  if (!schema || typeof schema !== "object") return "";

  if (isObjectSchema(schema)) {
    return renderObjectProperties(schema, indent).filter(Boolean).join("\n");
  }

  if (isArraySchema(schema)) {
    return renderArrayProperty("items", schema, indent, false).filter(Boolean).join("\n");
  }

  return "";
}
