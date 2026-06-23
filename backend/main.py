import base64
import json
import os
import re
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

SYSTEM_PROMPT = """You are an expert UI engineer. You convert a hand-drawn UI sketch (wireframe) into a polished, working website.

STRICT OUTPUT CONTRACT:
Return ONLY a single valid JSON object with EXACTLY these keys: "html", "css", "js".
- "html": ONLY the inner content of <body>. Do NOT include <!doctype>, <html>, <head>, <body>, <style>, or <script> tags. Use semantic HTML.
- "css": Plain vanilla CSS only. Modern, responsive, accessible. No frameworks.
- "js": Vanilla JavaScript only (no modules, no imports, no frameworks). Wire up interactive elements visible in the sketch. If nothing interactive, return an empty string.

RULES:
- NO React, NO Tailwind, NO Bootstrap, NO CDN scripts, NO external assets except <img> placeholders from https://picsum.photos.
- Faithfully reproduce the layout, sections, components and labels shown in the sketch.
- Output MUST be valid JSON. Do NOT wrap in markdown code fences. Do NOT add commentary.
"""

API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY (or GOOGLE_API_KEY) in your environment / .env")

client = genai.Client(api_key=API_KEY)

app = FastAPI(title="Ink2Interface API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded image (data URL or raw base64)")
    mime_type: Optional[str] = Field("image/png", description="Image MIME type")


class GenerateResponse(BaseModel):
    html: str
    css: str
    js: str


def _strip_data_url(image: str) -> tuple[str, str]:
    """Return (raw_base64, mime_type)."""
    m = re.match(r"^data:(?P<mime>[^;]+);base64,(?P<data>.+)$", image, re.DOTALL)
    if m:
        return m.group("data"), m.group("mime")
    return image, "image/png"


def _clean_html(html: str) -> str:
    html = re.sub(r"<!doctype[^>]*>", "", html, flags=re.I)
    html = re.sub(r"</?html[^>]*>", "", html, flags=re.I)
    html = re.sub(r"<head[\s\S]*?</head>", "", html, flags=re.I)
    html = re.sub(r"</?body[^>]*>", "", html, flags=re.I)
    return html.strip()


@app.get("/")
def root():
    return {"ok": True, "service": "Ink2Interface API"}


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    raw_b64, embedded_mime = _strip_data_url(req.image)
    mime = req.mime_type or embedded_mime or "image/png"

    try:
        image_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime),
                'Analyze this UI sketch and generate the website. Respond ONLY with JSON: {"html":"...","css":"...","js":"..."}',
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    text = (response.text or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model did not return valid JSON")

    if not isinstance(data, dict) or "html" not in data or "css" not in data:
        raise HTTPException(status_code=502, detail="Invalid response shape: missing html/css")

    html = _clean_html(str(data.get("html", "")))
    css = str(data.get("css", ""))
    js = str(data.get("js", "") or "")

    return GenerateResponse(html=html, css=css, js=js)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
