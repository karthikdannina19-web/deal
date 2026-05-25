"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supervisorService } from "@/services/admin/supervisor.service";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck, 
  Loader2,
  Plus,
  Shield,
  Phone,
  Store
} from 'lucide-react';
import { cn } from '@/utils/cn';

const TABS = [
  { id: 'all', label: 'All Supervisors' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

export default function SupervisorsPage() {
  const router = useRouter();
  const [supervisors, setSupervisors] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const fetchSupervisors = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery,
        page: pagination.page,
        limit: pagination.limit
      };
      
      const data = await supervisorService.getSupervisors(filters);
      setSupervisors(data.supervisors || []);
      setPagination({
        page: data.page,
        limit: pagination.limit,
        total: data.total,
        pages: data.totalPages
      });
    } catch (error) {
      console.error('Failed to fetch supervisors:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchSupervisors();
    
    // Polling every 30s
    const interval = setInterval(fetchSupervisors, 30000);
    return () => clearInterval(interval);
  }, [fetchSupervisors]);

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-admin-primary/5 rounded-full border border-admin-primary/10"
          >
            <Shield size={14} className="text-admin-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-primary">Workforce Management</span>
          </motion.div>
          <h1 className="text-5xl font-semibold text-zinc-900 tracking-tight">
            Supervisor <span className="text-admin-primary font-semibold">Nodes</span>
          </h1>
          <p className="text-zinc-500 font-medium text-sm">
            Managing <span className="text-zinc-900 font-semibold underline decoration-admin-primary/30 decoration-2">{pagination.total}</span> regional supervisors
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-all duration-500" size={22} />
            <input 
              type="text" 
              placeholder="Search by name, username or code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-8 py-5 bg-white border-2 border-zinc-100 rounded-[28px] text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all shadow-sm group-hover:shadow-md"
            />
          </div>
          <Link href="/admin/supervisors/create" className="flex items-center justify-center gap-3 px-10 py-5 bg-zinc-900 text-white rounded-[28px] text-sm font-semibold uppercase tracking-[0.08em] hover:bg-admin-primary hover:shadow-lg hover:shadow-admin-primary/30 transition-all w-full sm:w-auto">
            <Plus size={20} className="transition-transform" />
            Add Supervisor
          </Link>
        </div>
      </div>

      {/* Filters */}
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

      {/* Table */}
      <div className="glass-card rounded-[48px] border-white/60 overflow-hidden shadow-2xl relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-admin-primary animate-spin" size={48} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Syncing nodes</p>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/30 border-b border-zinc-100/80">
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Supervisor Profile</th>
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Access Code</th>
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Vendor Portfolio</th>
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Status</th>
                <th className="px-10 py-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              <AnimatePresence mode="popLayout">
                {supervisors.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-10 py-32 text-center">
                       <div className="flex flex-col items-center gap-6">
                          <div className="w-24 h-24 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-200">
                             <UserCheck size={48} />
                          </div>
                          <p className="font-semibold text-zinc-400 uppercase tracking-[0.08em] text-sm">No supervisors found</p>
                       </div>
                    </td>
                  </tr>
                ) : supervisors.map((sup, i) => (
                  <motion.tr 
                    key={sup._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group hover:bg-zinc-50/50 transition-all duration-300"
                  >
                    <td className="px-10 py-8">
                      <div className="flex flex-col">
                         <h3 className="text-lg font-black text-zinc-900 tracking-tight">{sup.fullName}</h3>
                         <p className="text-xs text-zinc-500 font-medium">@{sup.username}</p>
                         <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-zinc-600">
                            <Phone size={12} className="text-admin-primary" />
                            {sup.phoneNumber}
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl font-mono text-sm font-bold text-zinc-700 tracking-widest border border-zinc-200">
                         {sup.supervisorCode}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                             <Store size={16} className="text-admin-primary" />
                             {sup.totalVendors} Total
                          </div>
                          <div className="flex gap-4 text-xs font-medium">
                             <span className="text-green-600">{sup.approvedVendors || 0} Approved</span>
                             <span className="text-orange-500">{sup.pendingVendors || 0} Pending</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.08em] border",
                        sup.status === 'active' ? "bg-green-50/50 text-green-700 border-green-100" : "bg-red-50/50 text-red-700 border-red-100"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", sup.status === 'active' ? "bg-green-500" : "bg-red-500")} />
                        {sup.status}
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button 
                        onClick={() => router.push(`/admin/supervisors/${sup._id}`)}
                        className="group/btn relative w-12 h-12 rounded-2xl bg-zinc-50 text-zinc-400 hover:bg-admin-primary hover:text-white hover:rotate-12 transition-all duration-500 inline-flex items-center justify-center overflow-hidden shadow-sm"
                      >
                        <Eye size={20} className="group-hover/btn:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-10 py-10 bg-zinc-50/50 border-t border-zinc-100/50 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-1">
             <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.08em]">Pagination</p>
             <p className="text-xs font-bold text-zinc-500">Showing {supervisors.length} of {pagination.total}</p>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
              className="w-14 h-14 rounded-3xl bg-white border-2 border-zinc-100 text-zinc-400 hover:text-admin-primary hover:border-admin-primary transition-all disabled:opacity-30 disabled:scale-95"
            >
              <ChevronLeft size={24} className="mx-auto" />
            </button>
            <div className="w-14 h-14 rounded-3xl bg-zinc-900 text-white flex items-center justify-center font-semibold text-lg">
              {pagination.page}
            </div>
            <button 
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
              className="w-14 h-14 rounded-3xl bg-white border-2 border-zinc-100 text-zinc-400 hover:text-admin-primary hover:border-admin-primary transition-all disabled:opacity-30 disabled:scale-95"
            >
              <ChevronRight size={24} className="mx-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
