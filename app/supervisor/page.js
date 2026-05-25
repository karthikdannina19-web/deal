"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Store, 
  CheckCircle2, 
  ShieldAlert, 
  XCircle,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react';
import { dashboardService } from '@/services/supervisor/dashboard.service';
import authService from '@/services/supervisor/auth.service';

export default function SupervisorDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = authService.getCurrentSupervisor();

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await dashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 text-zinc-900 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-[32px] p-8 shadow-xl shadow-zinc-200/50 border border-zinc-100 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2">{title}</p>
          <h3 className="text-5xl font-bold tracking-tight text-zinc-900">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${colorClass}`}>
          <Icon size={24} />
        </div>
      </div>
      <div className="mt-8 flex items-center gap-2">
        <Activity size={14} className="text-zinc-400" />
        <p className="text-xs font-semibold text-zinc-500">{subtitle}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-12 pb-24 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight">
            Welcome back, <span className="font-black">{user?.fullName?.split(' ')[0] || 'Supervisor'}</span>
          </h1>
          <p className="text-zinc-500 font-medium mt-2">Here is your regional portfolio summary</p>
        </div>
        <div className="px-6 py-3 bg-zinc-900 text-white rounded-2xl flex items-center gap-4 shadow-lg shadow-zinc-900/20">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">Your Access Code</p>
            <p className="text-lg font-mono tracking-widest font-bold">{user?.supervisorCode}</p>
          </div>
          <div className="w-px h-10 bg-white/20"></div>
          <Store size={24} className="text-admin-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Total Vendors" 
          value={stats?.totalVendors || 0} 
          subtitle="Nodes under your jurisdiction"
          icon={Store}
          colorClass="bg-zinc-100 text-zinc-700"
          delay={0.1}
        />
        <StatCard 
          title="Approved Operations" 
          value={stats?.approvedVendors || 0} 
          subtitle="Fully verified & active nodes"
          icon={CheckCircle2}
          colorClass="bg-green-50 text-green-600"
          delay={0.2}
        />
        <StatCard 
          title="Pending Approval" 
          value={stats?.pendingVendors || 0} 
          subtitle="Awaiting admin clearance"
          icon={ShieldAlert}
          colorClass="bg-orange-50 text-orange-500"
          delay={0.3}
        />
        <StatCard 
          title="Restricted Nodes" 
          value={stats?.rejectedVendors || 0} 
          subtitle="Rejected or suspended operations"
          icon={XCircle}
          colorClass="bg-red-50 text-red-600"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-[40px] p-10 shadow-xl shadow-zinc-200/50 border border-zinc-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-zinc-900">Recent Vendors</h2>
            <TrendingUp className="text-zinc-400" />
          </div>
          {stats?.recentVendors?.length > 0 ? (
            <div className="space-y-4">
              {stats.recentVendors.map((vendor, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={vendor._id} 
                  className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-zinc-200 flex items-center justify-center">
                      <Store size={20} className="text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{vendor.storeName || vendor.fullName}</p>
                      <p className="text-xs font-medium text-zinc-500">{vendor.email}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    vendor.status === 'active' ? 'bg-green-100 text-green-700' :
                    vendor.status === 'pending_approval' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {vendor.status.replace('_', ' ')}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-500 font-medium">
              No recent vendors mapping. Share your supervisor code to grow your portfolio.
            </div>
          )}
        </div>

        <div className="bg-zinc-900 text-white rounded-[40px] p-10 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <Activity size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Ecosystem Status</h2>
            <p className="text-sm font-medium text-white/60 leading-relaxed mb-8">
              Your regional portfolio is functioning normally. All systems are synchronized. Continue monitoring vendor compliance and operational status.
            </p>
          </div>
          
          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-2">Sync Status</p>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-sm font-bold text-white">Live • Real-time Updates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
