"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Send, Users, UserCheck, Image as ImageIcon, Info,
  CheckCircle2, AlertCircle, Loader2, History, Calendar,
  ExternalLink, MapPin, Globe, Map, Navigation, X
} from "lucide-react";
import { notificationService } from "@/services/admin/notification.service";
import { motion, AnimatePresence } from "framer-motion";

/* ────────────────────────────────────────
   Location data helpers
──────────────────────────────────────── */
async function fetchStates() {
  const res = await fetch('/api/locations/states');
  const data = await res.json();
  return data.data || [];
}
async function fetchDistricts(stateId) {
  const res = await fetch(`/api/locations/districts?stateId=${stateId}`);
  const data = await res.json();
  return data.data || [];
}
async function fetchMandals(districtId) {
  const res = await fetch(`/api/locations/mandals?districtId=${districtId}`);
  const data = await res.json();
  return data.data || [];
}

const SCOPE_OPTIONS = [
  { value: 'all',      label: 'All Users',   icon: Globe,      color: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-500' },
  { value: 'state',    label: 'By State',    icon: Map,        color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  { value: 'district', label: 'By District', icon: Navigation, color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { value: 'mandal',   label: 'By Mandal',   icon: MapPin,     color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
];

const NOTIFICATION_TYPES = [
  { value: 'welcome', label: 'Welcome' }, { value: 'flash_deal', label: 'Flash Deal' },
  { value: 'coins_earned', label: 'Coins Earned' }, { value: 'store_update', label: 'Store Update' },
  { value: 'offer_expiring', label: 'Offer Expiring' }, { value: 'cashback', label: 'Cashback' },
  { value: 'referral_bonus', label: 'Referral Bonus' }, { value: 'deal_reminder', label: 'Deal Reminder' },
  { value: 'profile_updated', label: 'Profile Updated' }, { value: 'daily_checkin', label: 'Daily Check-in' },
  { value: 'nearby_store', label: 'Nearby Store' }, { value: 'order_reward', label: 'Order Reward' },
  { value: 'survey', label: 'Survey' }, { value: 'security', label: 'Security' },
  { value: 'food_offer', label: 'Food Offer' },
];

const EMPTY_FORM = {
  title: '', body: '', type: 'welcome', targetType: 'all',
  imageUrl: '', actionType: 'none', actionTarget: '',
  visibilityScope: 'all', stateId: '', districtId: '', mandalId: '',
};

/* ────────────────────────────────────────
   LocationPicker sub-component
──────────────────────────────────────── */
function LocationPicker({ scope, stateId, districtId, mandalId, onStateChange, onDistrictChange, onMandalChange }) {
  const [states, setStates]     = useState([]);
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals]   = useState([]);
  const [busy, setBusy]         = useState({ states: false, districts: false, mandals: false });

  useEffect(() => {
    setBusy(p => ({ ...p, states: true }));
    fetchStates().then(setStates).finally(() => setBusy(p => ({ ...p, states: false })));
  }, []);

  useEffect(() => {
    if (!stateId) { setDistricts([]); setMandals([]); return; }
    setBusy(p => ({ ...p, districts: true }));
    fetchDistricts(stateId).then(setDistricts).finally(() => setBusy(p => ({ ...p, districts: false })));
    setMandals([]);
  }, [stateId]);

  useEffect(() => {
    if (!districtId) { setMandals([]); return; }
    setBusy(p => ({ ...p, mandals: true }));
    fetchMandals(districtId).then(setMandals).finally(() => setBusy(p => ({ ...p, mandals: false })));
  }, [districtId]);

  const sel = "w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white";

  return (
    <AnimatePresence>
      {scope !== 'all' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden space-y-3 mt-3"
        >
          {/* State */}
          <div className="relative">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Select State</label>
            <select required value={stateId} onChange={e => onStateChange(e.target.value)} className={sel}>
              <option value="">{busy.states ? 'Loading…' : '— Choose a State —'}</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {busy.states && <Loader2 size={14} className="absolute right-3 bottom-3.5 animate-spin text-zinc-400" />}
          </div>

          {/* District */}
          {(scope === 'district' || scope === 'mandal') && (
            <div className="relative">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Select District</label>
              <select required value={districtId} onChange={e => onDistrictChange(e.target.value)} disabled={!stateId} className={sel + (!stateId ? ' opacity-40 cursor-not-allowed' : '')}>
                <option value="">{busy.districts ? 'Loading…' : '— Choose a District —'}</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {busy.districts && <Loader2 size={14} className="absolute right-3 bottom-3.5 animate-spin text-zinc-400" />}
            </div>
          )}

          {/* Mandal */}
          {scope === 'mandal' && (
            <div className="relative">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Select Mandal</label>
              <select required value={mandalId} onChange={e => onMandalChange(e.target.value)} disabled={!districtId} className={sel + (!districtId ? ' opacity-40 cursor-not-allowed' : '')}>
                <option value="">{busy.mandals ? 'Loading…' : '— Choose a Mandal —'}</option>
                {mandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {busy.mandals && <Loader2 size={14} className="absolute right-3 bottom-3.5 animate-spin text-zinc-400" />}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────────────
   ScopeBadge — for history table
──────────────────────────────────────── */
function ScopeBadge({ item }) {
  const scope = item.visibilityScope || 'all';
  const opt = SCOPE_OPTIONS.find(o => o.value === scope) || SCOPE_OPTIONS[0];
  const Icon = opt.icon;
  let label = opt.label;
  if (scope === 'state'    && item.stateId?.name)    label = item.stateId.name;
  if (scope === 'district' && item.districtId?.name) label = item.districtId.name;
  if (scope === 'mandal'   && item.mandalId?.name)   label = item.mandalId.name;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${opt.color}`}>
      <Icon size={12} />
      {label}
    </div>
  );
}

/* ────────────────────────────────────────
   Main Page
──────────────────────────────────────── */
export default function NotificationsPage() {
  const [loading, setLoading]         = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [success, setSuccess]         = useState(null);
  const [error, setError]             = useState(null);
  const [history, setHistory]         = useState([]);
  const [formData, setFormData]       = useState(EMPTY_FORM);

  const patch = (updates) => setFormData(f => ({ ...f, ...updates }));

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await notificationService.getBroadcastHistory();
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate location selection
    if (formData.visibilityScope === 'state' && !formData.stateId) {
      setError('Please select a State to target.');
      setLoading(false);
      return;
    }
    if (formData.visibilityScope === 'district' && (!formData.stateId || !formData.districtId)) {
      setError('Please select both State and District.');
      setLoading(false);
      return;
    }
    if (formData.visibilityScope === 'mandal' && (!formData.stateId || !formData.districtId || !formData.mandalId)) {
      setError('Please select State, District, and Mandal.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: formData.title,
        body: formData.body,
        type: formData.type,
        targetType: formData.targetType,
        imageUrl: formData.imageUrl || null,
        action: formData.actionType !== 'none'
          ? { type: formData.actionType, target: formData.actionTarget, params: {} }
          : { type: 'none' },
        // Location targeting
        visibilityScope: formData.visibilityScope,
        stateId: formData.stateId || null,
        districtId: formData.districtId || null,
        mandalId: formData.mandalId || null,
      };

      const result = await notificationService.sendBroadcast(payload);
      setSuccess(result.message || `Sent to ${result.data?.totalNotified ?? '–'} users`);
      setFormData(EMPTY_FORM);
      fetchHistory();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  /* Scope label for live preview */
  const scopeLabel = SCOPE_OPTIONS.find(o => o.value === formData.visibilityScope)?.label || 'All Users';

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* ── Header ── */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Broadcast Notifications</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Send targeted alerts to users by location — state, district, or mandal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Form ── */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-6">

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Notification Title</label>
              <input
                type="text" required
                placeholder="e.g. Weekend Flash Sale! ⚡"
                value={formData.title}
                onChange={e => patch({ title: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Message Body</label>
              <textarea
                required rows="3"
                placeholder="Tell your users what's happening..."
                value={formData.body}
                onChange={e => patch({ body: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium resize-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
              />
            </div>

            {/* Category + User Target */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Category Type</label>
                <select
                  value={formData.type}
                  onChange={e => patch({ type: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white"
                >
                  {NOTIFICATION_TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-white dark:bg-zinc-900">{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">User Filter</label>
                <select
                  value={formData.targetType}
                  onChange={e => patch({ targetType: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white"
                >
                  <option value="all" className="bg-white dark:bg-zinc-900">All Users</option>
                  <option value="login_only" className="bg-white dark:bg-zinc-900">Active Login Users</option>
                </select>
              </div>
            </div>

            {/* ── Location Scope ── */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-800/20">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-admin-primary" />
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Location Targeting</h3>
                <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Who receives this?
                </span>
              </div>

              {/* Scope selector pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SCOPE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const active = formData.visibilityScope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patch({ visibilityScope: opt.value, stateId: '', districtId: '', mandalId: '' })}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-[11px] font-bold transition-all ${
                        active
                          ? 'bg-zinc-900 dark:bg-admin-primary text-white border-zinc-900 dark:border-admin-primary shadow-md'
                          : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <Icon size={15} className={active ? 'text-white' : ''} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <LocationPicker
                scope={formData.visibilityScope}
                stateId={formData.stateId}
                districtId={formData.districtId}
                mandalId={formData.mandalId}
                onStateChange={v => patch({ stateId: v, districtId: '', mandalId: '' })}
                onDistrictChange={v => patch({ districtId: v, mandalId: '' })}
                onMandalChange={v => patch({ mandalId: v })}
              />
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            {/* Media & Actions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Media &amp; Actions (Optional)</h3>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  <ImageIcon size={16} className="text-zinc-400" /> Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={formData.imageUrl}
                  onChange={e => patch({ imageUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Action Type
                  </label>
                  <select
                    value={formData.actionType}
                    onChange={e => patch({ actionType: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white"
                  >
                    <option value="none" className="bg-white dark:bg-zinc-900">No Action</option>
                    <option value="route" className="bg-white dark:bg-zinc-900">App Route (Deep Link)</option>
                    <option value="external" className="bg-white dark:bg-zinc-900">External Website</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Target Path/URL</label>
                  <input
                    type="text"
                    disabled={formData.actionType === 'none'}
                    placeholder={formData.actionType === 'route' ? '/deals/hot' : 'https://…'}
                    value={formData.actionTarget}
                    onChange={e => patch({ actionTarget: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium disabled:opacity-50 text-zinc-900 dark:text-white placeholder:text-zinc-400"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-admin-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-admin-primary/25 hover:shadow-admin-primary/40 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> Send Broadcast Now</>}
            </button>

            {/* Feedback */}
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700">
                  <CheckCircle2 size={20} className="shrink-0" />
                  <p className="text-sm font-medium">{success}</p>
                  <button onClick={() => setSuccess(null)} className="ml-auto"><X size={16} /></button>
                </motion.div>
              )}
              {error && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Tips */}
          <div className="bg-gradient-to-br from-admin-primary to-admin-primary/80 rounded-3xl p-6 text-white shadow-xl shadow-admin-primary/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Info size={20} /> Targeting Guide</h3>
            <ul className="space-y-4 text-sm opacity-90">
              <li className="flex gap-3"><Globe size={18} className="shrink-0 mt-0.5" /><span><b>All Users</b> — everyone in the database.</span></li>
              <li className="flex gap-3"><Map size={18} className="shrink-0 mt-0.5" /><span><b>By State</b> — only users registered in the selected state.</span></li>
              <li className="flex gap-3"><Navigation size={18} className="shrink-0 mt-0.5" /><span><b>By District</b> — only users in the selected district.</span></li>
              <li className="flex gap-3"><MapPin size={18} className="shrink-0 mt-0.5" /><span><b>By Mandal</b> — hyper-local reach to a specific mandal.</span></li>
              <li className="flex gap-3"><Bell size={18} className="shrink-0 mt-0.5" /><span>Notifications are stored in-app <b>and</b> trigger FCM push to devices.</span></li>
            </ul>
          </div>

          {/* Live Preview */}
          <div className="bg-zinc-900 rounded-3xl p-6 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-admin-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-500 mb-4">Live Preview</h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 relative">
              <div className="w-12 h-12 rounded-xl bg-admin-primary/20 flex items-center justify-center text-admin-primary shrink-0">
                <Bell size={24} />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="font-bold text-sm truncate">{formData.title || "Your Title Here"}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{formData.body || "Your message will appear here."}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-zinc-500">Just now</span>
                  <span className="text-[10px] font-bold text-admin-primary/80 flex items-center gap-1">
                    <MapPin size={9} /> {scopeLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-zinc-500 text-center uppercase tracking-[0.2em]">
              User Mobile Experience
            </div>
          </div>
        </div>
      </div>

      {/* ── History ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-admin-primary/10 rounded-lg text-admin-primary"><History size={20} /></div>
          <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Broadcast History</h3>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">User Filter</th>
                  <th className="px-6 py-4">Location Target</th>
                  <th className="px-6 py-4">Recipients</th>
                  <th className="px-6 py-4">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {historyLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3 text-zinc-500">
                        <Loader2 className="animate-spin" size={20} /><span>Loading history…</span>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 font-medium">
                      No broadcast history found.
                    </td>
                  </tr>
                ) : history.map(item => (
                  <tr key={item._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    {/* Message */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <Bell size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.title}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{item.body}</p>
                          {item.action?.type !== 'none' && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-admin-primary uppercase tracking-wide">
                              <ExternalLink size={9} />{item.action.target}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* User filter */}
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        item.targetType === 'all'
                          ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50'
                          : 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50'
                      }`}>
                        {item.targetType === 'all' ? <Users size={12} /> : <UserCheck size={12} />}
                        {item.targetType === 'all' ? 'All Users' : 'Login Only'}
                      </div>
                    </td>

                    {/* Location scope badge */}
                    <td className="px-6 py-4">
                      <ScopeBadge item={item} />
                    </td>

                    {/* Recipients */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{item.totalNotified}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Recipients</p>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <Calendar size={14} className="opacity-50" />
                        <span className="text-xs font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
