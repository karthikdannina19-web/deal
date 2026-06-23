"use client";

import React from "react";
import { 
  Bell, 
  Search, 
  User, 
  Menu,
  ChevronDown
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAdminStore } from "../../../store/useAdminStore";

/**
 * Floating Glassmorphic TopBar
 * Handles search, notifications, and profile management
 */
export default function TopBar() {
  const { isSidebarOpen, setSidebarOpen, adminUser } = useAdminStore();
  const pathname = usePathname();

  const pathSegments = pathname.split('/').filter(Boolean);
  const section = pathSegments[1] || 'dashboard';
  const title = section
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

  return (
    <header className="h-24 sticky top-0 z-40 px-10 flex items-center justify-between glass-topbar transition-all duration-300">
      {/* Left Section: Context & Breadcrumbs */}
      <div className="flex items-center gap-6">
        {!isSidebarOpen && (
           <button 
             onClick={() => setSidebarOpen(true)}
             className="p-3 rounded-2xl bg-admin-primary/10 text-admin-primary hover:bg-admin-primary hover:text-white transition-all duration-300 shadow-lg shadow-admin-primary/5"
           >
             <Menu size={20} />
           </button>
        )}
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">{title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/60">System</span>
            <div className="w-1 h-1 rounded-full bg-zinc-300" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{title}</span>
          </div>
        </div>
      </div>

      {/* Right Section: Actions & Profile */}
      <div className="flex items-center gap-8">
        {/* Futisitic Search Bar */}
        <div className="hidden lg:flex items-center gap-3 bg-zinc-100/50 border border-zinc-200/50 rounded-2xl px-5 py-3 w-80 focus-within:w-96 focus-within:ring-4 focus-within:ring-admin-primary/10 focus-within:bg-white transition-all duration-500 group">
          <Search size={18} className="text-zinc-400 group-focus-within:text-admin-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search commands or data..." 
            className="bg-transparent border-none outline-none text-sm text-zinc-800 w-full font-bold placeholder:text-zinc-400 placeholder:font-medium"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Hub */}
          <button className="relative p-3.5 rounded-2xl bg-zinc-100/50 text-zinc-500 hover:text-admin-primary hover:bg-admin-primary-soft transition-all duration-300 group">
            <Bell size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-admin-primary rounded-full border-[3px] border-white ring-2 ring-admin-primary/20" />
          </button>

          {/* Vertical Divider */}
          <div className="w-px h-10 bg-zinc-200/60 mx-2" />

          {/* Profile Card */}
          <div className="flex items-center gap-4 pl-2 group cursor-pointer">
            <div className="flex flex-col items-end">
              <p className="text-sm font-black text-[#1A1A2E] tracking-tight group-hover:text-admin-primary transition-colors">
                {adminUser?.fullName || adminUser?.firstName || 'Admin'}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                {adminUser?.role === 'admin' ? 'Super Admin' : 'Staff'}
              </p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-admin-secondary to-white border-2 border-zinc-100 p-0.5 shadow-sm group-hover:shadow-xl group-hover:shadow-admin-primary/10 transition-all duration-300">
                <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                   <User size={24} className="text-admin-primary" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full" />
            </div>
            <ChevronDown size={14} className="text-zinc-400 group-hover:text-admin-primary transition-all duration-300 group-hover:translate-y-0.5" />
          </div>
        </div>
      </div>
    </header>
  );
}
