import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  MapPin,
  GitBranch,
  Users,
  AlertTriangle,
  LogOut,
  Bell,
  Shield,
  Lock,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  AdminRole,
  Complaint,
  LocationItem,
  RoutingRule,
  RoleAssignment,
  EscalationPolicy,
  User,
} from '../../types';
import { AdminOverview } from './AdminOverview';
import { ComplaintsTable } from './ComplaintsTable';
import { ComplaintDetailDrawer } from './ComplaintDetailDrawer';
import { LocationsAdmin } from './LocationsAdmin';
import { RoutingRulesAdmin } from './RoutingRulesAdmin';
import { RoleAssignmentsAdmin } from './RoleAssignmentsAdmin';
import { EscalationPoliciesAdmin } from './EscalationPoliciesAdmin';
import { UsersAccessAdmin } from './UsersAccessAdmin';

interface AdminLayoutProps {
  currentRole: AdminRole;
  onChangeRole: (role: AdminRole) => void;
  complaints: Complaint[];
  onUpdateComplaint: (updated: Complaint) => void;
  locations: LocationItem[];
  routingRules: RoutingRule[];
  onUpdateRules: (rules: RoutingRule[]) => void;
  roleAssignments: RoleAssignment[];
  onUpdateAssignments: (assignments: RoleAssignment[]) => void;
  escalationPolicies: EscalationPolicy[];
  users?: User[];
  onUpdateUser?: (updated: User) => void;
  onExitAdmin: () => void;
  onOpenPublicFlowForLocation: (code: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentRole,
  onChangeRole,
  complaints,
  onUpdateComplaint,
  locations,
  routingRules,
  onUpdateRules,
  roleAssignments,
  onUpdateAssignments,
  escalationPolicies,
  users = [],
  onUpdateUser = () => {},
  onExitAdmin,
  onOpenPublicFlowForLocation,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);

  // STRICT RBAC FILTERING FOR DATA ACCESS:
  // "Non-visible complaints must be genuinely absent from tables, counts, charts, search results and exports for that role — never shown as locked placeholders."
  const roleFilteredComplaints = complaints.filter((c) => {
    if (currentRole === 'Super Admin') {
      return true;
    }
    if (currentRole === 'Ops Admin') {
      // SERVICE track only, across all locations
      return c.track === 'SERVICE';
    }
    if (currentRole === 'Branch Manager') {
      // Own location only (AAS-KHN-01), SERVICE track only
      return c.locationCode === 'AAS-KHN-01' && c.track === 'SERVICE';
    }
    if (currentRole === 'Principal') {
      // Own campus only (AHS-MC-01), SERVICE track only — SAFEGUARDING and CONFIDENTIAL are genuinely ABSENT
      return c.locationCode === 'AHS-MC-01' && c.track === 'SERVICE';
    }
    if (currentRole === 'Child Protection Officer') {
      // SAFEGUARDING track across all campuses, plus nothing else!
      return c.track === 'SAFEGUARDING';
    }
    if (currentRole === 'Auditor') {
      // Read-only everything EXCEPT SAFEGUARDING
      return c.track !== 'SAFEGUARDING';
    }
    return false;
  });

  // Sidebar navigation links filtered by role
  const isSuperAdmin = currentRole === 'Super Admin';
  const isCPO = currentRole === 'Child Protection Officer';

  const navItems = [
    { id: 'overview', label: 'Overview & Metrics', icon: LayoutDashboard, visible: true },
    {
      id: 'complaints',
      label: isCPO ? 'Safeguarding Cases' : 'Complaints Table',
      icon: FileText,
      visible: true,
      badge: roleFilteredComplaints.filter((c) => c.status === 'New' || c.status === 'NEW').length,
    },
    { id: 'locations', label: 'Locations & QR', icon: MapPin, visible: !isCPO },
    { id: 'users', label: 'Users & Security Clearance', icon: Shield, visible: isSuperAdmin },
    { id: 'routing', label: 'Routing Rules', icon: GitBranch, visible: isSuperAdmin },
    { id: 'roles', label: 'Role Assignments', icon: Users, visible: isSuperAdmin },
    { id: 'escalations', label: 'Escalation Policies', icon: AlertTriangle, visible: isSuperAdmin },
  ];

  // System notifications complying with Safeguarding privacy rule:
  // "Notification preview text is only 'A safeguarding report has been filed. Open the dashboard.' — never the complaint content."
  const recentNotifications = [
    {
      id: 'notif-1',
      title: 'Safeguarding Alert',
      text: 'A safeguarding report has been filed. Open the dashboard.',
      time: '12m ago',
      isSafeguarding: true,
      visible: currentRole === 'Super Admin' || currentRole === 'Child Protection Officer',
    },
    {
      id: 'notif-2',
      title: 'SLA Escalation (Tier 1)',
      text: 'Ticket MTJ-L8K2M1 breached 12h ack SLA at AAS-FSD-01. Ops Head added as watcher.',
      time: '34m ago',
      isSafeguarding: false,
      visible: currentRole !== 'Child Protection Officer',
    },
    {
      id: 'notif-3',
      title: 'Case Resolved',
      text: 'Ticket MTJ-9Q3P5X has been marked as Resolved by Dr. Sajid Bashir.',
      time: '2h ago',
      isSafeguarding: false,
      visible: currentRole !== 'Child Protection Officer',
    },
  ].filter((n) => n.visible);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col antialiased text-stone-900" dir="ltr">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-600 hover:text-stone-950 rounded"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
              MTJ
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>CMS Admin Portal</span>
                <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded border border-stone-200">
                  v2.4
                </span>
              </div>
              <div className="text-[11px] text-stone-500">
                Institutional Complaints Management System
              </div>
            </div>
          </div>
        </div>

        {/* Role Switcher & Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationsModal(!showNotificationsModal)}
              className="min-h-[38px] min-w-[38px] p-2 text-stone-600 hover:text-stone-950 hover:bg-stone-100 rounded-md relative flex items-center justify-center"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {recentNotifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              )}
            </button>

            {/* Notifications Popover */}
            {showNotificationsModal && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-stone-200 p-3 z-50 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2 font-bold text-stone-800">
                  <span>System Broadcast Alerts</span>
                  <span className="text-[10px] text-stone-400">Live</span>
                </div>
                <div className="divide-y divide-stone-100">
                  {recentNotifications.map((notif) => (
                    <div key={notif.id} className="py-2 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${notif.isSafeguarding ? 'text-amber-900' : 'text-stone-900'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-stone-400">{notif.time}</span>
                      </div>
                      <p className="text-stone-600 text-[11px]">{notif.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE ROLE SWITCHER */}
          <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-bold uppercase text-stone-600 hidden sm:inline">
              Active Role:
            </span>
            <select
              value={currentRole}
              onChange={(e) => {
                const newRole = e.target.value as AdminRole;
                onChangeRole(newRole);
                // Reset to overview if user was on a tab not permitted for new role
                if (
                  (newRole !== 'Super Admin' &&
                    (activeTab === 'routing' || activeTab === 'roles' || activeTab === 'escalations')) ||
                  (newRole === 'Child Protection Officer' && activeTab === 'locations')
                ) {
                  setActiveTab('overview');
                }
              }}
              className="text-xs font-bold text-stone-900 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="Super Admin">Super Admin (CEO / Central)</option>
              <option value="Ops Admin">Ops Admin (All Service Tracks)</option>
              <option value="Branch Manager">Branch Manager (AAS-KHN-01)</option>
              <option value="Principal">Principal (AHS-MC-01)</option>
              <option value="Child Protection Officer">Child Protection Officer (CPO)</option>
              <option value="Auditor">Auditor (Read-only)</option>
            </select>
          </div>

          {/* Exit to Public Flow button */}
          <button
            type="button"
            onClick={onExitAdmin}
            className="min-h-[38px] px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Switch to Public Citizen Intake"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Public Intake Flow</span>
          </button>
        </div>
      </header>

      {/* Role Banner / Scope Indicator */}
      <div className="bg-stone-900 text-stone-300 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            Logged in as: <strong className="text-white">{currentRole}</strong>
          </span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400">
            {currentRole === 'Super Admin' && 'Full system access & security configuration'}
            {currentRole === 'Ops Admin' && 'Network-wide access to all Service complaints'}
            {currentRole === 'Branch Manager' && 'Restricted to AAS-KHN-01 collection centre records'}
            {currentRole === 'Principal' && 'Restricted to AHS-MC-01 campus service records (Safeguarding & Confidential genuinely isolated)'}
            {currentRole === 'Child Protection Officer' && 'Strictly isolated to Safeguarding track reports across all entities'}
            {currentRole === 'Auditor' && 'Read-only governance audit access (Safeguarding excluded)'}
          </span>
        </div>
        <div className="text-[11px] text-stone-400 font-mono">
          Visible Records: <strong className="text-emerald-400">{roleFilteredComplaints.length}</strong>
        </div>
      </div>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? 'block fixed inset-y-0 left-0 z-40 bg-white w-64 shadow-xl' : 'hidden'
          } md:block md:w-60 bg-white border-r border-stone-200 flex-shrink-0 flex flex-col justify-between`}
        >
          <div className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-600">
              Operations Navigation
            </div>

            {navItems
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[42px] px-3 py-2 rounded-md flex items-center justify-between text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Sidebar Footer info */}
          <div className="p-3 border-t border-stone-200 bg-stone-50 text-[11px] text-stone-500 space-y-1">
            <div className="font-semibold text-stone-700">MTJ Foundation Group</div>
            <div>AAS Lab • Schools • College</div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && (
            <AdminOverview
              complaints={roleFilteredComplaints}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'complaints' && (
            <ComplaintsTable
              complaints={roleFilteredComplaints}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'locations' && (
            <LocationsAdmin
              locations={locations}
              onOpenPublicFlowForLocation={onOpenPublicFlowForLocation}
            />
          )}

          {activeTab === 'users' && isSuperAdmin && (
            <UsersAccessAdmin
              users={users}
              complaints={complaints}
              onUpdateUser={onUpdateUser}
            />
          )}

          {activeTab === 'routing' && isSuperAdmin && (
            <RoutingRulesAdmin
              routingRules={routingRules}
              onUpdateRules={onUpdateRules}
              roleAssignments={roleAssignments}
              locations={locations}
            />
          )}

          {activeTab === 'roles' && isSuperAdmin && (
            <RoleAssignmentsAdmin
              roleAssignments={roleAssignments}
              onUpdateAssignments={onUpdateAssignments}
            />
          )}

          {activeTab === 'escalations' && isSuperAdmin && (
            <EscalationPoliciesAdmin policies={escalationPolicies} />
          )}
        </main>
      </div>

      {/* Complaint Detail Drawer */}
      <ComplaintDetailDrawer
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdateComplaint={(updated) => {
          onUpdateComplaint(updated);
          setSelectedComplaint(updated);
        }}
        currentRole={currentRole}
      />
    </div>
  );
};
