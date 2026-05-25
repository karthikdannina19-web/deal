"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import authService from '@/services/supervisor/auth.service';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { useSupervisorStore } from '@/store/useSupervisorStore';
import { cn } from '@/utils/cn';

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isSidebarOpen } = useSupervisorStore();

  useEffect(() => {
    // Exclude login page from auth check
    if (pathname === '/supervisor/login') {
      setIsAuthenticated(true);
      return;
    }

    const token = authService.getToken();
    if (!token) {
      router.push('/supervisor/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  if (!isAuthenticated) {
    return null; // Or a loading spinner
  }

  if (pathname === '/supervisor/login') {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Sidebar />
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen flex flex-col relative",
          isSidebarOpen ? "pl-72" : "pl-24"
        )}
      >
        <Topbar />
        <main className="flex-1 p-6 md:p-10 pt-24 md:pt-32">
          {children}
        </main>
      </div>
    </div>
  );
}
