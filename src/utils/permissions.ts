import {
  User,
  Complaint,
  PermissionKey,
  Persona,
  Track,
} from '../types';

// Strict Permission Grants by Persona
const ROLE_GRANTS: Record<Persona, PermissionKey[]> = {
  HANDLER: [
    'complaint.view',
    'complaint.status.progress',
    'complaint.resolve',
    'complaint.note.internal',
    'complaint.note.public',
    'complaint.attachment.add',
  ],
  TEAM_LEAD: [
    'complaint.view',
    'complaint.triage',
    'complaint.assign',
    'complaint.reassign',
    'complaint.severity.set',
    'complaint.status.progress',
    'complaint.resolve',
    'complaint.close',
    'complaint.reject',
    'complaint.reopen',
    'complaint.note.internal',
    'complaint.note.public',
    'complaint.export',
    'analytics.view',
  ],
  TOP_MANAGEMENT: [
    'complaint.view',
    'complaint.view.any',
    'analytics.view',
    'analytics.view.strategic',
    'complaint.export',
    'audit.view',
  ],
  CHILD_PROTECTION_OFFICER: [
    'complaint.view',
    'complaint.status.progress',
    'complaint.resolve',
    'complaint.close',
    'complaint.note.internal',
    'safeguarding.access',
  ],
  SUPER_ADMIN: [
    'complaint.view',
    'complaint.view.any',
    'complaint.triage',
    'complaint.reassign',
    'complaint.export',
    'analytics.view',
    'routing.manage',
    'roles.manage',
    'escalation.manage',
    'location.manage',
    'audit.view',
  ],
  AUDITOR: [
    'complaint.view',
    'audit.view',
    'analytics.view',
  ],
};

// Actions that modify or write data
const WRITE_PERMISSIONS: PermissionKey[] = [
  'complaint.triage',
  'complaint.assign',
  'complaint.reassign',
  'complaint.severity.set',
  'complaint.status.progress',
  'complaint.resolve',
  'complaint.close',
  'complaint.reject',
  'complaint.reopen',
  'complaint.note.internal',
  'complaint.note.public',
  'complaint.attachment.add',
  'routing.manage',
  'roles.manage',
  'escalation.manage',
  'location.manage',
];

/**
 * Checks if a user is excluded from a complaint due to Conflict of Interest.
 * Rule 1: A user can never act on a complaint in which they are the named subject,
 * the assigned owner, or the submitter.
 */
export function isUserExcludedFromComplaint(user: User, complaint: Complaint): boolean {
  if (!complaint) return false;

  // Named subject in safeguarding or general complaint
  if (complaint.safeguardingPersonName && complaint.safeguardingPersonName.trim().toLowerCase() === user.name.trim().toLowerCase()) {
    return true;
  }
  if (complaint.excludedPerson && complaint.excludedPerson.trim().toLowerCase() === user.name.trim().toLowerCase()) {
    return true;
  }

  // Submitter of the complaint
  if (complaint.contactInfo?.name && complaint.contactInfo.name.trim().toLowerCase() === user.name.trim().toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * Check if a complaint is within the user's operational track clearance
 */
export function isTrackAllowed(user: User, track: Track): boolean {
  if (track === 'SERVICE') {
    // Child Protection Officer ONLY sees Safeguarding
    if (user.persona === 'CHILD_PROTECTION_OFFICER') return false;
    return true;
  }

  if (track === 'CONFIDENTIAL') {
    if (user.persona === 'AUDITOR' || user.persona === 'CHILD_PROTECTION_OFFICER') {
      return false;
    }
    // Must have explicit confidential_clearance
    return user.confidential_clearance === true;
  }

  if (track === 'SAFEGUARDING') {
    // Strictly Child Protection Officer or CEO
    if (user.persona === 'CHILD_PROTECTION_OFFICER') return true;
    if (user.persona === 'TOP_MANAGEMENT' && user.isCEO) return true;
    if (user.safeguarding_acl === true) return true;
    return false;
  }

  return false;
}

/**
 * Check if a complaint is within the user's geographical / organizational scope
 */
export function isScopeAllowed(user: User, complaint: Complaint): boolean {
  if (!complaint) return true;

  if (user.scopeType === 'GLOBAL') {
    return true;
  }

  if (user.scopeType === 'ENTITY') {
    return complaint.entity === user.scopeValue;
  }

  if (user.scopeType === 'REGION') {
    // e.g. South Punjab contains AAS-KHN-01, AAS-MUL-02, etc.
    return complaint.locationCode.startsWith(user.scopeValue) || complaint.locationName.en.toLowerCase().includes(user.scopeValue.toLowerCase());
  }

  if (user.scopeType === 'LOCATION') {
    return complaint.locationCode === user.scopeValue;
  }

  if (user.scopeType === 'ASSIGNED_ONLY') {
    // Handler scope: must be assigned owner or explicit watcher
    const isOwner = complaint.ownerName.trim().toLowerCase() === user.name.trim().toLowerCase();
    const isWatcher = complaint.watchers?.some((w) => w.trim().toLowerCase() === user.name.trim().toLowerCase());
    return isOwner || isWatcher;
  }

  if (user.scopeType === 'CASE_ACL') {
    // Case ACL scope (e.g. Safeguarding)
    return complaint.track === 'SAFEGUARDING' && user.safeguarding_acl === true;
  }

  return false;
}

/**
 * Core Permission Evaluation Function
 * Evaluates the intersection of:
 * 1. Role grant
 * 2. Scope match
 * 3. Track clearance
 * 4. Conflict of interest
 * 5. Separation of duties
 */
export function evaluatePermission(
  user: User,
  permission: PermissionKey,
  complaint?: Complaint
): { granted: boolean; reason: string } {
  if (!user || !user.active) {
    return { granted: false, reason: 'User account is inactive or undefined' };
  }

  // 1. Role Grant Check
  const allowedPerms = ROLE_GRANTS[user.persona] || [];
  if (!allowedPerms.includes(permission)) {
    return {
      granted: false,
      reason: `DENIED: role ${user.persona} does not hold '${permission}'`,
    };
  }

  // If no specific complaint is provided (e.g. general navigation / analytics check)
  if (!complaint) {
    return {
      granted: true,
      reason: `GRANTED: role ${user.persona} has system-level permission '${permission}'`,
    };
  }

  // 2. Track Clearance Check
  if (!isTrackAllowed(user, complaint.track)) {
    return {
      granted: false,
      reason: `DENIED: user lacks track clearance for ${complaint.track}`,
    };
  }

  // 3. Geographical / Entity Scope Check
  if (!isScopeAllowed(user, complaint)) {
    return {
      granted: false,
      reason: `DENIED: out of scope, case belongs to ${complaint.locationCode} (${complaint.entity}) while user scope is ${user.scopeType}:${user.scopeValue}`,
    };
  }

  // 4. Hard Rule 1: Conflict of Interest
  if (isUserExcludedFromComplaint(user, complaint)) {
    if (WRITE_PERMISSIONS.includes(permission)) {
      return {
        granted: false,
        reason: `DENIED: conflict of interest — user is named subject or submitter on this case`,
      };
    }
    // If user is named subject in a safeguarding or confidential report, even view is forbidden
    if (complaint.track !== 'SERVICE') {
      return {
        granted: false,
        reason: `DENIED: named subject in sensitive track cannot view this report`,
      };
    }
  }

  // 5. Hard Rule 2: Separation of Duties on Closure
  if (permission === 'complaint.close') {
    // Only Team Lead, Top Management or CPO can close
    if (user.persona === 'HANDLER') {
      return {
        granted: false,
        reason: `DENIED: Handlers can only progress to PENDING_CLOSURE with root cause, not finalize closure`,
      };
    }

    // A Team Lead cannot close a case they personally investigated/handled
    const leadPersonallyHandled =
      complaint.handledBy?.trim().toLowerCase() === user.name.trim().toLowerCase() ||
      (complaint.ownerName.trim().toLowerCase() === user.name.trim().toLowerCase() && user.persona === 'TEAM_LEAD');

    if (leadPersonallyHandled) {
      return {
        granted: false,
        reason: `DENIED: Separation of Duties — Team Lead personally investigated this case. Requires closure approval from Director Education or Ops Head`,
      };
    }
  }

  // Top Management writes are denied (Read-only policy)
  if (user.persona === 'TOP_MANAGEMENT' && WRITE_PERMISSIONS.includes(permission)) {
    return {
      granted: false,
      reason: `DENIED: Top Management has strictly read-only executive visibility`,
    };
  }

  // Auditor writes are denied
  if (user.persona === 'AUDITOR' && WRITE_PERMISSIONS.includes(permission)) {
    return {
      granted: false,
      reason: `DENIED: Auditor role is strictly read-only governance`,
    };
  }

  return {
    granted: true,
    reason: `GRANTED: Verified role, scope (${user.scopeType}), track (${complaint.track}), and separation of duties`,
  };
}

/**
 * Standard can() predicate required by the specification:
 * can(user, permission, complaint?) -> boolean
 */
export function can(user: User, permission: PermissionKey, complaint?: Complaint): boolean {
  return evaluatePermission(user, permission, complaint).granted;
}

/**
 * Filter complaints strictly based on user's Scope and Track Clearance.
 * Enforces Hard Rule 4:
 * "Rows outside a user's scope or track clearance are genuinely ABSENT —
 * not greyed, not locked placeholders. They are excluded from tables, counts, charts, search results and exports."
 */
export function filterComplaintsForUser(complaints: Complaint[], user: User): Complaint[] {
  if (!user || !user.active) return [];

  return complaints.filter((c) => {
    // 1. Must be allowed track
    if (!isTrackAllowed(user, c.track)) return false;

    // 2. Must be allowed scope
    if (!isScopeAllowed(user, c)) return false;

    // 3. Super Admin sanitization:
    // "SUPER_ADMIN ... NOT safeguarding content — they may see that a safeguarding case exists
    // and its status, never its body, attachments or submitter"
    // So Super Admin sees basic record if they have general visibility, but if user is named in conflict they cannot see
    if (isUserExcludedFromComplaint(user, c) && c.track !== 'SERVICE') {
      return false;
    }

    return true;
  });
}

/**
 * Return resolved list of effective permissions for a user
 */
export function getEffectivePermissions(user: User): { key: PermissionKey; granted: boolean; description: string }[] {
  const allKeys: { key: PermissionKey; description: string }[] = [
    { key: 'complaint.view', description: 'View complaints within assigned scope' },
    { key: 'complaint.view.any', description: 'Cross-entity unrestricted read visibility' },
    { key: 'complaint.triage', description: 'Triage unassigned cases and set initial priority' },
    { key: 'complaint.assign', description: 'Assign complaints to eligible team handlers' },
    { key: 'complaint.reassign', description: 'Transfer ownership or reassign active cases' },
    { key: 'complaint.severity.set', description: 'Modify case severity (LOW to CRITICAL)' },
    { key: 'complaint.status.progress', description: 'Progress case lifecycle (Start work, In Progress)' },
    { key: 'complaint.resolve', description: 'Submit case for closure with resolution note and root cause' },
    { key: 'complaint.close', description: 'Approve final case closure (Team Lead or above)' },
    { key: 'complaint.reject', description: 'Reject invalid complaint with mandatory justification' },
    { key: 'complaint.reopen', description: 'Reopen closed complaint with SLA reset' },
    { key: 'complaint.note.internal', description: 'Add confidential internal notes' },
    { key: 'complaint.note.public', description: 'Publish public updates to citizen tracking portal' },
    { key: 'complaint.attachment.add', description: 'Attach photos or audio evidence' },
    { key: 'complaint.export', description: 'Export complaints data to CSV' },
    { key: 'analytics.view', description: 'View operational throughput and volume metrics' },
    { key: 'analytics.view.strategic', description: 'View strategic executive trends, hotspots, and systemic issues' },
    { key: 'routing.manage', description: 'Configure routing priority matrix' },
    { key: 'roles.manage', description: 'Manage institutional role designations and deputies' },
    { key: 'escalation.manage', description: 'Configure SLA escalation trigger policies' },
    { key: 'location.manage', description: 'Manage facilities directory and QR placards' },
    { key: 'audit.view', description: 'View immutable append-only chronological audit trail' },
    { key: 'safeguarding.access', description: 'Access air-gapped safeguarding child welfare console' },
  ];

  return allKeys.map((item) => ({
    key: item.key,
    description: item.description,
    granted: can(user, item.key),
  }));
}
