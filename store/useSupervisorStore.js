import { create } from 'zustand';

export const useSupervisorStore = (set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
});

export const createSupervisorStore = create(useSupervisorStore);
