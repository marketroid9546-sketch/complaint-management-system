import {
  Entity,
  Track,
  Severity,
  RoutingRule,
  RoleAssignment,
  LocationItem,
} from '../types';
import { MOCK_USERS } from '../data/mockData';

export interface SimulatedRoutingResult {
  matchedRule: RoutingRule;
  resolvedOwnerRole: string;
  resolvedOwnerName: string;
  watcherRoles: string[];
  watcherNames: string[];
  ackSlaHours: number;
  resolveSlaHours: number;
  excludedPerson?: string;
  appliedOverrides: string[];
}

export function matchRoutingRule(
  rules: RoutingRule[],
  entity: Entity,
  category: string,
  track: Track,
  _severity: Severity
): RoutingRule {
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (!rule.active) continue;

    // Check track match
    if (rule.track !== track) continue;

    // Check entity match
    let entityMatches = false;
    if (rule.entity === 'ALL') entityMatches = true;
    else if (rule.entity === entity) entityMatches = true;
    else if (rule.entity === 'AAS_LAB/FOUNDATION' && (entity === 'AAS_LAB' || entity === 'FOUNDATION')) entityMatches = true;
    else if (rule.entity === 'SCHOOL/COLLEGE' && (entity === 'SCHOOL' || entity === 'COLLEGE')) entityMatches = true;

    if (!entityMatches) continue;

    // Check category match
    if (rule.category === category || rule.isCatchAll) {
      return rule;
    }
  }

  // Fallback to catch-all
  const catchAll = rules.find((r) => r.isCatchAll) || rules[rules.length - 1];
  return catchAll;
}

export function resolveOwnerName(
  role: string,
  locationCode: string,
  roleAssignments: RoleAssignment[],
  locations: LocationItem[]
): string {
  // Check location-specific assignment first
  const locAssignment = roleAssignments.find(
    (ra) => ra.role === role && ra.scopeType === 'Location' && ra.scope.includes(locationCode) && ra.primaryAssignee
  );
  if (locAssignment) return locAssignment.primaryAssignee;

  // Check location's inCharge if role matches Branch Manager or Principal or Campus Admin
  const loc = locations.find((l) => l.code === locationCode);
  if (loc && (role === 'Branch Manager' || role === 'Principal') && loc.inCharge) {
    return loc.inCharge;
  }

  // Check entity or global assignment
  const generalAssignment = roleAssignments.find(
    (ra) => ra.role === role && ra.primaryAssignee
  );
  if (generalAssignment) return generalAssignment.primaryAssignee;

  // Check MOCK_USERS by role
  const user = Object.values(MOCK_USERS).find((u) => u.role === role);
  if (user) return user.name;

  return `${role} Desk`;
}

export function simulateRouting(
  rules: RoutingRule[],
  roleAssignments: RoleAssignment[],
  locations: LocationItem[],
  params: {
    entity: Entity;
    locationCode: string;
    category: string;
    track: Track;
    severity: Severity;
    isAboutPersonInCharge: boolean;
    safeguardingPersonName?: string;
  }
): SimulatedRoutingResult {
  const matchedRule = matchRoutingRule(rules, params.entity, params.category, params.track, params.severity);
  const appliedOverrides: string[] = [];

  let resolvedOwnerRole = matchedRule.ownerRole;
  let watcherRoles = [...matchedRule.watcherRoles];
  let ackSlaHours = matchedRule.ackSlaHours;
  let resolveSlaHours = matchedRule.resolveSlaHours;

  // Override 1: "About the person in charge here" = Yes bumps owner one level up the ladder
  if (params.isAboutPersonInCharge) {
    if (resolvedOwnerRole === 'Branch Manager') {
      resolvedOwnerRole = 'Regional Manager';
      appliedOverrides.push('In-charge override: Owner bumped from Branch Manager to Regional Manager');
    } else if (resolvedOwnerRole === 'Campus Admin Officer' || resolvedOwnerRole === 'Principal') {
      resolvedOwnerRole = 'Director Education';
      appliedOverrides.push(`In-charge override: Owner bumped from ${matchedRule.ownerRole} to Director Education`);
    } else if (resolvedOwnerRole === 'Hostel Warden') {
      resolvedOwnerRole = 'Principal';
      appliedOverrides.push('In-charge override: Owner bumped from Hostel Warden to Principal');
    } else if (resolvedOwnerRole === 'Regional Manager') {
      resolvedOwnerRole = 'Ops Head';
      appliedOverrides.push('In-charge override: Owner bumped from Regional Manager to Ops Head');
    } else if (resolvedOwnerRole === 'Director Education') {
      resolvedOwnerRole = 'CEO PA';
      appliedOverrides.push('In-charge override: Owner bumped from Director Education to CEO PA');
    }
  }

  // Override 2: Severity CRITICAL adds CEO PA as watcher and halves the ack SLA
  if (params.severity === 'CRITICAL') {
    ackSlaHours = Math.max(1, Math.round(ackSlaHours / 2));
    if (!watcherRoles.includes('CEO PA')) {
      watcherRoles.push('CEO PA');
    }
    appliedOverrides.push(`Critical severity: Ack SLA halved to ${ackSlaHours}h & CEO PA added as mandatory watcher`);
  }

  // Resolve Names
  let resolvedOwnerName = resolveOwnerName(resolvedOwnerRole, params.locationCode, roleAssignments, locations);

  let watcherNames = watcherRoles.map((r) =>
    resolveOwnerName(r, params.locationCode, roleAssignments, locations)
  );

  // Override 3: SAFEGUARDING always excludes any person named on Screen 4 from the case
  let excludedPerson: string | undefined = undefined;
  if (params.track === 'SAFEGUARDING' && params.safeguardingPersonName && params.safeguardingPersonName.trim().length > 0) {
    excludedPerson = params.safeguardingPersonName.trim();
    appliedOverrides.push(`Safeguarding exclusion active: "${excludedPerson}" strictly barred from case access`);

    // Remove if matched owner or watcher
    if (resolvedOwnerName.toLowerCase().includes(excludedPerson.toLowerCase())) {
      resolvedOwnerRole = 'Child Protection Officer';
      resolvedOwnerName = 'Ayesha Siddiqui';
    }
    watcherNames = watcherNames.filter((w) => !w.toLowerCase().includes(excludedPerson!.toLowerCase()));
  }

  return {
    matchedRule,
    resolvedOwnerRole,
    resolvedOwnerName,
    watcherRoles,
    watcherNames,
    ackSlaHours,
    resolveSlaHours,
    excludedPerson,
    appliedOverrides,
  };
}
