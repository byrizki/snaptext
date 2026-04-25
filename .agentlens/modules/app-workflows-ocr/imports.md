# Imports

[← Back to MODULE](MODULE.md) | [← Back to INDEX](../../INDEX.md)

## Dependency Graph

```mermaid
graph TD
    app_workflows_ocr[app-workflows-ocr] --> _[.]
    app_workflows_ocr[app-workflows-ocr] --> _[.]
    app_workflows_ocr[app-workflows-ocr] --> _ai_sdk[@ai-sdk]
    app_workflows_ocr[app-workflows-ocr] --> _toon_format[@toon-format]
    app_workflows_ocr[app-workflows-ocr] --> _vercel[@vercel]
    app_workflows_ocr[app-workflows-ocr] --> ai[ai]
    app_workflows_ocr[app-workflows-ocr] --> unpdf[unpdf]
```

## External Dependencies

Dependencies from other modules:

- `./prompts`
- `./steps`
- `@ai-sdk/openai`
- `@toon-format/toon`
- `@vercel/blob`
- `ai`
- `unpdf`

