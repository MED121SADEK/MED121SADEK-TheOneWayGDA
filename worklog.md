---
Task ID: 1
Agent: Main Agent
Task: Fix file upload, CSV parsing, and PDF scan issues in workspace

Work Log:
- Audited all file upload, CSV parsing, and PDF scan code across 6 key files
- Identified 7 critical issues: no drag-drop on ImportPanel/ScanPanel, fragile CSV fallback parser, no file validation, silent error handling, no JSON import, poor PDF unclear document handling
- Fixed ImportPanel: added real drag-drop with visual feedback, file size validation (50MB), extension validation, error/success toast messages, input reset after selection
- Fixed ScanPanel: added real drag-drop with visual feedback, file validation (20MB), proper error handling with user-friendly messages, raw text fallback when AI can't parse structured fields, improved batch scan with file validation
- Fixed CSV parser in store.ts: replaced broken manual comma-split with quote-aware CSV parser that handles escaped quotes, empty lines, and uneven columns; added column length equalization
- Fixed importFile in store.ts: added JSON import support, error handlers on all FileReader instances, better error logging
- Improved scan API (api/scan/route.ts): enhanced OCR prompt for blurry/unclear documents with "never give up" instructions, added 2-pass extraction (image OCR + text structuring), raw text fallback when structured parsing fails, higher max_tokens (4096)
- Build verified passing

Stage Summary:
- 5 files modified: WorkspacePanels.tsx, store.ts, api/scan/route.ts
- All drag-drop, file validation, error handling, and PDF unclear document issues fixed
- Build passing
