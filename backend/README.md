# Ink2Interface — FastAPI Backend

A standalone Python backend that mirrors the in-app TypeScript server function.
Use this for demos, placements, or local development outside Lovable.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Get a free key at https://aistudio.google.com/app/apikey
export GEMINI_API_KEY="your-key-here"

python main.py
# → http://localhost:8000
```

## API

### `POST /generate`

Request:
```json
{ "image": "<base64 or data URL>", "mime_type": "image/png" }
```

Response:
```json
{ "html": "...", "css": "...", "js": "..." }
```

- `html` is body inner-content only (no `<html>`/`<head>`/`<body>`)
- `css` is plain vanilla CSS
- `js` is vanilla JavaScript (may be empty)

### `GET /`
Health check.

## Notes

- Uses the official `google-genai` Python SDK with `gemini-2.5-flash`.
- CORS is wide-open (`*`) for easy local development — tighten before deploying.
- The frontend in this repo calls the in-app TypeScript implementation; if you
  want it to call this FastAPI server instead, point `fetch` at
  `http://localhost:8000/generate` in `src/lib/generate.functions.ts`.
