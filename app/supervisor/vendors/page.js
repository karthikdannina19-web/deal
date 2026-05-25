"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Store, 
  MapPin,
  ShieldCheck, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { dashboardService } from '@/services/supervisor/dashboard.service';

const TABS = [
  { id: 'all', label: 'All Vendors' },
  { id: 'pending_approval', label: 'Pending' },
  { id: 'active', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

export default function SupervisorVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery,
        page: pagination.page,
        limit: pagination.limit
      };
      const data = await dashboardService.getVendors(filters);
      setVendors(data.vendors || []);
      setPagination({
        page: data.page,
        limit: pagination.limit,
        total: data.total,
        pages: data.totalPages
      });
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchVendors();
    const interval = setInterval(fetchVendors, 30000);
    return () => clearInterval(interval);
  }, [fetchVendors]);

  return (
    <div className="space-y-12 pb-24 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div className="space-y-4">
          <h1 className="text-5xl font-semibold text-zinc-900 tracking-tight">
            Vendor <span className="text-zinc-400 font-semibold">Portfolio</span>
          </h1>
          <p className="text-zinc-500 font-medium text-sm">
            Monitoring <span className="text-zinc-900 font-semibold">{pagination.total}</span> active business nodes
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search store name, owner or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-8 py-5 bg-white border-2 border-zinc-100 rounded-[28px] text-sm font-bold text-zinc-900 focus:ring-4 ring-zinc-100 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3 p-2 bg-white rounded-[28px] border border-zinc-100 shadow-sm w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPagination(p => ({...p, page: 1})); }}
            className={cn(
              "px-8 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.08em] transition-all",
              activeTab === tab.id 
                ? "bg-zinc-900 text-white shadow-md" 
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-[40px] border border-zinc-100 overflow-hidden shadow-xl bg-white relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-zinc-900 animate-spin" size={40} />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">Business Details</th>
                <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">Contact</th>
                <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              <AnimatePresence mode="popLayout">
                {vendors.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan="3" className="px-10 py-24 text-center">
                       <div className="flex flex-col items-center gap-4">
                          <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300">
                             <Store size={32} />
                          </div>
                          <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No vendors mapped</p>
                       </div>
                    </td>
                  </tr>
                ) : vendors.map((vendor, i) => (
                  <motion.tr 
                    key={vendor._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {vendor.media?.thumbnailUrl ? (
                            <img src={vendor.media.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Store size={20} className="text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-zinc-900">{vendor.storeName || vendor.fullName}</h3>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-zinc-500">
                            <MapPin size={12} />
                            {vendor.location?.district || 'Pending Location'}, {vendor.location?.state || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
                        <p>{vendor.email}</p>
                        <p className="text-zinc-500">{vendor.mobileNumber}</p>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border",
                        vendor.status === 'active' ? "bg-green-50 text-green-700 border-green-100" :
                        vendor.status === 'pending_approval' ? "bg-orange-50 text-orange-700 border-orange-100" :
                        "bg-red-50 text-red-700 border-red-100"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", 
                          vendor.status === 'active' ? "bg-green-500" : 
                          vendor.status === 'pending_approval' ? "bg-orange-500" : "bg-red-500"
                        )} />
                        {vendor.status.replace('_', ' ')}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-10 py-8 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between gap-8">
          <p className="text-xs font-bold text-zinc-500">Showing {vendors.length} of {pagination.total} Vendors</p>
          
          <div className="flex items-center gap-4">
            <button 
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
              className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-all disabled:opacity-50"
            >
              <ChevronLeft size={20} className="mx-auto" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold">
              {pagination.page}
            </div>
            <button 
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
              className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-all disabled:opacity-50"
            >
              <ChevronRight size={20} className="mx-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
