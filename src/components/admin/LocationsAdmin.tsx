import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Search,
  QrCode,
  Download,
  ExternalLink,
  X,
  CheckCircle,
  Building,
} from 'lucide-react';
import { LocationItem, Entity } from '../../types';

interface LocationsAdminProps {
  locations: LocationItem[];
  onOpenPublicFlowForLocation: (code: string) => void;
}

export const LocationsAdmin: React.FC<LocationsAdminProps> = ({
  locations,
  onOpenPublicFlowForLocation,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<Entity | 'ALL'>('ALL');
  const [activeQrModalLoc, setActiveQrModalLoc] = useState<LocationItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate QR Data URL whenever active location changes
  useEffect(() => {
    if (activeQrModalLoc) {
      // In production, this QR leads to the real origin + /c/:code
      const targetUrl = `${window.location.origin}/c/${activeQrModalLoc.code}`;
      QRCode.toDataURL(
        targetUrl,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#064e3b', // Deep emerald
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    } else {
      setQrDataUrl('');
    }
  }, [activeQrModalLoc]);

  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !activeQrModalLoc) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${activeQrModalLoc.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLocations = locations.filter((loc) => {
    if (selectedEntity !== 'ALL' && loc.entity !== selectedEntity) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const codeMatch = loc.code.toLowerCase().includes(term);
      const enMatch = loc.name.en.toLowerCase().includes(term);
      const urMatch = loc.name.ur.toLowerCase().includes(term);
      const cityMatch = loc.city.toLowerCase().includes(term);
      const inChargeMatch = loc.inCharge.toLowerCase().includes(term);
      if (!codeMatch && !enMatch && !urMatch && !cityMatch && !inChargeMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Entity Filter */}
      <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search locations, codes, in-charge..."
            className="w-full min-h-[42px] pl-9 pr-4 border border-stone-300 rounded-md text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
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
                ? 'All'
                : ent === 'AAS_LAB'
                ? 'AAS Lab'
                : ent === 'FOUNDATION'
                ? 'Foundation'
                : ent === 'SCHOOL'
                ? 'School'
                : 'College'}
            </button>
          ))}
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white border border-stone-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600 font-medium">
          <span>Registered Locations ({filteredLocations.length} of {locations.length})</span>
          <span className="text-stone-400">All locations equipped with static physical QR placards</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase tracking-wider">
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3">Facility Name (EN & UR)</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">Facility Type</th>
                <th className="py-3 px-3">City</th>
                <th className="py-3 px-3">Person In-Charge</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">QR Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLocations.map((loc) => (
                <tr key={loc.code} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">
                    {loc.code}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-stone-900">{loc.name.en}</div>
                    <div className="text-[11px] text-stone-500 font-urdu" dir="rtl">
                      {loc.name.ur}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-medium text-stone-700">
                    {loc.entity === 'AAS_LAB'
                      ? 'AAS Lab'
                      : loc.entity === 'FOUNDATION'
                      ? 'MTJ Foundation'
                      : loc.entity === 'SCHOOL'
                      ? 'School System'
                      : 'College'}
                  </td>
                  <td className="py-3 px-3 text-stone-600 whitespace-nowrap">
                    {loc.type}
                  </td>
                  <td className="py-3 px-3 text-stone-700 font-medium whitespace-nowrap">
                    {loc.city}
                  </td>
                  <td className="py-3 px-3 text-stone-800 font-medium whitespace-nowrap">
                    {loc.inCharge}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setActiveQrModalLoc(loc)}
                      className="min-h-[34px] px-3 py-1 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 border border-stone-200 text-stone-800 font-semibold rounded text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-800" />
                      <span>View QR</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Modal */}
      {activeQrModalLoc && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 relative">
            <button
              type="button"
              onClick={() => setActiveQrModalLoc(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
                <Building className="w-3.5 h-3.5" />
                <span>{activeQrModalLoc.entity}</span>
              </div>
              <h2 className="text-lg font-bold text-stone-900">
                {activeQrModalLoc.name.en}
              </h2>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                Location Code: <strong>{activeQrModalLoc.code}</strong>
              </p>
            </div>

            {/* Rendered QR Code */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 inline-block shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${activeQrModalLoc.code}`}
                  className="w-56 h-56 mx-auto rounded"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-stone-400 text-xs">
                  Generating QR Code...
                </div>
              )}
            </div>

            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Scan with phone camera to launch complaint intake specifically bound to this site.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="w-full min-h-[44px] bg-stone-900 hover:bg-stone-800 text-white rounded-lg px-4 py-2 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Placard PNG</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const code = activeQrModalLoc.code;
                  setActiveQrModalLoc(null);
                  onOpenPublicFlowForLocation(code);
                }}
                className="w-full min-h-[44px] bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg px-4 py-2 font-bold text-xs flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Simulate Scan (Open Part A Flow)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
