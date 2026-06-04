import type { Playbook } from '@shared/types'

export interface VaptMethodology {
  id: string
  name: string
  description: string
  phases: { name: string; description: string }[]
}

export const VAPT_METHODOLOGIES: VaptMethodology[] = [
  {
    id: 'owasp-otg',
    name: 'OWASP Testing Guide v4',
    description: 'OWASP OTG v4 — 11 test categories covering all aspects of web app security.',
    phases: [
      { name: 'OTG-INFO: Information Gathering', description: 'Gather information about the target web application using passive and active techniques including fingerprinting, directory enumeration, and application mapping.' },
      { name: 'OTG-CONFIG: Configuration and Deployment', description: 'Review network, application, and file extension configurations. Test for default credentials, incomplete/insecure backups, and HTTP methods.' },
      { name: 'OTG-IDENT: Identity Management', description: 'Test account provisioning, account enumeration, username policies, and password policies.' },
      { name: 'OTG-AUTHN: Authentication', description: 'Test authentication mechanisms including brute force protection, bypass techniques, credential transport security, and multi-factor implementations.' },
      { name: 'OTG-AUTHZ: Authorization', description: 'Test path traversal, authorization bypass, privilege escalation, and insecure direct object references (IDOR).' },
      { name: 'OTG-SESS: Session Management', description: 'Test session token randomness, cookie attributes, CSRF, session fixation, and logout functionality.' },
      { name: 'OTG-INPVAL: Input Validation', description: 'Test for XSS, SQL injection, LDAP injection, XML injection, SSI injection, XPath injection, IMAP/SMTP injection, code injection, and buffer overflow.' },
      { name: 'OTG-ERR: Error Handling', description: 'Analyze error codes and stack traces for information leakage. Verify generic error messages in production.' },
      { name: 'OTG-CRYPST: Cryptography', description: 'Test SSL/TLS configuration, cipher suites, weak algorithms, and certificate validation.' },
      { name: 'OTG-BUSLOGIC: Business Logic', description: 'Test business logic data validation, request forgery, data integrity, and process timing vulnerabilities.' },
      { name: 'OTG-CLIENT: Client Side', description: 'Test DOM-based XSS, JavaScript execution, HTML injection, CSS injection, clickjacking, and WebSocket security.' },
    ],
  },
  {
    id: 'ptes',
    name: 'PTES (Penetration Testing Execution Standard)',
    description: 'PTES 7-phase framework covering the full lifecycle of a penetration test.',
    phases: [
      { name: 'Pre-Engagement Interactions', description: 'Scope definition, rules of engagement, legal agreements, emergency contacts, and timeline establishment.' },
      { name: 'Intelligence Gathering', description: 'OSINT collection covering technical and non-technical information: WHOIS, DNS, network ranges, employee data, social media.' },
      { name: 'Threat Modeling', description: 'Identify business assets, threat communities, attack vectors, and risk levels to prioritize testing efforts.' },
      { name: 'Vulnerability Analysis', description: 'Active and passive vulnerability identification via automated scanning, manual testing, and vulnerability research.' },
      { name: 'Exploitation', description: 'Attempt exploitation of identified vulnerabilities to validate their existence and determine business impact.' },
      { name: 'Post-Exploitation', description: 'Establish persistence, enumerate sensitive data, pivot to adjacent systems, and demonstrate true business impact.' },
      { name: 'Reporting', description: 'Document all findings with executive summary, technical findings (CVSS-scored), evidence, and actionable remediation guidance.' },
    ],
  },
  {
    id: 'nist-800-115',
    name: 'NIST SP 800-115',
    description: 'NIST 800-115 Technical Guide to Information Security Testing — 4 core phases.',
    phases: [
      { name: 'Planning', description: 'Define objectives, scope, and constraints. Identify testing rules of engagement, obtain authorization, coordinate logistics, and establish communication channels.' },
      { name: 'Discovery', description: 'Technical data collection: network scanning, host discovery, service identification, OS fingerprinting, and vulnerability scanning to build the target asset inventory.' },
      { name: 'Attack', description: 'Attempt to validate discovered vulnerabilities by gaining unauthorized access, escalating privileges, pivoting across systems, and documenting successful exploits.' },
      { name: 'Reporting', description: 'Analyze findings, correlate data from all phases, and produce deliverables: executive summary, technical findings, risk ratings, and prioritized remediation roadmap.' },
    ],
  },
]

export function buildVaptPlaybook(methodology: VaptMethodology): Omit<Playbook, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: methodology.name,
    description: methodology.description,
    category: 'web-app',
    tags: ['methodology', 'vapt'],
    version: '1.0',
    isBuiltIn: false,
    steps: methodology.phases.map((phase, idx) => ({
      id: `vapt-${methodology.id}-${idx + 1}`,
      order: idx + 1,
      title: phase.name,
      description: phase.description,
      category: 'recon' as const,
      commands: [],
      notes: phase.description,
      required: true,
      stepType: 'documentation' as const,
    })),
  }
}
