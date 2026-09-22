import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Tag,
  Calendar,
  AlertCircle,
  MessageSquare,
  Shield,
  Lock,
} from 'lucide-react';
import { Complaint, ComplaintStatus } from '../types';
import { Language, translations } from '../translations';

interface TrackingPageProps {
  lang: Language;
  initialCode?: string;
  complaints: Complaint[];
  onNavigateSubmit: () => void;
  onNavigateLogin?: () => void;
}

export const TrackingPage: React.FC<TrackingPageProps> = ({
  lang,
  initialCode = '',
  complaints,
  onNavigateSubmit,
  onNavigateLogin,
}) => {
  const t = translations[lang];
  const [searchCode, setSearchCode] = useState<string>(initialCode);
  const [matchedComplaint, setMatchedComplaint] = useState<Complaint | null>(null);
  const [searched, setSearched] = useState<boolean>(false);

  useEffect(() => {
    if (initialCode.trim()) {
      handleSearch(initialCode.trim());
    }
  }, [initialCode]);

  const handleSearch = (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim().toUpperCase();
    if (!cleanCode) return;

    setSearched(true);
    const found = complaints.find(
      (c) => c.id.toUpperCase() === cleanCode
    );
    setMatchedComplaint(found || null);
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchCode);
  };

  // Timeline steps definition: Submitted -> Acknowledged -> Under review (In Progress) -> Resolved
  const getTimelineStepStatus = (
    stepName: 'Submitted' | 'Acknowledged' | 'In Progress' | 'Resolved',
    currentStatus: ComplaintStatus
  ) => {
    const statusHierarchy: Record<ComplaintStatus, number> = {
      New: 1,
      NEW: 1,
      TRIAGED: 1,
      ASSIGNED: 2,
      Acknowledged: 2,
      'In Progress': 3,
      IN_PROGRESS: 3,
      PENDING_CLOSURE: 3,
      Resolved: 4,
      Closed: 4,
      CLOSED: 4,
      Rejected: 2,
      REJECTED: 2,
      Reopened: 3,
      REOPENED: 3,
    };

    const stepLevelMap = {
      Submitted: 1,
      Acknowledged: 2,
      'In Progress': 3,
      Resolved: 4,
    };

    const currentLevel = statusHierarchy[currentStatus] || 1;
    const stepLevel = stepLevelMap[stepName];

    if (currentLevel >= stepLevel) {
      return 'completed';
    }
    return 'pending';
  };

  return (
    <div className="w-full max-w-xl mx-auto min-h-screen bg-stone-50 py-4 sm:py-8 px-3 sm:px-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
          {t.trackPageTitle}
        </h1>
        <p className="text-sm text-stone-600 mt-1">{t.trackPageSubtitle}</p>
      </div>

      {/* Code Search Input Form */}
      <div className="bg-white border border-stone-300 rounded-xl p-4 sm:p-5 shadow-xs mb-6">
        <form onSubmit={onSubmitForm} className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
            {t.ticketCodeLabel}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder={t.ticketInputPlaceholder}
                className="w-full min-h-[50px] pl-4 pr-10 border-2 border-stone-300 rounded-lg text-lg font-mono tracking-wider text-stone-900 focus:border-emerald-800 focus:outline-hidden uppercase"
              />
              <Search className="w-5 h-5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="min-h-[50px] px-6 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>{t.checkStatusBtn}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Search Result - Not Found */}
      {searched && !matchedComplaint && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-red-900">{t.notFoundError}</h2>
          <p className="text-xs text-red-700 max-w-sm mx-auto">
            Please verify the ticket code received upon submission (format: MTJ-XXXXXX).
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateSubmit}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              {t.submitComplaint}
            </button>
          </div>
        </div>
      )}

      {/* Search Result - Matched Complaint */}
      {matchedComplaint && (
        <div className="space-y-6">
          {/* Card: Overview & Badges */}
          <div className="bg-white border border-stone-300 rounded-xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3 mb-4">
              <div>
                <span className="text-xs text-stone-600 font-mono block">Ticket ID</span>
                <span className="text-xl font-mono font-bold text-stone-900">
                  {matchedComplaint.id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {matchedComplaint.track === 'SAFEGUARDING' && (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-xs px-2.5 py-1 rounded font-bold border border-amber-300">
                    <Shield className="w-3.5 h-3.5" />
                    Safeguarding
                  </span>
                )}
                {matchedComplaint.track === 'CONFIDENTIAL' && (
                  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-xs px-2.5 py-1 rounded font-bold border border-purple-300">
                    <Lock className="w-3.5 h-3.5" />
                    Confidential
                  </span>
                )}
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold ${
                    matchedComplaint.status === 'Resolved' || matchedComplaint.status === 'Closed'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : matchedComplaint.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : matchedComplaint.status === 'Rejected'
                      ? 'bg-red-100 text-red-900 border border-red-300'
                      : 'bg-stone-200 text-stone-900'
                  }`}
                >
                  {(t as any)[matchedComplaint.status] || matchedComplaint.status}
                </span>
              </div>
            </div>

            {/* Key Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2 text-stone-700">
                <Building2 className="w-4 h-4 text-emerald-800 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-stone-600 block">{t.locationLabel}</span>
                  <span className="font-semibold text-stone-900">
                    {matchedComplaint.locationName[lang]}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-stone-700">
                <Tag className="w-4 h-4 text-emerald-800 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-stone-600 block">{t.categoryLabel}</span>
                  <span className="font-semibold text-stone-900">
                    {matchedComplaint.category}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-stone-700">
                <Calendar className="w-4 h-4 text-emerald-800 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-stone-600 block">{t.dateLabel}</span>
                  <span className="font-medium text-stone-900">
                    {new Date(matchedComplaint.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-stone-700">
                <Clock className="w-4 h-4 text-emerald-800 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-stone-600 block">{t.statusLabel}</span>
                  <span className="font-semibold text-stone-900">
                    {(t as any)[matchedComplaint.status] || matchedComplaint.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Progress Timeline */}
          <div className="bg-white border border-stone-300 rounded-xl p-5 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-800" />
              <span>{t.statusHistoryTitle}</span>
            </h2>

            <div className="space-y-6 relative before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-stone-200">
              {/* Step 1: Submitted */}
              <div className="flex items-start gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 z-10 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-stone-900">
                      {t.Submitted}
                    </span>
                    <span className="text-xs text-stone-600 font-mono">
                      {new Date(matchedComplaint.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Complaint received into secure queue.
                  </p>
                </div>
              </div>

              {/* Step 2: Acknowledged */}
              {(() => {
                const stepState = getTimelineStepStatus('Acknowledged', matchedComplaint.status);
                const isDone = stepState === 'completed';
                return (
                  <div className="flex items-start gap-3 relative">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        isDone ? 'bg-emerald-800 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-bold ${
                            isDone ? 'text-stone-900' : 'text-stone-600'
                          }`}
                        >
                          {t.Acknowledged}
                        </span>
                        {matchedComplaint.acknowledgedAt && (
                          <span className="text-xs text-stone-600 font-mono">
                            {new Date(matchedComplaint.acknowledgedAt).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {isDone
                          ? 'Case assigned to departmental officer.'
                          : 'Pending initial triage review.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Under review / In Progress */}
              {(() => {
                const stepState = getTimelineStepStatus('In Progress', matchedComplaint.status);
                const isDone = stepState === 'completed';
                return (
                  <div className="flex items-start gap-3 relative">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        isDone ? 'bg-emerald-800 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-bold ${
                            isDone ? 'text-stone-900' : 'text-stone-600'
                          }`}
                        >
                          {t['In Progress']}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {isDone
                          ? 'Active investigation & remediation in progress.'
                          : 'Awaiting investigation phase.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Resolved */}
              {(() => {
                const stepState = getTimelineStepStatus('Resolved', matchedComplaint.status);
                const isDone = stepState === 'completed';
                return (
                  <div className="flex items-start gap-3 relative">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        isDone ? 'bg-emerald-800 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-bold ${
                            isDone ? 'text-stone-900' : 'text-stone-600'
                          }`}
                        >
                          {matchedComplaint.status === 'Rejected'
                            ? t.Rejected
                            : t.Resolved}
                        </span>
                        {matchedComplaint.resolvedAt && (
                          <span className="text-xs text-stone-600 font-mono">
                            {new Date(matchedComplaint.resolvedAt).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {isDone
                          ? 'Action completed and case concluded.'
                          : 'Pending final resolution.'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Official Public Updates ONLY — Internal notes NEVER appear! */}
          <div className="bg-white border border-stone-300 rounded-xl p-5 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-800" />
              <span>{t.publicUpdatesTitle}</span>
            </h2>

            {matchedComplaint.publicUpdates.length === 0 ? (
              <p className="text-xs text-stone-600 italic bg-stone-50 p-3 rounded border border-stone-200">
                {t.noPublicUpdatesYet}
              </p>
            ) : (
              <div className="space-y-3">
                {matchedComplaint.publicUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-sm space-y-1"
                  >
                    <p className="font-medium text-stone-900">
                      {lang === 'ur' ? update.textUr : update.textEn}
                    </p>
                    <span className="text-[11px] text-stone-600 font-mono block">
                      {new Date(update.timestamp).toLocaleString(lang === 'ur' ? 'ur-PK' : 'en-GB')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff & Investigator Portal Access Link */}
      {onNavigateLogin && (
        <div className="mt-8 pt-4 border-t border-stone-200 text-center">
          <button
            type="button"
            onClick={onNavigateLogin}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-emerald-800 transition-colors font-medium py-1 px-2 rounded hover:bg-stone-100"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t.staffPortal} ({t.staffLogin})</span>
          </button>
        </div>
      )}
    </div>
  );
};
