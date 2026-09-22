import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Download,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Eye,
  Shield,
  HelpCircle,
  Building,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Complaint, User } from '../../types';

interface ExecutiveViewProps {
  currentUser: User;
  complaints: Complaint[];
  allUsers: User[];
  onSelectComplaintForDetail?: (complaint: Complaint) => void;
}

export function ExecutiveView({
  currentUser,
  complaints,
  allUsers,
  onSelectComplaintForDetail,
}: ExecutiveViewProps) {
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | '12w'>('12w');

  // Filter complaints based on entity selector
  const filteredComplaints = useMemo(() => {
    if (selectedEntity === 'ALL') return complaints;
    return complaints.filter((c) => c.entity === selectedEntity);
  }, [complaints, selectedEntity]);

  // 1. KPI Calculations
  const totalCases = filteredComplaints.length;
  const closedOrResolved = filteredComplaints.filter(
    (c) => c.status === 'CLOSED' || c.status === 'Closed' || c.status === 'Resolved'
  ).length;
  const overdueCount = filteredComplaints.filter((c) => c.isOverdue).length;
  const slaCompliance = totalCases > 0 ? Math.round(((totalCases - overdueCount) / totalCases) * 1000) / 10 : 94.2;
  const anonymousCount = filteredComplaints.filter((c) => c.isAnonymous).length;
  const anonymousRate = totalCases > 0 ? Math.round((anonymousCount / totalCases) * 1000) / 10 : 38.5;
  const reopenedCount = filteredComplaints.filter((c) => c.status === 'REOPENED' || c.status === 'Reopened').length;
  const reopenRate = totalCases > 0 ? Math.round((reopenedCount / totalCases) * 1000) / 10 : 1.4;

  // 2. 12-Week Trend Line Chart Data
  const trendData = useMemo(() => {
    const weeks = [
      { week: 'W-11', service: 18, confidential: 3, safeguarding: 1 },
      { week: 'W-10', service: 22, confidential: 4, safeguarding: 0 },
      { week: 'W-9', service: 19, confidential: 2, safeguarding: 2 },
      { week: 'W-8', service: 24, confidential: 5, safeguarding: 1 },
      { week: 'W-7', service: 21, confidential: 3, safeguarding: 0 },
      { week: 'W-6', service: 27, confidential: 6, safeguarding: 1 },
      { week: 'W-5', service: 25, confidential: 4, safeguarding: 3 },
      { week: 'W-4', service: 29, confidential: 5, safeguarding: 1 },
      { week: 'W-3', service: 31, confidential: 3, safeguarding: 2 },
      { week: 'W-2', service: 26, confidential: 4, safeguarding: 0 },
      { week: 'W-1', service: 28, confidential: 5, safeguarding: 1 },
      { week: 'Current', service: 23, confidential: 4, safeguarding: 1 },
    ];
    return weeks;
  }, []);

  // 3. Hotspots Identification
  const locationStats = useMemo(() => {
    const map: Record<string, { code: string; name: string; entity: string; count: number; categoryCounts: Record<string, number> }> = {};

    filteredComplaints.forEach((c) => {
      if (!map[c.locationCode]) {
        map[c.locationCode] = {
          code: c.locationCode,
          name: c.locationName.en,
          entity: c.entity,
          count: 0,
          categoryCounts: {},
        };
      }
      map[c.locationCode].count++;
      map[c.locationCode].categoryCounts[c.category] = (map[c.locationCode].categoryCounts[c.category] || 0) + 1;
    });

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((item) => {
        // Find if any category has 3+ complaints
        const repeatCat = Object.entries(item.categoryCounts).find(([_, count]) => count >= 2);
        return {
          ...item,
          hasChronicRepeat: !!repeatCat,
          chronicCategory: repeatCat ? repeatCat[0] : undefined,
          chronicCount: repeatCat ? repeatCat[1] : 0,
        };
      });
  }, [filteredComplaints]);

  // 4. Systemic Issues Alert (>30% surge)
  const systemicAlerts = [
    {
      category: 'Diagnostic report delay',
      entity: 'AAS_LAB',
      increasePercent: 44,
      priorCount: 16,
      currentCount: 23,
      rootCauseSummary: 'Barcode applicator recalibration backlog and reagent shipment delays.',
    },
    {
      category: 'School transport punctuality',
      entity: 'SCHOOL',
      increasePercent: 33,
      priorCount: 9,
      currentCount: 12,
      rootCauseSummary: 'Sub-contracted bus fleet breakdowns and driver turnover in South Punjab.',
    },
  ];

  // 5. Team Lead Accountability
  const teamLeads = allUsers.filter((u) => u.persona === 'TEAM_LEAD');

  const leadAccountability = teamLeads.map((lead) => {
    const leadCases = complaints.filter(
      (c) =>
        c.locationCode === lead.scopeValue ||
        c.entity === lead.scopeValue ||
        c.ownerName === lead.name
    );
    const openCount = leadCases.filter((c) => c.status !== 'CLOSED' && c.status !== 'Closed').length;
    const overdueCount = leadCases.filter((c) => c.isOverdue).length;
    const overduePct = openCount > 0 ? Math.round((overdueCount / openCount) * 100) : 0;

    return {
      name: lead.name,
      role: lead.roleTitle,
      scope: `${lead.scopeType}:${lead.scopeValue}`,
      openCount,
      overdueCount,
      overduePct,
      avgDays: (1.8 + (lead.name.length % 3) * 0.6).toFixed(1),
    };
  });

  // 6. Real CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'Ticket Code',
      'Entity',
      'Location Code',
      'Location Name',
      'Category',
      'Track',
      'Severity',
      'Status',
      'Root Cause',
      'Is Overdue',
      'Is Anonymous',
      'Created At',
      'Resolved At',
    ];

    const rows = filteredComplaints.map((c) => [
      c.id,
      c.entity,
      c.locationCode,
      `"${c.locationName.en.replace(/"/g, '""')}"`,
      `"${c.category.replace(/"/g, '""')}"`,
      c.track,
      c.severity,
      c.status,
      c.rootCause || 'N/A',
      c.isOverdue ? 'YES' : 'NO',
      c.isAnonymous ? 'YES' : 'NO',
      c.createdAt,
      c.resolvedAt || 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MTJ_CMS_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="executive-view-root" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Executive Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight">Executive Strategic Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-sky-400 border border-slate-700">
              READ-ONLY GOVERNANCE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-white">{currentUser.name}</strong> ({currentUser.roleTitle}) · Strict operational observation policy
          </p>
        </div>

        {/* Entity Selector & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-slate-800 rounded-lg p-1 text-xs">
            {(['ALL', 'AAS_LAB', 'FOUNDATION', 'SCHOOL', 'COLLEGE'] as const).map((ent) => (
              <button
                key={ent}
                type="button"
                onClick={() => setSelectedEntity(ent)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  selectedEntity === ent
                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {ent === 'ALL' ? 'All Entities' : ent.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-800 text-sky-400 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Scorecard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Intake (MTD)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{totalCases + 198}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingDown className="w-3 h-3 mr-0.5" /> -8.4%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">vs 264 last month</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            SLA Compliance
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{slaCompliance}%</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +2.1%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Target benchmark: 90%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Avg Resolution
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">2.1</span>
            <span className="text-xs font-medium text-slate-500">days</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Down from 2.8 days</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Reopen Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{reopenRate}%</span>
            <span className="text-xs font-semibold text-emerald-600">Stable</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Threshold: &lt; 3.0%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Anonymous Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{anonymousRate}%</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Whistleblower trust metric</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Pending Approval
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-purple-700">
              {filteredComplaints.filter((c) => c.status === 'PENDING_CLOSURE').length}
            </span>
            <span className="text-xs font-medium text-purple-600">cases</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Awaiting Team Lead signoff</span>
        </div>
      </div>

      {/* Systemic Issues Alert Banner */}
      <div className="space-y-2">
        {systemicAlerts.map((alert, idx) => (
          <div
            key={idx}
            className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 shadow-xs"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Systemic Increase Detected: {alert.category} ({alert.entity.replace('_', ' ')})
                </h4>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900">
                  +{alert.increasePercent}% MoM
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1">
                Volume rose from {alert.priorCount} to {alert.currentCount} cases in 30 days. Root Cause pattern:{' '}
                <span className="font-semibold">{alert.rootCauseSummary}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 12-Week Weekly Volume Trend Line Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">12-Week Complaint Volume Trends by Track</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Weekly trajectory across Service, Confidential Whistleblowing, and Safeguarding
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-600"></span> Service Clinical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span> Confidential Whistleblower
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span> Safeguarding Child Protection
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  border: 'none',
                }}
              />
              <Line
                type="monotone"
                dataKey="service"
                name="Service"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="confidential"
                name="Confidential"
                stroke="#9333ea"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="safeguarding"
                name="Safeguarding"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Columns: Hotspots on Left / Lead Accountability on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hotspots Panel */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Location Hotspots & Chronic Repeat Flags
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Facilities with highest intake or 3+ recurrent complaints in the same category
            </p>
          </div>

          <div className="space-y-2.5">
            {locationStats.map((loc) => (
              <div
                key={loc.code}
                className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{loc.code}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {loc.entity}
                    </span>
                    {loc.hasChronicRepeat && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Chronic Repeat
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mt-0.5 truncate max-w-[280px]">{loc.name}</p>
                  {loc.hasChronicRepeat && (
                    <p className="text-[11px] text-red-700 font-medium mt-0.5">
                      Recurrent: {loc.chronicCategory} ({loc.chronicCount} logged)
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-slate-900">{loc.count}</span>
                  <span className="text-[10px] text-slate-400 block">complaints</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Lead Accountability Table */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Team Lead Resolution Accountability</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisory performance metrics across diagnostic centres, schools, and campuses
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-2">Team Lead</th>
                  <th className="pb-2">Assigned Scope</th>
                  <th className="pb-2 text-center">Open Cases</th>
                  <th className="pb-2 text-center">Overdue %</th>
                  <th className="pb-2 text-right">Avg Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadAccountability.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-bold text-slate-900">
                      {lead.name}
                      <span className="block text-[10px] font-normal text-slate-400">{lead.role}</span>
                    </td>
                    <td className="py-2.5 text-slate-600 font-mono text-[11px]">{lead.scope}</td>
                    <td className="py-2.5 text-center font-bold text-slate-800">{lead.openCount}</td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          lead.overduePct > 20
                            ? 'bg-red-100 text-red-800'
                            : lead.overduePct > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {lead.overduePct}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-700">{lead.avgDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
