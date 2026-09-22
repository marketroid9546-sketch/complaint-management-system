import { useState } from 'react';
import {
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  Play,
  Key,
  Lock,
  Search,
  Filter,
  Eye,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { User, Complaint, PermissionKey, Persona } from '../../types';
import {
  evaluatePermission,
  getEffectivePermissions,
  can,
  isUserExcludedFromComplaint,
  isTrackAllowed,
  isScopeAllowed,
} from '../../utils/permissions';

interface UsersAccessAdminProps {
  users: User[];
  complaints: Complaint[];
  onUpdateUser: (updated: User) => void;
}

export function UsersAccessAdmin({
  users,
  complaints,
  onUpdateUser,
}: UsersAccessAdminProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonaFilter, setSelectedPersonaFilter] = useState<string>('ALL');

  // Effective permissions modal state
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // Permissions Sandbox state
  const [sandboxUserId, setSandboxUserId] = useState<string>(users[0]?.id || '');
  const [sandboxComplaintId, setSandboxComplaintId] = useState<string>(complaints[0]?.id || '');
  const [sandboxPermission, setSandboxPermission] = useState<PermissionKey>('complaint.close');

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.roleTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchPersona = selectedPersonaFilter === 'ALL' || u.persona === selectedPersonaFilter;
    return matchSearch && matchPersona;
  });

  const handleToggleClearance = (user: User, type: 'confidential' | 'safeguarding' | 'active') => {
    const updated: User = {
      ...user,
      confidential_clearance: type === 'confidential' ? !user.confidential_clearance : user.confidential_clearance,
      safeguarding_acl: type === 'safeguarding' ? !user.safeguarding_acl : user.safeguarding_acl,
      active: type === 'active' ? !user.active : user.active,
    };
    onUpdateUser(updated);
  };

  // Sandbox resolution evaluation
  const sandboxUser = users.find((u) => u.id === sandboxUserId) || users[0];
  const sandboxComplaint = complaints.find((c) => c.id === sandboxComplaintId) || complaints[0];
  const evaluationResult = sandboxUser && sandboxComplaint
    ? evaluatePermission(sandboxUser, sandboxPermission, sandboxComplaint)
    : { granted: false, reason: 'Selection incomplete' };

  // Breakdown checks for Sandbox display
  const sandboxRoleHasPerm = sandboxUser ? can(sandboxUser, sandboxPermission) : false;
  const sandboxTrackOk = sandboxUser && sandboxComplaint ? isTrackAllowed(sandboxUser, sandboxComplaint.track) : false;
  const sandboxScopeOk = sandboxUser && sandboxComplaint ? isScopeAllowed(sandboxUser, sandboxComplaint) : false;
  const sandboxHasConflict = sandboxUser && sandboxComplaint ? isUserExcludedFromComplaint(sandboxUser, sandboxComplaint) : false;

  const allPermissionKeys: PermissionKey[] = [
    'complaint.view',
    'complaint.view.any',
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
    'complaint.export',
    'analytics.view',
    'analytics.view.strategic',
    'routing.manage',
    'roles.manage',
    'escalation.manage',
    'location.manage',
    'audit.view',
    'safeguarding.access',
  ];

  return (
    <div id="users-access-admin-root" className="space-y-8">
      {/* Top Controls: Search & Persona Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search personnel by name, role, email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedPersonaFilter}
            onChange={(e) => setSelectedPersonaFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Personas ({users.length})</option>
            <option value="HANDLER">Handler ({users.filter((u) => u.persona === 'HANDLER').length})</option>
            <option value="TEAM_LEAD">Team Lead ({users.filter((u) => u.persona === 'TEAM_LEAD').length})</option>
            <option value="TOP_MANAGEMENT">Top Management ({users.filter((u) => u.persona === 'TOP_MANAGEMENT').length})</option>
            <option value="CHILD_PROTECTION_OFFICER">CPO</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="AUDITOR">Auditor</option>
          </select>
        </div>
      </div>

      {/* Users & Access Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Personnel & Security Clearance Directory</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage scope assignments, confidential clearance, and safeguarding ACL flags.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
            {filteredUsers.length} Active Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-3">Staff Name & Email</th>
                <th className="p-3">Persona Badge</th>
                <th className="p-3">Institutional Role</th>
                <th className="p-3">Operational Scope</th>
                <th className="p-3 text-center">Confidential</th>
                <th className="p-3 text-center">Safeguarding</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="p-3">
                    <strong className="text-slate-900 font-bold block">{u.name}</strong>
                    <span className="text-[11px] text-slate-500">{u.email}</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.persona === 'HANDLER'
                          ? 'bg-sky-100 text-sky-800'
                          : u.persona === 'TEAM_LEAD'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.persona === 'TOP_MANAGEMENT'
                          ? 'bg-purple-100 text-purple-800'
                          : u.persona === 'CHILD_PROTECTION_OFFICER'
                          ? 'bg-amber-100 text-amber-900'
                          : u.persona === 'SUPER_ADMIN'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {u.persona}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-800">{u.roleTitle}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-600">
                    {u.scopeType}:{u.scopeValue}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleClearance(u, 'confidential')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        u.confidential_clearance
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {u.confidential_clearance ? 'CLEARED' : 'NONE'}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleClearance(u, 'safeguarding')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        u.safeguarding_acl
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {u.safeguarding_acl ? 'ACL' : 'DENIED'}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleClearance(u, 'active')}
                      className={`w-2 h-2 rounded-full inline-block ${
                        u.active ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={u.active ? 'Account Active' : 'Account Suspended'}
                    />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setViewingUser(u)}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors"
                    >
                      Effective Perms
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Sandbox Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-sky-600" />
              <h3 className="text-base font-bold text-slate-900">Interactive Permissions Sandbox</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live testing of the permissions engine: test any combination of user, complaint record, and permission key.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            can(user, permission, complaint?)
          </span>
        </div>

        {/* 3 Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select User:</label>
            <select
              value={sandboxUserId}
              onChange={(e) => setSandboxUserId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.persona} · {u.scopeType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Target Complaint:</label>
            <select
              value={sandboxComplaintId}
              onChange={(e) => setSandboxComplaintId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            >
              {complaints.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.track} ({c.locationCode} - {c.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Permission Key:</label>
            <select
              value={sandboxPermission}
              onChange={(e) => setSandboxPermission(e.target.value as PermissionKey)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
            >
              {allPermissionKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Evaluation Box */}
        <div
          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            evaluationResult.granted
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/80 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {evaluationResult.granted ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  {evaluationResult.granted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/70">
                  {sandboxPermission}
                </span>
              </div>
              <p className="text-xs mt-1 font-medium leading-relaxed">{evaluationResult.reason}</p>
            </div>
          </div>

          {/* Orthogonal Breakdown Badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                sandboxRoleHasPerm
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}
            >
              Role: {sandboxRoleHasPerm ? 'PASSED' : 'DENIED'}
            </span>
            <span
              className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                sandboxTrackOk
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}
            >
              Track: {sandboxTrackOk ? 'PASSED' : 'DENIED'}
            </span>
            <span
              className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                sandboxScopeOk
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}
            >
              Scope: {sandboxScopeOk ? 'PASSED' : 'DENIED'}
            </span>
            <span
              className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                !sandboxHasConflict
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}
            >
              Conflict: {!sandboxHasConflict ? 'CLEAN' : 'EXCLUDED'}
            </span>
          </div>
        </div>
      </div>

      {/* Effective Permissions Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Effective Permissions: {viewingUser.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Persona: <strong className="text-slate-800">{viewingUser.persona}</strong> · Scope: {viewingUser.scopeType}:{viewingUser.scopeValue}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {getEffectivePermissions(viewingUser).map((perm) => (
                <div
                  key={perm.key}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                    perm.granted
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {perm.granted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <div>
                      <span className="font-mono font-bold block">{perm.key}</span>
                      <span className="text-[11px] text-slate-500">{perm.description}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      perm.granted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {perm.granted ? 'GRANTED' : 'DENIED'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
              >
                Close Perms Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
