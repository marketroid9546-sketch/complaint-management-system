import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  UserCheck,
  FileText,
  Building,
  History,
} from 'lucide-react';
import { Complaint, User, AuditEvent, ComplaintStatus } from '../../types';
import { can, isUserExcludedFromComplaint } from '../../utils/permissions';
import { AttachmentGallery } from '../attachments/AttachmentGallery';

interface SafeguardingConsoleProps {
  currentUser: User;
  allUsers: User[];
  complaints: Complaint[];
  onUpdateComplaint: (updated: Complaint) => void;
}

export function SafeguardingConsole({
  currentUser,
  allUsers,
  complaints,
  onUpdateComplaint,
}: SafeguardingConsoleProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [statusUpdate, setStatusUpdate] = useState<ComplaintStatus>('IN_PROGRESS');

  // Filter ONLY safeguarding complaints
  const safeguardingCases = complaints.filter((c) => c.track === 'SAFEGUARDING');

  const selectedCase =
    safeguardingCases.find((c) => c.id === selectedCaseId) || safeguardingCases[0];

  // Log a read audit event whenever a case is opened
  useEffect(() => {
    if (!selectedCase) return;

    // Check if viewed recently in audit timeline
    const recentView = selectedCase.auditTimeline.some(
      (a) =>
        a.eventType === 'VIEWED' &&
        a.actor === currentUser.name &&
        Date.now() - new Date(a.timestamp).getTime() < 30000
    );

    if (!recentView) {
      const viewAudit: AuditEvent = {
        id: `aud-sg-view-${Date.now()}`,
        eventType: 'VIEWED',
        actor: currentUser.name,
        role: currentUser.roleTitle,
        details: `Safeguarding case record accessed in high-security console`,
        timestamp: new Date().toISOString(),
      };

      const updated: Complaint = {
        ...selectedCase,
        auditTimeline: [...selectedCase.auditTimeline, viewAudit],
      };

      onUpdateComplaint(updated);
    }
  }, [selectedCase?.id]);

  const handleAddSafeguardingNote = () => {
    if (!selectedCase || !noteText.trim()) return;

    const updated: Complaint = {
      ...selectedCase,
      internalNotes: [
        ...selectedCase.internalNotes,
        {
          id: `sg-note-${Date.now()}`,
          author: currentUser.name,
          role: currentUser.roleTitle,
          text: `[RESTRICTED SAFEGUARDING ENTRY]\n${noteText.trim()}`,
          timestamp: new Date().toISOString(),
        },
      ],
      auditTimeline: [
        ...selectedCase.auditTimeline,
        {
          id: `aud-sg-note-${Date.now()}`,
          eventType: 'NOTE_ADDED',
          actor: currentUser.name,
          role: currentUser.roleTitle,
          details: 'Confidential case management note recorded',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onUpdateComplaint(updated);
    setNoteText('');
  };

  const handleStatusChange = (newStatus: ComplaintStatus) => {
    if (!selectedCase) return;

    const updated: Complaint = {
      ...selectedCase,
      status: newStatus,
      auditTimeline: [
        ...selectedCase.auditTimeline,
        {
          id: `aud-sg-stat-${Date.now()}`,
          eventType: 'STATUS_CHANGE',
          actor: currentUser.name,
          role: currentUser.roleTitle,
          details: `Safeguarding status transitioned to ${newStatus}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onUpdateComplaint(updated);
  };

  const isExcluded = selectedCase ? isUserExcludedFromComplaint(currentUser, selectedCase) : false;

  // Derive read audit history
  const accessLog = selectedCase
    ? selectedCase.auditTimeline.filter((a) => a.eventType === 'VIEWED' || a.details.includes('accessed'))
    : [];

  return (
    <div id="safeguarding-console-root" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* High-Security Safeguarding Header */}
      <div className="bg-slate-950 text-white rounded-xl p-6 border-l-4 border-l-amber-500 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Child Protection & Safeguarding Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800">
              AIR-GAPPED
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Designated Officer: <strong className="text-white">{currentUser.name}</strong> ({currentUser.roleTitle}) ·
            Direct escalation channel to CEO
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block tracking-wider">
              Active Cases
            </span>
            <span className="text-lg font-bold text-amber-400">{safeguardingCases.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block tracking-wider">
              Audit Status
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Read-Logged
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Cases List / Right Case Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Cases Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Protected Incidents Register
            </h3>
            <p className="text-[11px] text-slate-500">
              Zero-leak confidentiality enforced. Only CPO and CEO hold decryption clearance.
            </p>
          </div>

          <div className="space-y-2.5">
            {safeguardingCases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              const hasConflict = isUserExcludedFromComplaint(currentUser, c);

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">{c.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                          {c.category}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">{c.locationName.en}</p>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                      {c.severity}
                    </span>
                  </div>

                  {hasConflict ? (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-700 font-semibold">
                      Self-conflict exclusion active on this record
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 line-clamp-2 mb-2">{c.text}</p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Status: {c.status}</span>
                    <span>Officer: <strong className="text-slate-800">{c.ownerName}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: High Security Case Detail */}
        <div className="lg:col-span-7">
          {!selectedCase ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No Safeguarding Case Selected</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-6 p-6">
              {/* Conflict Exclusion Banner */}
              {isExcluded ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-950">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Conflict of Interest Exclusion</h4>
                    <p className="text-xs text-red-800 mt-0.5">
                      You are identified as the named subject in this safeguarding case. In compliance with Rule 1,
                      all management privileges and details are excluded and routed to an independent investigator.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Case Header & Status Controls */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-bold text-slate-900">{selectedCase.id}</span>
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {selectedCase.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">{selectedCase.locationName.en}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Status:</span>
                      <select
                        value={selectedCase.status}
                        onChange={(e) => handleStatusChange(e.target.value as ComplaintStatus)}
                        className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-bold text-slate-800"
                      >
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="PENDING_CLOSURE">PENDING_CLOSURE</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>
                  </div>

                  {/* Sensitive Party Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Named Subject / Party:</span>
                      <strong className="text-slate-900 font-bold">
                        {selectedCase.safeguardingPersonName || 'Not explicitly named / Under inquiry'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Complainant Contact:</span>
                      <strong className="text-slate-900 font-bold">
                        {selectedCase.isAnonymous
                          ? 'Protected Anonymous Submitter'
                          : `${selectedCase.contactInfo?.name || 'Complainant'} (${selectedCase.contactInfo?.phone || ''})`}
                      </strong>
                    </div>
                  </div>

                  {/* Incident Narrative */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Incident Narrative</h4>
                    <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 text-xs text-slate-900 leading-relaxed font-medium">
                      {selectedCase.text}
                    </div>
                  </div>

                  {/* Confidential Attachments and Evidence */}
                  <AttachmentGallery
                    attachments={selectedCase.attachments}
                    photos={selectedCase.photos}
                    track={selectedCase.track}
                    isAnonymous={selectedCase.isAnonymous}
                  />

                  {/* Restricted CPO Investigation Log */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Air-Gapped Child Protection Notes ({selectedCase.internalNotes.length})
                    </h4>

                    <div className="space-y-2">
                      {selectedCase.internalNotes.map((n) => (
                        <div key={n.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                            <span>{n.author} ({n.role})</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(n.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-800 whitespace-pre-wrap">{n.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Note Input */}
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add strictly confidential safeguarding assessment note..."
                        className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!noteText.trim()}
                          onClick={handleAddSafeguardingNote}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          Append Protected Note
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Immutable Access Log (Read Audits) */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        Tamper-Evident Access Log (Read Audits)
                      </h4>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Immutable Ledger
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200 max-h-40 overflow-y-auto">
                      {accessLog.length === 0 ? (
                        <p className="text-[11px] text-slate-400">No read events recorded yet.</p>
                      ) : (
                        accessLog.map((ev) => (
                          <div key={ev.id} className="text-[11px] text-slate-600 flex items-start gap-2">
                            <span className="text-slate-400 font-mono shrink-0">
                              {new Date(ev.timestamp).toLocaleDateString()} {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>·</span>
                            <span className="font-bold text-slate-800">{ev.actor}</span>
                            <span>—</span>
                            <span className="text-slate-600">{ev.details}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
