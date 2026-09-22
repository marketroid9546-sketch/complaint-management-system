import { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  FileText,
  MessageSquare,
  Send,
  Volume2,
  CheckCircle2,
  UserCheck,
  Search,
  ExternalLink,
  Lock,
  EyeOff,
} from 'lucide-react';
import { Complaint, User, RootCause, AuditEvent } from '../../types';
import { can, isUserExcludedFromComplaint } from '../../utils/permissions';
import { AttachmentGallery } from '../attachments/AttachmentGallery';

interface HandlerWorkspaceProps {
  currentUser: User;
  complaints: Complaint[];
  onUpdateComplaint: (updated: Complaint) => void;
  onSelectComplaintForDetail?: (complaint: Complaint) => void;
}

export function HandlerWorkspace({
  currentUser,
  complaints,
  onUpdateComplaint,
}: HandlerWorkspaceProps) {
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');

  // Resolution modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedRootCause, setSelectedRootCause] = useState<RootCause>('Process gap');
  const [resolutionNote, setResolutionNote] = useState('');

  // Internal note state
  const [internalNoteText, setInternalNoteText] = useState('');

  // Public update state
  const [publicUpdateEn, setPublicUpdateEn] = useState('');
  const [publicUpdateUr, setPublicUpdateUr] = useState('');

  // Filter complaints assigned to this handler
  const myComplaints = complaints.filter(
    (c) =>
      c.ownerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
      c.watchers?.some((w) => w.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
  );

  const filteredComplaints = myComplaints.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.locationName.en.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'ACTIVE') {
      return c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED' || c.status === 'In Progress' || c.status === 'Acknowledged';
    }
    if (activeTab === 'PENDING') {
      return c.status === 'PENDING_CLOSURE';
    }
    return true;
  });

  const selectedComplaint = complaints.find((c) => c.id === selectedComplaintId) || filteredComplaints[0];

  // SLA hours left calculation
  const getSlaHoursRemaining = (deadlineIso: string): number => {
    const deadline = new Date(deadlineIso).getTime();
    const now = Date.now();
    return Math.round((deadline - now) / (1000 * 60 * 60));
  };

  const getSlaBadge = (hoursLeft: number, isOverdue: boolean) => {
    if (isOverdue || hoursLeft <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          Overdue ({Math.abs(hoursLeft)}h ago)
        </span>
      );
    }
    if (hoursLeft <= 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-300 animate-pulse">
          <Clock className="w-3.5 h-3.5" />
          {hoursLeft}h left
        </span>
      );
    }
    if (hoursLeft <= 12) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          {hoursLeft}h left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Clock className="w-3.5 h-3.5" />
        {hoursLeft}h left
      </span>
    );
  };

  const handleStartWork = (complaint: Complaint) => {
    const updated: Complaint = {
      ...complaint,
      status: 'IN_PROGRESS',
      handledBy: currentUser.name,
      auditTimeline: [
        ...complaint.auditTimeline,
        {
          id: `aud-${Date.now()}`,
          eventType: 'STATUS_CHANGE',
          actor: currentUser.name,
          role: currentUser.roleTitle,
          details: `Investigation initiated by ${currentUser.name}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    onUpdateComplaint(updated);
  };

  const handleSubmitResolution = () => {
    if (!selectedComplaint || resolutionNote.trim().length < 30) return;

    const newAudit: AuditEvent = {
      id: `aud-${Date.now()}`,
      eventType: 'STATUS_CHANGE',
      actor: currentUser.name,
      role: currentUser.roleTitle,
      details: `Submitted for closure approval. Root Cause: ${selectedRootCause}`,
      timestamp: new Date().toISOString(),
    };

    const updated: Complaint = {
      ...selectedComplaint,
      status: 'PENDING_CLOSURE',
      handledBy: currentUser.name,
      rootCause: selectedRootCause,
      resolutionNote: resolutionNote.trim(),
      auditTimeline: [...selectedComplaint.auditTimeline, newAudit],
      internalNotes: [
        ...selectedComplaint.internalNotes,
        {
          id: `note-${Date.now()}`,
          author: currentUser.name,
          role: currentUser.roleTitle,
          text: `[RESOLUTION SUBMITTED - Root Cause: ${selectedRootCause}]\n${resolutionNote.trim()}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onUpdateComplaint(updated);
    setIsResolveModalOpen(false);
    setResolutionNote('');
  };

  const handleAddInternalNote = () => {
    if (!selectedComplaint || !internalNoteText.trim()) return;

    const updated: Complaint = {
      ...selectedComplaint,
      internalNotes: [
        ...selectedComplaint.internalNotes,
        {
          id: `note-${Date.now()}`,
          author: currentUser.name,
          role: currentUser.roleTitle,
          text: internalNoteText.trim(),
          timestamp: new Date().toISOString(),
        },
      ],
      auditTimeline: [
        ...selectedComplaint.auditTimeline,
        {
          id: `aud-${Date.now()}`,
          eventType: 'NOTE_ADDED',
          actor: currentUser.name,
          role: currentUser.roleTitle,
          details: 'Internal investigation note appended',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onUpdateComplaint(updated);
    setInternalNoteText('');
  };

  const handleAddPublicUpdate = () => {
    if (!selectedComplaint || (!publicUpdateEn.trim() && !publicUpdateUr.trim())) return;

    const updated: Complaint = {
      ...selectedComplaint,
      publicUpdates: [
        ...selectedComplaint.publicUpdates,
        {
          id: `pu-${Date.now()}`,
          textEn: publicUpdateEn.trim() || publicUpdateUr.trim(),
          textUr: publicUpdateUr.trim() || publicUpdateEn.trim(),
          timestamp: new Date().toISOString(),
        },
      ],
      auditTimeline: [
        ...selectedComplaint.auditTimeline,
        {
          id: `aud-${Date.now()}`,
          eventType: 'PUBLIC_UPDATE',
          actor: currentUser.name,
          role: currentUser.roleTitle,
          details: 'Public bulletin update published to tracking portal',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onUpdateComplaint(updated);
    setPublicUpdateEn('');
    setPublicUpdateUr('');
  };

  const isExcluded = selectedComplaint ? isUserExcludedFromComplaint(currentUser, selectedComplaint) : false;

  return (
    <div id="handler-workspace-root" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Workspace Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Investigator Workspace</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
              HANDLER
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Assigned investigations for <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.roleTitle})
          </p>
        </div>

        {/* Quick Counts */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Queue</span>
            <span className="text-lg font-bold text-slate-900">{myComplaints.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <span className="block text-xs font-medium text-amber-700 uppercase tracking-wider">Active</span>
            <span className="text-lg font-bold text-amber-900">
              {myComplaints.filter((c) => c.status === 'IN_PROGRESS' || c.status === 'In Progress').length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-purple-50 border border-purple-200 text-center">
            <span className="block text-xs font-medium text-purple-700 uppercase tracking-wider">Awaiting Approval</span>
            <span className="text-lg font-bold text-purple-900">
              {myComplaints.filter((c) => c.status === 'PENDING_CLOSURE').length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Queue List / Right Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Complaint Queue */}
        <div className="lg:col-span-5 space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket code, category, or branch..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                All ({myComplaints.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE')}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  activeTab === 'ACTIVE' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PENDING')}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  activeTab === 'PENDING' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Pending Review
              </button>
            </div>
          </div>

          {/* List of items */}
          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium">No complaints in this queue view.</p>
              </div>
            ) : (
              filteredComplaints.map((c) => {
                const hoursLeft = getSlaHoursRemaining(c.resolveDeadlineAt);
                const isSelected = selectedComplaint?.id === c.id;

                return (
                  <div
                    key={c.id}
                    id={`complaint-item-${c.id}`}
                    onClick={() => setSelectedComplaintId(c.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-50/70 border-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 font-mono">{c.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                              c.track === 'SAFEGUARDING'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : c.track === 'CONFIDENTIAL'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {c.track}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-0.5 line-clamp-1">{c.locationName.en}</p>
                      </div>

                      {getSlaBadge(hoursLeft, c.isOverdue)}
                    </div>

                    <p className="text-xs font-medium text-slate-800 line-clamp-1 mb-2">
                      <strong className="text-slate-900 font-semibold">{c.category}</strong>: {c.text}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-700">Status: {c.status}</span>
                      <span>Severity: <span className="font-semibold text-slate-800">{c.severity}</span></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Investigation Detail */}
        <div className="lg:col-span-7">
          {!selectedComplaint ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Select a Case from the Queue</h3>
              <p className="text-xs text-slate-500 mt-1">Click on any ticket on the left to review evidence and submit resolution.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Conflict Exclusion Banner */}
              {isExcluded && (
                <div className="p-4 bg-red-50 border-b border-red-200 flex items-start gap-3 text-red-900">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Conflict of Interest Exclusion</h4>
                    <p className="text-xs text-red-700 mt-0.5">
                      You are recorded as the named subject or submitter on this case. All investigation and resolution actions have been blocked and delegated.
                    </p>
                  </div>
                </div>
              )}

              {/* Detail Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold font-mono text-slate-900">{selectedComplaint.id}</h2>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-200 text-slate-800">
                      {selectedComplaint.entity}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                        selectedComplaint.track === 'SAFEGUARDING'
                          ? 'bg-amber-100 text-amber-900'
                          : selectedComplaint.track === 'CONFIDENTIAL'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      {selectedComplaint.track}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-medium">{selectedComplaint.locationName.en}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Status:</span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-900 text-white">
                    {selectedComplaint.status}
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span>Assigned Handler: </span>
                  <strong className="text-slate-900 font-semibold">{selectedComplaint.ownerName}</strong>
                </div>

                <div className="flex items-center gap-2">
                  {/* Progress to IN_PROGRESS */}
                  {(selectedComplaint.status === 'NEW' ||
                    selectedComplaint.status === 'ASSIGNED' ||
                    selectedComplaint.status === 'New' ||
                    selectedComplaint.status === 'Acknowledged') && (
                    <button
                      type="button"
                      disabled={isExcluded || !can(currentUser, 'complaint.status.progress', selectedComplaint)}
                      onClick={() => handleStartWork(selectedComplaint)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      Begin Investigation
                    </button>
                  )}

                  {/* Move to PENDING_CLOSURE */}
                  {(selectedComplaint.status === 'IN_PROGRESS' || selectedComplaint.status === 'In Progress') && (
                    <button
                      type="button"
                      disabled={isExcluded || !can(currentUser, 'complaint.resolve', selectedComplaint)}
                      onClick={() => setIsResolveModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Submit for Closure Approval
                    </button>
                  )}

                  {selectedComplaint.status === 'PENDING_CLOSURE' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                      <UserCheck className="w-3.5 h-3.5" />
                      Awaiting Team Lead Approval
                    </div>
                  )}
                </div>
              </div>

              {/* Case Content */}
              <div className="p-6 space-y-6">
                {/* Submitter Info / Anonymous Card */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {selectedComplaint.isAnonymous ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                          <EyeOff className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Anonymous Submitter</p>
                          <p className="text-[11px] text-slate-500">Contact details withheld for whistleblower protection</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                          {selectedComplaint.contactInfo?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{selectedComplaint.contactInfo?.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {selectedComplaint.submitterType} · {selectedComplaint.contactInfo?.phone}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Severity</span>
                    <span className="text-xs font-bold text-slate-800">{selectedComplaint.severity}</span>
                  </div>
                </div>

                {/* Complaint Narrative */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Complaint Statement</h4>
                  <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200 text-sm text-slate-800 leading-relaxed">
                    {selectedComplaint.text}
                  </div>
                </div>

                {/* Voice Note & Media Evidence */}
                {selectedComplaint.voiceNote && (
                  <div className="p-3 rounded-lg border border-slate-200 bg-sky-50/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Voice Recording</p>
                      <p className="text-[11px] text-slate-500">{selectedComplaint.voiceNote.durationSeconds}s audio recording</p>
                    </div>
                  </div>
                )}

                {/* Attachments Section with Scan Badges, Lightbox, PDF Viewer & Inline Audio Player */}
                <AttachmentGallery
                  attachments={selectedComplaint.attachments}
                  photos={selectedComplaint.photos}
                  track={selectedComplaint.track}
                  isAnonymous={selectedComplaint.isAnonymous}
                />

                {/* Resolution Summary (If in PENDING_CLOSURE or CLOSED) */}
                {selectedComplaint.resolutionNote && (
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900">Recorded Resolution Summary</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900 uppercase">
                        Root Cause: {selectedComplaint.rootCause}
                      </span>
                    </div>
                    <p className="text-xs text-purple-800 whitespace-pre-wrap">{selectedComplaint.resolutionNote}</p>
                  </div>
                )}

                {/* Internal Investigation Notes Feed */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Confidential Investigation Notes ({selectedComplaint.internalNotes.length})
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {selectedComplaint.internalNotes.map((note) => (
                      <div key={note.id} className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs">
                        <div className="flex items-center justify-between font-semibold text-amber-950 mb-1">
                          <span>{note.author} ({note.role})</span>
                          <span className="text-[10px] font-normal text-amber-800">
                            {new Date(note.timestamp).toLocaleDateString()} {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-amber-900 whitespace-pre-wrap">{note.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Note Input */}
                  {!isExcluded && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={2}
                        value={internalNoteText}
                        onChange={(e) => setInternalNoteText(e.target.value)}
                        placeholder="Add confidential investigation note..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!internalNoteText.trim()}
                          onClick={handleAddInternalNote}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
                        >
                          Save Internal Note
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Public Bulletin Updates */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    Public Citizen Bulletin Updates ({selectedComplaint.publicUpdates.length})
                  </h4>

                  <div className="space-y-2">
                    {selectedComplaint.publicUpdates.map((pu) => (
                      <div key={pu.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <p className="text-slate-800 font-medium">{pu.textEn}</p>
                        <p className="text-slate-600 font-urdu text-right text-sm" dir="rtl">{pu.textUr}</p>
                        <span className="text-[10px] text-slate-400 block pt-1">
                          {new Date(pu.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Add Public Update */}
                  {!isExcluded && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-700">Post Public Progress Update</p>
                      <input
                        type="text"
                        value={publicUpdateEn}
                        onChange={(e) => setPublicUpdateEn(e.target.value)}
                        placeholder="English update for citizen tracking..."
                        className="w-full text-xs p-2 rounded-md border border-slate-200 bg-white"
                      />
                      <input
                        type="text"
                        dir="rtl"
                        value={publicUpdateUr}
                        onChange={(e) => setPublicUpdateUr(e.target.value)}
                        placeholder="اردو میں پیش رفت..."
                        className="w-full text-xs p-2 rounded-md border border-slate-200 bg-white font-urdu"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!publicUpdateEn.trim() && !publicUpdateUr.trim()}
                          onClick={handleAddPublicUpdate}
                          className="px-3 py-1 rounded-md text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Publish to Portal
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audit Timeline */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Audit History</h4>
                  <div className="space-y-1.5">
                    {selectedComplaint.auditTimeline.map((item) => (
                      <div key={item.id} className="text-[11px] text-slate-600 flex items-start gap-2">
                        <span className="text-slate-400 font-mono shrink-0">
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>·</span>
                        <span className="font-semibold text-slate-700">{item.actor}</span>
                        <span>—</span>
                        <span className="text-slate-800">{item.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Resolution Modal for PENDING_CLOSURE */}
      {isResolveModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit for Closure Approval</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ticket {selectedComplaint.id}</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                Step 1 of 2
              </span>
            </div>

            <div className="space-y-3">
              {/* Mandatory Root Cause Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Root Cause Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRootCause}
                  onChange={(e) => setSelectedRootCause(e.target.value as RootCause)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Process gap">Process gap (Workflow delay / miscommunication)</option>
                  <option value="Staff error">Staff error (Procedural omission / behaviour)</option>
                  <option value="System failure">System failure (Software / hardware / assay defect)</option>
                  <option value="Third party">Third party (Supplier / logistics delay)</option>
                  <option value="Not substantiated">Not substantiated (Investigation found no fault)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Mandatory Resolution Note */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Resolution Note <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] ${resolutionNote.trim().length >= 30 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    {resolutionNote.trim().length} / 30 chars minimum
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Detail exactly what actions were taken to resolve this complaint, corrective measures implemented, and how the patient or student was satisfied..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Separation of duties: This ticket will move to <strong>PENDING_CLOSURE</strong> for formal Team Lead verification and signoff.
                </p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolutionNote.trim().length < 30}
                onClick={handleSubmitResolution}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-xs"
              >
                Confirm & Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
