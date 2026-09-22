import { useState } from 'react';
import {
  Inbox,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Search,
  Filter,
  Users,
  CheckSquare,
  Square,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Complaint, User, Severity, RootCause, AuditEvent } from '../../types';
import { can, filterComplaintsForUser } from '../../utils/permissions';
import { AttachmentGallery } from '../attachments/AttachmentGallery';

interface TeamLeadConsoleProps {
  currentUser: User;
  allUsers: User[];
  complaints: Complaint[];
  onUpdateComplaint: (updated: Complaint) => void;
  onSelectComplaintForDetail?: (complaint: Complaint) => void;
}

export function TeamLeadConsole({
  currentUser,
  allUsers,
  complaints,
  onUpdateComplaint,
  onSelectComplaintForDetail,
}: TeamLeadConsoleProps) {
  const [activeTab, setActiveTab] = useState<'TRIAGE' | 'ACTIVE' | 'APPROVAL'>('TRIAGE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');

  // Bulk reassignment state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTargetHandler, setBulkTargetHandler] = useState<string>('');

  // Return to handler modal state
  const [returningCase, setReturningCase] = useState<Complaint | null>(null);
  const [reworkNote, setReworkNote] = useState<string>('');

  // Closure approval comment modal
  const [approvingCase, setApprovingCase] = useState<Complaint | null>(null);
  const [closureComment, setClosureComment] = useState<string>('');

  // 1. Get complaints visible in this Team Lead's scope & track clearance
  const scopedComplaints = filterComplaintsForUser(complaints, currentUser);

  // 2. Derive eligible handlers in this entity/scope
  const handlersPool = allUsers.filter((u) => {
    if (u.persona !== 'HANDLER') return false;
    if (!u.active) return false;
    // Match entity if Team Lead has entity scope or location
    if (currentUser.scopeType === 'ENTITY') {
      return u.scopeValue === currentUser.scopeValue || u.scopeType === 'ASSIGNED_ONLY';
    }
    return true;
  });

  // Calculate caseload per handler
  const getHandlerCaseload = (handlerName: string) => {
    return complaints.filter(
      (c) =>
        c.ownerName.trim().toLowerCase() === handlerName.trim().toLowerCase() &&
        (c.status === 'IN_PROGRESS' || c.status === 'In Progress' || c.status === 'ASSIGNED' || c.status === 'NEW' || c.status === 'New')
    ).length;
  };

  // Filter queues
  const triageQueue = scopedComplaints.filter(
    (c) =>
      c.status === 'NEW' ||
      c.status === 'New' ||
      c.status === 'TRIAGED' ||
      (c.status === 'ASSIGNED' && !c.handledBy)
  );

  const activeQueue = scopedComplaints.filter(
    (c) =>
      c.status === 'IN_PROGRESS' ||
      c.status === 'In Progress' ||
      c.status === 'REOPENED' ||
      c.status === 'Reopened' ||
      c.status === 'Acknowledged'
  );

  const approvalQueue = scopedComplaints.filter((c) => c.status === 'PENDING_CLOSURE');

  // Search filter
  const applySearch = (list: Complaint[]) => {
    return list.filter((c) => {
      const matchText =
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.locationName.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ownerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchLoc = selectedLocation === 'ALL' || c.locationCode === selectedLocation;

      return matchText && matchLoc;
    });
  };

  // Distinct locations for filter dropdown
  const uniqueLocations = Array.from(new Set(scopedComplaints.map((c) => c.locationCode)));

  // Handlers for triage assignment
  const handleAssign = (complaint: Complaint, handlerName: string) => {
    const targetHandler = allUsers.find((u) => u.name === handlerName);
    const updated: Complaint = {
      ...complaint,
      ownerName: handlerName,
      ownerRole: targetHandler?.roleTitle || 'Investigation Officer',
      status: 'IN_PROGRESS',
      auditTimeline: [
        ...complaint.auditTimeline,
        {
          id: `aud-${Date.now()}`,
          eventType: 'REASSIGNED',
          actor: currentUser.name,
          role: currentUser.roleTitle,
          details: `Assigned to investigator ${handlerName} by Team Lead`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    onUpdateComplaint(updated);
  };

  const handleSeverityChange = (complaint: Complaint, newSeverity: Severity) => {
    const updated: Complaint = {
      ...complaint,
      severity: newSeverity,
      auditTimeline: [
        ...complaint.auditTimeline,
        {
          id: `aud-${Date.now()}`,
          eventType: 'STATUS_CHANGE',
          actor: currentUser.name,
          role: currentUser.roleTitle,
          details: `Severity adjusted to ${newSeverity} by Team Lead`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    onUpdateComplaint(updated);
  };

  const handleBulkReassign = () => {
    if (!bulkTargetHandler || selectedIds.length === 0) return;
    const targetHandler = allUsers.find((u) => u.name === bulkTargetHandler);

    selectedIds.forEach((id) => {
      const c = complaints.find((comp) => comp.id === id);
      if (c) {
        const updated: Complaint = {
          ...c,
          ownerName: bulkTargetHandler,
          ownerRole: targetHandler?.roleTitle || c.ownerRole,
          auditTimeline: [
            ...c.auditTimeline,
            {
              id: `aud-${Date.now()}-${id}`,
              eventType: 'REASSIGNED',
              actor: currentUser.name,
              role: currentUser.roleTitle,
              details: `Bulk reassigned to ${bulkTargetHandler}`,
              timestamp: new Date().toISOString(),
            },
          ],
        };
        onUpdateComplaint(updated);
      }
    });

    setSelectedIds([]);
    setBulkTargetHandler('');
  };

  const handleConfirmApproval = () => {
    if (!approvingCase) return;

    const newAudit: AuditEvent = {
      id: `aud-${Date.now()}`,
      eventType: 'STATUS_CHANGE',
      actor: currentUser.name,
      role: currentUser.roleTitle,
      details: `Closure approved by Team Lead ${currentUser.name}. ${closureComment.trim() ? `Note: ${closureComment.trim()}` : ''}`,
      timestamp: new Date().toISOString(),
    };

    const updated: Complaint = {
      ...approvingCase,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closureApprovalNote: closureComment.trim() || 'Verified satisfactory resolution.',
      auditTimeline: [...approvingCase.auditTimeline, newAudit],
      internalNotes: [
        ...approvingCase.internalNotes,
        {
          id: `note-${Date.now()}`,
          author: currentUser.name,
          role: currentUser.roleTitle,
          text: `[CLOSURE APPROVED]\n${closureComment.trim() || 'Verified resolution and corrective action. Case closed.'}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onUpdateComplaint(updated);
    setApprovingCase(null);
    setClosureComment('');
  };

  const handleConfirmReturn = () => {
    if (!returningCase || !reworkNote.trim()) return;

    const updated: Complaint = {
      ...returningCase,
      status: 'IN_PROGRESS',
      auditTimeline: [
        ...returningCase.auditTimeline,
        {
          id: `aud-${Date.now()}`,
          eventType: 'STATUS_CHANGE',
          actor: currentUser.name,
          role: currentUser.roleTitle,
          details: `Returned to Handler for rework. Reason: ${reworkNote.trim()}`,
          timestamp: new Date().toISOString(),
        },
      ],
      internalNotes: [
        ...returningCase.internalNotes,
        {
          id: `note-${Date.now()}`,
          author: currentUser.name,
          role: currentUser.roleTitle,
          text: `[RETURNED FOR REWORK by Team Lead]\n${reworkNote.trim()}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onUpdateComplaint(updated);
    setReturningCase(null);
    setReworkNote('');
  };

  const toggleSelectAll = (list: Complaint[]) => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div id="team-lead-console-root" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Console Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Team Lead Operational Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              TEAM_LEAD
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Supervising <strong className="text-slate-900">{currentUser.name}</strong> · Scope:{' '}
            <span className="font-mono font-semibold text-slate-800">{currentUser.scopeType}:{currentUser.scopeValue}</span>
          </p>
        </div>

        {/* Workload Indicator Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-slate-500 font-medium mr-1 hidden sm:block">Team Handlers:</div>
          {handlersPool.slice(0, 4).map((h) => {
            const count = getHandlerCaseload(h.name);
            return (
              <span
                key={h.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                  count > 3
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>{h.name}</span>
                <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                  {count}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('TRIAGE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'TRIAGE'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Triage Queue
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'TRIAGE' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {triageQueue.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'ACTIVE'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            Active Cases
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'ACTIVE' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeQueue.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('APPROVAL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'APPROVAL'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-purple-800 hover:bg-purple-50 hover:text-purple-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Awaiting Approval
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'APPROVAL' ? 'bg-purple-900 text-white' : 'bg-purple-200 text-purple-900'
              }`}
            >
              {approvalQueue.length}
            </span>
          </button>
        </div>

        {/* Global Search & Location Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in queue..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {uniqueLocations.length > 1 && (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-xs py-1.5 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tab 1: TRIAGE QUEUE */}
      {activeTab === 'TRIAGE' && (
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3 text-sky-950 text-xs">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Team Lead Triage Directive</p>
              <p className="text-sky-800 mt-0.5">
                Review newly filed complaints, set appropriate severity, and delegate to an investigator.
                Confidential complaints require cleared personnel (Rule 3).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applySearch(triageQueue).length === 0 ? (
              <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">Triage Queue Clear</p>
                <p className="text-xs text-slate-500 mt-0.5">All new incoming complaints have been assigned.</p>
              </div>
            ) : (
              applySearch(triageQueue).map((c) => {
                // Rule 3: filter assignable handlers
                const eligibleHandlers = handlersPool.filter((h) => {
                  if (c.track === 'CONFIDENTIAL') {
                    return h.confidential_clearance === true;
                  }
                  return true;
                });

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-sm font-bold text-slate-900">{c.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            c.track === 'CONFIDENTIAL'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.track}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-500 mb-1">{c.locationName.en}</p>
                      <h4 className="text-xs font-bold text-slate-900">{c.category}</h4>
                      <p className="text-xs text-slate-700 mt-1 line-clamp-2">{c.text}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      {/* Inline Severity Control */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Severity:</span>
                        <div className="flex gap-1">
                          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Severity[]).map((sev) => (
                            <button
                              key={sev}
                              type="button"
                              onClick={() => handleSeverityChange(c, sev)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                c.severity === sev
                                  ? sev === 'CRITICAL'
                                    ? 'bg-red-700 text-white'
                                    : sev === 'HIGH'
                                    ? 'bg-orange-600 text-white'
                                    : sev === 'MEDIUM'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-slate-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {sev}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Handler Assignment Dropdown */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Assign Investigator:
                        </label>
                        <select
                          value={c.ownerName || ''}
                          onChange={(e) => handleAssign(c, e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">-- Choose Eligible Handler --</option>
                          {eligibleHandlers.map((h) => {
                            const count = getHandlerCaseload(h.name);
                            return (
                              <option key={h.id} value={h.name}>
                                {h.name} · ({count} active)
                              </option>
                            );
                          })}
                        </select>
                        {c.track === 'CONFIDENTIAL' && (
                          <p className="text-[10px] text-purple-700 font-medium mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Filtered to personnel with security clearance
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: ACTIVE CASES TABLE */}
      {activeTab === 'ACTIVE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          {/* Bulk Action Header */}
          {selectedIds.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-amber-900">
                {selectedIds.length} case{selectedIds.length > 1 ? 's' : ''} selected
              </span>

              <div className="flex items-center gap-2">
                <select
                  value={bulkTargetHandler}
                  onChange={(e) => setBulkTargetHandler(e.target.value)}
                  className="text-xs p-1.5 rounded-md border border-slate-300 bg-white"
                >
                  <option value="">-- Reassign to Handler --</option>
                  {handlersPool.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name} ({getHandlerCaseload(h.name)} active)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!bulkTargetHandler}
                  onClick={handleBulkReassign}
                  className="px-3 py-1.5 rounded-md text-xs font-bold bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50"
                >
                  Apply Reassignment
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3 w-8">
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(applySearch(activeQueue))}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      {selectedIds.length === applySearch(activeQueue).length && activeQueue.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-sky-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Ticket & Track</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Category & Summary</th>
                  <th className="p-3">Assigned Handler</th>
                  <th className="p-3">Resolution SLA</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applySearch(activeQueue).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No active cases match the current filter.
                    </td>
                  </tr>
                ) : (
                  applySearch(activeQueue).map((c) => {
                    const isSelected = selectedIds.includes(c.id);
                    const deadline = new Date(c.resolveDeadlineAt).getTime();
                    const hoursLeft = Math.round((deadline - Date.now()) / (1000 * 60 * 60));

                    return (
                      <tr key={c.id} className={isSelected ? 'bg-sky-50/50' : 'hover:bg-slate-50/60'}>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(c.id)}
                            className="text-slate-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-sky-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {c.id}
                          <span className="block font-sans text-[10px] font-semibold text-slate-500 uppercase">
                            {c.track}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {c.locationCode}
                          <span className="block text-[11px] text-slate-400 truncate max-w-[140px]">
                            {c.locationName.en}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{c.category}</span>
                          <span className="text-slate-600 line-clamp-1 max-w-xs">{c.text}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800">{c.ownerName}</span>
                          <span className="block text-[10px] text-slate-400">{c.ownerRole}</span>
                        </td>
                        <td className="p-3">
                          {c.isOverdue || hoursLeft <= 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-red-700">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Overdue ({Math.abs(hoursLeft)}h)
                            </span>
                          ) : (
                            <span className="text-slate-700 font-medium">{hoursLeft}h remaining</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectComplaintForDetail?.(c)}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: AWAITING APPROVAL (PENDING_CLOSURE) */}
      {activeTab === 'APPROVAL' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3 text-purple-950 text-xs">
            <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Separation of Duties Verification Queue</p>
              <p className="text-purple-800 mt-0.5">
                These cases were submitted by Handlers upon completing investigation. Review the root cause and
                mandatory resolution notes before approving final closure. If you personally investigated a case,
                approval must be escalated.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applySearch(approvalQueue).length === 0 ? (
              <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">Approval Queue Clear</p>
                <p className="text-xs text-slate-500 mt-0.5">No cases currently awaiting closure signoff.</p>
              </div>
            ) : (
              applySearch(approvalQueue).map((c) => {
                // Hard Rule 2 Check: Did the Team Lead personally investigate this case?
                const leadPersonallyHandled =
                  c.handledBy?.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
                  c.ownerName?.trim().toLowerCase() === currentUser.name.trim().toLowerCase();

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl border border-purple-200 p-5 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-base font-bold text-slate-900">{c.id}</span>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{c.locationName.en}</p>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          PENDING_CLOSURE
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                        <span className="text-slate-500 block font-medium">Original Issue:</span>
                        <strong className="text-slate-900">{c.category}:</strong> {c.text}
                      </div>

                      {/* Attached Evidence & Files */}
                      {((c.attachments && c.attachments.length > 0) || (c.photos && c.photos.length > 0)) && (
                        <div className="pt-1">
                          <AttachmentGallery
                            attachments={c.attachments}
                            photos={c.photos}
                            track={c.track}
                            isAnonymous={c.isAnonymous}
                          />
                        </div>
                      )}

                      {/* Submitted Root Cause & Resolution Note */}
                      <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-950">Root Cause:</span>
                          <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-bold uppercase text-[10px]">
                            {c.rootCause || 'Process gap'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-purple-950 block mb-1">Handler Resolution Note:</span>
                          <p className="text-purple-900 whitespace-pre-wrap leading-relaxed">{c.resolutionNote}</p>
                        </div>
                        <div className="pt-2 border-t border-purple-200/60 text-[11px] text-purple-800 flex items-center justify-between">
                          <span>Investigator: <strong>{c.handledBy || c.ownerName}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Closure Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReturningCase(c);
                          setReworkNote('');
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return for Rework
                      </button>

                      {leadPersonallyHandled ? (
                        <div className="text-right">
                          <span className="block text-[11px] text-red-600 font-semibold">
                            Rule 2: Cannot approve self-handled case
                          </span>
                          <span className="text-[10px] text-slate-500">Requires Ops Head / Director signoff</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setApprovingCase(c);
                            setClosureComment('');
                          }}
                          className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve & Close
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Return to Handler Modal */}
      {returningCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Return Case for Rework</h3>
            <p className="text-xs text-slate-600">
              Ticket {returningCase.id} will be sent back to Investigator <strong>{returningCase.handledBy || returningCase.ownerName}</strong> in <strong>IN_PROGRESS</strong> status.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rework Reason & Instructions <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reworkNote}
                onChange={(e) => setReworkNote(e.target.value)}
                placeholder="Specify why the resolution is incomplete, what additional verification is required..."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReturningCase(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reworkNote.trim()}
                onClick={handleConfirmReturn}
                className="px-4 py-1.5 text-xs font-bold bg-amber-700 text-white rounded-md hover:bg-amber-800 disabled:opacity-50"
              >
                Return to Investigator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve & Close Modal */}
      {approvingCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Confirm Case Closure</h3>
            <p className="text-xs text-slate-600">
              Verify and close ticket {approvingCase.id}. Root cause <strong>{approvingCase.rootCause}</strong> will be archived into institutional quality records.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Closure Verification Comment (Optional)
              </label>
              <textarea
                rows={3}
                value={closureComment}
                onChange={(e) => setClosureComment(e.target.value)}
                placeholder="Add any supervisory closing remarks or preventative actions..."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setApprovingCase(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Sign Off & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
