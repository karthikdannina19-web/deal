"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Store,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSupervisorStore } from '@/store/useSupervisorStore';
import { cn } from '@/utils/cn';

const navItems = [
  { label: "Dashboard", href: "/supervisor", icon: LayoutDashboard },
  { label: "Vendor Portfolio", href: "/supervisor/vendors", icon: Store },
  { label: "Settings", href: "/supervisor/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar } = useSupervisorStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 280 : 88 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed left-0 top-0 h-screen z-50 bg-white border-r border-zinc-100 flex flex-col shadow-2xl shadow-zinc-200/50",
        !isSidebarOpen && "items-center"
      )}
    >
      <div className="p-6 flex items-center justify-between w-full h-24">
        <AnimatePresence mode="wait">
          {isSidebarOpen ? (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-900/20">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-900">
                Super<span className="text-admin-primary underline decoration-2 underline-offset-4 decoration-admin-primary/30">Node</span>
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="logo-short"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-900/20"
            >
              <span className="text-white font-bold text-xl">S</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isSidebarOpen && (
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all duration-300"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      <nav className={cn(
        "flex-1 overflow-y-auto py-6 flex flex-col gap-2",
        isSidebarOpen ? "px-6" : "px-3"
      )}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex items-center p-4 rounded-2xl transition-all duration-300 group",
                  isSidebarOpen ? "gap-4" : "justify-center",
                  isActive 
                    ? "bg-zinc-900 text-white shadow-xl shadow-zinc-900/20" 
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                <item.icon size={22} className={cn("transition-transform duration-300", !isActive && "group-hover:scale-110")} />
                
                {isSidebarOpen && (
                  <span className="font-semibold text-sm tracking-wide">
                    {item.label}
                  </span>
                )}

                {isActive && isSidebarOpen && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute right-3 w-2 h-2 rounded-full bg-admin-primary"
                  />
                )}

                {!isSidebarOpen && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {!isSidebarOpen && (
        <div className="p-6">
          <button 
            onClick={toggleSidebar}
            className="p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all duration-300 w-full flex justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </motion.aside>
  );
}
