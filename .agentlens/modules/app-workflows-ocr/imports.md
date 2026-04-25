# Imports

[← Back to MODULE](MODULE.md) | [← Back to INDEX](../../INDEX.md)

## Dependency Graph

```mermaid
graph TD
    app_workflows_ocr[app-workflows-ocr] --> __[..]
    app_workflows_ocr[app-workflows-ocr] --> __[..]
    app_workflows_ocr[app-workflows-ocr] --> __[..]
    app_workflows_ocr[app-workflows-ocr] --> __[..]
    app_workflows_ocr[app-workflows-ocr] --> _[.]
    app_workflows_ocr[app-workflows-ocr] --> _[.]
    app_workflows_ocr[app-workflows-ocr] --> _[@]
    app_workflows_ocr[app-workflows-ocr] --> _toon_format[@toon-format]
    app_workflows_ocr[app-workflows-ocr] --> _vercel[@vercel]
    app_workflows_ocr[app-workflows-ocr] --> ai[ai]
    app_workflows_ocr[app-workflows-ocr] --> drizzle_orm[drizzle-orm]
    app_workflows_ocr[app-workflows-ocr] --> sharp[sharp]
    app_workflows_ocr[app-workflows-ocr] --> unpdf[unpdf]
    app_workflows_ocr[app-workflows-ocr] --> workers_ai_provider[workers-ai-provider]
    app_workflows_ocr[app-workflows-ocr] --> zod[zod]
```

## Internal Dependencies

Dependencies within this module:

- `ai`
- `workflow`

## External Dependencies

Dependencies from other modules:

- `../image-processing`
- `../models`
- `../prompts`
- `../tools`
- `./hooks`
- `./steps`
- `@/db`
- `@toon-format/toon`
- `@vercel/blob`
- `@workflow/ai/agent`
- `drizzle-orm`
- `sharp`
- `unpdf`
- `workers-ai-provider`
- `zod`

