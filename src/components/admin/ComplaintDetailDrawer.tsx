import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Lock,
  Clock,
  Send,
  Building2,
  FileText,
  History,
  AlertTriangle,
  Play,
  Pause,
  ExternalLink,
  Ban,
  Maximize2,
} from 'lucide-react';
import {
  Complaint,
  ComplaintStatus,
  AdminRole,
} from '../../types';
import { MOCK_USERS } from '../../data/mockData';
import { AttachmentGallery } from '../attachments/AttachmentGallery';

interface ComplaintDetailDrawerProps {
  complaint: Complaint | null;
  onClose: () => void;
  onUpdateComplaint: (updated: Complaint) => void;
  currentRole: AdminRole;
}

export const ComplaintDetailDrawer: React.FC<ComplaintDetailDrawerProps> = ({
  complaint,
  onClose,
  onUpdateComplaint,
  currentRole,
}) => {
  if (!complaint) return null;

  // Audit view event on open for SAFEGUARDING complaints
  useEffect(() => {
    if (complaint.track === 'SAFEGUARDING') {
      const hasAlreadyLoggedView = complaint.auditTimeline.some(
        (ev) =>
          ev.eventType === 'VIEWED' &&
          ev.actor.includes(currentRole) &&
          Math.abs(Date.now() - new Date(ev.timestamp).getTime()) < 10000
      );

      if (!hasAlreadyLoggedView) {
        const viewAudit = {
          id: `view-${Date.now()}`,
          eventType: 'VIEWED' as const,
          actor: `${currentRole} Session`,
          role: currentRole,
          details: `Safeguarding confidential case viewed by ${currentRole}`,
          timestamp: new Date().toISOString(),
        };
        const updated = {
          ...complaint,
          auditTimeline: [viewAudit, ...complaint.auditTimeline],
        };
        onUpdateComplaint(updated);
      }
    }
  }, [complaint.id]);

  // Local interaction states
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(complaint.status);
  const [rejectionReason, setRejectionReason] = useState<string>(complaint.rejectionReason || '');
  const [showRejectionInput, setShowRejectionInput] = useState<boolean>(false);

  const [selectedAssignee, setSelectedAssignee] = useState<string>(complaint.ownerName);
  const [reassignmentReason, setReassignmentReason] = useState<string>('');
  const [showReassignmentInput, setShowReassignmentInput] = useState<boolean>(false);

  const [newInternalNote, setNewInternalNote] = useState<string>('');
  const [newPublicUpdateUr, setNewPublicUpdateUr] = useState<string>('');
  const [newPublicUpdateEn, setNewPublicUpdateEn] = useState<string>('');

  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Status Change Handler
  const handleStatusSave = () => {
    if (selectedStatus === 'Rejected' && !rejectionReason.trim()) {
      alert('A mandatory rejection reason is required before rejecting this complaint.');
      return;
    }

    const now = new Date().toISOString();
    const auditEntry = {
      id: `aud-stat-${Date.now()}`,
      eventType: 'STATUS_CHANGE' as const,
      actor: currentRole,
      role: currentRole,
      details: `Status changed from ${complaint.status} to ${selectedStatus}${
        selectedStatus === 'Rejected' ? ` (Reason: ${rejectionReason})` : ''
      }`,
      timestamp: now,
    };

    const updated: Complaint = {
      ...complaint,
      status: selectedStatus,
      rejectionReason: selectedStatus === 'Rejected' ? rejectionReason : undefined,
      acknowledgedAt:
        selectedStatus !== 'New' && !complaint.acknowledgedAt
          ? now
          : complaint.acknowledgedAt,
      resolvedAt:
        (selectedStatus === 'Resolved' || selectedStatus === 'Closed') && !complaint.resolvedAt
          ? now
          : complaint.resolvedAt,
      auditTimeline: [auditEntry, ...complaint.auditTimeline],
    };

    onUpdateComplaint(updated);
    setShowRejectionInput(false);
  };

  // Reassignment Handler
  const handleReassignmentSave = () => {
    if (!reassignmentReason.trim()) {
      alert('A mandatory reason is required for reassigning ownership.');
      return;
    }

    const userEntry = Object.values(MOCK_USERS).find((u) => u.name === selectedAssignee);
    const newRole = userEntry ? userEntry.role : 'Officer';

    const now = new Date().toISOString();
    const auditEntry = {
      id: `aud-assign-${Date.now()}`,
      eventType: 'REASSIGNED' as const,
      actor: currentRole,
      role: currentRole,
      details: `Reassigned from ${complaint.ownerName} to ${selectedAssignee} (${newRole}). Reason: ${reassignmentReason}`,
      timestamp: now,
    };

    const updated: Complaint = {
      ...complaint,
      ownerName: selectedAssignee,
      ownerRole: newRole,
      reassignmentReason,
      auditTimeline: [auditEntry, ...complaint.auditTimeline],
    };

    onUpdateComplaint(updated);
    setShowReassignmentInput(false);
    setReassignmentReason('');
  };

  // Add Internal Note
  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternalNote.trim()) return;

    const now = new Date().toISOString();
    const note = {
      id: `in-${Date.now()}`,
      author: currentRole,
      role: currentRole,
      text: newInternalNote.trim(),
      timestamp: now,
    };

    const auditEntry = {
      id: `aud-note-${Date.now()}`,
      eventType: 'NOTE_ADDED' as const,
      actor: currentRole,
      role: currentRole,
      details: `Internal confidential note added.`,
      timestamp: now,
    };

    const updated: Complaint = {
      ...complaint,
      internalNotes: [...complaint.internalNotes, note],
      auditTimeline: [auditEntry, ...complaint.auditTimeline],
    };

    onUpdateComplaint(updated);
    setNewInternalNote('');
  };

  // Add Public Update (Visible on Tracking Page)
  const handleAddPublicUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPublicUpdateUr.trim() && !newPublicUpdateEn.trim()) return;

    const now = new Date().toISOString();
    const update = {
      id: `pu-${Date.now()}`,
      textUr: newPublicUpdateUr.trim() || newPublicUpdateEn.trim(),
      textEn: newPublicUpdateEn.trim() || newPublicUpdateUr.trim(),
      timestamp: now,
    };

    const auditEntry = {
      id: `aud-pub-${Date.now()}`,
      eventType: 'PUBLIC_UPDATE' as const,
      actor: currentRole,
      role: currentRole,
      details: `Public update published to tracking portal.`,
      timestamp: now,
    };

    const updated: Complaint = {
      ...complaint,
      publicUpdates: [...complaint.publicUpdates, update],
      auditTimeline: [auditEntry, ...complaint.auditTimeline],
    };

    onUpdateComplaint(updated);
    setNewPublicUpdateUr('');
    setNewPublicUpdateEn('');
  };

  const isReadOnly = currentRole === 'Auditor';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-2xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base sm:text-lg font-mono font-bold text-stone-900">
              {complaint.id}
            </span>

            {complaint.track === 'SAFEGUARDING' && (
              <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-1 rounded font-bold border border-amber-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Safeguarding
              </span>
            )}
            {complaint.track === 'CONFIDENTIAL' && (
              <span className="bg-purple-100 text-purple-900 text-xs px-2.5 py-1 rounded font-bold border border-purple-300 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Confidential
              </span>
            )}
            <span className="bg-stone-200 text-stone-800 text-xs font-semibold px-2 py-0.5 rounded">
              {complaint.status}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 text-stone-400 hover:text-stone-700 rounded-md flex items-center justify-center"
            aria-label="Close drawer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Safeguarding exclusion alert if applicable */}
          {complaint.excludedPerson && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-xs text-red-900 flex items-start gap-2">
              <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Safeguarding Conflict Exclusion Active</strong>
                <span>
                  Excluded from this case: <strong>{complaint.excludedPerson}</strong> (strictly barred from receiving updates, viewing, or managing this record).
                </span>
              </div>
            </div>
          )}

          {/* Core Metadata */}
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-stone-500 block">Entity & Location</span>
              <span className="font-semibold text-stone-900">
                {complaint.locationName.en} ({complaint.locationCode})
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">Category</span>
              <span className="font-semibold text-stone-900">{complaint.category}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Submitter Identity</span>
              <span className="font-semibold text-stone-900">
                {complaint.isAnonymous
                  ? 'Anonymous Submitter'
                  : `${complaint.contactInfo?.name || 'Complainant'} (${complaint.contactInfo?.phone || 'No phone'})`}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">Severity / Priority</span>
              <span
                className={`font-bold inline-block px-2 py-0.5 rounded text-[11px] ${
                  complaint.severity === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : complaint.severity === 'HIGH'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-200 text-stone-800'
                }`}
              >
                {complaint.severity}
              </span>
            </div>
          </div>

          {/* Full Complaint Text */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Complaint Statement
            </h2>
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-stone-900 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {complaint.text || <em className="text-stone-400">No written text provided.</em>}
            </div>
          </div>

          {/* Voice Note Audio Player */}
          {complaint.voiceNote && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Audio Recording
              </h2>
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-900"
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Voice Note ({complaint.voiceNote.durationSeconds}s duration)
                    </span>
                    <span className="text-[11px] text-emerald-800 font-mono">
                      Recorded: {new Date(complaint.voiceNote.recordedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-800 bg-emerald-100 px-2 py-1 rounded">
                  {isPlayingAudio ? 'Playing...' : 'Ready'}
                </span>
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <AttachmentGallery
            attachments={complaint.attachments}
            photos={complaint.photos}
            track={complaint.track}
            isAnonymous={complaint.isAnonymous}
          />

          {/* Routing & SLA Section */}
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-500" />
              Routing & SLA Deadlines
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">Resolved Owner</span>
                <span className="font-semibold text-stone-900">
                  {complaint.ownerName} ({complaint.ownerRole})
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Watchers</span>
                <span className="font-semibold text-stone-900">
                  {complaint.watchers.length > 0 ? complaint.watchers.join(', ') : 'None'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Acknowledgement Deadline</span>
                <span className="font-mono text-stone-800">
                  {new Date(complaint.ackDeadlineAt).toLocaleString()} ({complaint.ackDeadlineHours}h SLA)
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Resolution Target</span>
                <span className="font-mono text-stone-800">
                  {new Date(complaint.resolveDeadlineAt).toLocaleString()} ({complaint.resolveDeadlineHours}h SLA)
                </span>
              </div>
            </div>
          </div>

          {/* Operational Actions: Status & Reassignment (If not read-only) */}
          {!isReadOnly && (
            <div className="bg-white border-2 border-stone-300 rounded-lg p-4 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Departmental Actions
              </h2>

              {/* Status Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700">Update Status</label>
                <div className="flex gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      const newSt = e.target.value as ComplaintStatus;
                      setSelectedStatus(newSt);
                      if (newSt === 'Rejected') {
                        setShowRejectionInput(true);
                      } else {
                        setShowRejectionInput(false);
                      }
                    }}
                    className="flex-1 min-h-[40px] px-3 py-1.5 border border-stone-300 rounded-md text-sm font-medium bg-stone-50"
                  >
                    <option value="New">New</option>
                    <option value="Acknowledged">Acknowledged</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Reopened">Reopened</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleStatusSave}
                    className="min-h-[40px] px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-md text-xs font-bold"
                  >
                    Update
                  </button>
                </div>

                {/* Mandatory Rejection Reason */}
                {showRejectionInput && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-2">
                    <label className="block text-xs font-bold text-red-900">
                      Mandatory Rejection Reason:
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Specify clear rationale why complaint is rejected..."
                      className="w-full text-xs p-2 border border-red-300 rounded bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Assignee Reassignment */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Reassign Case Owner
                  </label>
                  {!showReassignmentInput && (
                    <button
                      type="button"
                      onClick={() => setShowReassignmentInput(true)}
                      className="text-xs text-emerald-800 font-semibold hover:underline"
                    >
                      Change Assignee
                    </button>
                  )}
                </div>

                {showReassignmentInput && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-md space-y-2">
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 border border-stone-300 rounded text-xs bg-white"
                    >
                      {Object.values(MOCK_USERS).map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name} — {u.role}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={reassignmentReason}
                      onChange={(e) => setReassignmentReason(e.target.value)}
                      placeholder="Mandatory reason for transfer..."
                      className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded text-xs bg-white"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowReassignmentInput(false)}
                        className="px-3 py-1 text-xs text-stone-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReassignmentSave}
                        className="px-3 py-1 bg-stone-900 text-white rounded text-xs font-bold"
                      >
                        Confirm Reassignment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes ("Not visible to complainant") */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Internal Case Notes
              </h2>
              <span className="text-[10px] bg-red-100 text-red-900 px-2 py-0.5 rounded font-bold">
                Not visible to complainant
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {complaint.internalNotes.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No internal notes logged yet.</p>
              ) : (
                complaint.internalNotes.map((note) => (
                  <div key={note.id} className="p-3 bg-stone-100 rounded-md text-xs space-y-1">
                    <div className="flex items-center justify-between text-stone-500 font-mono text-[10px]">
                      <span className="font-bold text-stone-800">{note.author} ({note.role})</span>
                      <span>{new Date(note.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-stone-800">{note.text}</p>
                  </div>
                ))
              )}
            </div>

            {!isReadOnly && (
              <form onSubmit={handleAddInternalNote} className="flex gap-2">
                <input
                  type="text"
                  value={newInternalNote}
                  onChange={(e) => setNewInternalNote(e.target.value)}
                  placeholder="Type confidential note for internal team..."
                  className="flex-1 min-h-[40px] px-3 py-1.5 border border-stone-300 rounded text-xs bg-white"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-4 bg-stone-800 hover:bg-stone-900 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </form>
            )}
          </div>

          {/* Public Updates ("Visible on the tracking page") */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Public Updates for Citizen
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
                Visible on tracking page
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {complaint.publicUpdates.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No public updates published yet.</p>
              ) : (
                complaint.publicUpdates.map((pu) => (
                  <div key={pu.id} className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-md text-xs space-y-1">
                    <p className="font-medium text-emerald-950 font-urdu leading-relaxed" dir="rtl">
                      {pu.textUr}
                    </p>
                    <p className="text-stone-700 italic">{pu.textEn}</p>
                    <span className="text-[10px] text-stone-400 font-mono block">
                      {new Date(pu.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {!isReadOnly && (
              <form onSubmit={handleAddPublicUpdate} className="bg-stone-50 p-3 rounded-md border border-stone-200 space-y-2">
                <input
                  type="text"
                  value={newPublicUpdateEn}
                  onChange={(e) => setNewPublicUpdateEn(e.target.value)}
                  placeholder="English update for citizen (e.g. Investigation complete)..."
                  className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded text-xs bg-white"
                />
                <input
                  type="text"
                  dir="rtl"
                  value={newPublicUpdateUr}
                  onChange={(e) => setNewPublicUpdateUr(e.target.value)}
                  placeholder="اردو اپ ڈیٹ (مثلاً: کارروائی مکمل ہو چکی ہے)..."
                  className="w-full min-h-[38px] px-3 py-1.5 border border-stone-300 rounded text-xs bg-white font-urdu"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="min-h-[38px] px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Update</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Audit Timeline */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <History className="w-4 h-4 text-stone-500" />
              Chronological Audit Log
            </h2>

            <div className="space-y-2 relative before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-stone-200">
              {complaint.auditTimeline.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 text-xs relative">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      ev.eventType === 'VIEWED'
                        ? 'bg-amber-100 text-amber-800'
                        : ev.eventType === 'STATUS_CHANGE'
                        ? 'bg-blue-100 text-blue-800'
                        : ev.eventType === 'ESCALATED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-stone-800">{ev.actor}</span>
                      <span className="text-stone-400 font-mono">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] mt-0.5">{ev.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500 font-mono">ID: {complaint.id}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged evidence"
              className="max-w-full max-h-[85vh] object-contain rounded"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-stone-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
