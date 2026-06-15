"use client";

import React, { useEffect, useState } from 'react';
import {
  Coins, Wallet, ArrowUpRight, ArrowDownLeft, Calendar, Loader2,
  Search, ShieldAlert, User, Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle
} from "lucide-react";
import { cn } from "@/utils/cn";

export default function CoinsPage() {
  const [activeTab, setActiveTab] = useState('circulation'); // circulation | redemptions | fraud | transactions
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination states
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [totalPagesRedemptions, setTotalPagesRedemptions] = useState(1);
  const [totalPagesTransactions, setTotalPagesTransactions] = useState(1);

  // Data states
  const [stats, setStats] = useState({ totalRedeemed: 0, pendingRedemption: 0, userCirculation: 0, vendorCirculation: 0, vendorLifetimeRedeemed: 0 });
  const [redemptions, setRedemptions] = useState([]);
  const [walletLogs, setWalletLogs] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState({ highValueAlerts: [], populatedSpikes: [], populatedCodeAlerts: [] });
  const [vendorsList, setVendorsList] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [highValueFilter, setHighValueFilter] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch Vendors List (once)
      if (vendorsList.length === 0) {
        const vRes = await fetch('/api/admin/vendors?limit=1000', { headers });
        const vData = await vRes.json();
        if (vData.success) {
          setVendorsList(vData.vendors || []);
        }
      }

      // Fetch Redemptions & Stats
      const redemptionsRes = await fetch(`/api/admin/redemptions?page=${redemptionsPage}&limit=10&status=${statusFilter}&highValue=${highValueFilter}&vendorId=${selectedVendorId}`, { headers });
      const redData = await redemptionsRes.json();
      if (redData.success) {
        setRedemptions(redData.redemptions || []);
        setStats(redData.stats || { totalRedeemed: 0, pendingRedemption: 0, userCirculation: 0, vendorCirculation: 0, vendorLifetimeRedeemed: 0 });
        setTotalPagesRedemptions(redData.pagination?.totalPages || 1);
      }

      // Fetch Wallet Logs
      const logsRes = await fetch(`/api/admin/wallet/logs?page=${transactionsPage}&limit=10`, { headers });
      const logsData = await logsRes.json();
      if (logsData.success) {
        setWalletLogs(logsData.logs || []);
        setTotalPagesTransactions(logsData.pagination?.totalPages || 1);
      }

      // Fetch Fraud Alerts
      const fraudRes = await fetch('/api/admin/fraud-analysis', { headers });
      const fraudData = await fraudRes.json();
      if (fraudData.success) {
        setFraudAlerts(fraudData.alerts || { highValueAlerts: [], populatedSpikes: [], populatedCodeAlerts: [] });
      }

    } catch (err) {
      console.error(err);
      setError('Failed to fetch coin economy data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [redemptionsPage, transactionsPage, statusFilter, highValueFilter, selectedVendorId]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-800 dark:text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <Coins className="w-8 h-8 text-amber-500 animate-pulse" />
            Coin Economy & Redemption
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Audit transfers, monitor vendor requests, and manage coin distribution.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4 text-zinc-500", isLoading && "animate-spin")} />
          Sync Ledger
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* User Balance */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-zinc-900 dark:to-zinc-800/50 border border-amber-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">User Wallet Circulation</p>
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <Wallet size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-amber-950 dark:text-zinc-50 mt-3">{stats.userCirculation.toLocaleString()} Coins</h3>
          <p className="text-xs text-amber-700 dark:text-zinc-400 mt-1">In active circulation across standard wallets</p>
        </div>

        {/* Vendor Balance */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-zinc-900 dark:to-zinc-800/50 border border-indigo-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">Vendor Coins Redeemed</p>
            <div className="p-2 bg-indigo-500 text-white rounded-xl">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-indigo-950 dark:text-zinc-50 mt-3">{stats.totalRedeemed.toLocaleString()} Coins</h3>
          <p className="text-xs text-indigo-700 dark:text-zinc-400 mt-1">Successfully claimed and cleared by merchants</p>
        </div>

        {/* Pending Approval */}
        <div className="bg-gradient-to-br from-amber-50/50 to-amber-100/20 dark:from-zinc-900 dark:to-zinc-800/50 border border-yellow-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider">Redemptions Pending</p>
            <div className="p-2 bg-yellow-500 text-white rounded-xl">
              <Clock size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-yellow-950 dark:text-zinc-50 mt-3">{stats.pendingRedemption.toLocaleString()} Coins</h3>
          <p className="text-xs text-yellow-700 dark:text-zinc-400 mt-1">Locked coins awaiting user approve/reject</p>
        </div>

        {/* Total Minted */}
        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Platform Circulation</p>
            <div className="p-2 bg-zinc-600 text-white rounded-xl">
              <Coins size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-3">{(stats.userCirculation + stats.totalRedeemed).toLocaleString()} Coins</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Combined aggregate coin value minted</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('circulation')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap",
            activeTab === 'circulation' ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          Circulation Dashboard
        </button>
        <button
          onClick={() => setActiveTab('redemptions')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap",
            activeTab === 'redemptions' ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          Vendor Redemptions ({redemptions.length})
        </button>
        <button
          onClick={() => setActiveTab('fraud')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeTab === 'fraud' ? "border-red-500 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          Fraud Scanner
          {(fraudAlerts.highValueAlerts.length > 0 || fraudAlerts.populatedSpikes.length > 0) && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap",
            activeTab === 'transactions' ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          Transactions Ledger
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'circulation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Economy Flow chart preview */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              Coin Allocation Structure
            </h4>
            <div className="mt-8 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>User Wallet Reserves</span>
                  <span>{Math.round((stats.userCirculation / (stats.userCirculation + stats.totalRedeemed || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(stats.userCirculation / (stats.userCirculation + stats.totalRedeemed || 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Vendor Redemptions Cleared</span>
                  <span>{Math.round((stats.totalRedeemed / (stats.userCirculation + stats.totalRedeemed || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(stats.totalRedeemed / (stats.userCirculation + stats.totalRedeemed || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <strong>Platform Notice:</strong> Every coin redemption triggers a double-entry debit of User wallets and a credit of Vendor balances. Coins cannot be created or deleted during this process, maintaining a perfectly balanced circulation ledger.
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
            <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Ledger Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-150 dark:border-zinc-800">
                <p className="text-xs text-zinc-400 uppercase tracking-widest font-black">Cleared Redemptions</p>
                <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mt-2">{redemptions.filter(r => r.status === 'APPROVED').length}</p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-150 dark:border-zinc-800">
                <p className="text-xs text-zinc-400 uppercase tracking-widest font-black">Rejected Attempts</p>
                <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mt-2">{redemptions.filter(r => r.status === 'REJECTED').length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'redemptions' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Controls */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('')}
                className={cn("px-3 py-1 text-xs font-bold rounded-lg border", !statusFilter ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-white border-zinc-200 text-zinc-500")}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={cn("px-3 py-1 text-xs font-bold rounded-lg border", statusFilter === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-white border-zinc-200 text-zinc-500")}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('APPROVED')}
                className={cn("px-3 py-1 text-xs font-bold rounded-lg border", statusFilter === 'APPROVED' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-white border-zinc-200 text-zinc-500")}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('REJECTED')}
                className={cn("px-3 py-1 text-xs font-bold rounded-lg border", statusFilter === 'REJECTED' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-white border-zinc-200 text-zinc-500")}
              >
                Rejected
              </button>
            </div>
            <div className="flex gap-4 items-center flex-wrap">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={highValueFilter}
                  onChange={(e) => setHighValueFilter(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 border-zinc-350 focus:ring-amber-500"
                />
                High Value Only (200+)
              </label>

              <div className="relative">
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
                >
                  <option value="">All Vendors</option>
                  {vendorsList.map(v => (
                    <option key={v._id} value={v._id}>{v.storeName || v.fullName}</option>
                  ))}
                </select>
                <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Vendor specific analytics banner */}
          {selectedVendorId && (
            <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-indigo-500 text-white rounded-md"><Wallet size={14} /></div>
                 <div>
                   <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">
                     Vendor Filter Active: {vendorsList.find(v => v._id === selectedVendorId)?.storeName || 'Selected Merchant'}
                   </p>
                   <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Showing lifetime analytics for this specific merchant</p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Lifetime Cleared</p>
                 <p className="text-lg font-black text-indigo-950 dark:text-indigo-50">{stats.vendorLifetimeRedeemed?.toLocaleString() || 0} Coins</p>
               </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Request Details</th>
                  <th className="px-6 py-4">Participants</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2" />
                      Loading redemptions...
                    </td>
                  </tr>
                ) : redemptions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 font-bold">
                      No redemptions match the filters.
                    </td>
                  </tr>
                ) : (
                  redemptions.map((r) => (
                    <tr key={r._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900 dark:text-zinc-50">Redeem Request</p>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">ID: {r._id.slice(-8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-400 uppercase w-10">User:</span>
                            <span className="text-xs font-bold text-zinc-700">{r.user?.firstName} {r.user?.lastName}</span>
                            <span className="text-[10px] bg-zinc-100 px-1 py-0.5 rounded text-zinc-500 font-bold">{r.userUniqueCode}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-400 uppercase w-10">Vendor:</span>
                            <span className="text-xs font-bold text-zinc-700">{r.vendor?.storeName || 'Merchant'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-zinc-950 dark:text-zinc-100">
                        {r.coinAmount} Coins
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          r.status === 'APPROVED' ? "bg-green-50 text-green-700 border-green-200" :
                            r.status === 'PENDING' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                              "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-sm text-zinc-500">Page {redemptionsPage} of {totalPagesRedemptions}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRedemptionsPage(p => Math.max(1, p - 1))}
                disabled={redemptionsPage === 1 || isLoading}
                className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setRedemptionsPage(p => Math.min(totalPagesRedemptions, p + 1))}
                disabled={redemptionsPage === totalPagesRedemptions || isLoading}
                className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fraud' && (
        <div className="space-y-6">
          {/* Section 1: High Value Scans */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              High Value Redeems (500+ Coins)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-400 text-xs">
                    <th className="py-2">User</th>
                    <th className="py-2">Code Used</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Merchant</th>
                    <th className="py-2">Threat Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {fraudAlerts.highValueAlerts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-zinc-500 text-xs">No high value flags detected in this period.</td>
                    </tr>
                  ) : (
                    fraudAlerts.highValueAlerts.map(alert => (
                      <tr key={alert._id} className="text-xs hover:bg-zinc-50">
                        <td className="py-3 font-bold">{alert.user?.firstName} {alert.user?.lastName}</td>
                        <td className="py-3 text-zinc-500 font-mono">{alert.userUniqueCode}</td>
                        <td className="py-3 text-red-600 font-bold">{alert.coinAmount} Coins</td>
                        <td className="py-3 font-semibold">{alert.vendor?.storeName}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px] uppercase">Review Wallet</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Rapid Spikes */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Spike Warnings (5+ redemptions in 24h)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-400 text-xs">
                    <th className="py-2">User</th>
                    <th className="py-2">Total Requests</th>
                    <th className="py-2">Total Volume</th>
                    <th className="py-2">Threat Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {fraudAlerts.populatedSpikes.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-4 text-center text-zinc-500 text-xs">No transaction frequency anomalies.</td>
                    </tr>
                  ) : (
                    fraudAlerts.populatedSpikes.map(alert => (
                      <tr key={alert.user?._id} className="text-xs hover:bg-zinc-50">
                        <td className="py-3 font-bold">{alert.user?.firstName} {alert.user?.lastName}</td>
                        <td className="py-3 text-amber-600 font-black">{alert.count} Requests</td>
                        <td className="py-3 text-zinc-900 dark:text-zinc-50 font-bold">{alert.totalCoins} Coins</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-bold text-[10px] uppercase">Suspicious Frequency</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Participant</th>
                  <th className="px-6 py-4">Transaction Details</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Balance Before</th>
                  <th className="px-6 py-4">Balance After</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-zinc-500">
                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2" />
                      Loading transactions...
                    </td>
                  </tr>
                ) : walletLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 font-bold">
                      No system transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  walletLogs.map((tx) => (
                    <tr key={tx._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold">
                        {tx.user?.firstName} {tx.user?.lastName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            tx.type === 'credit' ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
                          )}>
                            {tx.type === 'credit' ? '+' : '-'}
                          </div>
                          <div>
                            <p className="font-bold capitalize">{tx.transactionType.toLowerCase().replace('_', ' ')}</p>
                            <p className="text-[9px] text-zinc-400 tracking-wider">REF: {tx._id.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black">
                        {tx.amount} Coins
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-semibold">{tx.balanceBefore}</td>
                      <td className="px-6 py-4 text-zinc-900 dark:text-zinc-50 font-bold">{tx.balanceAfter}</td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-sm text-zinc-500">Page {transactionsPage} of {totalPagesTransactions}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                disabled={transactionsPage === 1 || isLoading}
                className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setTransactionsPage(p => Math.min(totalPagesTransactions, p + 1))}
                disabled={transactionsPage === totalPagesTransactions || isLoading}
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
