"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, UserCheck, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import authService from '@/services/supervisor/auth.service';

export default function SupervisorLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(formData);
      router.push('/supervisor');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-zinc-100">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-admin-primary/10 rounded-3xl flex items-center justify-center text-admin-primary mb-6">
              <UserCheck size={40} />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Supervisor Portal</h1>
            <p className="text-zinc-500 font-medium text-sm mt-2">Sign in to access your administrative node</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-8 p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-3"
            >
              <ShieldAlert size={18} className="text-red-500 mt-0.5" />
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Username</label>
              <div className="relative">
                <UserCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-3 px-8 py-5 bg-admin-primary text-white rounded-3xl font-bold uppercase tracking-[0.08em] hover:bg-admin-primary/90 hover:shadow-xl hover:shadow-admin-primary/30 transition-all disabled:opacity-70 disabled:pointer-events-none group"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  Authenticate Access
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
