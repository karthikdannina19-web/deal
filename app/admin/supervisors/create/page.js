"use client";

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { 
  UserCheck, 
  ChevronLeft, 
  Save, 
  Loader2,
  Shield,
  User,
  Lock,
  Phone,
  Mail
} from 'lucide-react';
import Link from "next/link";
import { supervisorService } from "@/services/admin/supervisor.service";

export default function CreateSupervisorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    phoneNumber: '',
    email: '',
    status: 'active'
  });
  const [error, setError] = useState('');

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
      await supervisorService.createSupervisor(formData);
      router.push('/admin/supervisors');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create supervisor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link 
          href="/admin/supervisors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-admin-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Supervisors
        </Link>
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight">
            Deploy New <span className="text-admin-primary font-semibold">Supervisor</span>
          </h1>
          <p className="text-zinc-500 font-medium text-sm mt-2">
            Create a new administrative node to manage regional vendor portfolios
          </p>
        </div>
      </div>

      <div className="glass-card rounded-[48px] border-white/60 overflow-hidden shadow-2xl bg-white p-10 md:p-14">
        {error && (
          <div className="mb-8 p-6 bg-red-50/50 border border-red-200 rounded-3xl flex items-start gap-4">
             <div className="p-2 bg-red-100 rounded-xl text-red-600">
                <Shield size={20} />
             </div>
             <div>
                <h3 className="text-red-800 font-bold text-sm tracking-tight mb-1">Registration Error</h3>
                <p className="text-red-600 text-sm font-medium">{error}</p>
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 flex items-center gap-2">
                <User size={14} className="text-admin-primary" /> Full Name
              </label>
              <input 
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 flex items-center gap-2">
                <UserCheck size={14} className="text-admin-primary" /> Username
              </label>
              <input 
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
                placeholder="johndoe123"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 flex items-center gap-2">
                <Lock size={14} className="text-admin-primary" /> Initial Password
              </label>
              <input 
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="w-full px-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 flex items-center gap-2">
                <Phone size={14} className="text-admin-primary" /> Phone Number
              </label>
              <input 
                type="tel"
                name="phoneNumber"
                required
                pattern="[0-9]{10}"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
                placeholder="10 digit number"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 flex items-center gap-2">
                <Mail size={14} className="text-admin-primary" /> Email Address
              </label>
              <input 
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 flex items-center gap-2">
                <Shield size={14} className="text-admin-primary" /> Status
              </label>
              <select 
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all appearance-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100">
            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-10 py-6 bg-zinc-900 text-white rounded-[32px] text-sm font-bold uppercase tracking-[0.08em] hover:bg-admin-primary hover:shadow-xl hover:shadow-admin-primary/30 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
              {loading ? 'Deploying...' : 'Deploy Supervisor Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
