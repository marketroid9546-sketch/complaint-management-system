import React, { useState } from 'react';
import {
  AlertTriangle,
  UserCheck,
  Edit2,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { RoleAssignment } from '../../types';
import { MOCK_USERS } from '../../data/mockData';

interface RoleAssignmentsAdminProps {
  roleAssignments: RoleAssignment[];
  onUpdateAssignments: (assignments: RoleAssignment[]) => void;
}

export const RoleAssignmentsAdmin: React.FC<RoleAssignmentsAdminProps> = ({
  roleAssignments,
  onUpdateAssignments,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingAssignment, setEditingAssignment] = useState<RoleAssignment | null>(null);

  // Check for unassigned roles (No primary assignee)
  const unassignedList = roleAssignments.filter(
    (ra) => !ra.primaryAssignee || ra.primaryAssignee.trim() === ''
  );

  const filteredAssignments = roleAssignments.filter((ra) => {
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const roleMatch = ra.role.toLowerCase().includes(term);
      const scopeMatch = ra.scope.toLowerCase().includes(term);
      const primaryMatch = ra.primaryAssignee.toLowerCase().includes(term);
      const deputyMatch = ra.deputy?.toLowerCase().includes(term);
      if (!roleMatch && !scopeMatch && !primaryMatch && !deputyMatch) return false;
    }
    return true;
  });

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;

    const updated = roleAssignments.map((ra) =>
      ra.id === editingAssignment.id ? editingAssignment : ra
    );
    onUpdateAssignments(updated);
    setEditingAssignment(null);
  };

  return (
    <div className="space-y-6">
      {/* RED BANNER: Unassigned Roles Alert */}
      {unassignedList.length > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 text-red-950 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-900">
              Operational Vulnerability: {unassignedList.length} Role(s) Missing Active Primary Assignee
            </h3>
            <p className="text-xs text-red-800 leading-relaxed">
              Complaints routed to these scopes will fall back to default Ops Desk escalation unless a verified officer is designated:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {unassignedList.map((un) => (
                <span
                  key={un.id}
                  onClick={() => setEditingAssignment(un)}
                  className="bg-red-200/80 hover:bg-red-300 text-red-950 px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  {un.role} [{un.scope}] → Assign Now
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search role, scope, or assignee..."
            className="w-full min-h-[40px] pl-9 pr-4 border border-stone-300 rounded-md text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <span className="text-xs text-stone-500 font-medium">
          {filteredAssignments.length} designated roles in registry
        </span>
      </div>

      {/* Role Assignments Table */}
      <div className="bg-white border border-stone-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase tracking-wider">
                <th className="py-3 px-3">Role Designation</th>
                <th className="py-3 px-3">Scope Type</th>
                <th className="py-3 px-3">Target Scope</th>
                <th className="py-3 px-3">Primary Assignee</th>
                <th className="py-3 px-3">Deputy Assignee</th>
                <th className="py-3 px-3">Effective From</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredAssignments.map((ra) => {
                const isUnassigned = !ra.primaryAssignee || ra.primaryAssignee.trim() === '';

                return (
                  <tr
                    key={ra.id}
                    className={`hover:bg-stone-50 transition-colors ${
                      isUnassigned ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-stone-900 whitespace-nowrap">
                      {ra.role}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-stone-600">
                      <span className="bg-stone-100 px-2 py-0.5 rounded text-[11px] font-mono">
                        {ra.scopeType}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-medium text-stone-800">
                      {ra.scope}
                    </td>

                    <td className="py-3 px-3 font-semibold whitespace-nowrap">
                      {isUnassigned ? (
                        <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded">
                          Unassigned
                        </span>
                      ) : (
                        <span className="text-stone-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-800" />
                          {ra.primaryAssignee}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-stone-600 whitespace-nowrap">
                      {ra.deputy || <span className="text-stone-300 font-mono">—</span>}
                    </td>

                    <td className="py-3 px-3 text-stone-500 font-mono whitespace-nowrap">
                      {ra.effectiveFrom}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isUnassigned ? (
                        <span className="text-red-700 font-bold text-[10px]">DEFICIT</span>
                      ) : (
                        <span className="text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingAssignment(ra)}
                        className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded"
                        title="Edit Assignment"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Edit Role Assignment
                </h3>
                <span className="text-xs text-stone-500">
                  {editingAssignment.role} • {editingAssignment.scope}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Primary Assignee Officer
                </label>
                <select
                  value={editingAssignment.primaryAssignee}
                  onChange={(e) =>
                    setEditingAssignment({
                      ...editingAssignment,
                      primaryAssignee: e.target.value,
                    })
                  }
                  className="w-full min-h-[40px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {Object.values(MOCK_USERS).map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Designated Deputy Officer
                </label>
                <select
                  value={editingAssignment.deputy || ''}
                  onChange={(e) =>
                    setEditingAssignment({
                      ...editingAssignment,
                      deputy: e.target.value || undefined,
                    })
                  }
                  className="w-full min-h-[40px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                >
                  <option value="">-- No Deputy --</option>
                  {Object.values(MOCK_USERS).map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Scope Identifier
                </label>
                <input
                  type="text"
                  value={editingAssignment.scope}
                  onChange={(e) =>
                    setEditingAssignment({
                      ...editingAssignment,
                      scope: e.target.value,
                    })
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="px-4 py-2 border border-stone-300 rounded text-xs text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded text-xs font-bold"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
