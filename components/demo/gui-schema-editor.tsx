import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

type FieldType = "string" | "number" | "boolean" | "object" | "array";

interface FieldDef {
  key: string;
  type: FieldType;
  description?: string;
  properties?: FieldDef[];
  items?: FieldDef[]; // for arrays of objects
}

function parseSchemaToTree(schemaStr: string): FieldDef[] {
  if (!schemaStr) return [];
  try {
    const parsed = JSON.parse(schemaStr);
    if (parsed.type !== "object" || !parsed.properties) return [];

    return parseProperties(parsed.properties);
  } catch (_e) {
    return [];
  }
}

function parseProperties(properties: Record<string, unknown>): FieldDef[] {
  return Object.entries(properties).map(([key, v]) => {
    const val = v as Record<string, unknown>;
    const type = (val.type as FieldType) || "string";
    const field: FieldDef = { key, type, description: val.description as string | undefined };
    if (type === "object" && val.properties) {
      field.properties = parseProperties(val.properties as Record<string, unknown>);
    } else if (type === "array" && val.items) {
      const items = val.items as Record<string, unknown>;
      if (items.type === "object" && items.properties) {
        field.items = parseProperties(items.properties as Record<string, unknown>);
      }
    }
    return field;
  });
}

function treeToSchemaStr(tree: FieldDef[]): string {
  if (tree.length === 0) return "";
  const properties = buildProperties(tree);
  return JSON.stringify({ type: "object", properties }, null, 2);
}

function buildProperties(tree: FieldDef[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const field of tree) {
    if (!field.key.trim()) continue;
    const prop: Record<string, unknown> = { type: field.type };
    if (field.description) prop.description = field.description;

    if (field.type === "object" && field.properties) {
      prop.properties = buildProperties(field.properties);
    } else if (field.type === "array" && field.items) {
      prop.items = { type: "object", properties: buildProperties(field.items) };
    }
    props[field.key] = prop;
  }
  return props;
}

interface GuiSchemaEditorProps {
  schema: string;
  onChange: (schema: string) => void;
}

export function GuiSchemaEditor({ schema, onChange }: GuiSchemaEditorProps) {
  const [fields, setFields] = useState<FieldDef[]>(parseSchemaToTree(schema));

  // Sync from props
  useEffect(() => {
    try {
      const parsed = parseSchemaToTree(schema);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFields((prev) => {
        if (JSON.stringify(parsed) !== JSON.stringify(prev)) {
          return parsed;
        }
        return prev;
      });
    } catch {
      // ignore
    }
  }, [schema]);

  const updateFields = (newFields: FieldDef[]) => {
    setFields(newFields);
    onChange(treeToSchemaStr(newFields));
  };

  const addField = () => {
    updateFields([...fields, { key: "", type: "string" }]);
  };

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No schema defined.</p>
          <button
            onClick={addField}
            className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Add Field
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            <div className="col-span-4">Field Name</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-4">Description (Optional)</div>
            <div className="col-span-1"></div>
          </div>
          <FieldList fields={fields} onChange={updateFields} />
          <button
            onClick={addField}
            className="flex items-center gap-1.5 px-3 py-1.5 w-fit text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={14} /> Add Field
          </button>
        </div>
      )}
    </div>
  );
}

function FieldList({ fields, onChange }: { fields: FieldDef[]; onChange: (f: FieldDef[]) => void }) {
  const handleUpdate = (index: number, newField: FieldDef) => {
    const updated = [...fields];
    updated[index] = newField;
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <FieldRow
          key={index}
          field={field}
          onChange={(f) => handleUpdate(index, f)}
          onDelete={() => handleDelete(index)}
        />
      ))}
    </div>
  );
}

function FieldRow({ field, onChange, onDelete }: { field: FieldDef; onChange: (f: FieldDef) => void; onDelete: () => void }) {
  const handleChange = (updates: Partial<FieldDef>) => {
    const newField = { ...field, ...updates };
    if (newField.type === "object" && !newField.properties) {
      newField.properties = [{ key: "", type: "string" }];
    }
    if (newField.type === "array" && !newField.items) {
      newField.items = [{ key: "", type: "string" }];
    }
    onChange(newField);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-4">
          <input
            type="text"
            placeholder="fieldName"
            value={field.key}
            onChange={(e) => handleChange({ key: e.target.value })}
            className="w-full h-8 px-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>
        <div className="col-span-3">
          <select
            value={field.type}
            onChange={(e) => handleChange({ type: e.target.value as FieldType })}
            className="w-full h-8 px-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
            <option value="array">Array (of Objects)</option>
          </select>
        </div>
        <div className="col-span-4">
          <input
            type="text"
            placeholder="Description..."
            value={field.description || ""}
            onChange={(e) => handleChange({ description: e.target.value })}
            className="w-full h-8 px-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="col-span-1 flex justify-end">
          <button
            onClick={onDelete}
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
          >
            <HugeiconsIcon icon={Delete01Icon} size={14} />
          </button>
        </div>
      </div>

      {field.type === "object" && field.properties && (
        <div className="pl-4 pr-1 py-2 ml-2 border-l-2 border-zinc-100 dark:border-zinc-800 bg-black/[0.02] dark:bg-white/[0.02] rounded-r-lg">
          <FieldList fields={field.properties} onChange={(props) => handleChange({ properties: props })} />
          <button
            onClick={() => handleChange({ properties: [...field.properties!, { key: "", type: "string" }] })}
            className="mt-2 flex items-center gap-1.5 px-2 py-1 w-fit text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={12} /> Add Nested Field
          </button>
        </div>
      )}

      {field.type === "array" && field.items && (
        <div className="pl-4 pr-1 py-2 ml-2 border-l-2 border-zinc-100 dark:border-zinc-800 bg-black/[0.02] dark:bg-white/[0.02] rounded-r-lg">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 pl-1">Array Item Properties</div>
          <FieldList fields={field.items} onChange={(items) => handleChange({ items })} />
          <button
            onClick={() => handleChange({ items: [...field.items!, { key: "", type: "string" }] })}
            className="mt-2 flex items-center gap-1.5 px-2 py-1 w-fit text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={12} /> Add Array Item Field
          </button>
        </div>
      )}
    </div>
  );
}
