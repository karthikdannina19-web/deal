"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
import { supervisorService } from "@/services/admin/supervisor.service";
import { motion } from "framer-motion";
import { 
  UserCheck, 
  ChevronLeft, 
  Loader2,
  Shield,
  Phone,
  Mail,
  Store,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  Edit,
  Power
} from 'lucide-react';
import Link from "next/link";
import { cn } from '@/utils/cn';
import { vendorService } from "@/services/admin/vendor.service";

export default function SupervisorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [supervisor, setSupervisor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await supervisorService.getSupervisorDetail(id);
      setSupervisor(res.data);
    } catch (err) {
      console.error(err);
      router.push('/admin/supervisors');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(supervisor.supervisorCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = async () => {
    if (!confirm(`Are you sure you want to ${supervisor.status === 'active' ? 'disable' : 'enable'} this supervisor?`)) return;
    
    setActionLoading(true);
    try {
      const newStatus = supervisor.status === 'active' ? 'inactive' : 'active';
      await supervisorService.toggleStatus(id, newStatus);
      setSupervisor(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this supervisor? This will unlink all their vendors.')) return;
    
    setActionLoading(true);
    try {
      await supervisorService.deleteSupervisor(id);
      router.push('/admin/supervisors');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 text-admin-primary animate-spin" />
      </div>
    );
  }

  if (!supervisor) return null;

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link 
          href="/admin/supervisors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-admin-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Supervisors
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight">
              Supervisor <span className="text-admin-primary font-semibold">Intelligence</span>
            </h1>
          </div>
          <div className="flex gap-4">
            <Link 
              href={`/admin/supervisors/${id}/edit`}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-700 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-colors"
            >
              <Edit size={16} /> Edit Profile
            </Link>
            <button 
              onClick={handleToggleStatus}
              disabled={actionLoading}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-colors text-white",
                supervisor.status === 'active' ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600"
              )}
            >
              <Power size={16} /> {supervisor.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
            <button 
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="glass-card rounded-[40px] p-10 bg-white border border-zinc-100 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="w-20 h-20 bg-admin-primary/10 rounded-[28px] flex items-center justify-center text-admin-primary">
              <UserCheck size={40} />
            </div>
            <span className={cn(
              "px-4 py-2 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.12em] border",
              supervisor.status === 'active' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
            )}>
              {supervisor.status}
            </span>
          </div>

          <h2 className="text-2xl font-black text-zinc-900 mb-1">{supervisor.fullName}</h2>
          <p className="text-zinc-500 font-medium mb-8">@{supervisor.username}</p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm font-semibold text-zinc-700">
              <div className="p-3 rounded-xl bg-zinc-50 text-zinc-400"><Phone size={18} /></div>
              {supervisor.phoneNumber}
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold text-zinc-700">
              <div className="p-3 rounded-xl bg-zinc-50 text-zinc-400"><Mail size={18} /></div>
              {supervisor.email || 'No email provided'}
            </div>
          </div>

          <div className="mt-10 p-6 bg-zinc-900 rounded-[32px] text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50 mb-3">Supervisor Access Code</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-mono tracking-widest font-bold">{supervisor.supervisorCode}</span>
              <button 
                onClick={handleCopy}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                {copied ? <CheckCircle2 size={20} className="text-green-400" /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-[40px] p-8 bg-white border border-zinc-100 shadow-xl flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1">Total Vendors</p>
                <h3 className="text-5xl font-bold text-zinc-900">{supervisor.analytics?.totalVendors || 0}</h3>
              </div>
              <div className="p-4 bg-admin-primary/10 text-admin-primary rounded-2xl">
                <Store size={24} />
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-400 mt-8">Nodes managed in ecosystem</p>
          </div>

          <div className="glass-card rounded-[40px] p-8 bg-white border border-zinc-100 shadow-xl flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1">Approved Vendors</p>
                <h3 className="text-5xl font-bold text-green-600">{supervisor.analytics?.approvedVendors || 0}</h3>
              </div>
              <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-400 mt-8">Verified operational nodes</p>
          </div>

          <div className="glass-card rounded-[40px] p-8 bg-white border border-zinc-100 shadow-xl flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1">Pending Approval</p>
                <h3 className="text-5xl font-bold text-orange-500">{supervisor.analytics?.pendingVendors || 0}</h3>
              </div>
              <div className="p-4 bg-orange-50 text-orange-500 rounded-2xl">
                <Shield size={24} />
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-400 mt-8">Awaiting admin review</p>
          </div>

          <div className="glass-card rounded-[40px] p-8 bg-white border border-zinc-100 shadow-xl flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1">Rejected/Restricted</p>
                <h3 className="text-5xl font-bold text-red-600">{supervisor.analytics?.rejectedVendors || 0}</h3>
              </div>
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                <XCircle size={24} />
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-400 mt-8">Restricted operations</p>
          </div>
        </div>
      </div>
      
      {/* Quick Access Note */}
      <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl">
         <p className="text-sm font-semibold text-blue-800">
            <Shield size={16} className="inline mr-2" />
            To manage the vendors under this supervisor, navigate to the <Link href="/admin/vendors" className="underline">Vendors Directory</Link> and search by their supervisor code: <strong className="font-mono">{supervisor.supervisorCode}</strong>
         </p>
      </div>

    </div>
  );
}
