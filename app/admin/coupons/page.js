"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { couponService } from '@/services/admin/coupon.service';
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Calendar, Tag, Store, Link as LinkIcon,
  CheckCircle2, Loader2, Ticket, Info, Shield, Layers,
  ExternalLink, X, MapPin, Globe, Map, Navigation, Filter
} from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Fetches states / districts / mandals from the existing location APIs
 */
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
  { value: 'all',      label: 'All Users',      icon: Globe,      color: 'text-blue-500' },
  { value: 'state',    label: 'By State',        icon: Map,        color: 'text-violet-500' },
  { value: 'district', label: 'By District',     icon: Navigation, color: 'text-orange-500' },
  { value: 'mandal',   label: 'By Mandal',       icon: MapPin,     color: 'text-emerald-500' },
];

const EMPTY_FORM = {
  title: '', subtitle: '', category: '', imageUrl: '', imageFile: null,
  couponCode: '', isActive: true, order: 0, storeName: '', terms: '',
  ctaLink: '', expiryDate: '',
  visibilityScope: 'all', stateId: '', districtId: '', mandalId: '',
};

/**
 * LocationScopePicker — cascading dropdowns for State / District / Mandal
 */
function LocationScopePicker({ scope, stateId, districtId, mandalId, onChange }) {
  const [states, setStates]     = useState([]);
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals]   = useState([]);
  const [loading, setLoading]   = useState({ states: false, districts: false, mandals: false });

  // Load states once
  useEffect(() => {
    setLoading(p => ({ ...p, states: true }));
    fetchStates()
      .then(setStates)
      .finally(() => setLoading(p => ({ ...p, states: false })));
  }, []);

  // Load districts when stateId changes
  useEffect(() => {
    if (!stateId) { setDistricts([]); setMandals([]); return; }
    setLoading(p => ({ ...p, districts: true }));
    fetchDistricts(stateId)
      .then(setDistricts)
      .finally(() => setLoading(p => ({ ...p, districts: false })));
    setMandals([]);
  }, [stateId]);

  // Load mandals when districtId changes
  useEffect(() => {
    if (!districtId) { setMandals([]); return; }
    setLoading(p => ({ ...p, mandals: true }));
    fetchMandals(districtId)
      .then(setMandals)
      .finally(() => setLoading(p => ({ ...p, mandals: false })));
  }, [districtId]);

  const inputCls = "w-full px-4 py-3 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/30 focus:bg-white outline-none transition-all";

  return (
    <div className="space-y-4">
      {/* Scope selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SCOPE_OPTIONS.map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ visibilityScope: opt.value, stateId: '', districtId: '', mandalId: '' })}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border-2 text-[11px] font-black uppercase tracking-wider transition-all",
                scope === opt.value
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-lg"
                  : "bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300"
              )}
            >
              <Icon size={16} className={scope === opt.value ? 'text-white' : opt.color} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Cascading dropdowns */}
      <AnimatePresence>
        {scope !== 'all' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-3"
          >
            {/* State */}
            <div className="relative">
              <select
                required
                value={stateId}
                onChange={e => onChange({ stateId: e.target.value, districtId: '', mandalId: '' })}
                className={inputCls}
              >
                <option value="">
                  {loading.states ? 'Loading states…' : '— Select State —'}
                </option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {loading.states && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
            </div>

            {/* District */}
            {(scope === 'district' || scope === 'mandal') && (
              <div className="relative">
                <select
                  required
                  value={districtId}
                  onChange={e => onChange({ districtId: e.target.value, mandalId: '' })}
                  disabled={!stateId}
                  className={cn(inputCls, !stateId && 'opacity-40 cursor-not-allowed')}
                >
                  <option value="">
                    {loading.districts ? 'Loading districts…' : '— Select District —'}
                  </option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {loading.districts && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
              </div>
            )}

            {/* Mandal */}
            {scope === 'mandal' && (
              <div className="relative">
                <select
                  required
                  value={mandalId}
                  onChange={e => onChange({ mandalId: e.target.value })}
                  disabled={!districtId}
                  className={cn(inputCls, !districtId && 'opacity-40 cursor-not-allowed')}
                >
                  <option value="">
                    {loading.mandals ? 'Loading mandals…' : '— Select Mandal —'}
                  </option>
                  {mandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {loading.mandals && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * LocationBadge — compact pill showing a coupon's scope
 */
function LocationBadge({ coupon }) {
  const scope = coupon.visibilityScope || 'all';
  if (scope === 'all') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-wide">
        <Globe size={10} /> All Users
      </span>
    );
  }
  const label =
    scope === 'mandal'   ? (coupon.mandalId?.name   || 'Mandal')   :
    scope === 'district' ? (coupon.districtId?.name || 'District') :
                           (coupon.stateId?.name    || 'State');
  const colors = {
    state:    'bg-violet-50 text-violet-600',
    district: 'bg-orange-50 text-orange-600',
    mandal:   'bg-emerald-50 text-emerald-600',
  };
  const icons = { state: Map, district: Navigation, mandal: MapPin };
  const Icon = icons[scope] || Globe;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide", colors[scope])}>
      <Icon size={10} /> {label}
    </span>
  );
}

/**
 * Premium Coupon Management Module — with location targeting
 */
export default function CouponsPage() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filterScope, setFilterScope] = useState('');
  const [toast, setToast]       = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 100 };
      if (filterScope) params.visibilityScope = filterScope;
      const res = await couponService.list(params);
      setItems(res.data || []);
    } catch {
      showToast('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterScope]);

  useEffect(() => { load(); }, [load]);

  /* ---------- helpers to patch form location fields ---------- */
  const patchLocation = (patch) => setForm(f => ({ ...f, ...patch }));

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let payload;
      if (form.imageFile) {
        payload = new FormData();
        payload.append('title', form.title);
        payload.append('subtitle', form.subtitle);
        if (form.category)    payload.append('category', form.category);
        payload.append('image', form.imageFile);
        if (form.couponCode)  payload.append('couponCode', form.couponCode);
        payload.append('isActive', form.isActive);
        payload.append('order', form.order);
        if (form.storeName)   payload.append('storeName', form.storeName);
        if (form.terms)       payload.append('terms', form.terms);
        if (form.ctaLink)     payload.append('ctaLink', form.ctaLink);
        if (form.expiryDate)  payload.append('expiryDate', form.expiryDate);
        // Location
        payload.append('visibilityScope', form.visibilityScope);
        if (form.stateId)     payload.append('stateId', form.stateId);
        if (form.districtId)  payload.append('districtId', form.districtId);
        if (form.mandalId)    payload.append('mandalId', form.mandalId);
      } else {
        payload = { ...form };
        delete payload.imageFile;
      }
      await couponService.create(payload);
      setForm(EMPTY_FORM);
      setIsAdding(false);
      await load();
      showToast('Coupon created successfully!');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to create coupon', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await couponService.update(item._id, { isActive: !item.isActive });
      await load();
    } catch { showToast('Failed to update status', 'error'); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Permanently delete this coupon?")) return;
    try {
      await couponService.remove(id);
      await load();
      showToast('Coupon deleted');
    } catch { showToast('Failed to delete coupon', 'error'); }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'active')   return item.isActive;
    if (activeTab === 'inactive') return !item.isActive;
    return true;
  });

  return (
    <div className="space-y-10 pb-24 relative">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold",
              toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-900 text-white'
            )}
          >
            {toast.type === 'error' ? '✗' : '✓'} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-admin-primary/5 rounded-full border border-admin-primary/10"
          >
            <Ticket size={14} className="text-admin-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-admin-primary">Reward Infrastructure</span>
          </motion.div>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tighter">
            Coupon <span className="text-admin-primary italic">Architect</span>
          </h1>
          <p className="text-zinc-500 font-bold text-sm">
            Orchestrating <span className="text-zinc-900 font-black underline decoration-admin-primary/30 decoration-4">{items.length}</span> reward vectors · Location-targeted
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-3 px-8 py-5 bg-zinc-900 text-white rounded-[28px] text-sm font-black uppercase tracking-[0.2em] hover:bg-admin-primary hover:shadow-2xl hover:shadow-admin-primary/30 transition-all w-full md:w-auto group"
        >
          {isAdding ? <X size={20} /> : <Plus size={20} className="group-hover:rotate-90 transition-transform" />}
          {isAdding ? "Cancel" : "Forge New Coupon"}
        </button>
      </div>

      {/* ── Create Form ── */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={onCreate} className="glass-card rounded-[48px] border-white/60 p-10 bg-white/50 backdrop-blur-xl shadow-2xl space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                {/* Core Identity */}
                <div className="space-y-5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 flex items-center gap-3">
                    <Info size={14} className="text-admin-primary" /> Core Identity
                  </h4>
                  <div className="space-y-3">
                    <div className="relative group">
                      <Tag size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-colors" />
                      <input
                        className="w-full pl-14 pr-6 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all"
                        placeholder="Coupon Title (e.g. 50% OFF)"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                      />
                    </div>
                    <input
                      className="w-full px-6 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all"
                      placeholder="Subtitle / Short Description (Required)"
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      required
                    />
                    <div className="relative group">
                      <Ticket size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-colors" />
                      <input
                        className="w-full pl-14 pr-6 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all"
                        placeholder="Coupon Code (e.g. SAVE50)"
                        value={form.couponCode}
                        onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Market Logistics */}
                <div className="space-y-5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 flex items-center gap-3">
                    <Shield size={14} className="text-admin-primary" /> Market Logistics
                  </h4>
                  <div className="space-y-3">
                    <div className="relative group">
                      <Layers size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-colors" />
                      <input
                        className="w-full pl-14 pr-6 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all"
                        placeholder="Category (e.g. Fashion)"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      />
                    </div>
                    <div className="relative group">
                      <Store size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-colors" />
                      <input
                        className="w-full pl-14 pr-6 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all"
                        placeholder="Affiliated Store Name"
                        value={form.storeName}
                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                      />
                    </div>
                    <div className="relative group">
                      <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-colors" />
                      <input
                        className="w-full pl-14 pr-6 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all"
                        type="date"
                        value={form.expiryDate}
                        onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Visual & Links */}
                <div className="space-y-5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 flex items-center gap-3">
                    <LinkIcon size={14} className="text-admin-primary" /> Visual &amp; Links
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full px-6 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-admin-primary/10 file:text-admin-primary hover:file:bg-admin-primary/20"
                      onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })}
                      required
                    />
                    <div className="relative group">
                      <ExternalLink size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-colors" />
                      <input
                        className="w-full pl-14 pr-6 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all"
                        placeholder="CTA / Store Redirect Link"
                        value={form.ctaLink}
                        onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 rounded-2xl text-white">
                      <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <span className="text-[10px] font-bold">{form.isActive ? "ACTIVE" : "STANDBY"}</span>
                        <div
                          onClick={() => setForm({ ...form, isActive: !form.isActive })}
                          className={cn("w-12 h-6 rounded-full relative transition-all duration-500", form.isActive ? "bg-admin-primary" : "bg-zinc-700")}
                        >
                          <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500", form.isActive ? "left-7" : "left-1")} />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Terms — full width */}
                <div className="md:col-span-2 lg:col-span-3">
                  <textarea
                    className="w-full px-6 py-4 bg-zinc-50 border-2 border-transparent rounded-[32px] text-sm font-bold text-zinc-900 focus:border-admin-primary/20 focus:bg-white outline-none transition-all min-h-[100px]"
                    placeholder="Terms & Conditions"
                    value={form.terms}
                    onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  />
                </div>

                {/* Location Scope — full width */}
                <div className="md:col-span-2 lg:col-span-3 p-6 bg-zinc-900/5 rounded-[32px] border border-zinc-100 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 flex items-center gap-3">
                    <MapPin size={14} className="text-admin-primary" /> Visibility Scope — Who Can See This Coupon?
                  </h4>
                  <LocationScopePicker
                    scope={form.visibilityScope}
                    stateId={form.stateId}
                    districtId={form.districtId}
                    mandalId={form.mandalId}
                    onChange={patchLocation}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t border-zinc-100 pt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-12 py-5 bg-admin-primary text-white rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-admin-primary/30 hover:bg-zinc-900 transition-all flex items-center gap-4"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                  Instantiate Coupon
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status tabs */}
        <div className="flex items-center gap-2 p-2 bg-zinc-100/50 rounded-[28px] border border-zinc-200/50 backdrop-blur-md">
          {['all', 'active', 'inactive'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                activeTab === tab
                  ? "bg-white text-admin-primary shadow-lg scale-105 border border-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-white/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scope filter */}
        <div className="flex items-center gap-2 p-2 bg-zinc-100/50 rounded-[28px] border border-zinc-200/50 backdrop-blur-md">
          <Filter size={14} className="ml-3 text-zinc-400" />
          <select
            value={filterScope}
            onChange={e => setFilterScope(e.target.value)}
            className="bg-transparent text-[11px] font-black uppercase tracking-widest text-zinc-600 pr-4 pl-1 py-2 outline-none cursor-pointer"
          >
            <option value="">All Scopes</option>
            {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Coupons Table ── */}
      <div className="glass-card rounded-[48px] border-white/60 overflow-hidden shadow-2xl relative bg-white">
        {loading && items.length === 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-admin-primary animate-spin" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Syncing Reward Nodes</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/30 border-b border-zinc-100/80">
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Reward DNA</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Market Segment</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Location Scope</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Status</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              <AnimatePresence mode="popLayout">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-200">
                          <Ticket size={48} />
                        </div>
                        <p className="font-black text-zinc-400 uppercase tracking-widest text-sm">No reward vectors found</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.map((item, i) => (
                  <motion.tr
                    key={item._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group hover:bg-zinc-50/50 transition-all duration-300"
                  >
                    {/* Title + code */}
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-3xl bg-zinc-900 flex items-center justify-center overflow-hidden shadow-xl shadow-zinc-900/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-4 ring-white shrink-0">
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            : <Ticket size={24} className="text-white/40" />
                          }
                        </div>
                        <div>
                          <p className="font-black text-zinc-900 text-base tracking-tight mb-1 group-hover:text-admin-primary transition-colors">{item.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-admin-primary/10 rounded text-[10px] font-black text-admin-primary uppercase tracking-widest">
                              {item.couponCode || 'NO CODE'}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400 italic">{item.subtitle}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category + Store */}
                    <td className="px-10 py-7">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-zinc-900 uppercase tracking-widest">{item.category || "General"}</p>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                          <Store size={11} className="text-admin-primary" />
                          {item.storeName || "Rhock Universal"}
                        </div>
                      </div>
                    </td>

                    {/* Location badge */}
                    <td className="px-10 py-7">
                      <LocationBadge coupon={item} />
                    </td>

                    {/* Status toggle */}
                    <td className="px-10 py-7">
                      <button
                        onClick={() => toggleActive(item)}
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-500",
                          item.isActive
                            ? "bg-green-50/50 text-green-700 border-green-100 shadow-sm"
                            : "bg-zinc-50 text-zinc-500 border-zinc-200"
                        )}
                      >
                        <div className={cn("w-2 h-2 rounded-full", item.isActive ? "bg-green-500 animate-pulse" : "bg-zinc-300")} />
                        {item.isActive ? "ACTIVE" : "DISABLED"}
                      </button>
                    </td>

                    {/* Delete */}
                    <td className="px-10 py-7 text-right">
                      <button
                        onClick={() => onDelete(item._id)}
                        className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:-rotate-12 transition-all duration-500 flex items-center justify-center shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
