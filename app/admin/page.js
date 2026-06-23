"use client";

import React, { useEffect } from 'react';
import { useAdminStore } from "../../store/useAdminStore";
import { dashboardService } from "../../services/admin/dashboard.service";
import DashboardStats from "./components/DashboardStats";
import DashboardCharts from "./components/DashboardCharts";
import { ArrowUpRight, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Admin Dashboard Home Page
 * Aggregates and visualizes platform-wide stats and security metrics.
 */
export default function AdminDashboard() {
  const { 
    dashboardStats, 
    setDashboardStats, 
    isLoading, 
    setLoading, 
    setError 
  } = useAdminStore();

  // 1. Live Data Hydration
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await dashboardService.getStats();
        setDashboardStats(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Optional: Polling for real-time updates every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !dashboardStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-admin-primary animate-spin" />
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Synchronizing Neural Metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* 1. Futuristic Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-zinc-900 tracking-tighter mb-2">
            System <span className="text-admin-primary underline decoration-[8px] decoration-admin-primary/10 underline-offset-[12px]">Metrics</span>
          </h1>
          <p className="text-zinc-500 font-bold text-sm tracking-wide bg-zinc-100/80 border border-zinc-200/50 px-5 py-2 rounded-full inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-admin-primary animate-pulse" />
            Live platform overview as of {new Date().toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 rounded-2xl border border-green-200/50 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-green-500" />
             <span className="text-green-700 text-[10px] font-black uppercase tracking-widest">Database Secure</span>
           </div>
           <div className="px-5 py-2.5 bg-admin-primary/10 rounded-2xl border border-admin-primary/20 shadow-sm group cursor-help transition-all hover:bg-admin-primary hover:border-admin-primary">
             <span className="text-admin-primary text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Real-time Node</span>
           </div>
        </div>
      </div>

      {/* 2. Main Stat Widgets (Client Component) */}
      <DashboardStats stats={dashboardStats?.data || {}} />

      {/* 3. Analytics & System Security Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Analytics Module */}
        <div className="xl:col-span-2">
          <DashboardCharts />
        </div>

        {/* Security / System Audit Hub */}
        <div className="xl:col-span-1 pt-10">
          <div className="glass-card rounded-[48px] p-10 h-full border-white/60 bg-white/40 shadow-2xl relative overflow-hidden group">
             {/* Decorative Background Glow */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-admin-secondary/30 blur-[100px] -z-10 group-hover:bg-admin-primary/10 transition-colors duration-1000" />

             <div className="flex items-center gap-5 mb-12">
               <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-900/20">
                 <ShieldCheck size={28} />
               </div>
               <div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">Security Audit</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Environment Protected</p>
               </div>
             </div>

             <div className="space-y-5">
                {[
                  { label: "DDoS Protection", status: "Active", color: "green" },
                  { label: "IP Rate Limiting", status: "Active", color: "blue" },
                  { label: "SSL Certification", status: "Valid", color: "green" },
                  { label: "Global WAF", status: "Filtered", color: "blue" },
                  { label: "DB Sanitization", status: "Enabled", color: "green" },
                  { label: "Automated Backups", status: "Every 6h", color: "zinc" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-white/80 rounded-3xl border border-zinc-100/50 hover:border-admin-primary/20 hover:shadow-lg hover:shadow-zinc-100/50 transition-all cursor-default">
                    <span className="text-sm font-bold text-zinc-600 tracking-tight">{item.label}</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-xl border",
                      item.color === 'green' ? "bg-green-50 text-green-700 border-green-100" : 
                      item.color === 'blue' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-zinc-50 text-zinc-500 border-zinc-100"
                    )}>
                      {item.status}
                    </span>
                  </div>
                ))}
             </div>

             <button
               type="button"
               disabled
               title="Security statuses shown above are currently a static launch snapshot."
               className="w-full mt-12 py-5 rounded-[22px] bg-zinc-200 text-zinc-500 font-black text-[11px] uppercase tracking-[0.25em] cursor-not-allowed flex items-center justify-center gap-4"
             >
                Security Snapshot
                <ArrowUpRight size={18} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
