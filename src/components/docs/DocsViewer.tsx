import { useState } from 'react';
import Markdown from 'react-markdown';
import {
  BookOpen,
  Shield,
  Database,
  FileCode,
  Milestone,
  History,
  Copy,
  Check,
  Download,
} from 'lucide-react';

const DOCS_CONTENT: Record<string, { title: string; subtitle: string; icon: any; content: string }> = {
  permissions: {
    title: 'Access Control Layer & Permissions Specification',
    subtitle: 'RBAC architecture, orthogonal scope resolution, track clearances & hard rules',
    icon: Shield,
    content: `# Access Control Layer & Permissions Specification

This document details the architectural specifications for the Role-Based Access Control (RBAC) and Security Clearance Layer of the MTJ Complaint Management System.

---

## 1. Architectural Model: \`can(user, permission, complaint?)\`

Access is never evaluated based solely on role name. Access is the strict mathematical **intersection of three orthogonal attributes**:

$$\\text{Access Granted} \\iff \\text{Role Has Permission} \\land \\text{Complaint In User Scope} \\land \\text{Complaint In Track Clearance} \\land \\neg(\\text{Conflict of Interest})$$

\`\`\`
                  ┌─────────────────────────────────┐
                  │          can(user, perm)        │
                  └────────────────┬────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   [1. ROLE]                  [2. SCOPE]             [3. TRACK CLEARANCE]
 Does role grant action?     Is case within          Is user cleared for
 (view, triage, close)       location/entity/user?   SERVICE / CONFIDENTIAL /
                             (GLOBAL, LOCATION...)   SAFEGUARDING?
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                      [4. CONFLICT OF INTEREST]
                      Is user named, owner, or submitter?
                                   │
                                   ▼
                       FINAL ACCESS DECISION
\`\`\`

---

## 2. Scope Types

| Scope Type | Description | Visibility Constraint |
| :--- | :--- | :--- |
| \`GLOBAL\` | Institution-wide cross-entity access | Can view records across all 4 entities (subject to track clearance). |
| \`ENTITY\` | Bounded to an entire organization | Can view records within a specific entity (e.g. \`AAS_LAB\` or \`SCHOOL\`). |
| \`REGION\` | Geographical cluster of locations | Can view records within designated cities or regional hubs (e.g. South Punjab). |
| \`LOCATION\` | Single physical branch or campus | Can only view records tied to a specific location code (e.g. \`AAS-KHN-01\`). |
| \`ASSIGNED_ONLY\` | Case-level worker boundary | Can ONLY see complaints where \`complaint.ownerName === user.name\` or user is an explicit watcher. |
| \`CASE_ACL\` | Air-gapped cryptographic list | Can only access cases explicitly listed in the secure safeguarding ACL table. |

---

## 3. Track Clearance Rules

1. **\`SERVICE\`**: Public clinical turnaround, customer service, admissions, transport, hostel hygiene.
   - Cleared for all authorized personnel within their geographical/entity scope.
2. **\`CONFIDENTIAL\`**: Internal whistleblowing, payroll disputes, staff harassment, financial misappropriation.
   - Requires \`user.confidential_clearance === true\`.
   - Any staff member lacking this flag cannot see, query, or receive confidential complaints.
3. **\`SAFEGUARDING\`**: Physical abuse, corporal punishment, bullying, child exploitation.
   - Requires \`user.safeguarding_acl === true\`.
   - Strictly reserved for the Child Protection Officer (CPO) and the CEO.
   - **Super Admin exclusion**: Super Admins may see aggregated counts and ticket statuses for system health, but are permanently barred from reading complaint bodies, audio notes, or attachments.

---

## 4. Hard Security Rules

### Rule 1: Self-Conflict Exclusion
If a staff member is explicitly named in a complaint (\`complaint.safeguardingPersonName === user.name\` or \`complaint.excludedPerson === user.name\`), or is the complainant:
- They are **immediately excluded from viewing or taking any action** on the complaint.
- This rule supersedes all roles, including Team Leads and Executive Directors.

### Rule 2: Separation of Duties (Two-Person Rule)
- A Handler who investigates a complaint cannot approve its final closure.
- Handlers transition cases from \`IN_PROGRESS\` to \`PENDING_CLOSURE\` with a mandatory root cause and resolution note (min 30 characters).
- Only a Team Lead, Ops Head, or Executive can approve \`CLOSED\` status.
- If a Team Lead personally investigated a case, closure approval must be escalated to Ops Head or Director Education.

### Rule 3: Clearance Barrier on Assignment
A Team Lead cannot assign a complaint to a Handler who lacks the requisite clearance:
- If \`complaint.track === 'CONFIDENTIAL'\`, the target handler must have \`confidential_clearance: true\`.
- Any assignment attempt to an uncleared handler is rejected with \`FORBIDDEN_HANDLER_NOT_CLEARED\`.

### Rule 4: Zero-Leak Data Absence
Unauthorized users do not receive redacted records; records are **completely absent** from queries:
- HTTP GET requests for complaints outside user scope or clearance return HTTP 404 Not Found (not 403 Forbidden).
`,
  },
  dataModel: {
    title: 'MongoDB Schema & Data Model Specification',
    subtitle: 'Collections, relationships, CSFLE field encryption & state transitions',
    icon: Database,
    content: `# MongoDB Schema & Data Model Specification

This specification documents the data collections, fields, relationships, encryption requirements, and anonymization rules for the MTJ Complaint Management System.

---

## 1. Security & Privacy Annotations

- **\`[ENCRYPTED_AT_REST]\`**: Stored encrypted using MongoDB Client-Side Field Level Encryption (CSFLE) with AES-256-GCM. Decryption keys are held strictly in HashiCorp Vault / AWS KMS and only granted to microservices executing under authorized roles.
- **\`[NEVER_STORED_IF_ANONYMOUS]\`**: If \`is_anonymous === true\`, these fields are stripped before database write. They are never written to write-ahead logs, indexes, or audit events.

---

## 2. Collections Specification

### 2.1 \`locations\`
Represents physical branches, diagnostic hubs, schools, and college campuses.

\`\`\`typescript
interface LocationDocument {
  _id: ObjectId;
  code: string;               // e.g. "AAS-KHN-01", unique indexed
  name: {
    en: string;               // English display name
    ur: string;               // Urdu Nastaliq display name
  };
  entity: 'AAS_LAB' | 'FOUNDATION' | 'SCHOOL' | 'COLLEGE';
  type: 'Collection Centre' | 'Head Office' | 'Regional Office' | 'Campus' | 'Hostel';
  city: string;               // e.g. "Multan", "Lahore"
  in_charge_name: string;     // Primary physical manager
  in_charge_user_id?: ObjectId;// Reference to users._id
  active: boolean;            // Defaults to true
  created_at: Date;
  updated_at: Date;
}
\`\`\`

---

### 2.2 \`complaints\`
The primary operational record.

\`\`\`typescript
interface ComplaintDocument {
  _id: ObjectId;
  ticket_code: string;        // "MTJ-XXXXXX", indexed, unique
  entity: 'AAS_LAB' | 'FOUNDATION' | 'SCHOOL' | 'COLLEGE';
  location_code: string;      // Foreign key to locations.code
  category_id: string;        // e.g. "Report delay", "Bullying"
  track: 'SERVICE' | 'CONFIDENTIAL' | 'SAFEGUARDING'; // Indexed
  submitter_type: string;     // e.g. "Patient", "Parent", "Teacher"
  is_about_person_in_charge: boolean; // Triggers 1-level bump
  
  // Encrypted Sensitive Fields
  text: string;               // [ENCRYPTED_AT_REST if track != SERVICE]
  safeguarding_person_name?: string; // [ENCRYPTED_AT_REST] Named subject
  
  // Media References
  voice_note_s3_key?: string; // [ENCRYPTED_AT_REST]
  voice_note_duration_sec?: number;
  photo_s3_keys: string[];
  
  // Submitter Privacy
  is_anonymous: boolean;
  contact_name?: string;      // [NEVER_STORED_IF_ANONYMOUS]
  contact_phone?: string;     // [NEVER_STORED_IF_ANONYMOUS, ENCRYPTED_AT_REST]
  
  // Operational Lifecycle
  status: 'NEW' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_CLOSURE' | 'CLOSED' | 'REOPENED' | 'REJECTED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority_tier: 'ROUTINE' | 'ELEVATED' | 'URGENT' | 'CRITICAL_SAFEGUARDING';
  
  // Ownership & Casework
  owner_user_id?: ObjectId;   // Reference to users._id
  owner_name: string;
  handled_by_user_id?: ObjectId;
  watchers_user_ids: ObjectId[];
  
  // Resolution & Separation of Duties
  root_cause?: 'Process gap' | 'Staff error' | 'System failure' | 'Third party' | 'Not substantiated' | 'Other';
  resolution_note?: string;   // Required before PENDING_CLOSURE (min 30 chars)
  closure_approver_user_id?: ObjectId; // Required before CLOSED
  reopen_reason?: string;
}
\`\`\`

---

### 2.3 \`complaint_events\` (Append-Only Audit Ledger)
Every operational status change, assignment, note, or view logs an immutable event.

\`\`\`typescript
interface ComplaintEventDocument {
  _id: ObjectId;
  complaint_id: ObjectId;     // Foreign key to complaints._id
  ticket_code: string;
  event_type: 'CREATED' | 'ASSIGNED' | 'REASSIGNED' | 'STATUS_CHANGE' | 'NOTE_ADDED' | 'PUBLIC_UPDATE' | 'VIEWED' | 'ESCALATED';
  actor_user_id?: ObjectId;   // Null if citizen intake
  actor_name: string;
  actor_role: string;
  details: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  created_at: Date;           // Server timestamp, indexed
}
\`\`\`
`,
  },
  apiContract: {
    title: 'REST API Contract Specification',
    subtitle: 'Public intake endpoints, persona-authenticated routes, and webhook schemas',
    icon: FileCode,
    content: `# REST API Contract Specification

This document specifies the complete REST API interface for the MTJ Complaint Management System, designed for implementation by the backend MERN engineering team.

---

## 1. Global Conventions

- **Base URL**: \`/api/v1\`
- **Response Format**: Strict JSON wrapping:
\`\`\`json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-13T10:00:00Z"
}
\`\`\`
- **Error Format**:
\`\`\`json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN_CONFLICT_OF_INTEREST",
    "message": "You are excluded from this case due to a recorded conflict."
  }
}
\`\`\`
- **Authentication**: \`Authorization: Bearer <jwt_access_token>\` in HTTP headers.

---

## 2. Public Endpoints (Unauthenticated)

### 2.1 Get Location Details by Code
- **Method**: \`GET\`
- **Path**: \`/public/locations/:code\`
- **Response**:
\`\`\`json
{
  "code": "AAS-KHN-01",
  "name": {
    "en": "AAS Lab Collection Centre, Khanewal Road",
    "ur": "اے اے ایس کلیکشن سینٹر، خانیوال روڈ ملتان"
  },
  "entity": "AAS_LAB",
  "type": "Collection Centre",
  "city": "Multan",
  "active": true
}
\`\`\`

---

### 2.2 Submit a New Complaint
- **Method**: \`POST\`
- **Path**: \`/public/complaints\`
- **Headers**: \`Content-Type: application/json\`
- **Request Body**:
\`\`\`json
{
  "location_code": "AAS-KHN-01",
  "category_id": "Diagnostic report delay",
  "track": "SERVICE",
  "submitter_type": "Patient",
  "is_about_person_in_charge": false,
  "text": "Report promised by 5 PM yesterday was delayed over 24 hours.",
  "is_anonymous": false,
  "contact": {
    "name": "Mohammad Rizwan",
    "phone": "0300-1234567"
  },
  "voice_note_s3_key": "audio/2026/09/vn-9921.webm",
  "voice_note_duration_sec": 42,
  "photo_s3_keys": ["photos/2026/09/p-01.jpg"]
}
\`\`\`
- **Response**: \`201 Created\`
\`\`\`json
{
  "ticket_code": "MTJ-202609-8812",
  "ack_deadline_at": "2026-09-13T14:00:00Z",
  "resolve_deadline_at": "2026-09-15T10:00:00Z"
}
\`\`\`

---

### 2.3 Citizen Status Tracking Portal
- **Method**: \`GET\`
- **Path**: \`/public/track/:ticket_code\`
- **Sanitization Rule**: Strips all internal notes, handler names, root cause categorizations, and private phone numbers. Returns only public bulletin updates and high-level status.

---

## 3. Authenticated Operational Endpoints

### 3.1 Handler: Submit for Closure Approval
- **Method**: \`POST\`
- **Path**: \`/complaints/:ticket_code/submit-closure\`
- **Permission**: \`complaint.resolve\`
- **Request Body**:
\`\`\`json
{
  "root_cause": "Process gap",
  "resolution_note": "Reagent calibration backlog resolved; secondary analyzer commissioned."
}
\`\`\`

### 3.2 Team Lead: Approve Closure
- **Method**: \`POST\`
- **Path**: \`/complaints/:ticket_code/approve-closure\`
- **Permission**: \`complaint.close\`
- **Hard Rule Check**: Fails with 403 if the approving user investigated the case.
`,
  },
  handover: {
    title: 'MERN Handover & Implementation Roadmap',
    subtitle: 'Phased build order, open business decisions, and production deployment checklists',
    icon: Milestone,
    content: `# MERN Engineering Handover & Implementation Roadmap

This document outlines the phased build plan, unresolved business decisions, and mandatory security requirements for engineers taking the MTJ Complaint Management System prototype to full production.

---

## 1. Phased Build Order

\`\`\`
  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │   PHASE 1    │ ───► │   PHASE 2    │ ───► │   PHASE 3    │ ───► │   PHASE 4    │
  │ Core DB &    │      │ Public Intake│      │ RBAC Layer & │      │ Escalation & │
  │ Auth Service │      │ & Media S3   │      │ Persona UIs  │      │ Notification │
  └──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
\`\`\`

### Phase 1: Core Database & Identity Infrastructure (Weeks 1–2)
- Provision MongoDB 7.0+ Replica Set with Client-Side Field Level Encryption (CSFLE) enabled for sensitive fields (\`text\`, \`contact_phone\`, \`safeguarding_person_name\`).
- Implement JWT authentication with HttpOnly secure refresh cookies and role claims.
- Seed the 22 locations, routing rules, and the initial 20 enterprise staff accounts.
- Establish the immutable append-only \`complaint_events\` audit collection.

### Phase 2: Public Intake Engine & S3 Media Microservice (Weeks 3–4)
- Deploy \`/api/v1/public/complaints\` intake endpoint with rate limiting (Redis token bucket) and honeypot validation.
- Implement direct-to-S3 pre-signed upload URLs for photos (JPEG/PNG, max 5MB) and audio notes (WebM/AAC, max 60 seconds).
- Integrate Redis/BullMQ worker to generate the sequential unique ticket codes (\`MTJ-XXXXXX\`).
- Deploy the bilingual \`/public/track/:code\` endpoint with complete data sanitization.

### Phase 3: RBAC Enforcement & Persona Consoles (Weeks 5–6)
- Implement backend \`can(user, permission, complaint)\` middleware guard on all protected Express routes.
- Integrate the 4 distinct persona interfaces:
  - **Handler Workspace**: Personal assigned queue, countdown timers, full-screen case viewer.
  - **Team Lead Console**: Triage queue, Active case manager, Awaiting Approval queue with root-cause inspections.
  - **Executive View**: Aggregated read-only analytics, hotspots, systemic issue alerts.
  - **Safeguarding Console**: Air-gapped access log, named exclusion banners.
- Enforce the **Separation of Duties** rule on \`PENDING_CLOSURE\` ➔ \`CLOSED\`.

### Phase 4: Escalation Scheduler, Messaging & WhatsApp (Weeks 7–8)
- Implement BullMQ cron worker running every 15 minutes (\`*/15 * * * *\`) querying breached acknowledgement and resolution deadlines.
- Automatically add higher-tier managers as active watchers and dispatch multi-channel alerts.
- Integrate Meta Cloud API for WhatsApp delivery (templates for ticket submission confirmation and resolution bulletin).
- Conduct penetration testing, role privilege escalation testing, and load testing.

---

## 2. Open Business & Organizational Decisions

| Item | Open Decision Point | Current Prototype Assumption | Impact if Changed |
| :--- | :--- | :--- | :--- |
| **Child Protection Officer (CPO)** | Is the CPO a single centralized executive or decentralized per region/entity? | Single centralized officer (\`Ayesha Siddiqui\`) with global safeguarding ACL. | If decentralized, \`safeguarding_acl\` must incorporate campus-level scope. |
| **Team Lead Designations** | Who holds closure authority for cross-entity complaints involving Foundation and Schools simultaneously? | Ops Head (\`Usman Farooq\`) acts as supreme operational Team Lead. | Secondary approval workflow may be required for inter-entity disputes. |
| **Anonymous Retention Period** | Should anonymous complaint IP addresses be purged immediately after rate check? | Prototype purges all IP/metadata immediately upon write (\`ANON_STORE_IP=false\`). | Legal compliance with PECA (Pakistan Electronic Crimes Act). |
| **Safeguarding Direct-to-CEO** | Does the CEO receive immediate SMS/WhatsApp alerts for every safeguarding complaint, or only after an SLA breach? | Immediate broadcast alert generated to both CPO and CEO upon ticket creation. | Executive alert fatigue if volume is high. |
| **Resolution SLA Extension** | Can a Team Lead grant an SLA extension for cases requiring forensic lab re-analysis? | Currently SLAs are immutable once calculated from routing priority. | Requires a formal \`complaint.sla.extend\` permission key and audit reason. |
`,
  },
  changelog: {
    title: 'System Release History & Version Changelog',
    subtitle: 'Chronological record of iterations, architectural additions, and refactorings',
    icon: History,
    content: `# Changelog

All notable changes to the MTJ Complaint Management System (CMS) are documented in this file.

---

## [3.0.0] - 2026-09-13
### Added
- **Unified Permissions Engine (\`src/utils/permissions.ts\`)**:
  - Centralized \`can(user, permission, complaint?)\` permission evaluation.
  - Intersects user role, operational scope (\`GLOBAL\`, \`ENTITY\`, \`REGION\`, \`LOCATION\`, \`ASSIGNED_ONLY\`, \`CASE_ACL\`), and track clearance (\`SERVICE\`, \`CONFIDENTIAL\`, \`SAFEGUARDING\`).
  - Diagnostic \`evaluatePermission()\` helper with granular reasons for access decisions.
- **Dedicated Per-Persona Interfaces**:
  - **Handler Workspace (\`/workspace\`)**: Dedicated queue for assigned cases, countdown SLA timer, full case viewer, audio player, evidence preview, and two-step resolution submitter with root-cause categorization.
  - **Team Lead Console (\`/console\`)**: 3 operational tabs (*Triage*, *Active Cases*, *Awaiting Approval*). Live handler caseload indicators, bulk reassignment, and closure approval review.
  - **Executive View (\`/executive\`)**: Read-only strategic intelligence board with 12-week weekly trend line charts by track, location hotspots with chronic repeat flags, systemic issue alerts (>30% MoM increase), and team lead accountability tables.
  - **Safeguarding Console (\`/safeguarding\`)**: Air-gapped console for Child Protection Officer and CEO. Automatic conflict-of-interest exclusion banners and a tamper-evident access log.
  - **Users & Access Admin (\`/admin\` tab)**: Directory of 20 staff accounts with confidential clearance toggles, safeguarding ACL flags, an *Effective Permissions* modal, and an interactive *Permissions Sandbox* testing engine.
- **Enhanced Status Lifecycle**:
  - Mandatory intermediate state \`PENDING_CLOSURE\` enforcing Separation of Duties.
  - Handlers can only submit cases to \`PENDING_CLOSURE\`; only Team Leads or above can approve \`CLOSED\`.
- **Project Documentation & Architecture Specs**:
  - In-app technical documentation browser with responsive markdown rendering.
  - Created root \`README.md\`, \`.env.example\`, and \`server/.env.example\`.
  - Created \`docs/PERMISSIONS.md\`, \`docs/DATA-MODEL.md\`, \`docs/API-CONTRACT.md\`, and \`docs/HANDOVER.md\`.

---

## [2.0.0] - 2026-09-12
### Added
- Bilingual intake flow in Noto Nastaliq Urdu (RTL) and English (LTR).
- 60-second voice note recording and audio playback.
- Citizen status tracking portal with ticket codes and QR codes.
- Escalation engine with dynamic SLA timers.
`,
  },
};

export function DocsViewer() {
  const [activeDocKey, setActiveDocKey] = useState<string>('permissions');
  const [copied, setCopied] = useState(false);

  const currentDoc = DOCS_CONTENT[activeDocKey] || DOCS_CONTENT.permissions;
  const Icon = currentDoc.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentDoc.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDocKey.toUpperCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="docs-viewer-root" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Docs Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Architecture & Technical Docs</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              v3.0.0
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete technical specifications, MongoDB schema, RBAC rules, REST API contracts, and MERN handover roadmaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Markdown'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download .md
          </button>
        </div>
      </div>

      {/* Grid: Navigation Sidebar + Markdown Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-1.5">
          {Object.entries(DOCS_CONTENT).map(([key, item]) => {
            const ItemIcon = item.icon;
            const isSelected = activeDocKey === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDocKey(key)}
                className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <ItemIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4
                    className={`text-xs font-bold truncate ${
                      isSelected ? 'text-sky-950' : 'text-slate-800'
                    }`}
                  >
                    {item.title.split('&')[0]}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Markdown Reader Body */}
        <div className="md:col-span-8 lg:col-span-9 bg-white rounded-xl border border-slate-200 p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Icon className="w-4 h-4" />
              <span>Specification Document</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">{currentDoc.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{currentDoc.subtitle}</p>
          </div>

          <div className="markdown-body prose prose-slate max-w-none text-slate-800 text-xs leading-relaxed space-y-4">
            <Markdown>{currentDoc.content}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}
