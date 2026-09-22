# Access Control Layer & Permissions Specification

This document details the architectural specifications for the Role-Based Access Control (RBAC) and Security Clearance Layer of the MTJ Complaint Management System.

---

## 1. Architectural Model: `can(user, permission, complaint?)`

Access is never evaluated based solely on role name. Access is the strict mathematical **intersection of three orthogonal attributes**:

$$\text{Access Granted} \iff \text{Role Has Permission} \land \text{Complaint In User Scope} \land \text{Complaint In Track Clearance} \land \neg(\text{Conflict of Interest})$$

```
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
```

---

## 2. Scope Types

| Scope Type | Description | Visibility Constraint |
| :--- | :--- | :--- |
| `GLOBAL` | Institution-wide cross-entity access | Can view records across all 4 entities (subject to track clearance). |
| `ENTITY` | Bounded to an entire organization | Can view records within a specific entity (e.g. `AAS_LAB` or `SCHOOL`). |
| `REGION` | Geographical cluster of locations | Can view records within designated cities or regional hubs (e.g. South Punjab). |
| `LOCATION` | Single physical branch or campus | Can only view records tied to a specific location code (e.g. `AAS-KHN-01`). |
| `ASSIGNED_ONLY` | Case-level worker boundary | Can ONLY see complaints where `complaint.ownerName === user.name` or user is an explicit watcher. |
| `CASE_ACL` | Air-gapped cryptographic list | Can only access cases explicitly listed in the secure safeguarding ACL table. |

---

## 3. Track Clearance Rules

1. **`SERVICE`**: Public clinical turnaround, customer service, admissions, transport, hostel hygiene.
   - Cleared for all authorized personnel within their geographical/entity scope.
2. **`CONFIDENTIAL`**: Internal whistleblowing, payroll disputes, staff harassment, financial misappropriation.
   - Requires `user.confidential_clearance === true`.
   - Any staff member lacking this flag cannot see, query, or receive confidential complaints.
3. **`SAFEGUARDING`**: Physical abuse, corporal punishment, bullying, child exploitation.
   - Requires `user.safeguarding_acl === true`.
   - Strictly reserved for the Child Protection Officer (CPO) and the CEO.
   - **Super Admin exclusion**: Super Admins may see aggregated counts and ticket statuses for system health, but are permanently barred from reading complaint bodies, audio notes, or attachments.

---

## 4. The Complete Permission Matrix

| Permission Key | HANDLER | TEAM_LEAD | TOP_MANAGEMENT | CPO | SUPER_ADMIN | AUDITOR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `complaint.view` |  (Assigned) |  (In Scope) |  (Read Only) |  (Safeguarding) |  (Sanitized) |  (Service) |
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

## 5. The Four Hard Rules

### Rule 1: Self-Conflict Exclusion
> *A staff member can never act on a complaint in which they are the named subject, the assigned owner, or the submitter.*

When a conflict is detected:
- All action controls (status change, reassignment, note submission) are suppressed.
- A prominent red notice is rendered: `"You are excluded from this case due to a recorded conflict of interest."`
- In backend operations, the complaint bypasses the user and escalates directly to `user.managerId`.

### Rule 2: Separation of Duties on Closure
> *Handlers cannot close their own investigations; Team Leads cannot close cases they personally handled.*

- **Handler Lifecycle**: `ASSIGNED` ➔ `IN_PROGRESS` ➔ `PENDING_CLOSURE`. Handlers are forbidden from moving tickets directly to `RESOLVED` or `CLOSED`.
- **Closure Prerequisites**: Moving to `PENDING_CLOSURE` mandates:
  1. A root-cause selection (`Process gap`, `Staff error`, `System failure`, `Third party`, `Not substantiated`, `Other`).
  2. A detailed resolution narrative of at least 30 characters.
- **Team Lead Approval**: Only a Team Lead (or above) can approve `PENDING_CLOSURE` ➔ `CLOSED`.
- **Lead Self-Handling Block**: If a Team Lead personally conducted the investigation (`handledBy === user.name`), their approval button is disabled with the note: *"Requires approval from Director Education / Ops Head"*.

### Rule 3: Clearance Barrier on Assignment
> *A Team Lead cannot assign a CONFIDENTIAL complaint to a Handler who lacks security clearance.*

When triaging or reassigning a `CONFIDENTIAL` complaint, the user selection dropdown strictly filters the user pool:
$$\text{Eligible Assignees} = \{ u \in \text{Handlers} \mid u.\text{active} = \text{true} \land u.\text{confidential\_clearance} = \text{true} \}$$
Non-cleared personnel do not appear in the interface.

### Rule 4: Absolute Zero-Leak Data Absence
> *Records outside a user's scope or track clearance are genuinely ABSENT.*

Complaints outside an agent's boundaries are not rendered as greyed-out rows or "Locked" cards. They are completely filtered out of:
- Database query result sets.
- Summary statistical counts and KPI badges.
- Trend charts and analytics visualizers.
- Global search indexing.
- CSV export payloads.

---

## 6. Worked Evaluation Examples

### Example 1: Investigator Handling a Lab Service Delay
- **User**: `Hamza Tariq` (Persona: `HANDLER`, Scope: `ASSIGNED_ONLY`, Confidential Clearance: `false`).
- **Target Complaint**: `MTJ-4K7P2X` (Location: `AAS-KHN-01`, Track: `SERVICE`, Owner: `Hamza Tariq`, Status: `IN_PROGRESS`).

```
1. can(Hamza, 'complaint.view', MTJ-4K7P2X)
   ➔ Check Role: HANDLER has complaint.view? YES
   ➔ Check Scope: ASSIGNED_ONLY matches owner 'Hamza Tariq'? YES
   ➔ Check Track: SERVICE permitted? YES
   ➔ Check Conflict: Hamza is owner, but NOT named subject or submitter? YES
   ➔ RESOLUTION: GRANTED

2. can(Hamza, 'complaint.close', MTJ-4K7P2X)
   ➔ Check Role: HANDLER has complaint.close? NO (Only moves to PENDING_CLOSURE)
   ➔ RESOLUTION: DENIED (Role lacks permission)

3. can(Hamza, 'complaint.export', MTJ-4K7P2X)
   ➔ Check Role: HANDLER has complaint.export? NO
   ➔ RESOLUTION: DENIED (Handlers cannot perform bulk exports)
```

---

### Example 2: Team Lead Reviewing a Staff Harassment Case
- **User**: `Dr. Sajid Bashir` (Persona: `TEAM_LEAD`, Scope: `LOCATION: AAS-KHN-01`, Confidential Clearance: `false`).
- **Target Complaint**: `MTJ-H8R2K1` (Location: `AAS-KHN-01`, Track: `CONFIDENTIAL`, Category: `Staff harassment`, Owner: `Unassigned`).

```
1. can(Dr. Sajid, 'complaint.view', MTJ-H8R2K1)
   ➔ Check Role: TEAM_LEAD has complaint.view? YES
   ➔ Check Scope: Location AAS-KHN-01 matches? YES
   ➔ Check Track: Track is CONFIDENTIAL. Does Dr. Sajid have confidential_clearance? NO (false)
   ➔ RESOLUTION: DENIED (Lacks confidential track clearance — case is ABSENT from view)
```

---

### Example 3: Top Executive Inspecting School Campus Metrics
- **User**: `Brig. (R) Khalid Mehmood` (Persona: `TOP_MANAGEMENT`, Scope: `GLOBAL`, Confidential Clearance: `true`).
- **Target Complaint**: `MTJ-9B2L4M` (Location: `AHS-MC-01`, Track: `SERVICE`, Status: `PENDING_CLOSURE`).

```
1. can(Brig. Khalid, 'complaint.view', MTJ-9B2L4M)
   ➔ Check Role: TOP_MANAGEMENT has complaint.view? YES
   ➔ Check Scope: GLOBAL covers AHS-MC-01? YES
   ➔ Check Track: SERVICE permitted? YES
   ➔ RESOLUTION: GRANTED (Read-Only)

2. can(Brig. Khalid, 'complaint.close', MTJ-9B2L4M)
   ➔ Check Role: TOP_MANAGEMENT has complaint.close? NO (Top Management has read-only executive visibility; writes are denied to enforce delegation)
   ➔ RESOLUTION: DENIED (Executives do not perform operational case closures)

3. can(Brig. Khalid, 'analytics.view.strategic', undefined)
   ➔ Check Role: TOP_MANAGEMENT has analytics.view.strategic? YES
   ➔ RESOLUTION: GRANTED
```
