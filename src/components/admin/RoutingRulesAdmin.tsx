import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Play,
  CheckCircle,
  AlertTriangle,
  Lock,
  Shield,
  Edit2,
  Trash2,
  X,
  Sliders,
} from 'lucide-react';
import {
  RoutingRule,
  RoleAssignment,
  LocationItem,
  Entity,
  Track,
  Severity,
} from '../../types';
import { simulateRouting } from '../../utils/routingEngine';

interface RoutingRulesAdminProps {
  routingRules: RoutingRule[];
  onUpdateRules: (rules: RoutingRule[]) => void;
  roleAssignments: RoleAssignment[];
  locations: LocationItem[];
}

export const RoutingRulesAdmin: React.FC<RoutingRulesAdminProps> = ({
  routingRules,
  onUpdateRules,
  roleAssignments,
  locations,
}) => {
  // Simulator State
  const [simEntity, setSimEntity] = useState<Entity>('AAS_LAB');
  const [simLocation, setSimLocation] = useState<string>('AAS-KHN-01');
  const [simCategory, setSimCategory] = useState<string>('Staff behaviour');
  const [simTrack, setSimTrack] = useState<Track>('SERVICE');
  const [simSeverity, setSimSeverity] = useState<Severity>('MEDIUM');
  const [simIsAboutLeader, setSimIsAboutLeader] = useState<boolean>(false);
  const [simSafeguardingName, setSimSafeguardingName] = useState<string>('');
  const [simResult, setSimResult] = useState<any>(null);

  // Edit / Create Modal State
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [isNewRule, setIsNewRule] = useState<boolean>(false);

  // Move priority up / down
  const movePriority = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index >= routingRules.length - 2) return; // don't swap with pinned catch-all

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newRules = [...routingRules];
    const temp = newRules[index];
    newRules[index] = newRules[targetIndex];
    newRules[targetIndex] = temp;

    // Recalculate priorities
    const updated = newRules.map((r, idx) => {
      if (r.isCatchAll) return { ...r, priority: 99 };
      return { ...r, priority: idx + 1 };
    });

    onUpdateRules(updated);
  };

  const handleSimulate = () => {
    const result = simulateRouting(routingRules, roleAssignments, locations, {
      entity: simEntity,
      locationCode: simLocation,
      category: simCategory,
      track: simTrack,
      severity: simSeverity,
      isAboutPersonInCharge: simIsAboutLeader,
      safeguardingPersonName: simSafeguardingName,
    });
    setSimResult(result);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    if (isNewRule) {
      const newPriority = routingRules.length;
      const updated = [
        ...routingRules.slice(0, routingRules.length - 1),
        { ...editingRule, priority: newPriority },
        routingRules[routingRules.length - 1], // keep catch-all at bottom
      ];
      onUpdateRules(updated);
    } else {
      const updated = routingRules.map((r) =>
        r.id === editingRule.id ? editingRule : r
      );
      onUpdateRules(updated);
    }
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    const rule = routingRules.find((r) => r.id === id);
    if (rule?.isCatchAll) {
      alert('The system catch-all rule is permanently pinned and cannot be deleted.');
      return;
    }
    if (confirm('Are you sure you want to delete this routing rule?')) {
      const updated = routingRules.filter((r) => r.id !== id);
      onUpdateRules(updated);
    }
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: INTERACTIVE "TEST A RULE" SIMULATOR */}
      <div className="bg-white border-2 border-emerald-800/60 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-bold text-stone-900">
              Rule Evaluation Sandbox & Simulation Engine
            </h2>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded font-bold">
            Real-time Resolution Preview
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">Entity</label>
            <select
              value={simEntity}
              onChange={(e) => {
                const ent = e.target.value as Entity;
                setSimEntity(ent);
                const loc = locations.find((l) => l.entity === ent);
                if (loc) setSimLocation(loc.code);
              }}
              className="w-full min-h-[38px] px-2 py-1 border border-stone-300 rounded bg-stone-50"
            >
              <option value="AAS_LAB">AAS Lab</option>
              <option value="FOUNDATION">MTJ Foundation</option>
              <option value="SCHOOL">School</option>
              <option value="COLLEGE">College</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Location</label>
            <select
              value={simLocation}
              onChange={(e) => setSimLocation(e.target.value)}
              className="w-full min-h-[38px] px-2 py-1 border border-stone-300 rounded bg-stone-50 truncate"
            >
              {locations
                .filter((l) => l.entity === simEntity)
                .map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.code} — {loc.name.en}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Track</label>
            <select
              value={simTrack}
              onChange={(e) => setSimTrack(e.target.value as Track)}
              className="w-full min-h-[38px] px-2 py-1 border border-stone-300 rounded bg-stone-50"
            >
              <option value="SERVICE">Service</option>
              <option value="CONFIDENTIAL">Confidential</option>
              <option value="SAFEGUARDING">Safeguarding</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Category</label>
            <select
              value={simCategory}
              onChange={(e) => setSimCategory(e.target.value)}
              className="w-full min-h-[38px] px-2 py-1 border border-stone-300 rounded bg-stone-50 truncate"
            >
              <option value="Staff behaviour">Staff behaviour</option>
              <option value="Report delay">Report delay</option>
              <option value="Test quality or wrong result">Test quality / Wrong result</option>
              <option value="Billing or overcharging">Billing or overcharging</option>
              <option value="Teacher conduct">Teacher conduct</option>
              <option value="Bullying">Bullying</option>
              <option value="Corporal punishment or physical harm">Corporal punishment</option>
              <option value="Salary or benefits">Salary or benefits</option>
              <option value="Harassment">Harassment</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Severity</label>
            <select
              value={simSeverity}
              onChange={(e) => setSimSeverity(e.target.value as Severity)}
              className="w-full min-h-[38px] px-2 py-1 border border-stone-300 rounded bg-stone-50"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical (halves SLA)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">About In-Charge?</label>
            <select
              value={simIsAboutLeader ? 'YES' : 'NO'}
              onChange={(e) => setSimIsAboutLeader(e.target.value === 'YES')}
              className="w-full min-h-[38px] px-2 py-1 border border-stone-300 rounded bg-stone-50"
            >
              <option value="NO">No</option>
              <option value="YES">Yes (Bumps Owner 1 Level)</option>
            </select>
          </div>
        </div>

        {simTrack === 'SAFEGUARDING' && (
          <div className="pt-1">
            <label className="block text-xs font-bold text-amber-900 mb-1">
              Safeguarding: Named Person in Report (to test exclusion rule)
            </label>
            <input
              type="text"
              value={simSafeguardingName}
              onChange={(e) => setSimSafeguardingName(e.target.value)}
              placeholder="e.g. Hafiz Zubair (Principal) or Mr. Tariq..."
              className="w-full sm:w-80 min-h-[36px] px-3 py-1 text-xs border border-amber-300 rounded bg-amber-50"
            />
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={handleSimulate}
            className="min-h-[42px] px-6 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-xs font-bold flex items-center gap-2 transition-all shadow-2xs"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Simulate Routing Execution</span>
          </button>
        </div>

        {/* Simulation Output Box */}
        {simResult && (
          <div className="bg-stone-50 border border-stone-300 rounded-lg p-4 space-y-3 mt-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="font-mono text-xs font-bold text-stone-800">
                Matched Rule ID: <span className="text-emerald-800">{simResult.matchedRule.id}</span> ({simResult.matchedRule.category})
              </span>
              <span className="text-xs bg-stone-200 text-stone-800 px-2 py-0.5 rounded font-mono">
                Priority #{simResult.matchedRule.priority}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">Resolved Case Owner</span>
                <span className="font-bold text-stone-900 text-sm">
                  {simResult.resolvedOwnerName}
                </span>
                <span className="text-stone-600 block text-[11px]">
                  ({simResult.resolvedOwnerRole})
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Assigned Watchers</span>
                <span className="font-semibold text-stone-900">
                  {simResult.watcherNames.length > 0 ? simResult.watcherNames.join(', ') : 'None'}
                </span>
                <span className="text-stone-600 block text-[11px]">
                  ({simResult.watcherRoles.join(', ') || 'None'})
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Acknowledgement SLA</span>
                <span className="font-mono font-bold text-stone-900 text-sm">
                  {simResult.ackSlaHours} hours
                </span>
                <span className="text-stone-500 block text-[11px]">
                  Base: {simResult.matchedRule.ackSlaHours}h
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Resolution Target SLA</span>
                <span className="font-mono font-bold text-stone-900 text-sm">
                  {simResult.resolveSlaHours} hours
                </span>
                <span className="text-stone-500 block text-[11px]">
                  Base: {simResult.matchedRule.resolveSlaHours}h
                </span>
              </div>
            </div>

            {/* Applied Overrides */}
            {simResult.appliedOverrides.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-950 space-y-1">
                <span className="font-bold block text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Dynamic Policy Overrides Triggered:
                </span>
                <ul className="list-disc list-inside space-y-0.5">
                  {simResult.appliedOverrides.map((ov: string, i: number) => (
                    <li key={i}>{ov}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: ROUTING RULES TABLE */}
      <div className="bg-white border border-stone-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
              Active Routing Rules Table
            </h3>
            <p className="text-xs text-stone-500">
              Evaluated strictly in priority order from top to bottom.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsNewRule(true);
              setEditingRule({
                id: `RULE-0${routingRules.length + 1}`,
                priority: routingRules.length,
                entity: 'ALL',
                category: 'New Category',
                track: 'SERVICE',
                minSeverity: 'LOW',
                ownerRole: 'Branch Manager',
                watcherRoles: ['Ops Head'],
                ackSlaHours: 24,
                resolveSlaHours: 72,
                active: true,
              });
            }}
            className="min-h-[38px] px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase tracking-wider">
                <th className="py-3 px-3 w-16">Prio</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Track</th>
                <th className="py-3 px-3">Owner Role</th>
                <th className="py-3 px-3">Watcher Roles</th>
                <th className="py-3 px-2 text-center">Ack SLA</th>
                <th className="py-3 px-2 text-center">Resolve SLA</th>
                <th className="py-3 px-3 text-center">Reorder</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {routingRules.map((rule, idx) => {
                const isCatchAll = rule.isCatchAll;

                return (
                  <tr
                    key={rule.id}
                    className={`hover:bg-stone-50 transition-colors ${
                      isCatchAll ? 'bg-amber-50/50 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">
                      {isCatchAll ? (
                        <span className="bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded text-[10px]">
                          CATCH-ALL
                        </span>
                      ) : (
                        `#${rule.priority}`
                      )}
                    </td>

                    <td className="py-3 px-3 font-semibold text-stone-800">
                      {rule.entity}
                    </td>

                    <td className="py-3 px-3 text-stone-900 font-medium">
                      {rule.category}
                    </td>

                    <td className="py-3 px-3">
                      {rule.track === 'SAFEGUARDING' ? (
                        <span className="text-amber-900 font-bold flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Safeguarding
                        </span>
                      ) : rule.track === 'CONFIDENTIAL' ? (
                        <span className="text-purple-900 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Confidential
                        </span>
                      ) : (
                        <span className="text-stone-600">Service</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-semibold text-stone-900">
                      {rule.ownerRole}
                    </td>

                    <td className="py-3 px-3 text-stone-600">
                      {rule.watcherRoles.join(', ') || '—'}
                    </td>

                    <td className="py-3 px-2 text-center font-mono">
                      {rule.ackSlaHours}h
                    </td>

                    <td className="py-3 px-2 text-center font-mono">
                      {rule.resolveSlaHours}h
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {!isCatchAll && (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => movePriority(idx, 'up')}
                            className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx >= routingRules.length - 2}
                            onClick={() => movePriority(idx, 'down')}
                            className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewRule(false);
                          setEditingRule(rule);
                        }}
                        className="p-1 text-stone-600 hover:text-stone-900 mr-2"
                        title="Edit Rule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!isCatchAll && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 text-red-600 hover:text-red-900"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {isNewRule ? 'Add New Routing Rule' : `Edit Rule (${editingRule.id})`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Entity</label>
                <select
                  value={editingRule.entity}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, entity: e.target.value as any })
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                >
                  <option value="ALL">ALL</option>
                  <option value="AAS_LAB">AAS_LAB</option>
                  <option value="FOUNDATION">FOUNDATION</option>
                  <option value="SCHOOL">SCHOOL</option>
                  <option value="COLLEGE">COLLEGE</option>
                  <option value="AAS_LAB/FOUNDATION">AAS_LAB/FOUNDATION</option>
                  <option value="SCHOOL/COLLEGE">SCHOOL/COLLEGE</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Category</label>
                <input
                  type="text"
                  value={editingRule.category}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, category: e.target.value })
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Track</label>
                  <select
                    value={editingRule.track}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, track: e.target.value as any })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                  >
                    <option value="SERVICE">SERVICE</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="SAFEGUARDING">SAFEGUARDING</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Owner Role</label>
                  <input
                    type="text"
                    value={editingRule.ownerRole}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, ownerRole: e.target.value })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Ack SLA (Hours)
                  </label>
                  <input
                    type="number"
                    value={editingRule.ackSlaHours}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        ackSlaHours: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Resolve SLA (Hours)
                  </label>
                  <input
                    type="number"
                    value={editingRule.resolveSlaHours}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        resolveSlaHours: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded bg-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 border border-stone-300 rounded text-xs text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded text-xs font-bold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
