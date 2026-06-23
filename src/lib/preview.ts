import type { GeneratedSite } from "./generate.functions";

export function buildPreviewDoc({ html, css, js }: GeneratedSite): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Preview</title>
<link rel="stylesheet" href="style.css" />
<style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
}

export function buildIndexHtml({ html, js }: GeneratedSite): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Generated Site</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
${html}
<script src="script.js"></script>
</body>
</html>`;
}
