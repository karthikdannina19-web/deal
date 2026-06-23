"use client";
 
import React, { useEffect, useState, useMemo } from 'react';
import { useAdminStore } from "@/store/useAdminStore";
import { paymentService } from "@/services/admin/payment.service";
import { 
  Search, 
  IndianRupee, 
  User as UserIcon, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  CreditCard,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Hash,
  Mail,
  Phone,
  Zap,
  ChevronRight,
  Download,
  Info,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/utils/cn";

export default function PaymentsPage() {
  const { payments, setPayments, isLoading, setLoading, setError } = useAdminStore();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPayments(page, 20);
      setPayments(data.payments || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page]);

  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((acc, curr) => curr.status === 'paid' ? acc + (curr.amount / 100) : acc, 0);
    const paidCount = payments.filter(p => p.status === 'paid').length;
    const pendingCount = payments.filter(p => p.status === 'created').length;
    return { totalRevenue, paidCount, pendingCount };
  }, [payments]);

  const filteredPayments = payments.filter(p => 
    p.razorpayOrderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendorId?.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendorId?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const handleExportLedger = async () => {
    try {
      setIsExporting(true);
      const response = await paymentService.exportLedger({
        search: searchQuery || undefined,
      });

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/vnd.ms-excel',
      });
      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename=\"?([^\"]+)\"?/i);
      const fileName = match?.[1] || `payments-ledger-${new Date().toISOString().slice(0, 10)}.xls`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error || 'Failed to export payments ledger');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* 1. Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tighter mb-2 flex items-center gap-4">
            <CreditCard className="text-admin-primary" size={40} />
            Financial <span className="text-admin-primary">Intelligence</span>
          </h1>
          <p className="text-zinc-500 font-bold text-sm bg-zinc-100/50 px-4 py-1.5 rounded-full inline-block">
            {payments.length} Registered Transactions in Ledger
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search Order ID or Vendor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white focus:ring-4 ring-admin-primary/10 outline-none transition-all"
            />
          </div>
          <button
            type="button"
            onClick={handleExportLedger}
            disabled={isExporting}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-zinc-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-admin-primary transition-all w-full sm:w-auto shadow-xl shadow-zinc-900/10 disabled:opacity-60"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {isExporting ? 'Exporting...' : 'Export Ledger'}
          </button>
        </div>
      </div>

      {/* 2. Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-[32px] p-8 border-white/60 bg-gradient-to-br from-admin-primary/5 to-transparent relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <IndianRupee size={80} className="text-admin-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Gross Revenue</p>
          <h3 className="text-4xl font-black text-zinc-900 tracking-tighter">₹{stats.totalRevenue.toLocaleString()}</h3>
          <div className="flex items-center gap-2 mt-4 text-green-600 font-black text-xs">
            <TrendingUp size={14} />
            <span>+12.5% from last month</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-[32px] p-8 border-white/60 bg-gradient-to-br from-green-500/5 to-transparent"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Successful Payments</p>
          <h3 className="text-4xl font-black text-zinc-900 tracking-tighter">{stats.paidCount}</h3>
          <div className="flex items-center gap-2 mt-4 text-green-600 font-black text-xs">
            <CheckCircle2 size={14} />
            <span>Operational efficiency high</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[32px] p-8 border-white/60 bg-gradient-to-br from-yellow-500/5 to-transparent"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Pending Lifecycle</p>
          <h3 className="text-4xl font-black text-zinc-900 tracking-tighter">{stats.pendingCount}</h3>
          <div className="flex items-center gap-2 mt-4 text-yellow-600 font-black text-xs">
            <Clock size={14} />
            <span>Awaiting vendor confirmation</span>
          </div>
        </motion.div>
      </div>

      {/* 3. Enhanced Transaction Table */}
      <div className="glass-card rounded-[40px] border-white/60 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Order Intelligence</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Vendor Node</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Subscription Matrix</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Protocol Status</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="px-10 py-8">
                      <div className="h-4 bg-zinc-100 rounded-full w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredPayments.map((payment) => (
                <motion.tr 
                  key={payment._id}
                  onClick={() => handleRowClick(payment)}
                  whileHover={{ backgroundColor: 'rgba(244, 244, 245, 0.5)' }}
                  className="cursor-pointer transition-all group"
                >
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-900/10 group-hover:scale-110 transition-transform">
                        <Zap size={20} className={payment.status === 'paid' ? "text-admin-primary" : "text-zinc-500"} />
                      </div>
                      <div>
                        <p className="font-black text-zinc-900 tracking-tight">{payment.razorpayOrderId || 'System Ledger'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar size={10} className="text-zinc-400" />
                          <span className="text-[10px] font-bold text-zinc-400">
                            {new Date(payment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                        {payment.vendorId?.logo ? (
                          <img src={payment.vendorId.logo} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={16} className="text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-sm text-zinc-800">{payment.vendorId?.storeName || 'Independent Node'}</p>
                        <p className="text-[10px] font-bold text-zinc-400">{payment.vendorId?.fullName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex flex-col">
                      <span className="px-3 py-1 rounded-lg bg-admin-primary-soft text-admin-primary text-[10px] font-black uppercase tracking-widest inline-block w-fit">
                        {payment.planId?.name || 'Standard Tier'}
                      </span>
                      <p className="text-[10px] font-bold text-zinc-400 mt-1">
                        {payment.planId?.validityDays} Days Validity • {payment.planId?.credits} Credits
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border transition-all",
                      payment.status === 'paid' 
                        ? "bg-green-50 text-green-700 border-green-100 shadow-sm shadow-green-100" 
                        : payment.status === 'created' 
                        ? "bg-yellow-50 text-yellow-700 border-yellow-100 shadow-sm shadow-yellow-100" 
                        : "bg-red-50 text-red-700 border-red-100 shadow-sm shadow-red-100"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                        payment.status === 'paid' ? "bg-green-500" : payment.status === 'created' ? "bg-yellow-500" : "bg-red-500")} 
                      />
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-8 text-right">
                    <div className="flex flex-col items-end">
                      <p className="text-lg font-black text-zinc-900 tracking-tighter">₹{(payment.amount / 100).toLocaleString()}</p>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                        <span>GST 18% included</span>
                        <Info size={10} />
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Console */}
        <div className="px-10 py-6 bg-zinc-50/50 flex items-center justify-between border-t border-zinc-100">
          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
            Showing Protocol Node {page} of {totalPages}
          </p>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all disabled:opacity-30"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Transaction Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <span className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Transaction Manifest</span>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tighter mt-2">
                      Order <span className="text-admin-primary">{selectedPayment.razorpayOrderId}</span>
                    </h2>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all"
                  >
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Vendor Node</label>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 overflow-hidden">
                          {selectedPayment.vendorId?.logo ? (
                             <img src={selectedPayment.vendorId.logo} className="w-full h-full object-cover" />
                          ) : (
                             <UserIcon className="w-full h-full p-4 text-zinc-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-zinc-900 tracking-tight">{selectedPayment.vendorId?.storeName}</p>
                          <p className="text-xs font-bold text-zinc-500">{selectedPayment.vendorId?.fullName}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                          <Mail size={14} className="text-zinc-400" />
                          {selectedPayment.vendorId?.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                          <Phone size={14} className="text-zinc-400" />
                          {selectedPayment.vendorId?.phone}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Subscription Tier</label>
                      <div className="mt-3 p-4 rounded-3xl bg-zinc-50 border border-zinc-100">
                        <h4 className="font-black text-admin-primary uppercase tracking-tighter text-xl">{selectedPayment.planId?.name}</h4>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Validity</p>
                            <p className="font-black text-zinc-800 tracking-tight">{selectedPayment.planId?.validityDays} Days</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Credits</p>
                            <p className="font-black text-zinc-800 tracking-tight">{selectedPayment.planId?.credits} Points</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Settlement Matrix</label>
                      <div className="mt-3 space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                          <span className="text-xs font-bold text-zinc-500">Plan Amount</span>
                          <span className="font-black text-zinc-900">₹{(selectedPayment.amount / 118 * 100 / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                          <span className="text-xs font-bold text-zinc-500">GST (18%)</span>
                          <span className="font-black text-zinc-900">₹{(selectedPayment.amount / 118 * 18 / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-4">
                          <span className="text-sm font-black text-zinc-900 uppercase">Total Settlement</span>
                          <span className="text-2xl font-black text-admin-primary tracking-tighter">₹{(selectedPayment.amount / 100).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Digital Signatures</label>
                      <div className="mt-3 space-y-2">
                        <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between overflow-hidden">
                          <span className="text-[10px] font-black text-zinc-400 uppercase">Payment ID</span>
                          <span className="text-[10px] font-mono text-zinc-600 truncate ml-4">{selectedPayment.razorpayPaymentId || 'PENDING'}</span>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                          <span className="text-[10px] font-black text-zinc-400 uppercase">Status</span>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            selectedPayment.status === 'paid' ? "text-green-600" : "text-yellow-600"
                          )}>{selectedPayment.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button className="flex-1 py-5 bg-zinc-900 text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-admin-primary transition-all flex items-center justify-center gap-3">
                    <Download size={20} />
                    Download Invoice
                  </button>
                  <button className="px-8 py-5 bg-zinc-100 text-zinc-500 rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">
                    Flag Order
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
