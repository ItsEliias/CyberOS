'use strict';
// sources/cve.js — NVD CVE scraper and note generator
const https = require('https');

const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const EXPLOITDB_URL = 'https://www.exploit-db.com/search?cve=';

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  // Parse CVE IDs from config
  let cveIds = [];
  if (config.cveId) {
    // Single or bulk (newline-separated)
    cveIds = config.cveId
      .split(/[\n,]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => /^CVE-\d{4}-\d+$/.test(s));
  }

  if (cveIds.length === 0) {
    log('error', 'No valid CVE IDs provided (format: CVE-YYYY-NNNNN)');
    return [];
  }

  log('info', `Processing ${cveIds.length} CVE(s)`);
  const pages = [];

  for (const cveId of cveIds) {
    if (ctrl.abort()) break;
    await ctrl.delay(config.requestDelay || 1500);

    try {
      log('info', `Fetching ${cveId}...`, cveId);
      const cveData = await fetchCVE(cveId);

      if (!cveData) {
        log('error', `CVE not found: ${cveId}`, cveId);
        continue;
      }

      const content = buildCVENote(cveData);
      const year = cveId.split('-')[1];

      pages.push({
        url: `https://nvd.nist.gov/vuln/detail/${cveId}`,
        title: cveId,
        content,
        sourceType: 'cve',
        subfolder: `CVEs/${year}`,
        meta: {
          cvss: cveData.cvss,
          severity: cveData.severity,
          cveId
        }
      });

      log('success', `Fetched ${cveId}: ${cveData.severity} (CVSS ${cveData.cvss})`, cveId);
    } catch (e) {
      log('error', `Failed ${cveId}: ${e.message}`, cveId);
    }
  }

  return pages;
}

async function fetchCVE(cveId) {
  return new Promise((resolve) => {
    const url = `${NVD_API_BASE}?cveId=${cveId}`;
    const options = {
      hostname: 'services.nvd.nist.gov',
      path: `/rest/json/cves/2.0?cveId=${cveId}`,
      method: 'GET',
      headers: {
        'User-Agent': 'VaultCore/1.0',
        'Accept': 'application/json'
      },
      timeout: 20000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.vulnerabilities || json.vulnerabilities.length === 0) { resolve(null); return; }
          resolve(parseCVEData(json.vulnerabilities[0]));
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function parseCVEData(vuln) {
  const cve = vuln.cve;
  const id = cve.id;

  // Description
  const descriptions = cve.descriptions || [];
  const desc = descriptions.find(d => d.lang === 'en')?.value || 'No description available.';

  // CVSS score
  let cvss = 'N/A';
  let severity = 'Unknown';
  const metrics = cve.metrics || {};

  if (metrics.cvssMetricV31 && metrics.cvssMetricV31[0]) {
    const m = metrics.cvssMetricV31[0].cvssData;
    cvss = m.baseScore;
    severity = m.baseSeverity || getSeverityFromScore(cvss);
  } else if (metrics.cvssMetricV30 && metrics.cvssMetricV30[0]) {
    const m = metrics.cvssMetricV30[0].cvssData;
    cvss = m.baseScore;
    severity = m.baseSeverity || getSeverityFromScore(cvss);
  } else if (metrics.cvssMetricV2 && metrics.cvssMetricV2[0]) {
    const m = metrics.cvssMetricV2[0].cvssData;
    cvss = m.baseScore;
    severity = metrics.cvssMetricV2[0].baseSeverity || getSeverityFromScore(cvss);
  }

  // Affected software
  const affected = [];
  const configs = cve.configurations || [];
  for (const cfg of configs) {
    for (const node of (cfg.nodes || [])) {
      for (const match of (node.cpeMatch || [])) {
        if (match.vulnerable) {
          const parsed = parseCPE(match.criteria);
          if (parsed) affected.push(parsed);
        }
      }
    }
  }

  // Published date
  const published = cve.published ? cve.published.split('T')[0] : 'Unknown';
  const lastModified = cve.lastModified ? cve.lastModified.split('T')[0] : 'Unknown';

  // References
  const refs = (cve.references || []).map(r => ({ url: r.url, tags: r.tags || [] }));

  // CVSS vector string
  let vectorString = '';
  if (metrics.cvssMetricV31?.[0]?.cvssData?.vectorString) {
    vectorString = metrics.cvssMetricV31[0].cvssData.vectorString;
  }

  // CWE
  const weaknesses = cve.weaknesses || [];
  const cwes = weaknesses.map(w => w.description?.find(d => d.lang === 'en')?.value || '').filter(Boolean);

  return {
    id, description: desc, cvss, severity, affected,
    published, lastModified, references: refs, vectorString, cwes
  };
}

function buildCVENote(cve) {
  const severityLower = (cve.severity || 'unknown').toLowerCase();
  const affectedStr = cve.affected.slice(0, 5).join(', ') || 'Unknown';

  const exploitDbUrl = `${EXPLOITDB_URL}${cve.id}`;

  const lines = [];
  lines.push('## Description');
  lines.push('');
  lines.push(cve.description);
  lines.push('');

  if (cve.affected.length > 0) {
    lines.push('## Affected Versions');
    lines.push('');
    for (const a of cve.affected) lines.push(`- ${a}`);
    lines.push('');
  }

  lines.push('## Impact');
  lines.push('');
  lines.push(`**CVSS Score:** ${cve.cvss} (${cve.severity})`);
  if (cve.vectorString) lines.push(`**Vector:** \`${cve.vectorString}\``);
  if (cve.cwes.length > 0) lines.push(`**CWE:** ${cve.cwes.join(', ')}`);
  lines.push('');

  lines.push('## Exploitation Notes');
  lines.push('');
  lines.push(`> Check [ExploitDB](${exploitDbUrl}) for known exploits.`);
  lines.push('');

  lines.push('## Patches & Mitigations');
  lines.push('');
  lines.push('> See references below for vendor advisories and patches.');
  lines.push('');

  if (cve.references.length > 0) {
    lines.push('## References');
    lines.push('');
    for (const ref of cve.references) {
      const tags = ref.tags.length > 0 ? ` _(${ref.tags.join(', ')})_` : '';
      lines.push(`- [${ref.url}](${ref.url})${tags}`);
    }
  }

  return lines.join('\n');
}

function getSeverityFromScore(score) {
  const s = parseFloat(score);
  if (s >= 9.0) return 'CRITICAL';
  if (s >= 7.0) return 'HIGH';
  if (s >= 4.0) return 'MEDIUM';
  if (s >= 0.1) return 'LOW';
  return 'NONE';
}

function parseCPE(cpe) {
  if (!cpe) return null;
  const parts = cpe.split(':');
  if (parts.length < 5) return cpe;
  const vendor = parts[3];
  const product = parts[4];
  const version = parts[5] && parts[5] !== '*' ? ` ${parts[5]}` : '';
  return `${vendor}/${product}${version}`;
}

module.exports = { scrape };
