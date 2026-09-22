import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Shield,
  Lock,
  ChevronRight,
  FilterX,
} from 'lucide-react';
import { Complaint, Entity, Track, Severity, ComplaintStatus, AdminRole } from '../../types';

interface ComplaintsTableProps {
  complaints: Complaint[];
  onSelectComplaint: (complaint: Complaint) => void;
  currentRole: AdminRole;
}

export const ComplaintsTable: React.FC<ComplaintsTableProps> = ({
  complaints,
  onSelectComplaint,
  currentRole,
}) => {
  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [filterLocation, setFilterLocation] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterTrack, setFilterTrack] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  // Unique lists for dropdown filters
  const uniqueLocations = useMemo(() => {
    const set = new Set(complaints.map((c) => c.locationCode));
    return Array.from(set).sort();
  }, [complaints]);

  const uniqueCategories = useMemo(() => {
    const set = new Set(complaints.map((c) => c.category));
    return Array.from(set).sort();
  }, [complaints]);

  // Filtered complaints
  const filteredData = useMemo(() => {
    return complaints.filter((c) => {
      // Search by ticket code or text
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesCode = c.id.toLowerCase().includes(term);
        const matchesText = c.text.toLowerCase().includes(term);
        if (!matchesCode && !matchesText) return false;
      }

      if (filterEntity !== 'ALL' && c.entity !== filterEntity) return false;
      if (filterLocation !== 'ALL' && c.locationCode !== filterLocation) return false;
      if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
      if (filterTrack !== 'ALL' && c.track !== filterTrack) return false;
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
      if (filterSeverity !== 'ALL' && c.severity !== filterSeverity) return false;

      return true;
    });
  }, [
    complaints,
    searchTerm,
    filterEntity,
    filterLocation,
    filterCategory,
    filterTrack,
    filterStatus,
    filterSeverity,
  ]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterEntity('ALL');
    setFilterLocation('ALL');
    setFilterCategory('ALL');
    setFilterTrack('ALL');
    setFilterStatus('ALL');
    setFilterSeverity('ALL');
  };

  // CSV Export adhering to Safeguarding rules!
  const handleExportCSV = () => {
    // SAFEGUARDING HANDLING RULES:
    // "Excluded from CSV export, from any digest view, and from global search for every role except Child Protection Officer and CEO"
    const canExportSafeguarding = currentRole === 'Super Admin' || currentRole === 'Child Protection Officer';

    const exportableComplaints = filteredData.filter((c) => {
      if (c.track === 'SAFEGUARDING' && !canExportSafeguarding) {
        return false;
      }
      return true;
    });

    const headers = [
      'Ticket Code',
      'Entity',
      'Location Code',
      'Category',
      'Track',
      'Severity',
      'Status',
      'Created At',
      'Owner Role',
      'Owner Name',
      'Escalation Level',
      'Is Overdue',
    ];

    const rows = exportableComplaints.map((c) => [
      c.id,
      c.entity,
      c.locationCode,
      `"${c.category.replace(/"/g, '""')}"`,
      c.track,
      c.severity,
      c.status,
      c.createdAt,
      `"${c.ownerRole}"`,
      `"${c.ownerName}"`,
      c.escalationLevel,
      c.isOverdue ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MTJ_Complaints_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAgeDisplay = (createdAt: string) => {
    const diffHours = Math.round((Date.now() - new Date(createdAt).getTime()) / (3600 * 1000));
    if (diffHours < 24) return `${diffHours}h`;
    const days = Math.floor(diffHours / 24);
    return `${days}d`;
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ticket code..."
              className="w-full min-h-[42px] pl-9 pr-4 border border-stone-300 rounded-md text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {(searchTerm ||
              filterEntity !== 'ALL' ||
              filterLocation !== 'ALL' ||
              filterCategory !== 'ALL' ||
              filterTrack !== 'ALL' ||
              filterStatus !== 'ALL' ||
              filterSeverity !== 'ALL') && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[42px] px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1.5 font-medium border border-stone-200 rounded-md"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="min-h-[42px] px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-md text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-stone-100">
          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
              Entity
            </label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full text-xs min-h-[36px] px-2 py-1 border border-stone-200 rounded bg-stone-50 text-stone-800 focus:outline-hidden"
            >
              <option value="ALL">All Entities</option>
              <option value="AAS_LAB">AAS Lab</option>
              <option value="FOUNDATION">Foundation</option>
              <option value="SCHOOL">School</option>
              <option value="COLLEGE">College</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
              Location
            </label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full text-xs min-h-[36px] px-2 py-1 border border-stone-200 rounded bg-stone-50 text-stone-800 focus:outline-hidden"
            >
              <option value="ALL">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
              Track
            </label>
            <select
              value={filterTrack}
              onChange={(e) => setFilterTrack(e.target.value)}
              className="w-full text-xs min-h-[36px] px-2 py-1 border border-stone-200 rounded bg-stone-50 text-stone-800 focus:outline-hidden"
            >
              <option value="ALL">All Tracks</option>
              <option value="SERVICE">Service</option>
              <option value="CONFIDENTIAL">Confidential</option>
              <option value="SAFEGUARDING">Safeguarding</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs min-h-[36px] px-2 py-1 border border-stone-200 rounded bg-stone-50 text-stone-800 focus:outline-hidden truncate"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs min-h-[36px] px-2 py-1 border border-stone-200 rounded bg-stone-50 text-stone-800 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Rejected">Rejected</option>
              <option value="Reopened">Reopened</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
              Severity
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full text-xs min-h-[36px] px-2 py-1 border border-stone-200 rounded bg-stone-50 text-stone-800 focus:outline-hidden"
            >
              <option value="ALL">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white border border-stone-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600 font-medium">
          <span>Showing {filteredData.length} records</span>
          <span className="text-[11px] text-stone-400">Click any row for details drawer</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase tracking-wider">
                <th className="py-3 px-3">Ticket Code</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Track</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Age</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3 text-center">Escalation</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-stone-400">
                    No complaints match your active filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isOverdue = item.isOverdue;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectComplaint(item)}
                      className={`hover:bg-stone-50 cursor-pointer transition-colors ${
                        isOverdue ? 'bg-red-50/60' : ''
                      }`}
                    >
                      {/* Ticket Code */}
                      <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">
                        {item.id}
                      </td>

                      {/* Entity */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-stone-700">
                        {item.entity === 'AAS_LAB'
                          ? 'AAS Lab'
                          : item.entity === 'FOUNDATION'
                          ? 'MTJ Foundation'
                          : item.entity === 'SCHOOL'
                          ? 'School'
                          : 'College'}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-stone-600">
                        {item.locationCode}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 max-w-[180px] truncate text-stone-900 font-medium">
                        {item.category}
                      </td>

                      {/* Track with badges */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.track === 'SAFEGUARDING' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-300">
                            <Shield className="w-3 h-3" />
                            Safeguarding
                          </span>
                        ) : item.track === 'CONFIDENTIAL' ? (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-[11px] font-bold px-2 py-0.5 rounded border border-purple-300">
                            <Lock className="w-3 h-3" />
                            Confidential
                          </span>
                        ) : (
                          <span className="text-stone-600 font-medium">Service</span>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                            item.severity === 'CRITICAL'
                              ? 'bg-red-600 text-white'
                              : item.severity === 'HIGH'
                              ? 'bg-amber-600 text-white'
                              : item.severity === 'MEDIUM'
                              ? 'bg-stone-200 text-stone-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            item.status === 'Resolved' || item.status === 'Closed'
                              ? 'bg-emerald-100 text-emerald-900'
                              : item.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-900'
                              : item.status === 'Rejected'
                              ? 'bg-red-100 text-red-900'
                              : 'bg-stone-200 text-stone-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Age */}
                      <td className="py-3 px-3 whitespace-nowrap text-stone-600 font-mono">
                        {getAgeDisplay(item.createdAt)}
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-3 whitespace-nowrap text-stone-800 font-medium">
                        {item.ownerName}
                      </td>

                      {/* Escalation Level */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        {item.escalationLevel > 0 ? (
                          <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                            L{item.escalationLevel}
                          </span>
                        ) : (
                          <span className="text-stone-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Arrow action */}
                      <td className="py-3 px-2 text-stone-400">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
