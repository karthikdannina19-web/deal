"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Search,
  LogOut,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { useSupervisorStore } from '@/store/useSupervisorStore';
import authService from '@/services/supervisor/auth.service';
import { cn } from '@/utils/cn';

export default function Topbar() {
  const router = useRouter();
  const { isSidebarOpen } = useSupervisorStore();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(authService.getCurrentSupervisor());

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    authService.logout();
    router.push('/supervisor/login');
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 right-0 z-40 transition-all duration-300",
        isSidebarOpen ? "left-72" : "left-24",
        scrolled ? "p-4" : "p-6"
      )}
    >
      <div className={cn(
        "w-full flex items-center justify-between rounded-[32px] transition-all duration-300",
        scrolled ? "bg-white/80 backdrop-blur-xl shadow-lg border border-white/50 px-6 py-3" : "bg-transparent px-2"
      )}>
        {/* Search */}
        <div className="hidden md:flex items-center gap-3 bg-white/50 border border-zinc-200/50 backdrop-blur-sm px-4 py-2.5 rounded-2xl w-96 group focus-within:bg-white focus-within:border-zinc-300 focus-within:shadow-md transition-all duration-300">
          <Search size={18} className="text-zinc-400 group-focus-within:text-zinc-700 transition-colors" />
          <input 
            type="text" 
            placeholder="Search ecosystem..." 
            className="bg-transparent border-none outline-none text-sm font-semibold text-zinc-800 w-full placeholder:text-zinc-400 placeholder:font-medium"
          />
          <div className="px-2 py-1 bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
            Ctrl K
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <button className="relative p-3 rounded-2xl bg-white/50 hover:bg-white border border-zinc-200/50 backdrop-blur-sm text-zinc-600 hover:shadow-md transition-all duration-300">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-4 ring-white" />
          </button>

          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 p-1.5 pr-4 rounded-[20px] bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white">
                <UserCheck size={18} />
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-bold text-zinc-900 leading-tight">{user?.fullName || 'Supervisor'}</span>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.08em]">{user?.supervisorCode || 'Code Pending'}</span>
              </div>
              <ChevronDown size={16} className="text-zinc-400 ml-2" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden"
                >
                  <div className="p-4 border-b border-zinc-50 bg-zinc-50/50">
                    <p className="font-bold text-zinc-900">{user?.fullName}</p>
                    <p className="text-xs font-medium text-zinc-500 truncate">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
                    >
                      <LogOut size={18} />
                      Sign Out Protocol
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
