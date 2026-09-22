import React, { useState } from 'react';
import {
  Shield,
  Info,
  Clock,
  Bell,
  Mail,
  Smartphone,
  Lock,
} from 'lucide-react';
import { EscalationPolicy } from '../../types';

interface EscalationPoliciesAdminProps {
  policies: EscalationPolicy[];
}

export const EscalationPoliciesAdmin: React.FC<EscalationPoliciesAdminProps> = ({
  policies,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'STANDARD' | 'SAFEGUARDING'>('ALL');

  const filtered = policies.filter((p) => {
    if (activeTab === 'SAFEGUARDING') return p.isSafeguardingSpecial;
    if (activeTab === 'STANDARD') return !p.isSafeguardingSpecial;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Policy Governance Banner */}
      <div className="bg-stone-900 text-white rounded-xl p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>Institutional Escalation Protocol</span>
        </div>
        <h2 className="text-lg font-bold">
          Escalation ADDS a Watcher and Never Transfers Ownership
        </h2>
        <p className="text-xs text-stone-300 leading-relaxed max-w-3xl">
          When an acknowledgement or resolution SLA is breached, the primary assigned officer retains full operational accountability for executing the remediation. The system automatically elevates visibility by binding senior executives as active watchers on the ticket, triggering real-time alerts across SMS, WhatsApp, and executive in-app feeds.
        </p>
      </div>

      {/* Safeguarding Immutable Exception Notice */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-amber-950">
              Safeguarding Immutable Protocol (Zero-Tolerance)
            </h3>
            <span className="bg-amber-200 text-amber-950 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
              System Locked / Non-Editable
            </span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            Safeguarding reports bypass standard 3-tier escalation tiers. Any safeguarding complaint unacknowledged past the 2-hour window triggers a direct L1 escalation strictly and immediately to the <strong>CEO</strong>. Campus staff, teachers, and principals are permanently barred from receiving these notifications.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['ALL', 'STANDARD', 'SAFEGUARDING'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === tab
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            {tab === 'ALL'
              ? 'All Policies'
              : tab === 'STANDARD'
              ? 'Standard 3-Tier Policies'
              : 'Safeguarding Protocol'}
          </button>
        ))}
      </div>

      {/* Escalation Policies Table */}
      <div className="bg-white border border-stone-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase tracking-wider">
                <th className="py-3 px-3">Linked Domain / Rule</th>
                <th className="py-3 px-3 text-center">Escalation Tier</th>
                <th className="py-3 px-3">Trigger Condition</th>
                <th className="py-3 px-3">Escalate To Watcher</th>
                <th className="py-3 px-3">Notification Channels</th>
                <th className="py-3 px-3 text-center">Policy Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((pol) => {
                const isSafeguarding = pol.isSafeguardingSpecial;

                return (
                  <tr
                    key={pol.id}
                    className={`hover:bg-stone-50 transition-colors ${
                      isSafeguarding ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3 font-semibold text-stone-900 whitespace-nowrap">
                      {isSafeguarding ? (
                        <span className="flex items-center gap-1.5 text-amber-950">
                          <Shield className="w-3.5 h-3.5 text-amber-700" />
                          {pol.linkedRuleCategory}
                        </span>
                      ) : (
                        <span className="font-mono text-stone-700">{pol.linkedRuleCategory}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-extrabold text-[11px] ${
                          pol.level === 3
                            ? 'bg-red-600 text-white'
                            : pol.level === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-200 text-stone-800'
                        }`}
                      >
                        Tier {pol.level}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-medium text-stone-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                        <span>+{pol.hoursOverdue}h Overdue Breach</span>
                      </div>
                      <span className="text-[10px] text-stone-600 font-mono block">
                        {isSafeguarding ? 'Immediate Ack Expiry' : `Tier ${pol.level} Overdue Trigger`}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-bold text-stone-900 whitespace-nowrap">
                      {pol.escalateToRole}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-stone-700">
                        {pol.notifyChannels.includes('Email') && (
                          <span
                            title="Email"
                            className="bg-stone-100 p-1 rounded hover:bg-stone-200"
                          >
                            <Mail className="w-3.5 h-3.5 text-stone-700" />
                          </span>
                        )}
                        {pol.notifyChannels.includes('WhatsApp') && (
                          <span
                            title="WhatsApp"
                            className="bg-emerald-100 text-emerald-900 p-1 rounded"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-800" />
                          </span>
                        )}
                        {pol.notifyChannels.includes('In-app') && (
                          <span
                            title="In-app"
                            className="bg-blue-100 text-blue-900 p-1 rounded"
                          >
                            <Bell className="w-3.5 h-3.5 text-blue-700" />
                          </span>
                        )}
                        <span className="text-[11px] text-stone-600">
                          {pol.notifyChannels.join(' + ')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {isSafeguarding ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="text-emerald-800 font-semibold text-[11px]">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
