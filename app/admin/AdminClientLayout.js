"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { useAdminStore } from "../../store/useAdminStore";
import { adminAuthService } from "../../services/admin/auth.service";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "../../utils/cn";

/**
 * Client-Side Admin Layout Wrapper
 * Handles Framer Motion transitions, Sidebar logic, and Session validation.
 */
export default function AdminClientLayout({ children }) {
  const { isSidebarOpen, login, logout, isAuthenticated } = useAdminStore();
  const pathname = usePathname();
  const router = useRouter();

  // 1. Session Hydration
  React.useEffect(() => {
    const user = adminAuthService.getCurrentUser();
    if (user) {
      login(user);
    } else if (pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [pathname]);

  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div 
      className="min-h-screen bg-[#F3F6FB] font-sans font-normal text-base text-[#1A1A2E] flex overflow-x-hidden"
      style={{
        '--admin-primary': '#1A5CA8',
        '--color-admin-primary': '#1A5CA8',
        '--admin-primary-soft': 'rgba(26, 92, 168, 0.1)',
        '--color-admin-primary-soft': 'rgba(26, 92, 168, 0.08)',
        '--admin-primary-glow': 'rgba(26, 92, 168, 0.43)',
        '--color-admin-primary-glow': 'rgba(26, 92, 168, 0.43)'
      }}
    >
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          isSidebarOpen ? "pl-[280px]" : "pl-[88px]"
        )}
      >
        <TopBar />
        
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ 
                duration: 0.5, 
                ease: [0.23, 1, 0.32, 1] 
              }}
              className="max-w-[1600px] mx-auto w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
