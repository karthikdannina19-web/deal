"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, Settings, Share2, Search, ArrowRight, Loader2, Save, 
  Download, CheckCircle, RefreshCw, Network
} from 'lucide-react';
import { cn } from "@/utils/cn";

export default function ReferralsDashboard() {
  const defaultSettings = {
    coinsPerReferral: 50,
    coinsForReferrer: 500,
    coinsForReferred: 200,
    dailyReferralLimit: 20,
    maxReferralLimit: 100,
    activationCondition: 'signup',
    expiryDays: 365
  };

  const [activeTab, setActiveTab] = useState('settings'); // settings | visualization | logs
  const [isLoading, setIsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Data states
  const [referrals, setReferrals] = useState([]);
  const [referralMappings, setReferralMappings] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);

  // Logs filters & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [logsPage, setLogsPage] = useState(1);
  const [totalPagesLogs, setTotalPagesLogs] = useState(1);

  const fetchReferralData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch settings & logs list
      const res = await fetch(`/api/admin/referrals?page=${logsPage}&limit=10&search=${searchQuery}`, { headers });
      const data = await res.json();
      if (data.success) {
        setReferrals(data.referrals || []);
        if (data.settings) {
          setSettings({ ...defaultSettings, ...data.settings });
        }
        setTotalPagesLogs(data.pagination?.totalPages || 1);
      }

      // Fetch Tree nodes structure
      const treeRes = await fetch('/api/admin/referral-tree', { headers });
      const treeResult = await treeRes.json();
      if (treeResult.success) {
        setReferralMappings(treeResult.mappings || treeResult.trees || []);
      }

    } catch (err) {
      console.error(err);
      setError('Failed to fetch referral network data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [logsPage, searchQuery]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      setSuccessMsg('');

      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/referral/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Referral settings updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  const getUserName = (user, fallback = 'User') => {
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return name || user?.phone || user?.email || fallback;
  };

  const handleExportCSV = () => {
    // Generate CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Referrer,Referrer Code,Referred Friend,Referred Code,Coins Rewarded,Status,Date\n";
    
    referrals.forEach(r => {
      const referrerName = `${r.referrer?.firstName || 'System'} ${r.referrer?.lastName || ''}`.trim();
      const referredName = `${r.referred?.firstName || 'User'} ${r.referred?.lastName || ''}`.trim();
      csvContent += `"${referrerName}","${r.referrer?.referralCode || ''}","${referredName}","${r.referred?.referralCode || ''}",${r.rewardCoins},"${r.status}","${new Date(r.createdAt).toLocaleDateString()}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rhock_referral_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-800 dark:text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <Users className="w-8 h-8 text-amber-500" />
            Referrals Network Panel
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Configure coins economy, visualize invitation structures, and audit signups.</p>
        </div>
        <button 
          onClick={fetchReferralData} 
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4 text-zinc-500", isLoading && "animate-spin")} />
          Reload Panel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto gap-2">
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeTab === 'settings' ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          <Settings size={16} />
          Referral Settings
        </button>
        <button 
          onClick={() => setActiveTab('visualization')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeTab === 'visualization' ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          <Network size={16} />
          Referral Mapping Graph ({referralMappings.length})
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeTab === 'logs' ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          <Share2 size={16} />
          Invitation Logs ({referrals.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h4 className="text-lg font-bold">Referral Economy Parameters</h4>
            {successMsg && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold animate-bounce">
                <CheckCircle size={14} />
                {successMsg}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Coins To Referrer</label>
              <input 
                type="number" 
                value={settings.coinsForReferrer ?? settings.coinsPerReferral ?? 0} 
                onChange={(e) => setSettings({ ...settings, coinsForReferrer: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
              <p className="text-[10px] text-zinc-400">The amount of coins credited to the referrer once the referred friend registers.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Coins To Referred User</label>
              <input 
                type="number" 
                value={settings.coinsForReferred ?? 0} 
                onChange={(e) => setSettings({ ...settings, coinsForReferred: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
              <p className="text-[10px] text-zinc-400">The amount of coins credited to the newly registered user as a signup bonus.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Daily Invites Lock Limit</label>
              <input 
                type="number" 
                value={settings.dailyReferralLimit} 
                onChange={(e) => setSettings({ ...settings, dailyReferralLimit: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
              <p className="text-[10px] text-zinc-400">Anti-abuse threshold: Max referrals awarded per user in a single 24-hour cycle.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Activation Condition Logic</label>
              <select 
                value={settings.activationCondition} 
                onChange={(e) => setSettings({ ...settings, activationCondition: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              >
                <option value="signup">Immediate Signup Reward</option>
                <option value="first_deal">First Merchant Deal Completed</option>
              </select>
              <p className="text-[10px] text-zinc-400">Specifies the milestone that triggers the reward deposit.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Global Bonus Expiry (Days)</label>
              <input 
                type="number" 
                value={settings.expiryDays} 
                onChange={(e) => setSettings({ ...settings, expiryDays: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
              <p className="text-[10px] text-zinc-400">Lifespan of referred coin multipliers prior to deletion/expiry.</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              type="submit" 
              disabled={saveLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {saveLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
              Save Economics Settings
            </button>
          </div>
        </form>
      )}

      {activeTab === 'visualization' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="text-lg font-bold">User Referral Mapping</h4>
              <p className="text-xs text-zinc-500">Each row shows one user and the people directly referred by that user.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Referrers</p>
                <p className="text-lg font-black text-zinc-900 dark:text-zinc-50">{referralMappings.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Links</p>
                <p className="text-lg font-black text-zinc-900 dark:text-zinc-50">
                  {referralMappings.reduce((sum, item) => sum + (item.totalReferrals || item.referredUsers?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950 overflow-hidden p-4 min-h-[320px]">
            {isLoading ? (
              <div className="text-center text-zinc-500 py-16">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                Loading referral mapping...
              </div>
            ) : referralMappings.length === 0 ? (
              <div className="text-center text-zinc-500 space-y-2 py-16">
                <Network className="w-12 h-12 mx-auto text-zinc-350" />
                <p className="font-bold">No referral networks mapped yet.</p>
                <p className="text-xs">Once users invite referred users, the direct mapping will populate here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referralMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Referrer</p>
                        <p className="font-black text-zinc-900 dark:text-zinc-50">{getUserName(mapping.referrer, 'Referrer')}</p>
                        <p className="text-xs text-zinc-500">{mapping.referrer?.phone || mapping.referrer?.email || 'No contact saved'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-lg bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-xs font-bold">
                          {mapping.totalReferrals || mapping.referredUsers?.length || 0} referrals
                        </span>
                        <span className="rounded-lg bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 text-xs font-bold">
                          {mapping.totalCoins || 0} coins
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(mapping.referredUsers || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-zinc-900 dark:text-zinc-50 truncate">
                                {getUserName(item.user, 'Referred user')}
                              </p>
                              <p className="text-xs text-zinc-500 truncate">
                                {item.user?.phone || item.user?.email || item.user?.referralCode || 'No contact saved'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:justify-end">
                            <span className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border",
                              item.status === 'completed' ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            )}>
                              {item.status}
                            </span>
                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                              {item.rewardCoins || 0} Coins
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Controls */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 h-4 text-zinc-400" />
              </span>
              <input
                type="text"
                placeholder="Search referrers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-sm rounded-xl border border-zinc-200 bg-zinc-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {/* CSV Export */}
            <button 
              onClick={handleExportCSV} 
              className="flex items-center gap-2 px-4 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download size={14} />
              Export CSV Ledger
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Referrer User</th>
                  <th className="px-6 py-4">Referred Friend</th>
                  <th className="px-6 py-4">Reward Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date Linked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2" />
                      Loading invitation logs...
                    </td>
                  </tr>
                ) : referrals.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 font-bold">
                      No referral matches found.
                    </td>
                  </tr>
                ) : (
                  referrals.map((r) => (
                    <tr key={r._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900 dark:text-zinc-50">
                          {r.referrer?.firstName} {r.referrer?.lastName}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                          CODE: {r.referrer?.referralCode}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900 dark:text-zinc-50">
                          {r.referred?.firstName} {r.referred?.lastName}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                          CODE: {r.referred?.referralCode}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-black">
                        {r.rewardCoins} Coins
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          r.status === 'completed' ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
                        )}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-sm text-zinc-500">Page {logsPage} of {totalPagesLogs}</p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                disabled={logsPage === 1 || isLoading}
                className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setLogsPage(p => Math.min(totalPagesLogs, p + 1))}
                disabled={logsPage === totalPagesLogs || isLoading}
                className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
