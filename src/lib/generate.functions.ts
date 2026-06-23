import { createServerFn } from "@tanstack/react-start";

export type GeneratedSite = { html: string; css: string; js: string };

type GenInput = { image: string; mimeType?: string };

const SYSTEM_PROMPT = `You are an expert UI engineer. You convert a hand-drawn UI sketch (wireframe) into a polished, working website.

STRICT OUTPUT CONTRACT:
Return ONLY a single valid JSON object with EXACTLY these keys: "html", "css", "js".
- "html": ONLY the inner content of <body>. Do NOT include <!doctype>, <html>, <head>, <body>, <style>, or <script> tags. Use semantic HTML.
- "css": Plain vanilla CSS only. Modern, responsive, accessible. No frameworks, no @import of external fonts. Use a clean type scale and consistent spacing. Include a subtle modern look.
- "js": Vanilla JavaScript only (no modules, no imports, no frameworks). Wire up any interactive elements visible in the sketch (menus, tabs, forms, sliders, modals). Use document.addEventListener('DOMContentLoaded', ...). If nothing interactive, return an empty string.

RULES:
- NO React, NO Tailwind, NO Bootstrap, NO CDN scripts, NO external assets except <img> placeholders from https://picsum.photos.
- Faithfully reproduce the layout, sections, components and labels shown in the sketch.
- Add reasonable placeholder text where the sketch has scribbles or lorem.
- Output MUST be valid JSON. Do NOT wrap in markdown code fences. Do NOT add commentary.`;

export const generateSite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const v = input as GenInput;
    if (!v?.image || typeof v.image !== "string") throw new Error("image (base64) required");
    return { image: v.image, mimeType: v.mimeType || "image/png" };
  })
  .handler(async ({ data }): Promise<GeneratedSite> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const dataUrl = data.image.startsWith("data:")
      ? data.image
      : `data:${data.mimeType};base64,${data.image}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Analyze this UI sketch and generate the website. Respond ONLY with JSON: {"html":"...","css":"...","js":"..."}',
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to your workspace.");
      throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from model");

    let parsed: GeneratedSite;
    try {
      const cleaned = content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Model did not return valid JSON");
    }

    if (typeof parsed.html !== "string" || typeof parsed.css !== "string") {
      throw new Error("Invalid response shape: missing html/css");
    }
    if (typeof parsed.js !== "string") parsed.js = "";

    // Strip accidentally-included wrappers
    parsed.html = parsed.html
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<\/?body[^>]*>/gi, "")
      .trim();

    return parsed;
  });
