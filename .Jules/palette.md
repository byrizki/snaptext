## 2024-05-15 - ARIA Labels for Icon-only Buttons
**Learning:** Found multiple instances where icon-only buttons (like Rerun and Stop in scan history) used `title` attributes but lacked `aria-label`s, missing an opportunity for better screen reader accessibility. Also, a toggle switch using `role="switch"` and `aria-checked` was missing an `aria-label`.
**Action:** Always ensure interactive elements, especially icon-only buttons and custom toggles, have an explicit `aria-label` even if a `title` or surrounding context seems sufficient.
