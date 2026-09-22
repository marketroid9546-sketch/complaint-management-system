# MERN Engineering Handover & Implementation Roadmap

This document outlines the phased build plan, unresolved business decisions, and mandatory security requirements for engineers taking the MTJ Complaint Management System prototype to full production.

---

## 1. Phased Build Order

```
  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │   PHASE 1    │ ───► │   PHASE 2    │ ───► │   PHASE 3    │ ───► │   PHASE 4    │
  │ Core DB &    │      │ Public Intake│      │ RBAC Layer & │      │ Escalation & │
  │ Auth Service │      │ & Media S3   │      │ Persona UIs  │      │ Notification │
  └──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
```

### Phase 1: Core Database & Identity Infrastructure (Weeks 1–2)
- Provision MongoDB 7.0+ Replica Set with Client-Side Field Level Encryption (CSFLE) enabled for sensitive fields (`text`, `contact_phone`, `safeguarding_person_name`).
- Implement JWT authentication with HttpOnly secure refresh cookies and role claims.
- Seed the 22 locations, routing rules, and the initial 20 enterprise staff accounts.
- Establish the immutable append-only `complaint_events` audit collection.

### Phase 2: Public Intake Engine & S3 Media Microservice (Weeks 3–4)
- Deploy `/api/v1/public/complaints` intake endpoint with rate limiting (Redis token bucket) and honeypot validation.
- Implement direct-to-S3 pre-signed upload URLs for photos (JPEG/PNG, max 5MB) and audio notes (WebM/AAC, max 60 seconds).
- Integrate Redis/BullMQ worker to generate the sequential unique ticket codes (`MTJ-XXXXXX`).
- Deploy the bilingual `/public/track/:code` endpoint with complete data sanitization.

### Phase 3: RBAC Enforcement & Persona Consoles (Weeks 5–6)
- Implement backend `can(user, permission, complaint)` middleware guard on all protected Express routes.
- Integrate the 4 distinct persona interfaces:
  - **Handler Workspace**: Personal assigned queue, countdown timers, full-screen case viewer.
  - **Team Lead Console**: Triage queue, Active case manager, Awaiting Approval queue with root-cause inspections.
  - **Executive View**: Aggregated read-only analytics, hotspots, systemic issue alerts.
  - **Safeguarding Console**: Air-gapped access log, named exclusion banners.
- Enforce the **Separation of Duties** rule on `PENDING_CLOSURE` ➔ `CLOSED`.

### Phase 4: Escalation Scheduler, Messaging & WhatsApp (Weeks 7–8)
- Implement BullMQ cron worker running every 15 minutes (`*/15 * * * *`) querying breached acknowledgement and resolution deadlines.
- Automatically add higher-tier managers as active watchers and dispatch multi-channel alerts.
- Integrate Meta Cloud API for WhatsApp delivery (templates for ticket submission confirmation and resolution bulletin).
- Conduct penetration testing, role privilege escalation testing, and load testing.

---

## 2. Open Business & Organizational Decisions

The following policy decisions must be formally ratified by the MTJ Foundation Board of Trustees and Executive Committee prior to production deployment:

| Item | Open Decision Point | Current Prototype Assumption | Impact if Changed |
| :--- | :--- | :--- | :--- |
| **Child Protection Officer (CPO)** | Is the CPO a single centralized executive or decentralized per region/entity? | Single centralized officer (`Ayesha Siddiqui`) with global safeguarding ACL. | If decentralized, `safeguarding_acl` must incorporate campus-level scope. |
| **Team Lead Designations** | Who holds closure authority for cross-entity complaints involving Foundation and Schools simultaneously? | Ops Head (`Usman Farooq`) acts as supreme operational Team Lead. | Secondary approval workflow may be required for inter-entity disputes. |
| **Anonymous Retention Period** | Should anonymous complaint IP addresses be purged immediately after rate check? | Prototype purges all IP/metadata immediately upon write (`ANON_STORE_IP=false`). | Legal compliance with PECA (Pakistan Electronic Crimes Act). |
| **Safeguarding Direct-to-CEO** | Does the CEO receive immediate SMS/WhatsApp alerts for every safeguarding complaint, or only after an SLA breach? | Immediate broadcast alert generated to both CPO and CEO upon ticket creation. | Executive alert fatigue if volume is high. |
| **Resolution SLA Extension** | Can a Team Lead grant an SLA extension for cases requiring forensic lab re-analysis? | Currently SLAs are immutable once calculated from routing priority. | Requires a formal `complaint.sla.extend` permission key and audit reason. |

---

## 3. Mandatory Security & Compliance Requirements

### 3.1 Rate Limiting & Anti-Abuse
- Public submission endpoints must enforce **Redis Token Bucket Rate Limiting**:
  - Maximum **3 submissions per IP per 10-minute sliding window**.
  - Global threshold of **50 requests per minute per physical location code** to mitigate bot denial-of-service.
- **Honeypot Field**: Include a hidden CSS field `website_url_check` in public intake forms. Submissions with this field populated must be silently dropped with a simulated `201 Created` to mislead scrapers.

### 3.2 Media & Attachment Validation
- Audio upload maximum size: **3 Megabytes**, strictly capped at **60 seconds duration**. Validate MIME headers (`audio/webm`, `audio/ogg`, `audio/mp4`, `audio/aac`).
- Image upload maximum: **3 photos per complaint, max 5 Megabytes each**. Validate magic bytes for `image/jpeg`, `image/png`, `image/webp`. Strip all EXIF GPS metadata before persisting to S3.

### 3.3 Strict Read Auditing on Safeguarding
- In accordance with the **Safeguarding Zero-Leak Mandate**, every read access to a safeguarding complaint must trigger an atomic write to `complaint_events` with `event_type: 'VIEWED'`, recording:
  - `actor_id` and `actor_name`
  - `timestamp`
  - Client IP address and session token fingerprint.
- Safeguarding read logs cannot be truncated or deleted by any administrative role, including `SUPER_ADMIN`.

### 3.4 Zero PII for Anonymous Submissions
- When `is_anonymous === true`:
  - `contact_name`, `contact_phone`, and `contact_email` must be completely omitted from the payload.
  - Submitter IP address must be scrubbed prior to writing the `complaints` and `complaint_events` records.
  - S3 file paths must utilize randomized UUIDv4 hashes without submitter identifiers.
