# MongoDB Schema & Data Model Specification

This specification documents the data collections, fields, relationships, encryption requirements, and anonymization rules for the MTJ Complaint Management System.

---

## 1. Security & Privacy Annotations

- **`[ENCRYPTED_AT_REST]`**: Stored encrypted using MongoDB Client-Side Field Level Encryption (CSFLE) with AES-256-GCM. Decryption keys are held strictly in HashiCorp Vault / AWS KMS and only granted to microservices executing under authorized roles.
- **`[NEVER_STORED_IF_ANONYMOUS]`**: If `is_anonymous === true`, these fields are stripped before database write. They are never written to write-ahead logs, indexes, or audit events.

---

## 2. Collections Specification

### 2.1 `locations`
Represents physical branches, diagnostic hubs, schools, and college campuses.

```typescript
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
```

---

### 2.2 `complaints`
The primary operational record.

```typescript
interface ComplaintDocument {
  _id: ObjectId;
  ticket_code: string;        // "MTJ-XXXXXX", indexed, unique
  entity: 'AAS_LAB' | 'FOUNDATION' | 'SCHOOL' | 'COLLEGE';
  location_code: string;      // Foreign key to locations.code
  location_name: {
    en: string;
    ur: string;
  };
  category_id: string;        // e.g. "Report delay", "Bullying"
  track: 'SERVICE' | 'CONFIDENTIAL' | 'SAFEGUARDING'; // Indexed
  submitter_type: string;     // e.g. "Patient", "Parent", "Teacher"
  is_about_person_in_charge: boolean; // Triggers 1-level bump
  
  // Encrypted Sensitive Fields
  text: string;               // [ENCRYPTED_AT_REST if track != SERVICE]
  safeguarding_person_name?: string; // [ENCRYPTED_AT_REST] Named subject
  
  // Submitter Privacy & Anonymity
  is_anonymous: boolean;
  contact_name?: string;      // [NEVER_STORED_IF_ANONYMOUS]
  contact_phone?: string;     // [NEVER_STORED_IF_ANONYMOUS, ENCRYPTED_AT_REST]
  contact_email?: string;     // [NEVER_STORED_IF_ANONYMOUS, ENCRYPTED_AT_REST]
  notify_whatsapp: boolean;
  
  // Operational State
  status: 'NEW' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_CLOSURE' | 'CLOSED' | 'REJECTED' | 'REOPENED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Resolution & Separation of Duties
  root_cause?: 'Process gap' | 'Staff error' | 'System failure' | 'Third party' | 'Not substantiated' | 'Other';
  resolution_note?: string;   // Min 30 chars required for PENDING_CLOSURE
  closure_approval_note?: string;// Required from Team Lead for CLOSED
  rejection_reason?: string;  // Required if status == REJECTED
  reopen_reason?: string;     // Required if status == REOPENED
  
  // Assignment & Ownership
  owner_role: string;         // e.g. "Branch Manager"
  owner_user_id?: ObjectId;   // Reference to users._id
  owner_name: string;         // e.g. "Dr. Sajid Bashir"
  handled_by?: string;        // Specific Handler who conducted investigation
  watchers: string[];         // Names or user IDs of subscribed monitors
  
  // SLAs & Timestamps
  created_at: Date;
  ack_deadline_at: Date;
  resolve_deadline_at: Date;
  acknowledged_at?: Date;
  resolved_at?: Date;
  closed_at?: Date;
  is_overdue: boolean;
  escalation_level: 0 | 1 | 2 | 3;
  
  matched_rule_id: string;
}
```

---

### 2.3 `attachments`
Stores photo and voice recording metadata. Binary blobs reside in secure S3 buckets.

```typescript
interface AttachmentDocument {
  _id: ObjectId;
  complaint_id: ObjectId;     // Foreign key to complaints._id
  ticket_code: string;
  type: 'PHOTO' | 'VOICE_NOTE';
  s3_key: string;             // Private S3 object key
  s3_bucket: string;
  file_name: string;
  mime_type: string;          // e.g. "image/jpeg", "audio/webm"
  size_bytes: number;
  duration_seconds?: number;  // For voice notes (max 60)
  is_encrypted: boolean;      // True for CONFIDENTIAL / SAFEGUARDING
  created_at: Date;
}
```

---

### 2.4 `complaint_events` (Audit Log)
Immutable chronological append-only ledger.

```typescript
interface ComplaintEventDocument {
  _id: ObjectId;
  complaint_id: ObjectId;     // Indexed
  ticket_code: string;
  event_type: 'CREATED' | 'VIEWED' | 'STATUS_CHANGE' | 'REASSIGNED' | 'NOTE_ADDED' | 'PUBLIC_UPDATE' | 'ESCALATED' | 'REOPENED';
  actor_id?: ObjectId;        // Null for public submitter
  actor_name: string;
  actor_role: string;
  ip_address?: string;        // [NEVER_STORED_IF_ANONYMOUS]
  user_agent?: string;
  details: string;            // Human-readable change summary
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  timestamp: Date;            // Indexed
}
```

---

### 2.5 `users`
Staff and administrative personnel directory.

```typescript
interface UserDocument {
  _id: ObjectId;
  name: string;               // e.g. "Ayesha Siddiqui"
  email: string;              // Unique indexed
  phone: string;
  password_hash: string;      // Bcrypt hash (cost factor 12)
  persona: 'HANDLER' | 'TEAM_LEAD' | 'TOP_MANAGEMENT' | 'CHILD_PROTECTION_OFFICER' | 'SUPER_ADMIN' | 'AUDITOR';
  role_title: string;         // e.g. "Senior Lab Technologist", "Principal"
  scope_type: 'GLOBAL' | 'ENTITY' | 'REGION' | 'LOCATION' | 'ASSIGNED_ONLY' | 'CASE_ACL';
  scope_value: string;        // e.g. "AAS-KHN-01", "AAS_LAB", "GLOBAL"
  confidential_clearance: boolean; // Enables CONFIDENTIAL track access
  safeguarding_acl: boolean;  // Enables SAFEGUARDING track access
  manager_id?: ObjectId;      // Foreign key to users._id for auto-escalations
  active: boolean;            // Disabled staff cannot log in
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}
```

---

### 2.6 `role_assignments`
Maps institutional designations to active employees and designated deputies.

```typescript
interface RoleAssignmentDocument {
  _id: ObjectId;
  role: string;               // e.g. "Branch Manager"
  scope_type: 'Location' | 'Region' | 'Entity' | 'Global';
  scope: string;              // e.g. "AAS-KHN-01"
  primary_user_id?: ObjectId; // Foreign key to users._id
  primary_name: string;
  deputy_user_id?: ObjectId;
  deputy_name?: string;
  effective_from: Date;
  effective_to: Date;
  created_at: Date;
  updated_at: Date;
}
```

---

### 2.7 `routing_rules`
Decision matrix evaluated upon citizen complaint creation.

```typescript
interface RoutingRuleDocument {
  _id: ObjectId;
  priority: number;           // 1 to 99, unique indexed
  entity: 'AAS_LAB' | 'FOUNDATION' | 'SCHOOL' | 'COLLEGE' | 'ALL' | 'SCHOOL/COLLEGE' | 'AAS_LAB/FOUNDATION';
  location_code?: string;
  category: string;
  track: 'SERVICE' | 'CONFIDENTIAL' | 'SAFEGUARDING';
  min_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner_role: string;
  watcher_roles: string[];
  ack_sla_hours: number;
  resolve_sla_hours: number;
  active: boolean;
  is_catch_all: boolean;      // Pinned at priority 99
  created_at: Date;
}
```

---

### 2.8 `escalation_policies`
Overdue trigger definitions.

```typescript
interface EscalationPolicyDocument {
  _id: ObjectId;
  linked_rule_category: string;
  level: 1 | 2 | 3;
  hours_overdue: number;
  escalate_to_role: string;
  notify_channels: ('Email' | 'WhatsApp' | 'In-app')[];
  is_safeguarding_special: boolean;
}
```

---

### 2.9 `safeguarding_acl`
Cryptographic access control list for zero-tolerance cases.

```typescript
interface SafeguardingACLDocument {
  _id: ObjectId;
  complaint_id: ObjectId;     // Foreign key to complaints._id
  authorized_user_id: ObjectId;
  granted_by: ObjectId;
  access_level: 'READ' | 'READ_WRITE';
  revoked: boolean;
  granted_at: Date;
}
```

---

### 2.10 `notifications`
Dispatched delivery queue for SMS, WhatsApp, and email alerts.

```typescript
interface NotificationDocument {
  _id: ObjectId;
  recipient_user_id?: ObjectId;
  recipient_phone?: string;
  recipient_email?: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'IN_APP';
  template_id: string;
  preview_text: string;       // For safeguarding, strictly "A safeguarding report has been filed. Open the dashboard."
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  attempts: number;
  dispatched_at?: Date;
  error_message?: string;
}
```
