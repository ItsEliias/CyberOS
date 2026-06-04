/**
 * Print-optimised CSS injected into the page before PDF export via Electron printToPDF.
 * Produces a clean professional document: white background, readable typography,
 * page breaks between major sections.
 */

export const PRINT_STYLES = `
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
  }

  @page :first {
    margin-top: 15mm;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    background: #ffffff !important;
    color: #1a1a1a !important;
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.65;
    overflow: visible !important;
    height: auto !important;
  }

  #root {
    height: auto !important;
    overflow: visible !important;
    background: #ffffff !important;
  }

  /* Hide the app UI — only print-page div renders */
  body > #root > *:not(.print-container) {
    display: none !important;
  }

  .print-page {
    display: block !important;
    background: #ffffff;
    color: #1a1a1a;
    max-width: 100%;
    padding: 0;
  }

  /* Cover / report header */
  .print-cover {
    margin-bottom: 32pt;
    padding-bottom: 16pt;
    border-bottom: 2pt solid #2a7a36;
    page-break-after: avoid;
  }

  .print-cover h1 {
    font-size: 22pt;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 6pt;
    letter-spacing: -0.02em;
  }

  .print-meta-table {
    font-size: 10pt;
    border-collapse: collapse;
    margin-top: 10pt;
  }

  .print-meta-table td {
    padding: 2pt 10pt 2pt 0;
    vertical-align: top;
  }

  .print-meta-label {
    font-weight: 600;
    color: #555555;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    padding-right: 12pt !important;
  }

  /* Sections */
  .print-section {
    margin-bottom: 28pt;
    page-break-inside: avoid;
  }

  .print-section-heading {
    font-size: 15pt;
    font-weight: 700;
    border-bottom: 1pt solid #cccccc;
    padding-bottom: 5pt;
    margin-bottom: 12pt;
    color: #1a1a1a;
    page-break-after: avoid;
  }

  /* Major section page breaks */
  .print-section.page-break-before {
    page-break-before: always;
  }

  /* Findings */
  .print-finding {
    margin-bottom: 20pt;
    padding-left: 10pt;
    page-break-inside: avoid;
  }

  .print-finding-title {
    font-size: 12pt;
    font-weight: 700;
    margin-bottom: 4pt;
    display: flex;
    align-items: center;
    gap: 8pt;
  }

  .print-severity-badge {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    border: 1pt solid;
    padding: 1pt 5pt;
    border-radius: 2pt;
    white-space: nowrap;
  }

  .print-severity-critical { color: #cc0000; border-color: #cc0000; border-left: 3pt solid #cc0000; }
  .print-severity-high     { color: #cc4400; border-color: #cc4400; border-left: 3pt solid #cc4400; }
  .print-severity-medium   { color: #aa7700; border-color: #aa7700; border-left: 3pt solid #aa7700; }
  .print-severity-low      { color: #2a7a36; border-color: #2a7a36; border-left: 3pt solid #2a7a36; }
  .print-severity-info     { color: #555555; border-color: #555555; border-left: 3pt solid #555555; }

  .print-field-label {
    font-weight: 700;
    font-size: 10pt;
    color: #333333;
    margin-top: 5pt;
  }

  .print-field-value {
    font-size: 10pt;
    color: #1a1a1a;
    margin-bottom: 4pt;
  }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8pt 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }

  th {
    background: #f0f0f0 !important;
    border: 1pt solid #cccccc;
    padding: 5pt 8pt;
    text-align: left;
    font-weight: 600;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  td {
    border: 1pt solid #cccccc;
    padding: 5pt 8pt;
    font-size: 10pt;
    color: #1a1a1a;
  }

  tr:nth-child(even) td {
    background: #fafafa;
  }

  /* Code blocks */
  pre {
    background: #f4f4f4 !important;
    color: #1a1a1a !important;
    border: 1pt solid #dddddd;
    border-radius: 3pt;
    padding: 8pt 12pt;
    font-size: 9pt;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    font-family: 'Courier New', Courier, monospace;
    page-break-inside: avoid;
    margin: 6pt 0;
  }

  code {
    background: #f0f0f0 !important;
    color: #1a1a1a !important;
    padding: 1pt 4pt;
    border-radius: 2pt;
    font-size: 9pt;
    font-family: 'Courier New', Courier, monospace;
  }

  /* Header / Footer branding (via @page if supported) */
  .print-footer {
    position: running(footer);
    font-size: 8pt;
    color: #888888;
    text-align: center;
    border-top: 1pt solid #eeeeee;
    padding-top: 4pt;
  }

  /* Links */
  a {
    color: #2a7a36 !important;
    text-decoration: underline;
  }

  /* Page numbers via counter */
  .print-page-num::after {
    content: counter(page);
  }

  /* Paragraph spacing */
  p {
    margin: 5pt 0;
    color: #1a1a1a;
    font-size: 11pt;
    line-height: 1.65;
  }

  h1 { font-size: 18pt; margin: 14pt 0 5pt; color: #1a1a1a; }
  h2 { font-size: 15pt; margin: 12pt 0 4pt; color: #1a1a1a; }
  h3 { font-size: 13pt; margin: 10pt 0 4pt; color: #1a1a1a; }
  h4 { font-size: 11pt; margin: 8pt 0 3pt; color: #1a1a1a; }

  ul, ol {
    margin: 5pt 0;
    padding-left: 18pt;
  }

  li {
    margin-bottom: 2pt;
    font-size: 10pt;
    color: #1a1a1a;
  }

  /* Summary table at top of findings */
  .print-summary-table th {
    background: #2a7a36 !important;
    color: #ffffff !important;
  }
`;

/**
 * Returns the watermark CSS for the given label.
 * Diagonal text stamp across each page.
 */
export function watermarkStyle(label: string): string {
  if (!label || label === 'none') return '';
  const colors: Record<string, string> = {
    CONFIDENTIAL: 'rgba(220,38,38,0.12)',
    DRAFT       : 'rgba(240,165,0,0.12)',
    'FOR REVIEW' : 'rgba(63,185,80,0.12)',
  };
  const color = colors[label] ?? 'rgba(100,100,100,0.10)';
  return `
    body::after {
      content: "${label}";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80pt;
      font-weight: 900;
      color: ${color};
      letter-spacing: 0.1em;
      white-space: nowrap;
      pointer-events: none;
      z-index: 9999;
      text-transform: uppercase;
    }
  `;
}

/**
 * Returns the print style element to inject into the document head
 * when the print view is rendered.
 */
export function injectPrintStyles(): HTMLStyleElement {
  const existing = document.getElementById('reportforge-print-styles');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = 'reportforge-print-styles';
  style.textContent = PRINT_STYLES;
  document.head.appendChild(style);
  return style;
}

/**
 * Removes the injected print styles after PDF export is complete.
 */
export function removePrintStyles(): void {
  const el = document.getElementById('reportforge-print-styles');
  if (el) el.remove();
}
