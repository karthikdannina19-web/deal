"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Coins, Wallet, ArrowUpRight, ArrowDownLeft, Calendar, Loader2,
  Search, ShieldAlert, User, Clock, CheckCircle2, XCircle, RefreshCw,
  AlertTriangle, Store, ChevronRight, X, TrendingUp, ArrowLeft,
  Filter, BarChart3, History, Eye, Hash, Phone, Mail, MapPin,
  ChevronDown
} from "lucide-react";
import { cn } from "@/utils/cn";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const fmtDateTime = (d) => `${fmtDate(d)} · ${fmtTime(d)}`;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatusBadge = ({ status }) => {
  const s = String(status).toUpperCase();
  const isApproved = ['APPROVED','SUCCESS'].includes(s);
  const isPending  = ['PENDING','OTP_PENDING'].includes(s);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
      isApproved ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
        : isPending ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
    )}>
      {isApproved ? <CheckCircle2 size={9}/> : isPending ? <Clock size={9}/> : <XCircle size={9}/>}
      {status}
    </span>
  );
};

// ─── Vendor History Modal ─────────────────────────────────────────────────────

function VendorHistoryModal({ vendorId, vendorName, onClose, token }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `/api/admin/vendors/${vendorId}/redemptions?page=${page}&limit=15&status=${statusFilter}`,
        { headers }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load vendor history');
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [vendorId, page, statusFilter, token]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const stats = data?.stats;
  const vendor = data?.vendor;
  const redemptions = data?.redemptions || [];
  const pagination = data?.pagination;
  const monthly = data?.monthlyBreakdown || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-indigo-50 to-indigo-100/30 dark:from-zinc-900 dark:to-zinc-800/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-md">
              <Store size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Vendor Redemption History</p>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 leading-tight">
                {vendor?.storeName || vendorName || 'Loading…'}
              </h3>
              {vendor?.fullAddress && (
                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {vendor.fullAddress}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
          >
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-zinc-500 font-semibold">Loading lifetime history…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <p className="text-sm text-red-500 font-semibold">{error}</p>
              <button
                onClick={fetchHistory}
                className="px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {data && (
            <>
              {/* ── Vendor Info Row ── */}
              {vendor && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {vendor.email && (
                    <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <Mail size={14} className="text-zinc-400 shrink-0"/>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Email</p>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{vendor.email}</p>
                      </div>
                    </div>
                  )}
                  {vendor.mobileNumber && (
                    <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <Phone size={14} className="text-zinc-400 shrink-0"/>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Mobile</p>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{vendor.mobileNumber}</p>
                      </div>
                    </div>
                  )}
                  {vendor.location?.district && (
                    <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <MapPin size={14} className="text-zinc-400 shrink-0"/>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Location</p>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {[vendor.location.mandal, vendor.location.district, vendor.location.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Stats Cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-zinc-800 dark:to-zinc-900 border border-indigo-200 dark:border-zinc-700 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Lifetime Coins</p>
                  <p className="text-2xl font-black text-indigo-950 dark:text-zinc-50 mt-1">{stats.totalLifetimeCoins.toLocaleString()}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">All-time total</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/30 dark:from-zinc-800 dark:to-zinc-900 border border-green-200 dark:border-zinc-700 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">Approved</p>
                  <p className="text-2xl font-black text-green-950 dark:text-zinc-50 mt-1">{stats.approved.coins.toLocaleString()}</p>
                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">{stats.approved.count} transactions</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/30 dark:from-zinc-800 dark:to-zinc-900 border border-yellow-200 dark:border-zinc-700 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">Pending</p>
                  <p className="text-2xl font-black text-yellow-950 dark:text-zinc-50 mt-1">{stats.pending.coins.toLocaleString()}</p>
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending.count} transactions</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100/30 dark:from-zinc-800 dark:to-zinc-900 border border-red-200 dark:border-zinc-700 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Rejected</p>
                  <p className="text-2xl font-black text-red-950 dark:text-zinc-50 mt-1">{stats.rejected.coins.toLocaleString()}</p>
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">{stats.rejected.count} transactions</p>
                </div>
              </div>

              {/* ── Monthly Breakdown (last 12m) ── */}
              {monthly.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
                  <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <BarChart3 size={15} className="text-indigo-500" />
                    Monthly Approved Redemptions (Last 12 Months)
                  </h4>
                  <div className="flex items-end gap-2 h-24 overflow-x-auto pb-2">
                    {(() => {
                      const maxCoins = Math.max(...monthly.map(m => m.totalCoins), 1);
                      return monthly.map((m, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[40px]">
                          <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">
                            {m.totalCoins >= 1000 ? `${(m.totalCoins/1000).toFixed(1)}k` : m.totalCoins}
                          </span>
                          <div className="w-8 bg-indigo-100 dark:bg-zinc-800 rounded-t-md overflow-hidden" style={{ height: '56px' }}>
                            <div
                              className="w-full bg-indigo-500 rounded-t-md transition-all duration-700"
                              style={{ height: `${Math.max((m.totalCoins / maxCoins) * 100, 4)}%`, marginTop: `${100 - Math.max((m.totalCoins / maxCoins) * 100, 4)}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-zinc-400 font-semibold whitespace-nowrap">
                            {MONTH_NAMES[(m._id.month - 1)]}'{String(m._id.year).slice(2)}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* ── Redemption History Table ── */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                {/* Table Controls */}
                <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-2 items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-zinc-400" />
                    <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                      Transaction History
                      {pagination && <span className="text-zinc-400 font-semibold ml-1">({pagination.total} total)</span>}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {['', 'APPROVED', 'PENDING', 'REJECTED'].map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setPage(1); }}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all",
                          statusFilter === s
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700"
                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800"
                        )}
                      >
                        {s || 'All'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50/70 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                      <tr>
                        <th className="px-5 py-3">#</th>
                        <th className="px-5 py-3">Transaction ID</th>
                        <th className="px-5 py-3">Customer</th>
                        <th className="px-5 py-3">Redeem Code</th>
                        <th className="px-5 py-3">Coins</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 whitespace-nowrap">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center">
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mx-auto mb-2" />
                            <span className="text-xs text-zinc-500">Updating…</span>
                          </td>
                        </tr>
                      ) : redemptions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center">
                            <History size={24} className="text-zinc-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-zinc-500">No redemptions found for this filter.</p>
                          </td>
                        </tr>
                      ) : redemptions.map((r, idx) => {
                        const rowNum = (page - 1) * 15 + idx + 1;
                        const isApproved = ['APPROVED','success'].includes(r.status);
                        return (
                          <tr
                            key={r._id}
                            className="hover:bg-indigo-50/40 dark:hover:bg-zinc-800/40 transition-colors group"
                          >
                            <td className="px-5 py-3.5 text-xs font-black text-zinc-400">
                              {rowNum}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-[10px] font-black text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                #{r._id.slice(-10).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                  {r.user?.firstName?.[0] || '?'}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                    {r.user?.firstName} {r.user?.lastName}
                                  </p>
                                  {r.user?.email && (
                                    <p className="text-[10px] text-zinc-400">{r.user.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                                {r.userUniqueCode}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={cn(
                                "text-sm font-black",
                                isApproved ? "text-green-700 dark:text-green-400" : "text-zinc-900 dark:text-zinc-100"
                              )}>
                                {r.coinAmount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-zinc-400 ml-1">coins</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={r.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                  {fmtDate(r.createdAt)}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-semibold whitespace-nowrap">
                                  {fmtTime(r.createdAt)}
                                </span>
                                {r.approvedAt && (
                                  <span className="text-[9px] text-green-600 font-bold whitespace-nowrap">
                                    ✓ Approved {fmtDate(r.approvedAt)}
                                  </span>
                                )}
                                {r.rejectedAt && (
                                  <span className="text-[9px] text-red-500 font-bold whitespace-nowrap">
                                    ✗ Rejected {fmtDate(r.rejectedAt)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
                    <p className="text-xs text-zinc-500">
                      Page <span className="font-black text-zinc-700 dark:text-zinc-300">{page}</span> of {pagination.totalPages}
                      <span className="ml-2 text-zinc-400">· {pagination.total} records</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-600 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages || loading}
                        className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-600 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vendor Search Selector ───────────────────────────────────────────────────

function VendorSearchSelector({ vendorsList, selectedVendorId, onSelect, onView }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const filtered = search.trim()
    ? vendorsList.filter(v =>
        (v.storeName || v.fullName || '').toLowerCase().includes(search.toLowerCase())
      )
    : vendorsList;

  const selectedVendor = vendorsList.find(v => v._id === selectedVendorId);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Dropdown */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setIsOpen(o => !o)}
          className="flex items-center gap-2 pl-3 pr-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[180px] max-w-[240px]"
        >
          <Store size={13} className="text-zinc-400 shrink-0" />
          <span className="truncate flex-1 text-left">
            {selectedVendor ? (selectedVendor.storeName || selectedVendor.fullName) : 'All Vendors'}
          </span>
          <ChevronDown size={12} className={cn("text-zinc-400 shrink-0 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Search input */}
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search vendors…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200"
                />
              </div>
            </div>
            {/* Options */}
            <div className="max-h-52 overflow-y-auto">
              <button
                onClick={() => { onSelect(''); setIsOpen(false); setSearch(''); }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2",
                  !selectedVendorId ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10" : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                <Store size={12} className="text-zinc-400" />
                All Vendors
              </button>
              {filtered.length === 0 && (
                <p className="px-4 py-3 text-xs text-zinc-400 text-center">No vendors found</p>
              )}
              {filtered.map(v => (
                <button
                  key={v._id}
                  onClick={() => { onSelect(v._id); setIsOpen(false); setSearch(''); }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2",
                    selectedVendorId === v._id ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""
                  )}
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[9px] font-black shrink-0">
                    {(v.storeName || v.fullName || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-bold truncate", selectedVendorId === v._id ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-800 dark:text-zinc-200")}>
                      {v.storeName || v.fullName}
                    </p>
                    {v.location?.district && (
                      <p className="text-[10px] text-zinc-400 truncate">{v.location.district}</p>
                    )}
                  </div>
                  {selectedVendorId === v._id && <CheckCircle2 size={12} className="text-indigo-500 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View History button - visible only when vendor is selected */}
      {selectedVendorId && (
        <button
          onClick={onView}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-400 shadow-sm active:scale-95 transition-all"
        >
          <Eye size={13} />
          View Full History
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoinsPage() {
  const [activeTab, setActiveTab] = useState('circulation');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [totalPagesRedemptions, setTotalPagesRedemptions] = useState(1);
  const [totalPagesTransactions, setTotalPagesTransactions] = useState(1);

  // Data
  const [stats, setStats] = useState({ totalRedeemed: 0, pendingRedemption: 0, userCirculation: 0, vendorCirculation: 0, vendorLifetimeRedeemed: 0 });
  const [redemptions, setRedemptions] = useState([]);
  const [walletLogs, setWalletLogs] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState({ highValueAlerts: [], populatedSpikes: [], populatedCodeAlerts: [] });
  const [vendorsList, setVendorsList] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [highValueFilter, setHighValueFilter] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Vendor History Modal
  const [historyModalVendorId, setHistoryModalVendorId] = useState(null);
  const [historyModalVendorName, setHistoryModalVendorName] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (vendorsList.length === 0) {
        const vRes = await fetch('/api/admin/vendors?limit=1000', { headers });
        const vData = await vRes.json();
        if (vData.success) setVendorsList(vData.vendors || []);
      }

      const redemptionsRes = await fetch(
        `/api/admin/redemptions?page=${redemptionsPage}&limit=10&status=${statusFilter}&highValue=${highValueFilter}&vendorId=${selectedVendorId}`,
        { headers }
      );
      const redData = await redemptionsRes.json();
      if (redData.success) {
        setRedemptions(redData.redemptions || []);
        setStats(redData.stats || { totalRedeemed: 0, pendingRedemption: 0, userCirculation: 0, vendorCirculation: 0, vendorLifetimeRedeemed: 0 });
        setTotalPagesRedemptions(redData.pagination?.totalPages || 1);
      }

      const logsRes = await fetch(`/api/admin/wallet/logs?page=${transactionsPage}&limit=10`, { headers });
      const logsData = await logsRes.json();
      if (logsData.success) {
        setWalletLogs(logsData.logs || []);
        setTotalPagesTransactions(logsData.pagination?.totalPages || 1);
      }

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

  const combinedVendorsList = React.useMemo(() => {
    const list = [...vendorsList];
    redemptions.forEach(r => {
      if (r.vendor && r.vendor._id) {
        if (!list.some(v => v._id === r.vendor._id)) {
          list.push({
            _id: r.vendor._id,
            storeName: r.vendor.storeName || 'Merchant',
            fullName: r.vendor.fullName || '',
            location: r.vendor.location || {}
          });
        }
      }
    });
    return list;
  }, [vendorsList, redemptions]);

  const openVendorHistory = () => {
    const v = combinedVendorsList.find(v => v._id === selectedVendorId);
    setHistoryModalVendorId(selectedVendorId);
    setHistoryModalVendorName(v?.storeName || v?.fullName || 'Vendor');
  };

  return (
    <>
      {/* ── Vendor History Modal ── */}
      {historyModalVendorId && (
        <VendorHistoryModal
          vendorId={historyModalVendorId}
          vendorName={historyModalVendorName}
          token={token}
          onClose={() => setHistoryModalVendorId(null)}
        />
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-800 dark:text-zinc-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
              <Coins className="w-8 h-8 text-amber-500 animate-pulse" />
              Coin Economy &amp; Redemption
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
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-zinc-900 dark:to-zinc-800/50 border border-amber-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">User Wallet Circulation</p>
              <div className="p-2 bg-amber-500 text-white rounded-xl"><Wallet size={16} /></div>
            </div>
            <h3 className="text-3xl font-black text-amber-950 dark:text-zinc-50 mt-3">{stats.userCirculation.toLocaleString()} Coins</h3>
            <p className="text-xs text-amber-700 dark:text-zinc-400 mt-1">In active circulation across standard wallets</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-zinc-900 dark:to-zinc-800/50 border border-indigo-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">Vendor Coins Redeemed</p>
              <div className="p-2 bg-indigo-500 text-white rounded-xl"><CheckCircle2 size={16} /></div>
            </div>
            <h3 className="text-3xl font-black text-indigo-950 dark:text-zinc-50 mt-3">{stats.totalRedeemed.toLocaleString()} Coins</h3>
            <p className="text-xs text-indigo-700 dark:text-zinc-400 mt-1">Successfully claimed and cleared by merchants</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50/50 to-amber-100/20 dark:from-zinc-900 dark:to-zinc-800/50 border border-yellow-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider">Redemptions Pending</p>
              <div className="p-2 bg-yellow-500 text-white rounded-xl"><Clock size={16} /></div>
            </div>
            <h3 className="text-3xl font-black text-yellow-950 dark:text-zinc-50 mt-3">{stats.pendingRedemption.toLocaleString()} Coins</h3>
            <p className="text-xs text-yellow-700 dark:text-zinc-400 mt-1">Locked coins awaiting user approve/reject</p>
          </div>

          <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Platform Circulation</p>
              <div className="p-2 bg-zinc-600 text-white rounded-xl"><Coins size={16} /></div>
            </div>
            <h3 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-3">{(stats.userCirculation + stats.totalRedeemed).toLocaleString()} Coins</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Combined aggregate coin value minted</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto gap-2">
          {[
            { key: 'circulation', label: 'Circulation Dashboard' },
            { key: 'redemptions', label: `Vendor Redemptions (${redemptions.length})` },
            { key: 'fraud', label: 'Fraud Scanner', hasDot: fraudAlerts.highValueAlerts.length > 0 || fraudAlerts.populatedSpikes.length > 0 },
            { key: 'transactions', label: 'Transactions Ledger' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
                activeTab === tab.key
                  ? tab.key === 'fraud' ? "border-red-500 text-red-600" : "border-amber-500 text-amber-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              )}
            >
              {tab.label}
              {tab.hasDot && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
            </button>
          ))}
        </div>

        {/* ── Tab: Circulation ── */}
        {activeTab === 'circulation' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${(stats.userCirculation / (stats.userCirculation + stats.totalRedeemed || 1)) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Vendor Redemptions Cleared</span>
                    <span>{Math.round((stats.totalRedeemed / (stats.userCirculation + stats.totalRedeemed || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${(stats.totalRedeemed / (stats.userCirculation + stats.totalRedeemed || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  <strong>Platform Notice:</strong> Every coin redemption triggers a double-entry debit of User wallets and a credit of Vendor balances.
                  Coins cannot be created or deleted during this process, maintaining a perfectly balanced circulation ledger.
                </p>
              </div>
            </div>

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

        {/* ── Tab: Redemptions ── */}
        {activeTab === 'redemptions' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Controls */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
              {/* Status Filters */}
              <div className="flex gap-2 flex-wrap">
                {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg border",
                      statusFilter === s ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                    )}
                  >
                    {s || 'All'}
                  </button>
                ))}
              </div>

              {/* Right-side controls */}
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

                {/* Vendor Search Selector */}
                <VendorSearchSelector
                  vendorsList={combinedVendorsList}
                  selectedVendorId={selectedVendorId}
                  onSelect={(id) => { setSelectedVendorId(id); setRedemptionsPage(1); }}
                  onView={openVendorHistory}
                />
              </div>
            </div>

            {/* Vendor-specific banner */}
            {selectedVendorId && (
              <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-500 text-white rounded-md"><Store size={14} /></div>
                  <div>
                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">
                      Vendor Filter Active: {combinedVendorsList.find(v => v._id === selectedVendorId)?.storeName || 'Selected Merchant'}
                    </p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Showing filtered redemptions. Click "View Full History" for detailed A-Z lifetime report.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Lifetime Cleared</p>
                    <p className="text-lg font-black text-indigo-950 dark:text-indigo-50">{stats.vendorLifetimeRedeemed?.toLocaleString() || 0} Coins</p>
                  </div>
                  <button
                    onClick={openVendorHistory}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-md active:scale-95 transition-all"
                  >
                    <Eye size={13} />
                    Full History
                  </button>
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
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{r.user?.firstName} {r.user?.lastName}</span>
                              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-500 font-bold">{r.userUniqueCode}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-zinc-400 uppercase w-10">Vendor:</span>
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{r.vendor?.storeName || 'Merchant'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-zinc-950 dark:text-zinc-100">
                          {r.coinAmount} Coins
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-6 py-4 text-zinc-500 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} />
                              <span className="font-semibold">{fmtDate(r.createdAt)}</span>
                            </div>
                            <span className="text-zinc-400">{fmtTime(r.createdAt)}</span>
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
                >Previous</button>
                <button
                  onClick={() => setRedemptionsPage(p => Math.min(totalPagesRedemptions, p + 1))}
                  disabled={redemptionsPage === totalPagesRedemptions || isLoading}
                  className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
                >Next</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Fraud ── */}
        {activeTab === 'fraud' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                High Value Redeems (500+ Coins)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 text-xs">
                      <th className="py-2">User</th><th className="py-2">Code Used</th>
                      <th className="py-2">Amount</th><th className="py-2">Merchant</th>
                      <th className="py-2">Threat Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {fraudAlerts.highValueAlerts.length === 0 ? (
                      <tr><td colSpan="5" className="py-4 text-center text-zinc-500 text-xs">No high value flags detected in this period.</td></tr>
                    ) : fraudAlerts.highValueAlerts.map(alert => (
                      <tr key={alert._id} className="text-xs hover:bg-zinc-50">
                        <td className="py-3 font-bold">{alert.user?.firstName} {alert.user?.lastName}</td>
                        <td className="py-3 text-zinc-500 font-mono">{alert.userUniqueCode}</td>
                        <td className="py-3 text-red-600 font-bold">{alert.coinAmount} Coins</td>
                        <td className="py-3 font-semibold">{alert.vendor?.storeName}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px] uppercase">Review Wallet</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Spike Warnings (5+ redemptions in 24h)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 text-xs">
                      <th className="py-2">User</th><th className="py-2">Total Requests</th>
                      <th className="py-2">Total Volume</th><th className="py-2">Threat Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {fraudAlerts.populatedSpikes.length === 0 ? (
                      <tr><td colSpan="4" className="py-4 text-center text-zinc-500 text-xs">No transaction frequency anomalies.</td></tr>
                    ) : fraudAlerts.populatedSpikes.map(alert => (
                      <tr key={alert.user?._id} className="text-xs hover:bg-zinc-50">
                        <td className="py-3 font-bold">{alert.user?.firstName} {alert.user?.lastName}</td>
                        <td className="py-3 text-amber-600 font-black">{alert.count} Requests</td>
                        <td className="py-3 text-zinc-900 dark:text-zinc-50 font-bold">{alert.totalCoins} Coins</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-bold text-[10px] uppercase">Suspicious Frequency</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Transactions ── */}
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
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-zinc-500">
                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2" />
                      Loading transactions...
                    </td></tr>
                  ) : walletLogs.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-zinc-500 font-bold">No system transactions logged yet.</td></tr>
                  ) : walletLogs.map((tx) => (
                    <tr key={tx._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold">{tx.user?.firstName} {tx.user?.lastName}</td>
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
                      <td className="px-6 py-4 font-black">{tx.amount} Coins</td>
                      <td className="px-6 py-4 text-zinc-500 font-semibold">{tx.balanceBefore}</td>
                      <td className="px-6 py-4 text-zinc-900 dark:text-zinc-50 font-bold">{tx.balanceAfter}</td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">{fmtDate(tx.createdAt)}</span>
                          <span className="text-zinc-400">{fmtTime(tx.createdAt)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <p className="text-sm text-zinc-500">Page {transactionsPage} of {totalPagesTransactions}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                  disabled={transactionsPage === 1 || isLoading}
                  className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
                >Previous</button>
                <button
                  onClick={() => setTransactionsPage(p => Math.min(totalPagesTransactions, p + 1))}
                  disabled={transactionsPage === totalPagesTransactions || isLoading}
                  className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
                >Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
