"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAdminStore } from "@/store/useAdminStore";
import { vendorService } from "@/services/admin/vendor.service";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Store, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck, 
  Loader2,
  MapPin,
  ExternalLink,
  Info,
  TrendingUp,
  Zap,
  Globe,
  Shield,
  CreditCard,
  User as UserIcon,
  Tag
} from 'lucide-react';
import { cn } from '@/utils/cn';

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toString) return value.toString();
  return String(value);
}

/**
 * Tab definitions for filtering vendors by their registration status
 */
const TABS = [
  { id: 'all', label: 'Complete Ecosystem' },
  { id: 'pending', label: 'Pending Audit' },
  { id: 'active', label: 'Verified Active' },
  { id: 'rejected', label: 'Restricted' },
  { id: 'deleted', label: 'Deleted' },
];

/**
 * Fully Overhauled Vendor Management Module
 * Integrated with real-time APIs for listing, searching, and premium administrative control.
 */
export default function VendorsPage() {
  // State Management
  const { vendors, setVendors, isLoading, setLoading, setError, updateVendorStatus } = useAdminStore();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [selectedVisibilityLevel, setSelectedVisibilityLevel] = useState('');
  const [locationTree, setLocationTree] = useState([]);
  const [visibilityLocation, setVisibilityLocation] = useState({
    stateId: '',
    districtId: '',
    mandalId: '',
  });

  /**
   * Fetch vendors from the dynamic backend API
   */
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery,
        page: pagination.page,
        limit: pagination.limit
      };
      const data = activeTab === 'deleted'
        ? await vendorService.getDeletedVendors(filters)
        : await vendorService.getVendors(filters);
      
      setVendors(data.vendors || []);
      setPagination({
        page: data.page,
        limit: pagination.limit,
        total: data.total,
        pages: data.totalPages
      });
    } catch (error) {
      console.error('Failed to sync vendors:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, pagination.page, pagination.limit]);

  // Initial fetch and dependency-based refresh
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await fetch('/api/locations/tree');
        const data = await response.json();
        if (data.success) {
          setLocationTree(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load locations', error);
      }
    };

    loadLocations();
  }, []);

  /**
   * Handle Approval or Rejection
   */
  const handleReview = async (id, status) => {
    setProcessingId(id);
    try {
      if (status === 'active') {
        await vendorService.approveVendor(id, selectedVisibilityLevel || null);
      } else if (status === 'rejected') {
        await vendorService.rejectVendor(id, "Admin moderation review");
      }
      
      // Optimistic update
      updateVendorStatus(id, status);
      // Update selected vendor in modal if open
      if (selectedVendor && selectedVendor._id === id) {
        setSelectedVendor({ ...selectedVendor, status, visibilityLevel: selectedVisibilityLevel || null });
      }
    } catch (error) {
      alert(error?.message || 'Failed to update vendor status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateVisibility = async () => {
    if (!selectedVendor) return;

    setProcessingId(selectedVendor._id);
    try {
      const response = await vendorService.updateVendorVisibility(selectedVendor._id, {
        visibility_level: selectedVisibilityLevel || null,
        visibility_state_id: selectedVisibilityLevel ? visibilityLocation.stateId : null,
        visibility_district_id: selectedVisibilityLevel === 'state' ? null : (selectedVisibilityLevel ? visibilityLocation.districtId : null),
        visibility_mandal_id: selectedVisibilityLevel === 'mandal' ? visibilityLocation.mandalId : null,
      });

      const updatedVendor = response.data;
      setSelectedVendor(updatedVendor);
      await fetchVendors();
    } catch (error) {
      alert(error?.message || error || 'Failed to update vendor visibility');
    } finally {
      setProcessingId(null);
    }
  };

  const selectedState = locationTree.find((state) => state.id === visibilityLocation.stateId);
  const selectedDistrict = selectedState?.districts?.find((district) => district.id === visibilityLocation.districtId);

  return (
    <div className="space-y-12 pb-24">
      {/* 1. Futuristic Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-admin-primary/5 rounded-full border border-admin-primary/10"
          >
            <Shield size={14} className="text-admin-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-primary">Administrative oversight</span>
          </motion.div>
          <h1 className="text-5xl font-semibold text-zinc-900 tracking-tight">
            Vendor <span className="text-admin-primary font-semibold">Intelligence</span>
          </h1>
          <p className="text-zinc-500 font-medium text-sm">
            Orchestrating <span className="text-zinc-900 font-semibold underline decoration-admin-primary/30 decoration-2">{pagination.total}</span> verified business nodes in the ecosystem
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-all duration-500" size={22} />
            <input 
              type="text" 
              placeholder="Search store name, owner or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-8 py-5 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[28px] text-sm font-bold text-zinc-900 dark:text-white focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all shadow-sm group-hover:shadow-md"
            />
          </div>
          <button className="flex items-center justify-center gap-3 px-10 py-5 bg-zinc-900 text-white rounded-[28px] text-sm font-semibold uppercase tracking-[0.08em] hover:bg-admin-primary hover:shadow-lg hover:shadow-admin-primary/30 transition-all w-full sm:w-auto">
            <CreditCard size={20} className="transition-transform" />
            Export audit
          </button>
        </div>
      </div>

      {/* 2. Advanced Filter Navigation */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-zinc-100/50 rounded-[32px] border border-zinc-200/50 backdrop-blur-md">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPagination(p => ({...p, page: 1})); }}
            className={cn(
              "px-8 py-4 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-500 relative overflow-hidden",
              activeTab === tab.id 
                ? "bg-white text-admin-primary shadow-md shadow-zinc-200/50 scale-105 border border-zinc-100" 
                : "text-zinc-500 hover:text-zinc-900 hover:bg-white/50"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="tab-pill" className="absolute bottom-0 left-0 right-0 h-1 bg-admin-primary/30" />
            )}
          </button>
        ))}
      </div>

      {/* 3. High-End Vendor Ledger Table */}
      <div className="glass-card rounded-[48px] border-white/60 overflow-hidden shadow-2xl relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-admin-primary animate-spin" size={48} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Syncing intelligence</p>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/30 border-b border-zinc-100/80">
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Business DNA</th>
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Governance & Trust</th>
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Economic Portfolio</th>
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 text-right">Administrative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              <AnimatePresence mode="popLayout">
                {vendors.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan="4" className="px-10 py-32 text-center">
                       <div className="flex flex-col items-center gap-6">
                          <div className="w-24 h-24 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-200">
                             <Store size={48} />
                          </div>
                          <p className="font-semibold text-zinc-400 uppercase tracking-[0.08em] text-sm">No business nodes found</p>
                       </div>
                    </td>
                  </tr>
                ) : vendors.map((vendor, i) => (
                  <motion.tr 
                    key={vendor._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      "group transition-all duration-300",
                      (vendor.is_deleted || vendor.status === 'deleted') 
                        ? "opacity-60 bg-zinc-50/30 hover:bg-zinc-50/50" 
                        : "hover:bg-zinc-50/50"
                    )}
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center overflow-hidden shadow-xl shadow-zinc-900/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-4 ring-white">
                            {vendor.media?.thumbnailUrl ? (
                              <img src={vendor.media.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Store size={28} className="text-white/40" />
                            )}
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-xl shadow-md border border-zinc-100 flex items-center justify-center">
                             <ShieldCheck size={14} className={vendor.status === 'active' ? "text-green-500" : "text-zinc-300"} />
                          </div>
                        </div>
                        <div>
                          <div className="rounded-3xl bg-white border border-zinc-100 shadow-sm px-4 py-3 mb-2 transition-all duration-300 group-hover:border-admin-primary/30 group-hover:shadow-md">
                            <h3 className="text-lg font-black text-zinc-900 tracking-tight truncate">
                              {vendor.storeName || 'Independent Node'}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.08em]">
                              {vendor.categoryId?.name || 'Category Pending'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                              <MapPin size={10} className="text-admin-primary" />
                              {vendor.location?. district}, {vendor.location?.state}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col gap-3">
                        <span className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.08em] border transition-all duration-500",
                          vendor.status === 'active' ? "bg-green-50/50 text-green-700 border-green-100 shadow-sm shadow-green-100/50" :
                          vendor.status === 'pending_approval' ? "bg-orange-50/50 text-orange-700 border-orange-100 shadow-sm shadow-orange-100/50" :
                          vendor.status === 'rejected' ? "bg-red-50/50 text-red-700 border-red-100 shadow-sm shadow-red-100/50" :
                          vendor.status === 'deleted' ? "bg-zinc-100 text-zinc-600 border-zinc-200" :
                          "bg-zinc-50 text-zinc-500 border-zinc-200"
                        )}>
                          <div className={cn("w-2 h-2 rounded-full", 
                            vendor.status === 'active' ? "bg-green-500 animate-pulse" : 
                            vendor.status === 'pending_approval' ? "bg-orange-500" : 
                            vendor.status === 'deleted' ? "bg-zinc-400" : "bg-red-500"
                          )} />
                          {vendor.status.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-3 bg-zinc-50/80 px-3 py-1.5 rounded-xl w-fit border border-zinc-100/50">
                          <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.08em]">Audit stage</span>
                          <div className="flex gap-1">
                            {[1, 2, 3].map(step => (
                               <div key={step} className={cn(
                                 "w-3 h-1.5 rounded-full transition-all duration-500",
                                 step <= vendor.registrationStep ? "bg-admin-primary" : "bg-zinc-200"
                               )} />
                           ))}
                          </div>
                        </div>
                        {(vendor.is_deleted || vendor.status === 'deleted') && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                              Deleted {vendor.deletedAt ? new Date(vendor.deletedAt).toLocaleDateString() : 'Archived'}
                            </p>
                            {vendor.deletedReason && (
                              <p className="max-w-xs text-xs font-semibold text-zinc-500">
                                {vendor.deletedReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100 shadow-sm transition-all">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-admin-primary/10 rounded-xl text-admin-primary">
                              <Zap size={14} />
                           </div>
                           <p className="text-xl font-semibold text-zinc-900 tracking-tight">
                              {(vendor.creditsRemaining || 0).toLocaleString()}
                           </p>
                        </div>
                        <div className="flex items-center gap-2">
                           <TrendingUp size={10} className="text-green-500" />
                           <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.08em]">Active Credits</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button 
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setSelectedVisibilityLevel(vendor.visibilityLevel || '');
                          setVisibilityLocation({
                            stateId: normalizeId(vendor.visibilityStateId || vendor.storeStateId),
                            districtId: normalizeId(vendor.visibilityDistrictId || vendor.storeDistrictId),
                            mandalId: normalizeId(vendor.visibilityMandalId || vendor.storeMandalId),
                          });
                        }}
                        className="group/btn relative w-14 h-14 rounded-3xl bg-zinc-50 text-zinc-400 hover:bg-admin-primary hover:text-white hover:rotate-12 transition-all duration-500 flex items-center justify-center overflow-hidden shadow-sm"
                      >
                        <Eye size={24} className="group-hover/btn:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Console */}
        <div className="px-10 py-10 bg-zinc-50/50 border-t border-zinc-100/50 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-1">
             <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.08em]">Governance ledger</p>
             <p className="text-xs font-bold text-zinc-500">Showing {vendors.length} of {pagination.total} Dynamic Entities</p>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
              className="w-14 h-14 rounded-3xl bg-white border-2 border-zinc-100 text-zinc-400 hover:text-admin-primary hover:border-admin-primary hover:shadow-xl transition-all disabled:opacity-30 disabled:scale-95"
            >
              <ChevronLeft size={24} className="mx-auto" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-3xl bg-zinc-900 text-white flex items-center justify-center font-semibold text-lg shadow-md shadow-zinc-900/10">
                {pagination.page}
              </div>
              <span className="text-zinc-300 font-semibold text-xs mx-1">/</span>
              <div className="w-14 h-14 rounded-3xl bg-white border-2 border-zinc-100 text-zinc-500 flex items-center justify-center font-semibold text-lg">
                {pagination.pages}
              </div>
            </div>

            <button 
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
              className="w-14 h-14 rounded-3xl bg-white border-2 border-zinc-100 text-zinc-400 hover:text-admin-primary hover:border-admin-primary hover:shadow-xl transition-all disabled:opacity-30 disabled:scale-95"
            >
              <ChevronRight size={24} className="mx-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Vendor Audit & Review Modal (Administrative View) */}
      <AnimatePresence>
        {selectedVendor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVendor(null)}
              className="fixed inset-0 bg-zinc-900/70 backdrop-blur-xl z-0"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50, rotateX: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="relative w-full max-w-[min(100vw-2rem,1100px)] bg-white rounded-[32px] shadow-2xl shadow-zinc-200/30 overflow-hidden z-10 border border-zinc-100"
            >
              {/* Modal Header/Banner */}
              <div className="relative h-56 sm:h-64 bg-zinc-950">
                {selectedVendor.media?.bannerUrl ? (
                  <img src={selectedVendor.media.bannerUrl} alt="" className="w-full h-full object-cover opacity-85" />
                ) : (
                  <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                    <Globe size={100} className="text-white/15" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20" />
                
                <button 
                  onClick={() => setSelectedVendor(null)}
                  className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/90 text-zinc-900 hover:bg-white shadow-lg transition-all duration-300 flex items-center justify-center z-20"
                >
                  <XCircle size={24} />
                </button>
                
                {/* Floating Status Badge */}
                <div className="absolute top-8 left-8 z-20">
                   <span className={cn(
                      "px-4 py-2 rounded-2xl text-[11px] font-semibold uppercase tracking-[0.08em] border",
                      selectedVendor.status === 'active' ? "bg-green-50 text-green-700 border-green-200" :
                      selectedVendor.status === 'pending_approval' ? "bg-orange-50 text-orange-700 border-orange-200" :
                      selectedVendor.status === 'deleted' ? "bg-zinc-100 text-zinc-600 border-zinc-200" :
                      "bg-red-50 text-red-700 border-red-200"
                   )}>
                      {selectedVendor.status.replace('_', ' ')}
                   </span>
                </div>
              </div>

              {/* Modal Content */}
              <div className="px-6 sm:px-10 pb-16 -mt-20 relative z-10">
                 <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                    <div className="relative">
                       <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-white p-3 shadow-lg border border-zinc-100">
                          <div className="w-full h-full rounded-3xl bg-zinc-50 flex items-center justify-center overflow-hidden border border-zinc-100">
                            {selectedVendor.media?.thumbnailUrl ? (
                              <img src={selectedVendor.media.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Store size={40} className="text-zinc-300" />
                            )}
                          </div>
                       </div>
                    </div>
                    <div className="flex-1 pb-4 min-w-0">
                       <div className="inline-flex flex-col gap-3 bg-white/95 border border-zinc-100 shadow-xl shadow-zinc-200/40 rounded-3xl px-6 py-5">
                          <h1 className="text-4xl sm:text-5xl font-black text-zinc-900 tracking-tight leading-tight truncate">
                            {selectedVendor.storeName || 'Unnamed Store'}
                          </h1>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                            <p className="text-admin-primary font-semibold uppercase tracking-[0.12em]">Administrative audit</p>
                            <div className="h-1 w-12 bg-zinc-100 rounded-full" />
                            <p>Node #{selectedVendor._id.slice(-8).toUpperCase()}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {/* Column 1: Identity & Social */}
                    <div className="space-y-10">
                       <section>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4 flex items-center gap-3">
                             <UserIcon size={14} className="text-admin-primary" /> Entity ownership
                          </label>
                          <div className="bg-zinc-50 rounded-[32px] p-6 shadow-sm border border-zinc-100 text-zinc-900">
                             <p className="text-lg font-semibold tracking-tight mb-1">{selectedVendor.fullName || selectedVendor.userId?.fullName || 'Unknown Proprietor'}</p>
                             <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-5">Authorized signatory</p>
                             <div className="space-y-4 pt-5 border-t border-zinc-200">
                                <div className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                                   <Mail size={16} className="text-admin-primary" />
                                   {selectedVendor.email || selectedVendor.userId?.email || 'No email provided'}
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                                   <Phone size={16} className="text-admin-primary" />
                                   {selectedVendor.mobileNumber || selectedVendor.userId?.phone || 'No phone provided'}
                                </div>
                             </div>
                          </div>
                       </section>

                       <section>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4 flex items-center gap-3">
                             <Globe size={14} /> Social links
                          </label>
                          <div className="flex flex-wrap gap-3">
                             {[
                               { icon: Globe, val: selectedVendor.website, label: 'WEB' },
                               { icon: Globe, val: selectedVendor.instagram, label: 'INSTAGRAM' },
                               { icon: Globe, val: selectedVendor.facebook, label: 'FACEBOOK' },
                               { icon: Globe, val: selectedVendor.linkedin, label: 'LINKEDIN' },
                             ].map((social, idx) => (
                               <a 
                                 key={idx}
                                 href={social.val || '#'} 
                                 target="_blank"
                                 rel="noreferrer"
                                 className={cn(
                                   "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200",
                                   social.val ? "bg-zinc-100 text-zinc-900 hover:bg-admin-primary hover:text-white" : "bg-zinc-50 text-zinc-300 cursor-not-allowed"
                                 )}
                               >
                                  <social.icon size={20} />
                               </a>
                             ))}
                          </div>
                       </section>
                    </div>

                    {/* Column 2: Localization & Categories */}
                    <div className="space-y-10">
                       <section>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4 flex items-center gap-3">
                             <MapPin size={14} className="text-admin-primary" /> Location profile
                          </label>
                          <div className="bg-zinc-50 rounded-[32px] p-6 border border-zinc-200">
                             <p className="text-sm font-medium text-zinc-700 leading-relaxed mb-6">
                                {selectedVendor.fullAddress || 'Full geographical address pending validation'}
                             </p>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-[0.08em] mb-1">District</p>
                                   <p className="font-semibold text-zinc-900">{selectedVendor.location?.district || 'N/A'}</p>
                                </div>
                                <div>
                                 <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-[0.08em] mb-1">State</p>
                                  <p className="font-semibold text-zinc-900">{selectedVendor.location?.state || 'N/A'}</p>
                                </div>
                                <div>
                                   <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-[0.08em] mb-1">Mandal</p>
                                   <p className="font-semibold text-zinc-900">{selectedVendor.location?.mandal || 'N/A'}</p>
                                </div>
                                <div>
                                   <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-[0.08em] mb-1">Visibility</p>
                                   <p className="font-semibold text-zinc-900 capitalize">{selectedVendor.visibilityLevel || 'All Users'}</p>
                                </div>
                             </div>
                          </div>
                       </section>

                       <section>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4 flex items-center gap-3">
                             <Tag size={14} /> Market sector
                          </label>
                          <div className="inline-flex items-center gap-3 px-6 py-4 bg-admin-primary/10 border border-admin-primary/15 rounded-3xl">
                             <div className="w-10 h-10 rounded-xl bg-admin-primary/10 flex items-center justify-center text-admin-primary">
                                <Store size={18} />
                             </div>
                             <span className="font-semibold text-admin-primary text-sm">{selectedVendor.categoryId?.name || 'Unclassified'}</span>
                          </div>
                       </section>
                    </div>

                    {/* Column 3: Economic Portfolio & Actions */}
                    <div className="space-y-10">
                       <section>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-6 flex items-center gap-3">
                             <Zap size={14} className="text-admin-primary" /> Financial portfolio
                          </label>
                          <div className="space-y-4">
                             <div className="bg-admin-primary rounded-[32px] p-8 text-white shadow-sm border border-admin-primary/15">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70 mb-2">Active credits</p>
                                <h3 className="text-4xl font-semibold tracking-tight">{(selectedVendor.creditsRemaining || 0).toLocaleString()}</h3>
                                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/15 rounded-full">
                                   <TrendingUp size={14} className="text-white" />
                                   <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">Protocol credits</span>
                                </div>
                             </div>

                             <div className="bg-zinc-50 rounded-[32px] p-6 flex items-center justify-between border border-zinc-200">
                                <div>
                                   <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1">Rhock coins</p>
                                   <p className="text-2xl font-semibold text-zinc-900">₹{(selectedVendor.coinBalance || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-admin-primary/10 rounded-2xl text-admin-primary">
                                   <CreditCard size={24} />
                                </div>
                             </div>
                          </div>
                       </section>

                       {/* Governance Actions */}
                       <div className="pt-6 flex flex-col gap-5">
                          {selectedVendor.status === 'pending_approval' ? (
                            <>
                              <div className="rounded-[32px] border border-zinc-200 bg-zinc-50 p-6 text-left">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Visibility target</p>
                                <p className="mt-3 text-sm font-medium text-zinc-700">
                                  Store belongs to {selectedVendor.location?.mandal || 'Unknown mandal'}, {selectedVendor.location?.district || 'Unknown district'}, {selectedVendor.location?.state || 'Unknown state'}.
                                </p>
                                <div className="mt-5 grid grid-cols-1 gap-3">
                                  {['', 'state', 'district', 'mandal'].map((level) => (
                                    <label key={level} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 cursor-pointer">
                                      <div>
                                        <p className="text-sm font-semibold text-zinc-900 capitalize">{level ? `${level} Visibility` : 'All Users'}</p>
                                        <p className="text-xs text-zinc-500">
                                          {level === '' ? 'Visible to users in every location' : level === 'state' ? selectedVendor.location?.state : level === 'district' ? selectedVendor.location?.district : selectedVendor.location?.mandal}
                                        </p>
                                      </div>
                                      <input
                                        type="radio"
                                        name="vendor-visibility"
                                        value={level}
                                        checked={selectedVisibilityLevel === level}
                                        onChange={() => setSelectedVisibilityLevel(level)}
                                      />
                                    </label>
                                  ))}
                                </div>
                                {selectedVisibilityLevel && (
                                <div className="mt-5 grid grid-cols-1 gap-4">
                                  <select
                                    value={visibilityLocation.stateId}
                                    onChange={(e) => setVisibilityLocation({ stateId: e.target.value, districtId: '', mandalId: '' })}
                                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
                                  >
                                    <option value="">Select state</option>
                                    {locationTree.map((state) => (
                                      <option key={state.id} value={state.id}>{state.name}</option>
                                    ))}
                                  </select>

                                  {selectedVisibilityLevel !== 'state' && (
                                    <select
                                      value={visibilityLocation.districtId}
                                      onChange={(e) => setVisibilityLocation((prev) => ({ ...prev, districtId: e.target.value, mandalId: '' }))}
                                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
                                    >
                                      <option value="">Select district</option>
                                      {(selectedState?.districts || []).map((district) => (
                                        <option key={district.id} value={district.id}>{district.name}</option>
                                      ))}
                                    </select>
                                  )}

                                  {selectedVisibilityLevel === 'mandal' && (
                                    <select
                                      value={visibilityLocation.mandalId}
                                      onChange={(e) => setVisibilityLocation((prev) => ({ ...prev, mandalId: e.target.value }))}
                                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
                                    >
                                      <option value="">Select mandal</option>
                                      {(selectedDistrict?.mandals || []).map((mandal) => (
                                        <option key={mandal.id} value={mandal.id}>{mandal.name}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                               <button 
                                 disabled={!!processingId}
                                 onClick={() => handleReview(selectedVendor._id, 'active')}
                                 className="py-5 bg-green-600 text-white rounded-3xl font-semibold text-sm shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                               >
                                  {processingId ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                                  <span>Verify hub</span>
                               </button>
                               <button 
                                 disabled={!!processingId}
                                 onClick={() => handleReview(selectedVendor._id, 'rejected')}
                                 className="py-5 bg-white border border-red-200 text-red-600 rounded-3xl font-semibold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                               >
                                  {processingId ? <Loader2 className="animate-spin" size={24} /> : <XCircle size={24} />}
                                 <span>Restrict node</span>
                               </button>
                              </div>
                            </>
                          ) : (selectedVendor.is_deleted || selectedVendor.status === 'deleted') ? (
                             <>
                               <div className="rounded-[32px] border border-zinc-200 bg-zinc-50 p-6 text-left">
                                 <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Deletion audit</p>
                                 <p className="mt-3 text-sm font-medium text-zinc-800">
                                   {selectedVendor.deletedReason || 'No deletion reason captured.'}
                                 </p>
                                 <p className="mt-2 text-xs text-zinc-500">
                                   Deleted on {selectedVendor.deletedAt ? new Date(selectedVendor.deletedAt).toLocaleString() : 'Unknown date'}
                                 </p>
                                 <p className="mt-1 text-xs text-zinc-500">
                                   Wallet before delete: {(selectedVendor.walletBalanceBeforeDelete || 0).toLocaleString()} coins
                                 </p>
                               </div>
                               <button 
                                 disabled={!!processingId}
                                 onClick={async () => {
                                   setProcessingId(selectedVendor._id);
                                   try {
                                     await vendorService.restoreVendor(selectedVendor._id);
                                     alert('Vendor profile restored successfully.');
                                     setSelectedVendor(null);
                                     fetchVendors();
                                   } catch (error) {
                                     alert(error || 'Failed to restore vendor account.');
                                   } finally {
                                      setProcessingId(null);
                                   }
                                 }}
                                 className="w-full py-5 bg-green-600 text-white rounded-[32px] font-semibold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-3"
                               >
                                 {processingId ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                                 Restore vendor account
                               </button>
                             </>
                          ) : (
                             <>
                               <div className="rounded-[32px] border border-zinc-200 bg-zinc-50 p-6 text-left">
                                 <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Edit visibility target</p>
                                 <div className="mt-5 grid grid-cols-1 gap-3">
                                   {['', 'state', 'district', 'mandal'].map((level) => (
                                     <label key={level} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 cursor-pointer">
                                       <div>
                                         <p className="text-sm font-semibold text-zinc-900 capitalize">{level ? `${level} Visibility` : 'All Users'}</p>
                                         <p className="text-xs text-zinc-500">{level ? 'Change who can see this store' : 'Show this store to users in every location'}</p>
                                       </div>
                                       <input
                                         type="radio"
                                         name="vendor-visibility-edit"
                                         value={level}
                                         checked={selectedVisibilityLevel === level}
                                         onChange={() => setSelectedVisibilityLevel(level)}
                                       />
                                     </label>
                                   ))}
                                 </div>

                                 {selectedVisibilityLevel && (
                                 <div className="mt-5 grid grid-cols-1 gap-4">
                                   <select
                                     value={visibilityLocation.stateId}
                                     onChange={(e) => setVisibilityLocation({ stateId: e.target.value, districtId: '', mandalId: '' })}
                                     className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
                                   >
                                     <option value="">Select state</option>
                                     {locationTree.map((state) => (
                                       <option key={state.id} value={state.id}>{state.name}</option>
                                     ))}
                                   </select>

                                   {selectedVisibilityLevel !== 'state' && (
                                     <select
                                       value={visibilityLocation.districtId}
                                       onChange={(e) => setVisibilityLocation((prev) => ({ ...prev, districtId: e.target.value, mandalId: '' }))}
                                       className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
                                     >
                                       <option value="">Select district</option>
                                       {(selectedState?.districts || []).map((district) => (
                                         <option key={district.id} value={district.id}>{district.name}</option>
                                       ))}
                                     </select>
                                   )}

                                   {selectedVisibilityLevel === 'mandal' && (
                                     <select
                                       value={visibilityLocation.mandalId}
                                       onChange={(e) => setVisibilityLocation((prev) => ({ ...prev, mandalId: e.target.value }))}
                                       className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
                                     >
                                       <option value="">Select mandal</option>
                                       {(selectedDistrict?.mandals || []).map((mandal) => (
                                         <option key={mandal.id} value={mandal.id}>{mandal.name}</option>
                                       ))}
                                     </select>
                                   )}
                                 </div>
                                 )}
                               </div>

                               <button
                                 disabled={!!processingId}
                                 onClick={handleUpdateVisibility}
                                 className="w-full py-5 bg-zinc-900 text-white rounded-[32px] font-semibold text-sm hover:bg-zinc-800 transition-colors"
                               >
                                 {processingId ? 'Saving...' : 'Update Visibility'}
                               </button>
                             </>
                          )}
                          
                          <button className="w-full py-5 bg-zinc-100 text-zinc-700 rounded-[32px] font-semibold text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3">
                             <ExternalLink size={20} />
                             Advanced analytics
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
