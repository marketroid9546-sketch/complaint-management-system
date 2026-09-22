import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Key,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  RefreshCw,
  Info,
  HelpCircle,
  UserCheck,
  Briefcase,
  Layers,
  LineChart,
  User,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { User as UserType } from '../../types';
import { MOCK_USERS_LIST } from '../../data/mockData';
import { Language } from '../../translations';

interface LoginScreenProps {
  onLoginSuccess: (user: UserType) => void;
  onNavigatePublic: () => void;
  onNavigateTracking: () => void;
  lang: Language;
  onToggleLang: () => void;
  targetViewLabel?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigatePublic,
  onNavigateTracking,
  lang,
  onToggleLang,
  targetViewLabel,
}) => {
  // Form State
  const [email, setEmail] = useState<string>('hamza.tariq@aaslab.pk');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<UserType>(MOCK_USERS_LIST[0]);

  // Auth Flow & MFA State
  const [authStage, setAuthStage] = useState<'CREDENTIALS' | 'MFA_CHALLENGE'>('CREDENTIALS');
  const [mfaCode, setMfaCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'form' | 'demo_roles'>('form');

  // Handle preset selection
  const handleSelectPreset = (user: UserType) => {
    setSelectedUser(user);
    setEmail(user.email);
    setPassword('DemoSecret2026!');
    setErrorMessage('');
  };

  // Perform credential check
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage(lang === 'ur' ? 'براہ کرم اپنا دفتری ای میل درج کریں' : 'Please enter your work email address.');
      return;
    }

    setIsLoading(true);

    // Simulate network authentication
    setTimeout(() => {
      setIsLoading(false);
      const matched = MOCK_USERS_LIST.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!matched) {
        setErrorMessage(
          lang === 'ur'
            ? 'ای میل یا پاس ورڈ درست نہیں ہے۔ براہ کرم تصدیق کریں یا نیچے دیئے گئے ڈیمو یوزرز میں سے منتخب کریں۔'
            : 'Unrecognized credentials. Please select a registered staff member from the demo presets below.'
        );
        return;
      }

      if (!matched.active) {
        setErrorMessage(
          lang === 'ur'
            ? 'یہ اکاؤنٹ غیر فعال (Deactivated) ہے۔ برائے مہربانی آئی ٹی ایڈمنسٹریٹر سے رابطہ کریں۔'
            : 'This account has been deactivated. Please contact the IT Systems Administrator.'
        );
        return;
      }

      setSelectedUser(matched);

      // High security personas trigger Multi-Factor Authentication (2FA) challenge
      const requiresMfa =
        matched.persona === 'CHILD_PROTECTION_OFFICER' ||
        matched.persona === 'SUPER_ADMIN' ||
        matched.persona === 'TOP_MANAGEMENT' ||
        matched.safeguarding_acl;

      if (requiresMfa) {
        setAuthStage('MFA_CHALLENGE');
      } else {
        onLoginSuccess(matched);
      }
    }, 600);
  };

  // Perform MFA Verification
  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length < 6) {
      setErrorMessage(
        lang === 'ur' ? 'براہ کرم 6 ہندسوں کا تصدیقی کوڈ درج کریں' : 'Please enter the full 6-digit verification code.'
      );
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(selectedUser);
    }, 500);
  };

  // Quick 1-click login for testing
  const handleDirectDemoLogin = (user: UserType) => {
    setSelectedUser(user);
    onLoginSuccess(user);
  };

  // Group demo users for structured display
  const handlers = MOCK_USERS_LIST.filter((u) => u.persona === 'HANDLER');
  const teamLeads = MOCK_USERS_LIST.filter((u) => u.persona === 'TEAM_LEAD');
  const executives = MOCK_USERS_LIST.filter((u) => u.persona === 'TOP_MANAGEMENT');
  const cpo = MOCK_USERS_LIST.filter((u) => u.persona === 'CHILD_PROTECTION_OFFICER');
  const adminAndAuditor = MOCK_USERS_LIST.filter(
    (u) => u.persona === 'SUPER_ADMIN' || u.persona === 'AUDITOR'
  );

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-3 sm:px-6 relative overflow-hidden font-sans">
      {/* Background Subtle Accent Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-950/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-950/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar inside Login */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-900/30">
            M
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 block">
              MTJ Group of Institutions
            </span>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Grievance Redressal & Whistleblower Portal (CMS)
            </h1>
          </div>
        </div>

        {/* Public Flow Links & Language Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigatePublic}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors hidden sm:flex items-center gap-1.5"
          >
            <span>Public Intake</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={onNavigateTracking}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors hidden sm:flex items-center gap-1.5"
          >
            <span>Track Grievance</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
          >
            {lang === 'ur' ? 'English' : 'اردو'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Column: Institutional Context & Clearances Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Staff & Investigator Access</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Central Redressal & Oversight System
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Secure authentication for clinical branch managers, academic principals, safeguarding officers, and the executive leadership across all MTJ Group institutions.
            </p>
          </div>

          {/* Institutional Badges */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Supported Organizational Entities
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-slate-200">AAS Diagnostic Labs</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="font-semibold text-slate-200">MTJ Foundation</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-semibold text-slate-200">Alhasanain Schools</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="font-semibold text-slate-200">Alhasanain College</span>
              </div>
            </div>
          </div>

          {/* Security & Clearance Legend */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Multi-Tier Security Clearances</span>
            </span>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 text-slate-300">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300 shrink-0">
                  SERVICE
                </span>
                <p className="text-[11px] text-slate-400">
                  Standard branch grievances, clinical turnaround, admissions, transport, and facilities.
                </p>
              </div>
              <div className="flex items-start gap-2.5 text-slate-300">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-700 text-amber-300 shrink-0">
                  CONFIDENTIAL
                </span>
                <p className="text-[11px] text-slate-400">
                  Internal staff grievances, whistleblowing, and payroll. Bypasses branch leads to CEO.
                </p>
              </div>
              <div className="flex items-start gap-2.5 text-slate-300">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-700 text-rose-300 shrink-0">
                  SAFEGUARDING
                </span>
                <p className="text-[11px] text-slate-400">
                  Air-gapped case ACL for child protection. Reserved strictly for CPO and CEO.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Card & Fast Demo Roles (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
            {/* Contextual Notice if redirected */}
            {targetViewLabel && (
              <div className="mb-6 p-3.5 rounded-xl bg-sky-950/60 border border-sky-800 flex items-center gap-3 text-xs text-sky-200">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  Authentication required: Please sign in to access the{' '}
                  <strong className="text-white font-bold">{targetViewLabel}</strong>.
                </span>
              </div>
            )}

            {/* Stage 1: Credentials Input */}
            {authStage === 'CREDENTIALS' && (
              <div>
                {/* Tabs: Standard Login vs Quick Demo Sign-In */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white">Staff Sign In</h3>
                    <p className="text-xs text-slate-400">
                      Enter your organizational credentials or choose a quick role.
                    </p>
                  </div>
                  <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('form')}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                        activeTab === 'form'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Login Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('demo_roles')}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                        activeTab === 'demo_roles'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Fast Demo Roles
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3 rounded-lg bg-rose-950/80 border border-rose-800 flex items-start gap-2.5 text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {activeTab === 'form' ? (
                  <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                    {/* Work Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>Work Email Address</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          e.g. @aaslab.pk, @mtjfoundation.org
                        </span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@organization.pk"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold text-slate-300">Password</label>
                        <button
                          type="button"
                          onClick={() => setShowForgotModal(true)}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors text-[11px]"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your security password"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 transition-colors font-mono"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember me */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Remember credentials on this workstation</span>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full min-h-[46px] bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 mt-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Authenticating with Central Directory...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Sign In to Staff Console</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>

                    {/* Fast Persona Quick-Bar Below Form */}
                    <div className="pt-4 border-t border-slate-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Quick Demo Account Fill:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {handlers.slice(0, 2).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSelectPreset(u)}
                            className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                              email === u.email
                                ? 'bg-sky-950 border-sky-600 text-sky-200'
                                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {u.name} (Handler)
                          </button>
                        ))}
                        {teamLeads.slice(0, 1).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSelectPreset(u)}
                            className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                              email === u.email
                                ? 'bg-emerald-950 border-emerald-600 text-emerald-200'
                                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {u.name} (Team Lead)
                          </button>
                        ))}
                        {cpo.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSelectPreset(u)}
                            className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                              email === u.email
                                ? 'bg-amber-950 border-amber-600 text-amber-200'
                                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {u.name} (CPO)
                          </button>
                        ))}
                        {executives.slice(0, 1).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSelectPreset(u)}
                            className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                              email === u.email
                                ? 'bg-purple-950 border-purple-600 text-purple-200'
                                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {u.name} (CEO)
                          </button>
                        ))}
                      </div>
                    </div>
                  </form>
                ) : (
                  /* Option B: Fast Demo Role Grid (1-Click Login) */
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                    {/* Section 1: Investigation Handlers */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Investigation Handlers (Assigned Only)</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {handlers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleDirectDemoLogin(u)}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-600/70 hover:bg-slate-850 cursor-pointer transition-all group text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-sky-300">
                                {u.name}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400" />
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{u.roleTitle}</p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                {u.scopeValue}
                              </span>
                              {u.confidential_clearance && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold">
                                  CONFIDENTIAL
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Team Leads & Branch Managers */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Operational Team Leads & Principals</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teamLeads.slice(0, 4).map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleDirectDemoLogin(u)}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-600/70 hover:bg-slate-850 cursor-pointer transition-all group text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                                {u.name}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400" />
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{u.roleTitle}</p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                {u.scopeValue}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 3: CPO & Executive Board */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Safeguarding & Executive Leadership</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cpo.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleDirectDemoLogin(u)}
                            className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/80 hover:border-amber-500 cursor-pointer transition-all group text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-200 group-hover:text-amber-100">
                                {u.name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-600 text-white font-bold">
                                2FA REQ
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-300/80 truncate">{u.roleTitle}</p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 font-bold">
                                SAFEGUARDING ACL
                              </span>
                            </div>
                          </div>
                        ))}
                        {executives.slice(0, 1).map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleDirectDemoLogin(u)}
                            className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/80 hover:border-purple-500 cursor-pointer transition-all group text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-purple-200 group-hover:text-purple-100">
                                {u.name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-bold">
                                CEO
                              </span>
                            </div>
                            <p className="text-[11px] text-purple-300/80 truncate">{u.roleTitle}</p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-purple-200 font-mono">
                                GLOBAL OVERSIGHT
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 4: System Administration & Audit */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>System Administration & Audit</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {adminAndAuditor.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleDirectDemoLogin(u)}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-600/70 hover:bg-slate-850 cursor-pointer transition-all group text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-rose-300">
                                {u.name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                {u.persona}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{u.roleTitle}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 2: 2FA Multi-Factor Authentication Challenge */}
            {authStage === 'MFA_CHALLENGE' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Two-Factor Security Verification</h3>
                    <p className="text-xs text-slate-400">
                      High-clearance role verification for {selectedUser.name}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <p className="font-semibold text-white">
                    A 6-digit authentication token has been dispatched to:
                  </p>
                  <p className="font-mono text-emerald-400 text-sm">
                    {selectedUser.phone ? selectedUser.phone.replace(/(\d{4})\d+(\d{2})/, '$1-***-$2') : '+92 301-***-12'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Role Clearance:{' '}
                    <strong className="text-amber-400 font-bold">
                      {selectedUser.persona === 'CHILD_PROTECTION_OFFICER'
                        ? 'SAFEGUARDING VAULT ACL'
                        : selectedUser.persona === 'TOP_MANAGEMENT'
                        ? 'GLOBAL EXECUTIVE OVERSIGHT'
                        : 'SYSTEM ROOT ADMINISTRATOR'}
                    </strong>
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 flex items-start gap-2.5 text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Enter 6-Digit One-Time PIN (OTP)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full text-center tracking-[0.6em] text-2xl font-mono py-3 bg-slate-950 border-2 border-slate-700 focus:border-amber-500 rounded-lg text-white placeholder-slate-600 focus:outline-hidden"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setMfaCode('123456')}
                      className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-medium"
                    >
                      ⚡ Auto-fill demo OTP (123456)
                    </button>
                    <span className="text-slate-500">Expires in 04:59</span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStage('CREDENTIALS');
                        setErrorMessage('');
                      }}
                      className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || mfaCode.length < 6}
                      className="flex-1 min-h-[44px] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Token...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify & Access Console</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Security Compliance Text */}
      <footer className="w-full max-w-5xl mx-auto pt-6 border-t border-slate-800 text-center text-xs text-slate-400 space-y-1 relative z-10">
        <p className="font-medium">
          Official MTJ Group Staff & Administration Portal · Maulana Tariq Jamil Group
        </p>
        <p className="text-[11px] text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Authorized personnel only. All access transactions, query filters, and document views are bound to unique cryptographic session identifiers and immutable audit logs in accordance with the MTJ Information Security & Whistleblower Protection Charter 2026.
        </p>
      </footer>

      {/* Forgot Password Modal Simulation */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Staff Credential Recovery</h4>
                <p className="text-xs text-slate-400">MTJ Information Technology Operations</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              In accordance with ISO/IEC 27001 data protection protocols, automated email self-reset is disabled for Safeguarding and Healthcare investigators. Please contact your designated entity IT Administrator:
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">IT Helpdesk:</span>
                <span className="text-emerald-400">+92 42 111 685 000 (Ext 402)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Secure Email:</span>
                <span className="text-emerald-400">it.security@mtjgroup.org</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Shift:</span>
                <span className="text-slate-300">24/7 Security Operations Center (SOC)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
