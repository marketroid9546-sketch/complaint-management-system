import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Check,
  X,
  MapPin,
  User,
  GraduationCap,
  HeartHandshake,
  FlaskConical,
  School,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { LocationItem, Entity } from '../types';
import { Language } from '../translations';

interface ProjectLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: LocationItem[];
  activeLocationCode: string;
  onSelectLocation: (locationCode: string) => void;
  lang: Language;
}

interface ProjectMetadata {
  entity: Entity;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  descriptionUr: string;
  icon: React.ElementType;
  badgeBg: string;
  badgeText: string;
  activeColor: string;
  primaryCode: string;
}

export const PROJECT_METADATA: Record<Entity, ProjectMetadata> = {
  AAS_LAB: {
    entity: 'AAS_LAB',
    nameEn: 'AAS Diagnostic Labs',
    nameUr: 'اے اے ایس تشخیصی لیبز',
    descriptionEn: 'Network of 13 diagnostic pathology labs & collection centres across South Punjab',
    descriptionUr: 'جنوبی پنجاب میں 13 تشخیصی لیبارٹریز اور کلیکشن سینٹرز کا نیٹ ورک',
    icon: FlaskConical,
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-300 border-emerald-300',
    activeColor: 'border-emerald-600 ring-emerald-500',
    primaryCode: 'AAS-KHN-01',
  },
  FOUNDATION: {
    entity: 'FOUNDATION',
    nameEn: 'MTJ Foundation',
    nameUr: 'مولانا طارق جمیل فاؤنڈیشن',
    descriptionEn: 'Charitable welfare, disaster relief, health & education projects across Pakistan',
    descriptionUr: 'ملک بھر میں فلاحی کام، آفات سے نمٹنے، صحت اور تعلیمی منصوبے',
    icon: HeartHandshake,
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-300 border-amber-300',
    activeColor: 'border-amber-600 ring-amber-500',
    primaryCode: 'MTJF-HO-01',
  },
  COLLEGE: {
    entity: 'COLLEGE',
    nameEn: 'AlHasanain College',
    nameUr: 'الحسنین کالج و ہاسٹل',
    descriptionEn: 'Higher secondary & undergraduate college campuses with residential hostel facilities',
    descriptionUr: 'اعلیٰ ثانوی و گریجویٹ کالج کیمپسز بمعہ رہائشی ہاسٹل سہولیات',
    icon: GraduationCap,
    badgeBg: 'bg-purple-100 dark:bg-purple-950/80',
    badgeText: 'text-purple-800 dark:text-purple-300 border-purple-300',
    activeColor: 'border-purple-600 ring-purple-500',
    primaryCode: 'AHC-MC-01',
  },
  SCHOOL: {
    entity: 'SCHOOL',
    nameEn: 'AlHasanain School System',
    nameUr: 'الحسنین اسکول سسٹم',
    descriptionEn: 'Quality primary and secondary school campuses in Multan, Lahore, Faisalabad, and Rawalpindi',
    descriptionUr: 'ملتان، لاہور، فیصل آباد اور راولپنڈی میں پرائمری اور سیکنڈری اسکول کیمپسز',
    icon: School,
    badgeBg: 'bg-sky-100 dark:bg-sky-950/80',
    badgeText: 'text-sky-800 dark:text-sky-300 border-sky-300',
    activeColor: 'border-sky-600 ring-sky-500',
    primaryCode: 'AHS-MC-01',
  },
};

export const ProjectLocationModal: React.FC<ProjectLocationModalProps> = ({
  isOpen,
  onClose,
  locations,
  activeLocationCode,
  onSelectLocation,
  lang,
}) => {
  const isUrdu = lang === 'ur';

  // Find active location
  const currentLocation = useMemo(() => {
    return locations.find((l) => l.code === activeLocationCode) || locations[0];
  }, [locations, activeLocationCode]);

  // Selected Tab state (defaults to entity of active location)
  const [selectedEntity, setSelectedEntity] = useState<Entity>(
    currentLocation?.entity || 'AAS_LAB'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  // Filter locations for selected entity and search query
  const filteredLocations = locations.filter((loc) => {
    if (loc.entity !== selectedEntity) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const codeMatch = loc.code.toLowerCase().includes(query);
    const cityMatch = loc.city.toLowerCase().includes(query);
    const nameEnMatch = loc.name.en.toLowerCase().includes(query);
    const nameUrMatch = loc.name.ur.toLowerCase().includes(query);
    const inChargeMatch = loc.inCharge?.toLowerCase().includes(query);

    return codeMatch || cityMatch || nameEnMatch || nameUrMatch || inChargeMatch;
  });

  const handleSelect = (code: string) => {
    onSelectLocation(code);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-project-title"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-project-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                {isUrdu ? 'ادارہ / کیمپس منتخب کریں' : 'Select Project / Facility'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {isUrdu
                  ? 'شکایت یا فیڈ بیک درج کروانے کے لیے اپنا مطلوبہ ادارہ اور برانچ منتخب کریں'
                  : 'Choose the MTJ Group institution and branch you wish to file a grievance or feedback for'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Project / Entity Tabs */}
        <div className="bg-slate-100 dark:bg-slate-950 p-2 sm:p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(PROJECT_METADATA) as Entity[]).map((entityKey) => {
              const meta = PROJECT_METADATA[entityKey];
              const Icon = meta.icon;
              const isTabActive = selectedEntity === entityKey;
              const count = locations.filter((l) => l.entity === entityKey).length;

              return (
                <button
                  key={entityKey}
                  type="button"
                  onClick={() => {
                    setSelectedEntity(entityKey);
                    setSearchQuery('');
                  }}
                  className={`p-2.5 rounded-xl text-left flex flex-col justify-between transition-all border ${
                    isTabActive
                      ? 'bg-white dark:bg-slate-800 shadow-md border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isTabActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {count} {isUrdu ? 'مراکز' : 'locs'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {isUrdu ? meta.nameUr : meta.nameEn}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {entityKey}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Project Banner */}
          <div className="mt-2.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2">
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <span className="font-bold">
                {isUrdu
                  ? PROJECT_METADATA[selectedEntity].nameUr
                  : PROJECT_METADATA[selectedEntity].nameEn}
                :
              </span>{' '}
              <span className="text-emerald-700 dark:text-emerald-300">
                {isUrdu
                  ? PROJECT_METADATA[selectedEntity].descriptionUr
                  : PROJECT_METADATA[selectedEntity].descriptionEn}
              </span>
            </div>

            {/* Quick Select Flagship */}
            <button
              type="button"
              onClick={() => handleSelect(PROJECT_METADATA[selectedEntity].primaryCode)}
              className="shrink-0 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>{isUrdu ? 'مین سینٹر منتخب کریں' : 'Select Main Centre'}</span>
              <ArrowRight className={`w-3 h-3 ${isUrdu ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-2.5 left-3 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isUrdu
                  ? 'برانچ کا نام، شہر یا کوڈ تلاش کریں (مثلاً: لاہور، ملتان، نشتر روڈ)...'
                  : 'Search by branch name, city, or location code (e.g., Multan, Lahore, Khanewal)...'
              }
              className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-2.5 right-3 rtl:right-auto rtl:left-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Branch List */}
        <div className="overflow-y-auto p-3 sm:p-4 space-y-2 flex-1 max-h-96">
          {filteredLocations.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">
                {isUrdu ? 'کوئی برانچ نہیں ملی' : 'No branches found'}
              </p>
              <p className="text-xs mt-1 text-slate-400">
                {isUrdu ? 'براہ کرم سرچ کیورڈ تبدیل کریں' : 'Try adjusting your search query'}
              </p>
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const isCurrent = loc.code === activeLocationCode;

              return (
                <div
                  key={loc.code}
                  onClick={() => handleSelect(loc.code)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isCurrent
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:group-hover:bg-emerald-900'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {loc.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                          {loc.city}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          • {loc.type}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {isUrdu ? loc.name.ur : loc.name.en}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {isUrdu ? loc.name.en : loc.name.ur}
                      </p>

                      {loc.inCharge && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>
                            {isUrdu ? 'انچارج:' : 'In-charge:'} {loc.inCharge}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        <span>{isUrdu ? 'موجودہ' : 'Selected'}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(loc.code);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1 group-hover:bg-emerald-600 group-hover:text-white"
                      >
                        <span>{isUrdu ? 'منتخب کریں' : 'Select'}</span>
                        <ArrowRight className={`w-3 h-3 ${isUrdu ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            {isUrdu
              ? `کل ${filteredLocations.length} برانچز دستیاب ہیں`
              : `Showing ${filteredLocations.length} locations in this entity`}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {isUrdu ? 'بند کریں' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
