import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  TrendingUp,
  AlertOctagon,
  Inbox,
  Filter,
  ArrowRight,
  Shield,
  Lock,
} from 'lucide-react';
import { Complaint, Entity } from '../../types';

interface AdminOverviewProps {
  complaints: Complaint[];
  onSelectComplaint: (complaint: Complaint) => void;
  onNavigateTab: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  complaints,
  onSelectComplaint,
  onNavigateTab,
}) => {
  const [selectedEntity, setSelectedEntity] = useState<Entity | 'ALL'>('ALL');

  // Filter complaints by entity if selected
  const entityFilteredComplaints = complaints.filter(
    (c) => selectedEntity === 'ALL' || c.entity === selectedEntity
  );

  // Compute stats
  const openCount = entityFilteredComplaints.filter(
    (c) => c.status === 'New' || c.status === 'Acknowledged' || c.status === 'In Progress' || c.status === 'Reopened'
  ).length;

  const overdueCount = entityFilteredComplaints.filter((c) => c.isOverdue).length;

  const resolvedThisMonth = entityFilteredComplaints.filter(
    (c) => c.status === 'Resolved' || c.status === 'Closed'
  ).length;

  // Average resolution days (mock derived)
  const avgResolutionDays = 2.8;
  const avgFirstResponseHours = 4.2;

  // SLA Breached list (sorted by escalation level & age)
  const breachedComplaints = entityFilteredComplaints
    .filter((c) => c.isOverdue || c.escalationLevel > 0)
    .sort((a, b) => b.escalationLevel - a.escalationLevel);

  // Location breakdown
  const locationCounts: Record<string, number> = {};
  entityFilteredComplaints.forEach((c) => {
    const loc = c.locationCode;
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  entityFilteredComplaints.forEach((c) => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Entity Filter Bar */}
      <div className="bg-white border border-stone-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
          <Filter className="w-4 h-4" />
          <span>Entity Scope:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'AAS_LAB', 'FOUNDATION', 'SCHOOL', 'COLLEGE'] as const).map((ent) => (
            <button
              key={ent}
              type="button"
              onClick={() => setSelectedEntity(ent)}
              className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                selectedEntity === ent
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {ent === 'ALL'
                ? 'All Entities'
                : ent === 'AAS_LAB'
                ? 'AAS Lab'
                : ent === 'FOUNDATION'
                ? 'MTJ Foundation'
                : ent === 'SCHOOL'
                ? 'Schools'
                : 'College'}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Tickets</span>
            <Inbox className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">{openCount}</div>
          <p className="text-[11px] text-stone-700 mt-1">Pending action or review</p>
        </div>

        <div className="bg-red-50/70 border border-red-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue SLA</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-red-900">{overdueCount}</div>
          <p className="text-[11px] text-red-700 mt-1">Breached resolution window</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved Month</span>
            <CheckCircle className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">{resolvedThisMonth}</div>
          <p className="text-[11px] text-stone-700 mt-1">Closed or remediated</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Resolution</span>
            <Clock className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">{avgResolutionDays} <span className="text-sm font-normal text-stone-700">days</span></div>
          <p className="text-[11px] text-stone-700 mt-1">From ingress to closure</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg First Ack</span>
            <TrendingUp className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">{avgFirstResponseHours} <span className="text-sm font-normal text-stone-700">hrs</span></div>
          <p className="text-[11px] text-stone-700 mt-1">Initial response SLA speed</p>
        </div>
      </div>

      {/* Red "SLA Breached" list */}
      <div className="bg-white border-2 border-red-300 rounded-lg overflow-hidden shadow-2xs">
        <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <h2 className="text-sm font-bold text-red-900 uppercase tracking-wide">
              Critical SLA Breached / Escalated Queue ({breachedComplaints.length})
            </h2>
          </div>
          <span className="text-xs text-red-700 font-medium">Requires Priority Clearance</span>
        </div>

        {breachedComplaints.length === 0 ? (
          <div className="p-6 text-center text-stone-500 text-sm">
            No active SLA breaches recorded in current entity scope.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
            {breachedComplaints.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectComplaint(item)}
                className="p-3.5 hover:bg-red-50/50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-stone-900 text-sm">
                    {item.id}
                  </span>
                  {item.track === 'SAFEGUARDING' && (
                    <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-bold border border-amber-300 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Safeguarding
                    </span>
                  )}
                  {item.track === 'CONFIDENTIAL' && (
                    <span className="bg-purple-100 text-purple-900 text-[10px] px-1.5 py-0.5 rounded font-bold border border-purple-300 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Confidential
                    </span>
                  )}
                  <span className="text-xs text-stone-600 truncate">
                    {item.category} • {item.locationCode}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-stone-600">
                    Owner: <strong className="font-semibold text-stone-800">{item.ownerName}</strong>
                  </span>
                  <span className="bg-red-600 text-white px-2 py-0.5 rounded font-bold">
                    L{item.escalationLevel || 1} Escalated
                  </span>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics: Location & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart representation: By Location */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
              Volume by Location
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('locations')}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              View all 22 locations →
            </button>
          </div>

          <div className="space-y-3">
            {topLocations.map(([locCode, count]) => {
              const maxCount = Math.max(...topLocations.map((t) => t[1]), 1);
              const pct = Math.round((count / maxCount) * 100);

              return (
                <div key={locCode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 font-mono">{locCode}</span>
                    <span className="text-stone-500 font-mono">{count} tickets</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-800 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown: By Category */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
              Volume by Category
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('complaints')}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Filter in table →
            </button>
          </div>

          <div className="space-y-3">
            {topCategories.map(([cat, count]) => {
              const maxCount = Math.max(...topCategories.map((t) => t[1]), 1);
              const pct = Math.round((count / maxCount) * 100);

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 truncate pr-2">{cat}</span>
                    <span className="text-stone-500 font-mono flex-shrink-0">{count} tickets</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-700 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
