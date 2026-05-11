import { create } from 'zustand';

/**
 * Admin Panel Global State
 * Manages UI, Authentication, and Module Data
 */
export const useAdminStore = create((set) => ({
  // ==========================================
  // UI & Session State
  // ==========================================
  isSidebarOpen: true,
  activeTab: 'Dashboard',
  adminUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // ==========================================
  // Module Data
  // ==========================================
  users: [],
  vendors: [],
  ads: [],
  payments: [],
  coinTransactions: [],
  categories: [],
  dashboardStats: null,
  analyticsData: [],

  // ==========================================
  // UI Actions
  // ==========================================
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (err) => set({ error: err }),

  // ==========================================
  // Auth Actions
  // ==========================================
  login: (user) => set({ 
    adminUser: user, 
    isAuthenticated: true,
    error: null
  }),

  logout: () => {
    set({ 
      adminUser: null, 
      isAuthenticated: false,
      users: [],
      vendors: [],
      ads: []
    });
  },

  // ==========================================
  // Data Setters
  // ==========================================
  setUsers: (users) => set({ users }),
  setVendors: (vendors) => set({ vendors }),
  setAds: (ads) => set({ ads }),
  setPayments: (payments) => set({ payments }),
  setCoinTransactions: (transactions) => set({ coinTransactions: transactions }),
  setCategories: (categories) => set({ categories }),
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  setAnalyticsData: (analyticsData) => set({ analyticsData }),

  // ==========================================
  // Optimistic/Local Updates
  // ==========================================
  updateVendorStatus: (vendorId, status) => set((state) => ({
    vendors: state.vendors.map((v) => 
      v._id === vendorId ? { ...v, status } : v
    ),
  })),

  updateAdStatus: (adId, status) => set((state) => ({
    ads: state.ads.map((ad) => 
      ad._id === adId ? { ...ad, status } : ad
    ),
  })),
}));
