import React, { useState, useEffect } from 'react';
import {
  Globe,
  Building2,
  Search,
  ShieldCheck,
  QrCode,
  Sliders,
  Briefcase,
  Layers,
  LineChart,
  ShieldAlert,
  BookOpen,
  User,
  ChevronDown,
  LogIn,
  LogOut,
  Key,
  Lock,
} from 'lucide-react';
import {
  Language,
  translations,
} from './translations';
import {
  Complaint,
  LocationItem,
  RoutingRule,
  RoleAssignment,
  EscalationPolicy,
  AdminRole,
  User as UserType,
} from './types';
import {
  MOCK_LOCATIONS,
  INITIAL_ROUTING_RULES,
  INITIAL_ROLE_ASSIGNMENTS,
  INITIAL_ESCALATION_POLICIES,
  MOCK_USERS_LIST,
} from './data/mockData';
import { INITIAL_COMPLAINTS } from './data/complaintsData';
import { PublicSubmissionFlow } from './components/PublicSubmissionFlow';
import { TrackingPage } from './components/TrackingPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { HandlerWorkspace } from './components/personas/HandlerWorkspace';
import { TeamLeadConsole } from './components/personas/TeamLeadConsole';
import { ExecutiveView } from './components/personas/ExecutiveView';
import { SafeguardingConsole } from './components/personas/SafeguardingConsole';
import { DocsViewer } from './components/docs/DocsViewer';
import { LoginScreen } from './components/auth/LoginScreen';
import { ProjectLocationModal } from './components/ProjectLocationModal';

export type AppViewMode =
  | 'public'
  | 'tracking'
  | 'login'
  | 'workspace'
  | 'console'
  | 'executive'
  | 'safeguarding'
  | 'admin'
  | 'docs';

export default function App() {
  // Global State
  const [lang, setLang] = useState<Language>('ur');
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS);
  const [locations, setLocations] = useState<LocationItem[]>(MOCK_LOCATIONS);
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>(INITIAL_ROUTING_RULES);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>(INITIAL_ROLE_ASSIGNMENTS);
  const [escalationPolicies] = useState<EscalationPolicy[]>(INITIAL_ESCALATION_POLICIES);
  const [users, setUsers] = useState<UserType[]>(MOCK_USERS_LIST);

  // Active Logged-in Staff User
  const [currentUser, setCurrentUser] = useState<UserType>(() => {
    const savedUserId = localStorage.getItem('mtj_cms_user_id');
    const found = MOCK_USERS_LIST.find((u) => u.id === savedUserId);
    return found || MOCK_USERS_LIST[0];
  });

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('mtj_cms_auth_status') === 'true';
  });

  const [targetViewLabel, setTargetViewLabel] = useState<string>('');

  // Active View State
  const [activeView, setActiveView] = useState<AppViewMode>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/c/')) return 'public';
    if (path === '/t' || path.startsWith('/t/')) return 'tracking';
    if (path === '/docs') return 'docs';
    if (path === '/login') return 'login';
    const isAuth = localStorage.getItem('mtj_cms_auth_status') === 'true';
    if (!isAuth) return 'login';
    if (path === '/console') return 'console';
    if (path === '/executive') return 'executive';
    if (path === '/safeguarding') return 'safeguarding';
    if (path === '/admin') return 'admin';
    return 'workspace';
  });
  const [activeLocationCode, setActiveLocationCode] = useState<string>('AAS-KHN-01');
  const [trackingCode, setTrackingCode] = useState<string>('');
  const [adminRole, setAdminRole] = useState<AdminRole>('Super Admin');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState<boolean>(false);
  const [isGlobalLocationModalOpen, setIsGlobalLocationModalOpen] = useState<boolean>(false);

  // Handle URL path initialization if user navigated to /c/:code or /t or /workspace etc
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/c/')) {
      const code = path.replace('/c/', '').trim();
      if (code) {
        setActiveLocationCode(code);
        setActiveView('public');
      }
    } else if (path === '/t' || path.startsWith('/t/')) {
      const code = path.replace('/t/', '').replace('/t', '').trim();
      if (code) setTrackingCode(code);
      setActiveView('tracking');
    } else if (path === '/login') {
      setActiveView('login');
    } else if (path === '/workspace') {
      if (!isAuthenticated) {
        setTargetViewLabel('Handler Workspace');
        setActiveView('login');
      } else {
        setActiveView('workspace');
      }
    } else if (path === '/console') {
      if (!isAuthenticated) {
        setTargetViewLabel('Team Lead Console');
        setActiveView('login');
      } else {
        setActiveView('console');
      }
    } else if (path === '/executive') {
      if (!isAuthenticated) {
        setTargetViewLabel('Executive Board View');
        setActiveView('login');
      } else {
        setActiveView('executive');
      }
    } else if (path === '/safeguarding') {
      if (!isAuthenticated) {
        setTargetViewLabel('Safeguarding Console');
        setActiveView('login');
      } else {
        setActiveView('safeguarding');
      }
    } else if (path === '/admin') {
      if (!isAuthenticated) {
        setTargetViewLabel('System Administration Portal');
        setActiveView('login');
      } else {
        setActiveView('admin');
      }
    } else if (path === '/docs') {
      setActiveView('docs');
    }
  }, [isAuthenticated]);

  // Update HTML lang and dir whenever language or view changes
  useEffect(() => {
    const html = document.documentElement;
    if (activeView !== 'public' && activeView !== 'tracking') {
      // Operations & Admin consoles are English LTR
      html.setAttribute('lang', 'en');
      html.setAttribute('dir', 'ltr');
      html.classList.remove('font-urdu');
      html.classList.add('font-sans');
    } else {
      html.setAttribute('lang', lang);
      html.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
      if (lang === 'ur') {
        html.classList.add('font-urdu');
        html.classList.remove('font-sans');
      } else {
        html.classList.remove('font-urdu');
        html.classList.add('font-sans');
      }
    }
  }, [lang, activeView]);

  // Find active location item
  const currentLocation =
    locations.find((l) => l.code === activeLocationCode) || locations[0];

  // Callback when public citizen submits a complaint
  const handleComplaintSubmitted = (newComplaint: Complaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
  };

  // Callback when complaint is updated in any workspace or admin
  const handleUpdateComplaint = (updatedComplaint: Complaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
    );
  };

  // Callback to update user attributes (e.g. clearances)
  const handleUpdateUser = (updatedUser: UserType) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleNavigateTracking = (code?: string) => {
    if (code) setTrackingCode(code);
    setActiveView('tracking');
    window.history.pushState({}, '', `/t${code ? `/${code}` : ''}`);
  };

  const handleOpenPublicFlowForLocation = (code: string) => {
    setActiveLocationCode(code);
    setActiveView('public');
    window.history.pushState({}, '', `/c/${code}`);
  };

  const handleLoginSuccess = (user: UserType) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('mtj_cms_auth_status', 'true');
    localStorage.setItem('mtj_cms_user_id', user.id);
    setTargetViewLabel('');

    // Contextually switch view based on persona
    if (user.persona === 'HANDLER') {
      setActiveView('workspace');
      window.history.pushState({}, '', '/workspace');
    } else if (user.persona === 'TEAM_LEAD') {
      setActiveView('console');
      window.history.pushState({}, '', '/console');
    } else if (user.persona === 'TOP_MANAGEMENT' || user.persona === 'AUDITOR') {
      setActiveView('executive');
      window.history.pushState({}, '', '/executive');
    } else if (user.persona === 'CHILD_PROTECTION_OFFICER') {
      setActiveView('safeguarding');
      window.history.pushState({}, '', '/safeguarding');
    } else if (user.persona === 'SUPER_ADMIN') {
      setActiveView('admin');
      window.history.pushState({}, '', '/admin');
    } else {
      setActiveView('workspace');
      window.history.pushState({}, '', '/workspace');
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('mtj_cms_auth_status');
    setTargetViewLabel('');
    setActiveView('login');
    window.history.pushState({}, '', '/login');
  };

  const handleNavigateStaffView = (view: AppViewMode, path: string, label: string) => {
    if (!isAuthenticated) {
      setTargetViewLabel(label);
      setActiveView('login');
      window.history.pushState({}, '', '/login');
    } else {
      setActiveView(view);
      window.history.pushState({}, '', path);
    }
  };

  const handleSwitchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (!found) return;
    setCurrentUser(found);
    setIsAuthenticated(true);
    localStorage.setItem('mtj_cms_auth_status', 'true');
    localStorage.setItem('mtj_cms_user_id', found.id);
    setTargetViewLabel('');

    // Contextually switch view based on persona
    if (found.persona === 'HANDLER') {
      setActiveView('workspace');
      window.history.pushState({}, '', '/workspace');
    } else if (found.persona === 'TEAM_LEAD') {
      setActiveView('console');
      window.history.pushState({}, '', '/console');
    } else if (found.persona === 'TOP_MANAGEMENT' || found.persona === 'AUDITOR') {
      setActiveView('executive');
      window.history.pushState({}, '', '/executive');
    } else if (found.persona === 'CHILD_PROTECTION_OFFICER') {
      setActiveView('safeguarding');
      window.history.pushState({}, '', '/safeguarding');
    } else if (found.persona === 'SUPER_ADMIN') {
      setActiveView('admin');
      window.history.pushState({}, '', '/admin');
    }
  };

  const navigateTo = (view: AppViewMode, path: string) => {
    setActiveView(view);
    window.history.pushState({}, '', path);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Prototype Navigation & Persona Switcher */}
      <nav
        aria-label="Prototype demo switcher"
        className="bg-slate-950 text-slate-200 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-40 sticky top-0 shadow-md"
        dir="ltr"
      >
        {/* Left: View Modes Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Logo / Brand */}
          <div className="flex items-center gap-1.5 mr-2 font-bold text-white tracking-wide">
            <span className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-xs font-black">
              M
            </span>
            <span className="hidden sm:inline">MTJ CMS</span>
          </div>

          {/* Citizen Intake Flow */}
          <button
            type="button"
            onClick={() => handleOpenPublicFlowForLocation('AAS-KHN-01')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeView === 'public'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Citizen Intake</span>
          </button>

          {/* Citizen Tracking */}
          <button
            type="button"
            onClick={() => navigateTo('tracking', '/t')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeView === 'tracking'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Citizen Track</span>
          </button>

          <span className="text-slate-700 mx-0.5">|</span>

          {/* Login Screen Access Button */}
          <button
            type="button"
            onClick={() => {
              setTargetViewLabel('');
              navigateTo('login', '/login');
            }}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'login'
                ? 'bg-amber-600 text-white ring-2 ring-amber-400/50 shadow-md'
                : !isAuthenticated
                ? 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-700'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAuthenticated ? 'Login Screen' : 'Staff Sign In'}</span>
          </button>

          {/* Persona 1: Handler Workspace */}
          <button
            type="button"
            onClick={() => handleNavigateStaffView('workspace', '/workspace', 'Handler Workspace')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeView === 'workspace'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-sky-400" />
            <span>Handler Workspace</span>
          </button>

          {/* Persona 2: Team Lead Console */}
          <button
            type="button"
            onClick={() => handleNavigateStaffView('console', '/console', 'Team Lead Console')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeView === 'console'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Team Lead</span>
          </button>

          {/* Persona 3: Executive Board */}
          <button
            type="button"
            onClick={() => handleNavigateStaffView('executive', '/executive', 'Executive Board View')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeView === 'executive'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-purple-400" />
            <span>Executive</span>
          </button>

          {/* Persona 4: Safeguarding Console */}
          <button
            type="button"
            onClick={() => handleNavigateStaffView('safeguarding', '/safeguarding', 'Safeguarding Console')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeView === 'safeguarding'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Safeguarding</span>
          </button>

          {/* Part C: Admin Portal */}
          <button
            type="button"
            onClick={() => handleNavigateStaffView('admin', '/admin', 'System Administration Portal')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeView === 'admin'
                ? 'bg-slate-700 text-white shadow-xs font-bold'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Admin</span>
          </button>

          {/* Documentation Viewer */}
          <button
            type="button"
            onClick={() => navigateTo('docs', '/docs')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeView === 'docs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Docs</span>
          </button>
        </div>

        {/* Right: Active Persona Selector + Language + Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              {/* Active User Persona Selector & Badge */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-slate-400 hidden xl:inline">
                  User:
                </span>
                <select
                  value={currentUser.id}
                  onChange={(e) => handleSwitchUser(e.target.value)}
                  className="text-xs font-bold text-white bg-transparent focus:outline-hidden cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
                  title="Switch Active Persona"
                >
                  <optgroup label="Investigation Handlers">
                    {users
                      .filter((u) => u.persona === 'HANDLER')
                      .map((u) => (
                        <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                          {u.name} (HANDLER - {u.scopeValue})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Operational Team Leads">
                    {users
                      .filter((u) => u.persona === 'TEAM_LEAD')
                      .map((u) => (
                        <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                          {u.name} (TEAM_LEAD - {u.scopeValue})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Executive & Child Protection">
                    {users
                      .filter((u) => u.persona === 'TOP_MANAGEMENT' || u.persona === 'CHILD_PROTECTION_OFFICER')
                      .map((u) => (
                        <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                          {u.name} ({u.persona})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Admin & Auditors">
                    {users
                      .filter((u) => u.persona === 'SUPER_ADMIN' || u.persona === 'AUDITOR')
                      .map((u) => (
                        <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                          {u.name} ({u.persona})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOut}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 transition-colors flex items-center gap-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTargetViewLabel('');
                navigateTo('login', '/login');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Sign In</span>
            </button>
          )}

          {/* Bilingual Language Switcher (for Public, Tracking, Login) */}
          {(activeView === 'public' || activeView === 'tracking' || activeView === 'login') && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <div className="inline-flex rounded-md bg-slate-900 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setLang('ur')}
                  className={`min-h-[28px] px-2 py-0.5 rounded text-xs font-bold transition-all font-urdu ${
                    lang === 'ur'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  اردو
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`min-h-[28px] px-2 py-0.5 rounded text-xs font-bold transition-all font-sans ${
                    lang === 'en'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Primary Application Body */}
      <main className="flex-1">
        {activeView === 'login' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigatePublic={() => handleOpenPublicFlowForLocation('AAS-KHN-01')}
            onNavigateTracking={() => navigateTo('tracking', '/t')}
            lang={lang}
            onToggleLang={() => setLang(lang === 'ur' ? 'en' : 'ur')}
            targetViewLabel={targetViewLabel}
          />
        )}

        {activeView === 'public' && (
          <div className="py-2">
            <PublicSubmissionFlow
              currentLocation={currentLocation}
              lang={lang}
              onNavigateTracking={handleNavigateTracking}
              onNavigateLogin={() => {
                setTargetViewLabel('');
                navigateTo('login', '/login');
              }}
              onComplaintSubmitted={handleComplaintSubmitted}
              routingRules={routingRules}
              roleAssignments={roleAssignments}
              locations={locations}
            />
          </div>
        )}

        {activeView === 'tracking' && (
          <div className="py-2">
            <TrackingPage
              lang={lang}
              initialCode={trackingCode || 'MTJ-7K9P2X'}
              complaints={complaints}
              onNavigateSubmit={() => {
                setActiveView('public');
                window.history.pushState({}, '', `/c/${activeLocationCode}`);
              }}
              onNavigateLogin={() => {
                setTargetViewLabel('');
                navigateTo('login', '/login');
              }}
            />
          </div>
        )}

        {activeView === 'workspace' && (
          <HandlerWorkspace
            currentUser={currentUser}
            complaints={complaints}
            onUpdateComplaint={handleUpdateComplaint}
          />
        )}

        {activeView === 'console' && (
          <TeamLeadConsole
            currentUser={currentUser}
            allUsers={users}
            complaints={complaints}
            onUpdateComplaint={handleUpdateComplaint}
          />
        )}

        {activeView === 'executive' && (
          <ExecutiveView
            currentUser={currentUser}
            complaints={complaints}
            allUsers={users}
          />
        )}

        {activeView === 'safeguarding' && (
          <SafeguardingConsole
            currentUser={currentUser}
            allUsers={users}
            complaints={complaints}
            onUpdateComplaint={handleUpdateComplaint}
          />
        )}

        {activeView === 'admin' && (
          <AdminLayout
            currentRole={adminRole}
            onChangeRole={(newRole) => setAdminRole(newRole)}
            complaints={complaints}
            onUpdateComplaint={handleUpdateComplaint}
            locations={locations}
            routingRules={routingRules}
            onUpdateRules={(rules) => setRoutingRules(rules)}
            roleAssignments={roleAssignments}
            onUpdateAssignments={(assignments) => setRoleAssignments(assignments)}
            escalationPolicies={escalationPolicies}
            users={users}
            onUpdateUser={handleUpdateUser}
            onExitAdmin={() => {
              setActiveView('public');
              window.history.pushState({}, '', `/c/${activeLocationCode}`);
            }}
            onOpenPublicFlowForLocation={handleOpenPublicFlowForLocation}
          />
        )}

        {activeView === 'docs' && <DocsViewer />}
      </main>
    </div>
  );
}
