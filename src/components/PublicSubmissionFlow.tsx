import React, { useState } from 'react';
import {
  Shield,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Building2,
  AlertTriangle,
  FileText,
  UserCheck,
  Camera,
  X,
  Send,
  ExternalLink,
  ArrowRightLeft,
} from 'lucide-react';
import {
  LocationItem,
  Track,
  Severity,
  RoutingRule,
  RoleAssignment,
  Complaint,
  Attachment,
  Entity,
} from '../types';
import { Language, translations } from '../translations';
import { VoiceRecorder } from './VoiceRecorder';
import { PublicAttachmentUploader } from './attachments/PublicAttachmentUploader';
import { simulateRouting } from '../utils/routingEngine';
import { ProjectLocationModal, PROJECT_METADATA } from './ProjectLocationModal';

interface PublicSubmissionFlowProps {
  currentLocation: LocationItem;
  lang: Language;
  onNavigateTracking: (code?: string) => void;
  onNavigateLogin?: () => void;
  onComplaintSubmitted: (complaint: Complaint) => void;
  routingRules: RoutingRule[];
  roleAssignments: RoleAssignment[];
  locations: LocationItem[];
  onSelectLocation?: (locationCode: string) => void;
}

export const PublicSubmissionFlow: React.FC<PublicSubmissionFlowProps> = ({
  currentLocation,
  lang,
  onNavigateTracking,
  onNavigateLogin,
  onComplaintSubmitted,
  routingRules,
  roleAssignments,
  locations,
  onSelectLocation,
}) => {
  const t = translations[lang];
  const isRtl = lang === 'ur';

  // Modal State for switching project/location
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Step index: 1 to 7
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [submitterType, setSubmitterType] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [track, setTrack] = useState<Track>('SERVICE');
  const [isAboutPersonInCharge, setIsAboutPersonInCharge] = useState<boolean>(false);
  const [safeguardingPersonName, setSafeguardingPersonName] = useState<string>('');
  const [complaintText, setComplaintText] = useState<string>('');
  const [voiceNote, setVoiceNote] = useState<any>(undefined);
  const [photos, setPhotos] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [whatsappPhone, setWhatsappPhone] = useState<string>('');
  const [isWhatsappSubscribed, setIsWhatsappSubscribed] = useState<boolean>(false);

  // Generated Ticket State (Screen 7)
  const [generatedTicket, setGeneratedTicket] = useState<{
    code: string;
    expectedResponseText: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Determine Submitter options based on scanned entity
  const getSubmitterOptions = () => {
    switch (currentLocation.entity) {
      case 'AAS_LAB':
        return ['Patient', 'Attendant', 'Employee', 'Visitor'];
      case 'FOUNDATION':
        return ['Employee', 'Visitor', 'Donor', 'Beneficiary'];
      case 'SCHOOL':
        return ['Parent or Guardian', 'Student', 'Teacher or Staff', 'Visitor'];
      case 'COLLEGE':
        return ['Student', 'Parent or Guardian', 'Teacher or Staff', 'Visitor'];
      default:
        return ['Visitor'];
    }
  };

  // Determine Service Categories based on entity
  const getServiceCategories = () => {
    switch (currentLocation.entity) {
      case 'AAS_LAB':
        return [
          { en: 'Staff behaviour', ur: 'عملے کا رویہ' },
          { en: 'Report delay', ur: 'رپورٹ میں تاخیر' },
          { en: 'Test quality or wrong result', ur: 'ٹیسٹ کا معیار یا غلط نتیجہ' },
          { en: 'Billing or overcharging', ur: 'بلنگ یا اضافی چارجز' },
          { en: 'Cleanliness or facility', ur: 'صفائی یا سہولیات' },
          { en: 'System/software/CCTV', ur: 'سسٹم / سافٹ ویئر / سی سی ٹی وی' },
          { en: 'Other', ur: 'دیگر' },
        ];
      case 'FOUNDATION':
        return [
          { en: 'Staff behaviour', ur: 'عملے کا رویہ' },
          { en: 'Donation or receipt issue', ur: 'عطیہ یا رسید کا مسئلہ' },
          { en: 'Aid or beneficiary issue', ur: 'امداد یا مستحقین کا مسئلہ' },
          { en: 'Cleanliness or facility', ur: 'صفائی یا سہولیات' },
          { en: 'System/software/CCTV', ur: 'سسٹم / سافٹ ویئر / سی سی ٹی وی' },
          { en: 'Other', ur: 'دیگر' },
        ];
      case 'SCHOOL':
        return [
          { en: 'Teacher conduct', ur: 'اساتذہ کا طرز عمل' },
          { en: 'Academic quality', ur: 'تعلیمی معیار' },
          { en: 'Exam or result issue', ur: 'امتحان یا نتائج کا مسئلہ' },
          { en: 'Fees or accounts', ur: 'فیس یا اکاؤنٹس' },
          { en: 'Admission', ur: 'داخلہ' },
          { en: 'Transport or van', ur: 'ٹرانسپورٹ یا وین' },
          { en: 'Facility or hygiene', ur: 'سہولیات یا حفظان صحت' },
          { en: 'Other', ur: 'دیگر' },
        ];
      case 'COLLEGE':
        return [
          { en: 'Teacher conduct', ur: 'اساتذہ کا طرز عمل' },
          { en: 'Academic quality', ur: 'تعلیمی معیار' },
          { en: 'Exam or result issue', ur: 'امتحان یا نتائج کا مسئلہ' },
          { en: 'Fees or accounts', ur: 'فیس یا اکاؤنٹس' },
          { en: 'Admission', ur: 'داخلہ' },
          { en: 'Transport or van', ur: 'ٹرانسپورٹ یا وین' },
          { en: 'Facility or hygiene', ur: 'سہولیات یا حفظان صحت' },
          { en: 'Hostel', ur: 'ہاسٹل' },
          { en: 'Other', ur: 'دیگر' },
        ];
    }
  };

  const confidentialCategories = [
    { en: 'Salary or benefits', ur: 'تنخواہ یا مراعات' },
    { en: 'Harassment', ur: 'ہراساں کرنا' },
    { en: 'Management conduct', ur: 'انتظامیہ کا رویہ' },
    { en: 'Fraud or theft', ur: 'دھوکہ دہی یا چوری' },
  ];

  const safeguardingCategories = [
    { en: 'Bullying', ur: 'دھونس، بدمعاشی یا بلنگ' },
    { en: 'Corporal punishment or physical harm', ur: 'جسمانی سزا یا مار پیٹ' },
    { en: 'Child safety concern', ur: 'بچوں کے تحفظ اور سلامتی کا خدشہ' },
  ];

  // Screen 3 condition:
  // "Shown only for categories whose default owner is a campus or branch-level role (Branch Manager, Principal, Campus Admin Officer)"
  const shouldShowScreen3 = () => {
    if (track === 'SAFEGUARDING' || track === 'CONFIDENTIAL') return false;
    const branchLevelCategories = [
      'Staff behaviour',
      'Cleanliness or facility',
      'Teacher conduct',
      'Admission',
      'Facility or hygiene',
      'Hostel',
    ];
    return branchLevelCategories.includes(category);
  };

  // Screen 4 condition:
  // "Shown optional, SAFEGUARDING track only"
  const shouldShowScreen4 = () => {
    return track === 'SAFEGUARDING';
  };

  const handleNextFromStep2 = (catEn: string, trk: Track) => {
    setCategory(catEn);
    setTrack(trk);

    // If Screen 3 applies, go to 3. If Safeguarding, skip 3 and go to 4. Otherwise go to 5.
    if (trk === 'SAFEGUARDING') {
      setCurrentStep(4);
    } else {
      const branchLevelCategories = [
        'Staff behaviour',
        'Cleanliness or facility',
        'Teacher conduct',
        'Admission',
        'Facility or hygiene',
        'Hostel',
      ];
      if (branchLevelCategories.includes(catEn)) {
        setCurrentStep(3);
      } else {
        setCurrentStep(5);
      }
    }
  };

  const handleNextFromStep3 = (isAboutLeader: boolean) => {
    setIsAboutPersonInCharge(isAboutLeader);
    setCurrentStep(5);
  };

  const handleBack = () => {
    if (currentStep === 1) return;
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      setCurrentStep(2);
    } else if (currentStep === 5) {
      if (shouldShowScreen4()) {
        setCurrentStep(4);
      } else if (shouldShowScreen3()) {
        setCurrentStep(3);
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 6) {
      setCurrentStep(5);
    }
  };

  const handleFinalSubmit = () => {
    // Generate code format: MTJ-XXXXXX
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ticketCode = `MTJ-${randomChars}`;

    // Determine severity
    const severity: Severity =
      track === 'SAFEGUARDING'
        ? category === 'Bullying'
          ? 'HIGH'
          : 'CRITICAL'
        : track === 'CONFIDENTIAL'
        ? category === 'Harassment' || category === 'Fraud or theft'
          ? 'CRITICAL'
          : 'HIGH'
        : category === 'Test quality or wrong result'
        ? 'CRITICAL'
        : 'MEDIUM';

    // Simulate routing rule match
    const routing = simulateRouting(routingRules, roleAssignments, locations, {
      entity: currentLocation.entity,
      locationCode: currentLocation.code,
      category,
      track,
      severity,
      isAboutPersonInCharge,
      safeguardingPersonName,
    });

    const now = new Date();
    const ackDeadline = new Date(now.getTime() + routing.ackSlaHours * 3600 * 1000).toISOString();
    const resolveDeadline = new Date(now.getTime() + routing.resolveSlaHours * 3600 * 1000).toISOString();

    const expectedResponse =
      lang === 'ur'
        ? `${routing.ackSlaHours} گھنٹے کے اندر جواب، اور ${routing.resolveSlaHours} گھنٹے کے اندر حل`
        : `Acknowledgment within ${routing.ackSlaHours} hours, resolution target ${routing.resolveSlaHours} hours`;

    // Sanitize filenames: Never store original filename if is_anonymous = true
    const sanitizedAttachments: Attachment[] = attachments.map((att, idx) => {
      const ext = att.original_filename.split('.').pop() || 'dat';
      const sanitizedName = isAnonymous
        ? `evidence_${String(idx + 1).padStart(2, '0')}.${ext}`
        : att.original_filename;
      return {
        ...att,
        complaint_id: ticketCode,
        original_filename: sanitizedName,
      };
    });

    const newComplaint: Complaint = {
      id: ticketCode,
      entity: currentLocation.entity,
      locationCode: currentLocation.code,
      locationName: currentLocation.name,
      category,
      track,
      submitterType,
      isAboutPersonInCharge,
      safeguardingPersonName: safeguardingPersonName.trim() || undefined,
      text: complaintText.trim(),
      voiceNote,
      photos,
      attachments: sanitizedAttachments,
      isAnonymous,
      contactInfo: isAnonymous
        ? undefined
        : {
            name: contactName.trim() || undefined,
            phone: contactPhone.trim() || undefined,
            notifyWhatsApp: !!whatsappPhone,
          },
      status: 'New',
      severity,
      createdAt: now.toISOString(),
      ackDeadlineHours: routing.ackSlaHours,
      resolveDeadlineHours: routing.resolveSlaHours,
      ackDeadlineAt: ackDeadline,
      resolveDeadlineAt: resolveDeadline,
      ownerRole: routing.resolvedOwnerRole,
      ownerName: routing.resolvedOwnerName,
      watcherRoles: routing.watcherRoles,
      watchers: routing.watcherNames,
      escalationLevel: 0,
      isOverdue: false,
      matchedRuleId: routing.matchedRule.id,
      excludedPerson: routing.excludedPerson,
      internalNotes: [],
      publicUpdates: [
        {
          id: `pu-${Date.now()}`,
          textUr: `شکایت سسٹم میں موصول ہو چکی ہے اور قانونی طور پر ${routing.resolvedOwnerRole} کو تفویض کر دی گئی ہے۔`,
          textEn: `Complaint registered in portal and assigned to ${routing.resolvedOwnerRole} under official SLA protocols.`,
          timestamp: now.toISOString(),
        },
      ],
      auditTimeline: [
        {
          id: `aud-${Date.now()}`,
          eventType: 'CREATED',
          actor: isAnonymous ? 'Anonymous Citizen' : contactName || 'Citizen',
          role: submitterType,
          details: `Complaint submitted via QR code at ${currentLocation.code}`,
          timestamp: now.toISOString(),
        },
      ],
    };

    onComplaintSubmitted(newComplaint);
    setGeneratedTicket({
      code: ticketCode,
      expectedResponseText: expectedResponse,
    });
    setCurrentStep(7);
  };

  const copyTicketCode = () => {
    if (!generatedTicket) return;
    navigator.clipboard.writeText(generatedTicket.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSubscribeWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappPhone.trim()) return;
    setIsWhatsappSubscribed(true);
  };

  const handleLocationSwitch = (newLocationCode: string) => {
    // Reset dependent fields so categories and submitter types align with the new entity
    setSubmitterType('');
    setCategory('');
    if (onSelectLocation) {
      onSelectLocation(newLocationCode);
    }
  };

  const handleQuickEntityChange = (entity: Entity) => {
    const meta = PROJECT_METADATA[entity];
    handleLocationSwitch(meta.primaryCode);
  };

  return (
    <div className="w-full max-w-xl mx-auto min-h-screen bg-stone-50 flex flex-col justify-between py-2 sm:py-6 px-3 sm:px-4">
      {/* Top Banner: Location & Project Identifier with Quick Switcher */}
      <div>
        <div
          id="location-banner"
          className="bg-emerald-950 text-white border-b-2 border-emerald-700 px-3.5 sm:px-4 py-3 rounded-t-lg shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold block">
                  {t.scannedLocation} • {currentLocation.code}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {currentLocation.name[lang]}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded font-mono font-medium hidden sm:inline">
                {currentLocation.entity}
              </span>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title={isRtl ? 'ادارہ یا برانچ تبدیل کریں' : 'Change project or branch location'}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-300" />
                <span>{isRtl ? 'ادارہ بدلیں' : 'Change Project'}</span>
              </button>
            </div>
          </div>

          {/* Quick Project Switcher Bar */}
          <div className="mt-2.5 pt-2 border-t border-emerald-800/80 flex items-center justify-between gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-emerald-300/80 tracking-wider">
              {isRtl ? 'پروجیکٹ منتخب کریں:' : 'Select Project:'}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickEntityChange('AAS_LAB')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentLocation.entity === 'AAS_LAB'
                    ? 'bg-emerald-500 text-white shadow-xs ring-1 ring-white/30 font-bold'
                    : 'bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200'
                }`}
              >
                🏥 {isRtl ? 'اے اے ایس لیب' : 'AAS Lab'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickEntityChange('FOUNDATION')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentLocation.entity === 'FOUNDATION'
                    ? 'bg-amber-600 text-white shadow-xs ring-1 ring-white/30 font-bold'
                    : 'bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200'
                }`}
              >
                🤝 {isRtl ? 'ایم ٹی جے فاؤنڈیشن' : 'MTJ Foundation'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickEntityChange('COLLEGE')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentLocation.entity === 'COLLEGE'
                    ? 'bg-purple-600 text-white shadow-xs ring-1 ring-white/30 font-bold'
                    : 'bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200'
                }`}
              >
                🎓 {isRtl ? 'الحسنین کالج' : 'College'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickEntityChange('SCHOOL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentLocation.entity === 'SCHOOL'
                    ? 'bg-sky-600 text-white shadow-xs ring-1 ring-white/30 font-bold'
                    : 'bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200'
                }`}
              >
                🏫 {isRtl ? 'الحسنین اسکول' : 'School'}
              </button>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="px-1.5 py-0.5 rounded text-[10px] text-emerald-300 hover:text-white underline underline-offset-2 ml-1 cursor-pointer"
              >
                {isRtl ? 'تمام 22 مراکز...' : 'All 22 branches...'}
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar and Navigation header for steps 1-6 */}
        {currentStep < 7 && (
          <div className="bg-white border-x border-b border-stone-300 px-4 py-3 flex items-center justify-between shadow-xs">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-md flex items-center gap-1.5 text-sm font-semibold transition-colors"
                aria-label="Back"
              >
                {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{t.back}</span>
              </button>
            ) : (
              <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                {t.submitComplaint}
              </div>
            )}

            {/* Visual Step Dots */}
            <div className="flex items-center gap-1.5" aria-label="Progress">
              {[1, 2, 3, 4, 5, 6].map((st) => {
                const isActive = st === currentStep;
                const isPassed = st < currentStep;
                return (
                  <div
                    key={st}
                    className={`h-2 rounded-full transition-all ${
                      isActive
                        ? 'w-6 bg-emerald-800'
                        : isPassed
                        ? 'w-2.5 bg-emerald-600'
                        : 'w-2 bg-stone-300'
                    }`}
                  />
                );
              })}
            </div>

            <span className="text-xs font-mono font-medium text-stone-700">
              {t.step} {currentStep} {t.of} 6
            </span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white border-x border-b border-stone-300 p-4 sm:p-6 rounded-b-lg shadow-sm mt-0 min-h-[420px]">
          {/* ================================================================= */}
          {/* SCREEN 1: WHO ARE YOU? */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {t.screen1Title}
                </h1>
                <p className="text-sm text-stone-600 mt-1">{t.screen1Subtitle}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {getSubmitterOptions().map((optKey) => {
                  const label = (t as any)[optKey] || optKey;
                  const isSelected = submitterType === optKey;

                  return (
                    <button
                      key={optKey}
                      type="button"
                      onClick={() => {
                        setSubmitterType(optKey);
                        setCurrentStep(2);
                      }}
                      className={`w-full min-h-[56px] text-start px-4 py-3.5 rounded-lg border-2 flex items-center justify-between gap-3 transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'border-emerald-800 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50 text-stone-900 font-medium'
                      }`}
                    >
                      <span className="text-base sm:text-lg">{label}</span>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-emerald-800 bg-emerald-800' : 'border-stone-400'
                        }`}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SCREEN 2: WHAT IS THIS ABOUT? */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {t.screen2Title}
                </h1>
                <p className="text-sm text-stone-600 mt-1">{t.screen2Subtitle}</p>
              </div>

              {/* SERVICE TRACK */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {t.serviceTrackHeader}
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {getServiceCategories().map((cat) => (
                    <button
                      key={cat.en}
                      type="button"
                      onClick={() => handleNextFromStep2(cat.en, 'SERVICE')}
                      className="w-full min-h-[50px] text-start px-4 py-3 rounded-lg border border-stone-300 hover:border-emerald-700 bg-stone-50 hover:bg-white text-stone-900 font-medium text-base transition-colors flex items-center justify-between"
                    >
                      <span>{cat[lang]}</span>
                      <span className="text-xs text-stone-600 font-normal">
                        {lang === 'ur' ? cat.en : cat.ur}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SAFEGUARDING TRACK (Shown for SCHOOL and COLLEGE to ALL submitters) */}
              {(currentLocation.entity === 'SCHOOL' || currentLocation.entity === 'COLLEGE') && (
                <div className="pt-3 border-t-2 border-amber-300">
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 mb-3">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                      <Shield className="w-5 h-5 text-amber-700 flex-shrink-0" />
                      <span>{t.safeguardingTrackHeader}</span>
                    </div>
                    <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                      {t.safeguardingNotice}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {safeguardingCategories.map((cat) => (
                      <button
                        key={cat.en}
                        type="button"
                        onClick={() => handleNextFromStep2(cat.en, 'SAFEGUARDING')}
                        className="w-full min-h-[52px] text-start px-4 py-3 rounded-lg border-2 border-amber-400 bg-amber-50/50 hover:bg-amber-100/70 text-amber-950 font-semibold text-base transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-700" />
                          <span>{cat[lang]}</span>
                        </div>
                        <span className="text-xs text-amber-800 font-normal">
                          {lang === 'ur' ? cat.en : cat.ur}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CONFIDENTIAL TRACK (Shown ONLY when submitter is Employee or Teacher/Staff) */}
              {(submitterType === 'Employee' || submitterType === 'Teacher or Staff') && (
                <div className="pt-3 border-t-2 border-purple-300">
                  <div className="bg-purple-50 border border-purple-300 rounded-lg p-3.5 mb-3">
                    <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                      <Lock className="w-5 h-5 text-purple-700 flex-shrink-0" />
                      <span>{t.confidentialTrackHeader}</span>
                    </div>
                    <p className="text-xs text-purple-900 mt-1 leading-relaxed">
                      {t.confidentialNotice}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {confidentialCategories.map((cat) => (
                      <button
                        key={cat.en}
                        type="button"
                        onClick={() => handleNextFromStep2(cat.en, 'CONFIDENTIAL')}
                        className="w-full min-h-[52px] text-start px-4 py-3 rounded-lg border-2 border-purple-400 bg-purple-50/50 hover:bg-purple-100/70 text-purple-950 font-semibold text-base transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-purple-700" />
                          <span>{cat[lang]}</span>
                        </div>
                        <span className="text-xs text-purple-800 font-normal">
                          {lang === 'ur' ? cat.en : cat.ur}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SCREEN 3: IS THIS COMPLAINT ABOUT THE PERSON IN CHARGE HERE? */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {t.screen3Title}
                </h1>
                <p className="text-sm text-stone-600 mt-1">{t.screen3Subtitle}</p>
              </div>

              <div className="bg-stone-100 border border-stone-300 rounded-lg p-3.5 text-xs text-stone-700">
                <span className="font-semibold block text-stone-900 mb-0.5">
                  {currentLocation.name[lang]}
                </span>
                <span>
                  Current in-charge: <strong className="font-semibold">{currentLocation.inCharge}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleNextFromStep3(true)}
                  className="min-h-[64px] border-2 border-amber-600 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-lg p-4 font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                  <span>{t.yes}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNextFromStep3(false)}
                  className="min-h-[64px] border-2 border-stone-300 hover:border-emerald-700 bg-white hover:bg-stone-50 text-stone-900 rounded-lg p-4 font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-5 h-5 text-stone-400" />
                  <span>{t.no}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SCREEN 4: WHO IS THIS ABOUT? (Optional, SAFEGUARDING track only) */}
          {/* ================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-xs px-2.5 py-1 rounded font-semibold mb-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t.safeguardingTrackHeader}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {t.screen4Title}
                </h1>
                <p className="text-sm text-stone-600 mt-1">{t.screen4Subtitle}</p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={safeguardingPersonName}
                  onChange={(e) => setSafeguardingPersonName(e.target.value)}
                  placeholder={t.screen4Placeholder}
                  className="w-full min-h-[50px] px-4 py-3 border-2 border-stone-300 rounded-lg text-base focus:border-amber-700 focus:outline-hidden bg-white"
                />
                <p className="text-xs text-stone-700 italic">{t.screen4Note}</p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="w-full min-h-[52px] bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg px-6 py-3 font-bold text-base flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
                >
                  <span>{t.next}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SCREEN 5: TELL US WHAT HAPPENED */}
          {/* ================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {t.screen5Title}
                </h1>
                <p className="text-sm text-stone-600 mt-1">{t.screen5Subtitle}</p>
              </div>

              {/* Large Text Area */}
              <div>
                <textarea
                  rows={5}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder={t.textPlaceholder}
                  className="w-full p-4 border-2 border-stone-300 rounded-lg text-base focus:border-emerald-800 focus:outline-hidden bg-white resize-y"
                />
              </div>

              {/* Voice Note Section */}
              <VoiceRecorder
                lang={lang}
                onVoiceRecorded={(data) => setVoiceNote(data)}
                existingVoiceNote={voiceNote}
              />

              {/* Attachments Section (v3.1) */}
              <PublicAttachmentUploader
                lang={lang}
                attachments={attachments}
                setAttachments={setAttachments}
                onPhotosSync={(urls) => setPhotos(urls)}
              />

              {/* Requirement notice */}
              {!complaintText.trim() && !voiceNote && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  {t.inputRequiredNote}
                </p>
              )}

              {/* Continue button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!complaintText.trim() && !voiceNote}
                  onClick={() => setCurrentStep(6)}
                  className={`w-full min-h-[52px] rounded-lg px-6 py-3 font-bold text-base flex items-center justify-center gap-2 transition-all ${
                    complaintText.trim() || voiceNote
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-white active:scale-[0.99]'
                      : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <span>{t.next}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SCREEN 6: IDENTITY */}
          {/* ================================================================= */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {t.screen6Title}
                </h1>
                <p className="text-sm text-stone-600 mt-1">{t.screen6Subtitle}</p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Radio Card 1: Anonymous (Default) */}
                <button
                  type="button"
                  onClick={() => setIsAnonymous(true)}
                  className={`w-full text-start p-4 rounded-lg border-2 transition-all min-h-[64px] ${
                    isAnonymous
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-950'
                      : 'border-stone-300 hover:border-stone-400 bg-white text-stone-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-bold flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-800" />
                        <span>{t.anonymousCardTitle}</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {t.anonymousCardDesc}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                        isAnonymous ? 'border-emerald-800 bg-emerald-800' : 'border-stone-400'
                      }`}
                    >
                      {isAnonymous && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>

                {/* Radio Card 2: Share Contact */}
                <button
                  type="button"
                  onClick={() => setIsAnonymous(false)}
                  className={`w-full text-start p-4 rounded-lg border-2 transition-all min-h-[64px] ${
                    !isAnonymous
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-950'
                      : 'border-stone-300 hover:border-stone-400 bg-white text-stone-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-bold flex items-center gap-2">
                        <span>{t.contactCardTitle}</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {t.contactCardDesc}
                      </p>
                      {track === 'SAFEGUARDING' && (
                        <p className="text-xs text-amber-800 font-medium mt-1.5 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" />
                          {t.safeguardingContactNotice}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                        !isAnonymous ? 'border-emerald-800 bg-emerald-800' : 'border-stone-400'
                      }`}
                    >
                      {!isAnonymous && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              </div>

              {/* Contact fields if not anonymous */}
              {!isAnonymous && (
                <div className="bg-stone-50 border border-stone-300 rounded-lg p-4 space-y-3 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {t.fullNameLabel}
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Ahmad Khan"
                      className="w-full min-h-[48px] px-3 py-2 border border-stone-300 rounded-md bg-white text-sm focus:border-emerald-800 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {t.mobileLabel}
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full min-h-[48px] px-3 py-2 border border-stone-300 rounded-md bg-white text-sm focus:border-emerald-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="w-full min-h-[54px] bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg px-6 py-3 font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all"
                >
                  <Send className="w-5 h-5" />
                  <span>{t.submit}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SCREEN 7: CONFIRMATION */}
          {/* ================================================================= */}
          {currentStep === 7 && generatedTicket && (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 leading-tight">
                  {t.screen7SuccessTitle}
                </h1>
                <p className="text-sm text-stone-600 mt-1">{t.screen7SuccessSubtitle}</p>
              </div>

              {/* Ticket Code Box */}
              <div className="bg-stone-100 border-2 border-emerald-700 rounded-xl p-5 max-w-md mx-auto">
                <span className="text-xs uppercase tracking-wider text-stone-600 font-semibold block mb-1">
                  {t.ticketCodeLabel}
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-bold text-emerald-950 tracking-wider my-1">
                  {generatedTicket.code}
                </div>

                <button
                  type="button"
                  onClick={copyTicketCode}
                  className="mt-3 min-h-[48px] px-5 py-2 bg-white hover:bg-stone-50 border border-stone-300 rounded-md text-sm font-semibold text-stone-800 inline-flex items-center gap-2 shadow-2xs active:bg-stone-200 transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span className="text-emerald-700">{t.codeCopied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{t.copyCode}</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-stone-600 mt-3">{t.saveCodeNotice}</p>
              </div>

              {/* Expected Response SLA */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 max-w-md mx-auto">
                <span className="font-bold block text-emerald-950 mb-0.5">
                  {t.expectedResponseTitle}
                </span>
                <span>{generatedTicket.expectedResponseText}</span>
              </div>

              {/* WhatsApp subscription (Optional) */}
              <div className="bg-white border border-stone-300 rounded-lg p-4 max-w-md mx-auto text-start">
                <h3 className="text-sm font-bold text-stone-900 mb-1">
                  {t.whatsappUpdatesTitle}
                </h3>
                {isWhatsappSubscribed ? (
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {t.whatsappSubscribed}
                  </p>
                ) : (
                  <form onSubmit={handleSubscribeWhatsApp} className="flex gap-2 mt-2">
                    <input
                      type="tel"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder={t.whatsappPlaceholder}
                      className="flex-1 min-h-[48px] px-3 py-2 border border-stone-300 rounded-md text-sm bg-white focus:border-emerald-800 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="min-h-[48px] px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-xs font-bold flex-shrink-0"
                    >
                      {t.whatsappSubmit}
                    </button>
                  </form>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => onNavigateTracking(generatedTicket.code)}
                  className="w-full min-h-[50px] bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg px-5 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <span>{t.goToTracking}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setCategory('');
                    setTrack('SERVICE');
                    setComplaintText('');
                    setVoiceNote(undefined);
                    setPhotos([]);
                    setSafeguardingPersonName('');
                    setIsAboutPersonInCharge(false);
                    setGeneratedTicket(null);
                  }}
                  className="w-full min-h-[50px] bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg px-5 py-3 font-semibold text-sm transition-colors"
                >
                  {t.submitAnother}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discreet Staff & Investigator Portal Access */}
      {onNavigateLogin && (
        <footer className="mt-8 pt-4 pb-2 border-t border-stone-200 text-center">
          <button
            type="button"
            onClick={onNavigateLogin}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-emerald-800 transition-colors py-1 px-2.5 rounded hover:bg-stone-100 font-medium"
          >
            <span>{t.staffPortal} ({t.staffLogin})</span>
          </button>
        </footer>
      )}
      {/* Project & Branch Selection Directory Modal */}
      <ProjectLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        locations={locations}
        activeLocationCode={currentLocation.code}
        onSelectLocation={handleLocationSwitch}
        lang={lang}
      />
    </div>
  );
};
