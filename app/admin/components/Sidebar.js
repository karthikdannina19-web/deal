"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  CreditCard, 
  Megaphone, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  PieChart, 
  Layers,
  Wallet,
  Bell,
  Tag,
  FileText,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import { useAdminStore } from '../../../store/useAdminStore';
import { cn } from '../../../utils/cn';

/**
 * Futuristic Glassmorphic Sidebar
 * Animated with Framer Motion and fully collapsible
 */
const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Vendors", href: "/admin/vendors", icon: Store },
  { label: "Supervisors", href: "/admin/supervisors", icon: UserCheck },
  { label: "Ads", href: "/admin/ads", icon: Megaphone },
  { label: "Ad Sections", href: "/admin/sections", icon: Tag },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Economy", href: "/admin/coins", icon: Wallet },
  { label: "Referrals", href: "/admin/referrals", icon: Users },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: PieChart },
  { label: "Categories", href: "/admin/categories", icon: Layers },
  { label: "Coupons", href: "/admin/coupons", icon: Tag },
  { label: "CMS Pages", href: "/admin/cms", icon: FileText },
  { label: "FAQs", href: "/admin/faqs", icon: HelpCircle },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar } = useAdminStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 280 : 88 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed left-0 top-0 h-screen z-50 glass-sidebar flex flex-col",
        !isSidebarOpen && "items-center"
      )}
    >
      {/* Brand Header */}
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
              <div className="w-10 h-10 rounded-2xl bg-admin-primary flex items-center justify-center shadow-lg shadow-admin-primary/30">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-[#1A1A2E]">
                Rhock<span className="text-admin-primary underline decoration-2 underline-offset-4 decoration-admin-primary/30">Deal</span>
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="logo-short"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-10 h-10 rounded-2xl bg-admin-primary flex items-center justify-center shadow-lg shadow-admin-primary/30"
            >
              <span className="text-white font-bold text-xl">R</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isSidebarOpen && (
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-admin-primary-soft text-zinc-400 hover:text-admin-primary transition-all duration-300"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto no-scrollbar scroll-smooth">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 relative group cursor-pointer",
                  isActive 
                    ? "bg-admin-primary text-white shadow-[0_8px_20px_rgba(26,92,168,0.25)]" 
                    : "text-zinc-500 hover:text-admin-primary hover:bg-admin-primary-soft"
                )}
              >
                <Icon 
                  size={22} 
                  className={cn(
                    "shrink-0 transition-transform duration-300",
                    isActive ? "text-white" : "group-hover:scale-110",
                    isActive && "animate-pulse"
                  )} 
                />
                
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-bold text-[15px] tracking-wide"
                  >
                    {item.label}
                  </motion.span>
                )}

                {/* Hover Glow Dot */}
                {isActive && (
                  <motion.div 
                    layoutId="active-dot"
                    className="absolute -left-1 w-1.5 h-6 bg-white rounded-r-full"
                  />
                )}

                {/* Tooltip for collapsed state */}
                {!isSidebarOpen && (
                  <div className="absolute left-20 bg-zinc-900/90 backdrop-blur-md text-white text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 shadow-2xl z-[100]">
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Interaction */}
      <div className="p-4 border-t border-zinc-100/50 mt-auto">
        {!isSidebarOpen ? (
          <button 
            onClick={toggleSidebar}
            className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-admin-primary hover:bg-admin-primary-soft transition-all"
          >
            <ChevronRight size={20} />
          </button>
        ) : (
          <button 
            className="flex items-center gap-4 px-5 py-4 w-full rounded-2xl text-zinc-500 hover:text-red-500 hover:bg-red-50 transition-all duration-300 group"
          >
            <LogOut size={22} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest">Sign Out</span>
          </button>
        )}
      </div>
    </motion.aside>
  );
}
