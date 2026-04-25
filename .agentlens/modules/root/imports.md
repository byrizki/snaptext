# Imports

[← Back to MODULE](MODULE.md) | [← Back to INDEX](../../INDEX.md)

## Dependency Graph

```mermaid
graph TD
    root[root] --> _[.]
    root[root] --> workflows[workflows]
    root[root] --> demo[demo]
    root[root] --> demo[demo]
    root[root] --> demo[demo]
    root[root] --> demo[demo]
    root[root] --> demo[demo]
    root[root] --> landing[landing]
    root[root] --> landing[landing]
    root[root] --> landing[landing]
    root[root] --> landing[landing]
    root[root] --> landing[landing]
    root[root] --> ui[ui]
    root[root] --> hooks[hooks]
    root[root] --> lib[lib]
    root[root] --> _vercel[@vercel]
    root[root] --> clsx[clsx]
    root[root] --> eslint_config_next[eslint-config-next]
    root[root] --> eslint_config_next[eslint-config-next]
    root[root] --> eslint[eslint]
    root[root] --> font[font]
    root[root] --> next[next]
    root[root] --> react[react]
    root[root] --> tailwind_merge[tailwind-merge]
    root[root] --> workflow[workflow]
    root[root] --> workflow[workflow]
```

## External Dependencies

Dependencies from other modules:

- `./globals.css`
- `@/app/workflows/ocr`
- `@/components/demo/error-view`
- `@/components/demo/results-view`
- `@/components/demo/scanning-view`
- `@/components/demo/upload-progress`
- `@/components/demo/upload-zone`
- `@/components/landing/background-grid`
- `@/components/landing/features`
- `@/components/landing/footer`
- `@/components/landing/header`
- `@/components/landing/hero`
- `@/components/ui/tooltip`
- `@/hooks/use-ocr-pipeline`
- `@/lib/utils`
- `@vercel/blob`
- `clsx`
- `eslint-config-next/core-web-vitals`
- `eslint-config-next/typescript`
- `eslint/config`
- `next/font/google`
- `next/server`
- `react`
- `tailwind-merge`
- `workflow/api`
- `workflow/next`

