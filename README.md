# MTJ Complaint Management System (CMS)
*Enterprise Institutional Redressal & Safeguarding Platform*

---

## 1. System Overview & Problem Statement

The **MTJ Complaint Management System** is a unified, mobile-first redressal and safeguarding infrastructure engineered for a prominent Pakistani nonprofit conglomerate operating across four distinct entities:

1. **AAS Lab (`AAS_LAB`)**: A high-volume diagnostic centre network with collection centres across Southern and Central Punjab (e.g., Khanewal Road, Nishtar Road, Dera Ghazi Khan, Bahawalpur).
2. **MTJ Foundation (`FOUNDATION`)**: Head office, regional hubs, relief operations, welfare clinics, and donor-facing departments.
3. **Alhasanain School System (`SCHOOL`)**: K-10 campus network educating thousands of students across Multan, Lahore, Faisalabad, and Rawalpindi.
4. **Alhasanain College (`COLLEGE`)**: Higher-secondary academic campuses and on-site residential boarding hostels.

### The Problem It Solves
Prior to this system, feedback and grievances were fragmented across informal WhatsApp messages, paper suggestion boxes, and unmonitored reception registers. Critical incidents—especially child welfare and staff harassment—suffered from under-reporting due to fear of local retaliation. 

This platform establishes:
- **Zero-Barrier Citizen Access**: Direct QR code intake at every physical facility without login requirements, complete bilingual support (**Urdu Nastaliq RTL** default and English LTR), 60-second voice note recording, and guaranteed anonymous filing.
- **Three-Track Confidentiality Firewall**: Complete data and operational isolation between **Service** grievances, **Confidential** internal escalations (HR/payroll/whistleblower), and zero-tolerance **Safeguarding** reports (child safety/abuse/corporal punishment).
- **Enforced Separation of Duties**: Prevention of conflicts of interest where local administrators could hide or dismiss grievances filed against themselves or their staff.
- **Strict SLA Governance**: Mathematical SLA tracking with multi-tier escalations that alert executive leadership automatically upon overdue thresholds without stripping operational ownership.

---

## 2. Screen Map & Persona Routing

The system routes users to specialized, purpose-built interfaces rather than toggling hidden buttons on a monolithic screen:

| Route | Primary Persona | Purpose & Functional Scope |
| :--- | :--- | :--- |
| `/c/:locationCode` | **Public / Citizen** | Facility-bound intake flow. 7-step accessible questionnaire with voice recording, photos, and auto-SLA confirmation. |
| `/t` or `/t/:ticketId` | **Public / Citizen** | Public tracker. Vertical timeline tracking real-time status and public bulletins. Internal notes strictly suppressed. |
| `/workspace` | **HANDLER (Investigator)** | Dedicated case clearance queue. Personal workload cards, countdown badges, full-screen case view, activity logging, and *Submit for Closure* modal. |
| `/console` | **TEAM_LEAD** | Three-tab operational console: *Triage*, *Active Cases*, and *Awaiting Approval* (closure review). Inline severity, handler capacity monitoring, bulk reassignment, and SLA analytics. |
| `/executive` | **TOP_MANAGEMENT** | Read-only executive strategic intelligence. 12-week track trends, chronic location hotspots, systemic category shifts (>30% MoM), and lead accountability metrics. |
| `/safeguarding` | **CHILD_PROTECTION_OFFICER / CEO** | Air-gapped safeguarding console. Plain high-security layout, automatic conflict exclusion banners, and tamper-evident access log of every view. |
| `/admin` | **SUPER_ADMIN** | Institutional governance: locations directory, QR placard generator, priority routing rules engine, role assignments, escalation policies, and live Permissions Sandbox. |
| `/docs` | **All Staff / Auditors** | In-app technical documentation viewer rendering specifications, permissions matrix, API contracts, and architecture docs. |

---

## 3. The Three Confidentiality Tracks

To prevent operational contamination and protect vulnerable individuals, all incoming cases are compartmentalized into three immutable tracks:

```
                      ┌─────────────────────────────────────────┐
                      │          Citizen QR Intake              │
                      └────────────────────┬────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
   [SERVICE TRACK]                 [CONFIDENTIAL TRACK]             [SAFEGUARDING TRACK]
 • Turnaround / Reports           • Salary & Payroll disputes       • Physical harm / Corporal
 • Hygiene & Facility upkeep      • Staff harassment & bullying     • Child sexual abuse
 • Academic & Transport delays    • Financial embezzlement          • Emotional neglect
 ─────────────────────────────    ─────────────────────────────     ─────────────────────────────
 Routed to Branch Managers &      Routed to HR Head, Finance        Routed exclusively to CPO &
 Campus Admin Officers            Head, & CEO PA                    CEO. Completely air-gapped
 Visible in normal reports        Requires Security Clearance       Excluded from all standard APIs
```

1. **SERVICE Track**: Operational, academic, and customer service matters. Handled through decentralized facility-level supervision.
2. **CONFIDENTIAL Track**: Whistleblower disclosures, staff grievances, and financial fraud. Only accessible to users with verified `confidential_clearance = true`.
3. **SAFEGUARDING Track**: Zero-tolerance child safety concerns. Completely absent from standard dashboards, CSV exports, search bars, and digest notifications. The Super Admin only sees that a safeguarding case exists and its status, but **never** its body, attachments, or submitter details.

---

## 4. Permission Matrix

Access is enforced via `can(user, permission, complaint?)` based on the intersection of **Role**, **Scope**, and **Track Clearance**:

| Permission Key | HANDLER | TEAM_LEAD | TOP_MANAGEMENT | CPO | SUPER_ADMIN | AUDITOR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `complaint.view` |  (Assigned) |  (In Scope) |  (Read Only) |  (Safeguard) |  (Sanitized) |  (Service) |
| `complaint.view.any` | ❌ | ❌ |  | ❌ |  | ❌ |
| `complaint.triage` | ❌ |  | ❌ | ❌ |  (Recovery) | ❌ |
| `complaint.assign` | ❌ |  | ❌ | ❌ | ❌ | ❌ |
| `complaint.reassign` | ❌ |  | ❌ | ❌ |  | ❌ |
| `complaint.severity.set` | ❌ |  | ❌ | ❌ | ❌ | ❌ |
| `complaint.status.progress`|  |  | ❌ |  | ❌ | ❌ |
| `complaint.resolve` |  (To Pending) |  | ❌ |  | ❌ | ❌ |
| `complaint.close` | ❌ |  | ❌ |  | ❌ | ❌ |
| `complaint.reject` | ❌ |  | ❌ | ❌ | ❌ | ❌ |
| `complaint.reopen` | ❌ |  |  | ❌ | ❌ | ❌ |
| `complaint.note.internal` |  |  | ❌ |  | ❌ | ❌ |
| `complaint.note.public` |  |  | ❌ | ❌ | ❌ | ❌ |
| `complaint.attachment.add`|  |  | ❌ |  | ❌ | ❌ |
| `complaint.export` | ❌ |  |  | ❌ |  | ❌ |
| `analytics.view` | ❌ |  |  | ❌ |  |  |
| `analytics.view.strategic`| ❌ | ❌ |  | ❌ | ❌ | ❌ |
| `routing.manage` | ❌ | ❌ | ❌ | ❌ |  | ❌ |
| `roles.manage` | ❌ | ❌ | ❌ | ❌ |  | ❌ |
| `escalation.manage` | ❌ | ❌ | ❌ | ❌ |  | ❌ |
| `location.manage` | ❌ | ❌ | ❌ | ❌ |  | ❌ |
| `audit.view` | ❌ | ❌ |  | ❌ |  |  |
| `safeguarding.access` | ❌ | ❌ | ❌ (CEO only)|  | ❌ | ❌ |

---

## 5. Status Flow & Enforced Separation of Duties

The lifecycle enforces strict checks between investigation and final sign-off:

```
 [NEW] ──(Triage)──► [TRIAGED] ──(Assign)──► [ASSIGNED] ──(Start)──► [IN_PROGRESS]
   │                                                                      │
   │ (Reject with                                       (Submit with      │
   │  mandatory note)                                    root cause &     │
   ▼                                                     min 30 chars)    ▼
 [REJECTED]                                                      [PENDING_CLOSURE]
                                                                          │
                                                      (Team Lead Approval │
                                                       with approval note)▼
 [REOPENED] ◄────────(Reopen with mandatory reason)────────────── [CLOSED]
```

### The 4 Hard Rules
1. **Self-Conflict Exclusion**: A staff member can **never** act on a case where they are the named subject, the assigned owner, or the submitter. The system displays a red exclusion notice and auto-routes escalation to their direct manager.
2. **Separation of Duties on Closure**: A Handler can only advance a case to `PENDING_CLOSURE` by supplying a root cause and a detailed resolution note (>= 30 characters). Only a Team Lead (or above) can approve final transition to `CLOSED`. Crucially, if a Team Lead personally handled or investigated the case, they are disqualified from approving closure—the ticket automatically flags for Director/Ops Head review.
3. **Clearance Barrier on Assignment**: A Team Lead cannot assign a `CONFIDENTIAL` case to any Handler lacking `confidential_clearance = true`. Non-cleared handlers are filtered out of assignee selectors.
4. **Absolute Zero-Leak Data Absence**: Cases outside a user's geographical scope or security track are completely absent from queries, counts, exports, and UI tables.

---

## 6. Routing Engine & Escalation Ladder

### Routing Priority Logic
1. Rules are evaluated sequentially by `priority` ascending (1 to 99).
2. The engine evaluates: `Entity Match` ➔ `Location Match` ➔ `Category Match` ➔ `Track Match` ➔ `Severity Match`.
3. An undeletable fallback catch-all rule (`priority: 99`) ensures no ticket remains unassigned.
4. **Rule Overrides**:
   - **Critical Severity**: Automatically halves acknowledgement and resolution SLA hours.
   - **Person in Charge**: If the citizen flags that the complaint is *"about the person in charge here"*, ownership bumps one tier up the reporting chain.

### Escalation Protocol
> *"Escalation ADDS a watcher and NEVER transfers primary ownership."*

- **Tier 1 (Ack SLA Breached)**: Assignee's direct manager added as a watcher.
- **Tier 2 (Resolve SLA Breached)**: Division Head (Ops Head / HR Head / Director Education) added as watcher; WhatsApp and SMS alerts dispatched.
- **Tier 3 (2x Resolve SLA Breached)**: CEO PA and Executive Committee added as watchers; case flagged on Executive Scorecard.
- **Safeguarding Exception**: Single instant escalation to CEO if unacknowledged within 2 hours.

---

## 7. Local MERN Setup Instructions

To run the complete production MERN stack locally:

### Prerequisites
- Node.js v20+
- MongoDB v7.0+ (replica set recommended for transactions)
- npm or yarn

### 1. Repository Setup
```bash
git clone https://github.com/mtj-foundation/cms-core.git
cd cms-core
```

### 2. Backend Server Configuration
```bash
cd server
cp .env.example .env
npm install
npm run dev
# Server binds to http://localhost:5000
```

### 3. Frontend Client Configuration
```bash
cd ../client
cp .env.example .env
npm install
npm run dev
# Client runs on http://localhost:3000
```

---

## 8. What Is Mocked In This Prototype

This prototype functions entirely client-side using responsive React state. For enterprise production deployment, the following components must be built:

| Subsystem | Prototype Implementation | Production Implementation Required |
| :--- | :--- | :--- |
| **Authentication** | Simulated role/user dropdown switcher | JWT access tokens + HttpOnly refresh cookies, Active Directory / LDAP SSO integration |
| **Database** | In-memory JavaScript arrays & local storage | MongoDB with field-level encryption (Client-Side Field Level Encryption for Safeguarding) |
| **File Storage** | Browser `FileReader` base64 data URLs | AWS S3 or MinIO buckets with signed upload URLs and virus scanning |
| **Messaging** | Simulated notification toasts | Meta Cloud API (WhatsApp Business) & SendGrid/AWS SES for email templates |
| **SLA Tracking** | Client-side timestamp calculations | Distributed Redis/BullMQ cron scheduler checking overdue thresholds every 5 minutes |
| **Audio Capture** | HTML5 MediaRecorder web stream | Audio transcode to AAC/MP3, automated speech-to-text indexing for Urdu and Roman Urdu |
| **QR Generation**| Dynamic client-side Canvas rendering | Serverless PDF placard batch renderer producing print-ready 300 DPI vector assets |
