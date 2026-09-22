export type Entity = 'AAS_LAB' | 'FOUNDATION' | 'SCHOOL' | 'COLLEGE';

export type Track = 'SERVICE' | 'CONFIDENTIAL' | 'SAFEGUARDING';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'NEW'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_CLOSURE'
  | 'CLOSED'
  | 'REJECTED'
  | 'REOPENED'
  // Legacy / UI aliases
  | 'New'
  | 'Acknowledged'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'
  | 'Rejected'
  | 'Reopened';

export type RootCause =
  | 'Process gap'
  | 'Staff error'
  | 'System failure'
  | 'Third party'
  | 'Not substantiated'
  | 'Other';

export type SubmitterType =
  | 'Patient'
  | 'Attendant'
  | 'Employee'
  | 'Visitor'
  | 'Donor'
  | 'Beneficiary'
  | 'Parent or Guardian'
  | 'Student'
  | 'Teacher or Staff';

export type Persona =
  | 'HANDLER'
  | 'TEAM_LEAD'
  | 'TOP_MANAGEMENT'
  | 'CHILD_PROTECTION_OFFICER'
  | 'SUPER_ADMIN'
  | 'AUDITOR';

export type ScopeType =
  | 'GLOBAL'
  | 'ENTITY'
  | 'REGION'
  | 'LOCATION'
  | 'ASSIGNED_ONLY'
  | 'CASE_ACL';

export type PermissionKey =
  | 'complaint.view'
  | 'complaint.view.any'
  | 'complaint.triage'
  | 'complaint.assign'
  | 'complaint.reassign'
  | 'complaint.severity.set'
  | 'complaint.status.progress'
  | 'complaint.resolve'
  | 'complaint.close'
  | 'complaint.reject'
  | 'complaint.reopen'
  | 'complaint.note.internal'
  | 'complaint.note.public'
  | 'complaint.attachment.add'
  | 'complaint.export'
  | 'analytics.view'
  | 'analytics.view.strategic'
  | 'routing.manage'
  | 'roles.manage'
  | 'escalation.manage'
  | 'location.manage'
  | 'audit.view'
  | 'safeguarding.access';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  persona: Persona;
  roleTitle: string;
  scopeType: ScopeType;
  scopeValue: string; // e.g. "GLOBAL", "AAS_LAB", "AAS-KHN-01"
  confidential_clearance: boolean;
  safeguarding_acl: boolean;
  managerId?: string;
  managerName?: string;
  active: boolean;
  lastLogin: string;
  isCEO?: boolean;
}

export type AdminRole =
  | 'Super Admin'
  | 'Ops Admin'
  | 'Branch Manager'
  | 'Principal'
  | 'Child Protection Officer'
  | 'Auditor';

export interface LocationItem {
  code: string;
  name: { en: string; ur: string };
  entity: Entity;
  type: 'Collection Centre' | 'Head Office' | 'Regional Office' | 'Campus' | 'Hostel';
  city: string;
  inCharge: string;
  active: boolean;
}

export interface InternalNote {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
}

export interface PublicUpdate {
  id: string;
  textUr: string;
  textEn: string;
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  eventType: 'CREATED' | 'VIEWED' | 'STATUS_CHANGE' | 'REASSIGNED' | 'NOTE_ADDED' | 'PUBLIC_UPDATE' | 'ESCALATED' | 'REOPENED';
  actor: string;
  role: string;
  details: string;
  timestamp: string;
}

export type AttachmentScanStatus = 'CLEAN' | 'PENDING' | 'INFECTED';

export interface Attachment {
  id: string;
  complaint_id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  scan_status: AttachmentScanStatus;
  scan_timestamp?: string;
  scan_error_message?: string;
  uploaded_at: string;
  is_voice_note?: boolean;
  // UI & prototype helpers
  url?: string;
  fileType: 'image' | 'pdf' | 'doc' | 'audio' | 'other';
  thumbnailUrl?: string;
}

export interface VoiceNoteData {
  durationSeconds: number;
  blobUrl?: string;
  audioData?: string; // fallback synthetic/data-url
  recordedAt: string;
}

export interface Complaint {
  id: string; // e.g. MTJ-4K7P2X
  entity: Entity;
  locationCode: string;
  locationName: { en: string; ur: string };
  category: string;
  track: Track;
  submitterType: string;
  isAboutPersonInCharge: boolean;
  safeguardingPersonName?: string;
  text: string;
  voiceNote?: VoiceNoteData;
  photos: string[];
  attachments?: Attachment[];
  isAnonymous: boolean;
  contactInfo?: {
    name?: string;
    phone?: string;
    notifyWhatsApp?: boolean;
  };
  status: ComplaintStatus;
  severity: Severity;
  createdAt: string;
  ackDeadlineHours: number;
  resolveDeadlineHours: number;
  ackDeadlineAt: string;
  resolveDeadlineAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  ownerRole: string;
  ownerName: string;
  handledBy?: string;
  watcherRoles: string[];
  watchers: string[];
  escalationLevel: number; // 0, 1, 2, 3
  isOverdue: boolean;
  matchedRuleId: string;
  internalNotes: InternalNote[];
  publicUpdates: PublicUpdate[];
  auditTimeline: AuditEvent[];
  
  // Separation of duties & resolution notes
  rootCause?: RootCause;
  resolutionNote?: string; // min 30 chars for PENDING_CLOSURE
  closureApprovalNote?: string; // required for CLOSED
  rejectionReason?: string;
  reassignmentReason?: string;
  reopenReason?: string;
  excludedPerson?: string;
}

export interface RoutingRule {
  id: string;
  priority: number;
  entity: Entity | 'ALL' | 'SCHOOL/COLLEGE' | 'AAS_LAB/FOUNDATION';
  locationCode?: string;
  category: string;
  track: Track;
  minSeverity: Severity;
  ownerRole: string;
  watcherRoles: string[];
  ackSlaHours: number;
  resolveSlaHours: number;
  active: boolean;
  isCatchAll?: boolean;
}

export interface RoleAssignment {
  id: string;
  role: string;
  scopeType: 'Location' | 'Region' | 'Entity' | 'Global';
  scope: string;
  primaryAssignee: string;
  deputy: string;
  effectiveFrom: string;
  effectiveTo: string;
}

export interface EscalationPolicy {
  id: string;
  linkedRuleCategory: string;
  level: number;
  hoursOverdue: number;
  escalateToRole: string;
  notifyChannels: ('Email' | 'WhatsApp' | 'In-app')[];
  isSafeguardingSpecial?: boolean;
}

export type ViewMode = 'SUBMIT' | 'TRACK' | 'WORKSPACE' | 'CONSOLE' | 'EXECUTIVE' | 'SAFEGUARDING' | 'ADMIN' | 'DOCS';
