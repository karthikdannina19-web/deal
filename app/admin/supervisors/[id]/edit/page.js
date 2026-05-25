"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
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

export default function EditSupervisorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    phoneNumber: '',
    email: ''
  });
  const [supervisor, setSupervisor] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await supervisorService.getSupervisorDetail(id);
      setSupervisor(res.data);
      setFormData({
        fullName: res.data.fullName || '',
        password: '',
        phoneNumber: res.data.phoneNumber || '',
        email: res.data.email || ''
      });
    } catch (err) {
      console.error(err);
      router.push('/admin/supervisors');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      // Only send password if it's not empty
      const payload = { ...formData };
      if (!payload.password) {
        delete payload.password;
      }
      
      await supervisorService.updateSupervisor(id, payload);
      router.push(`/admin/supervisors/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update supervisor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 text-admin-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link 
          href={`/admin/supervisors/${id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-admin-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Supervisor Profile
        </Link>
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight">
            Edit Supervisor <span className="text-admin-primary font-semibold">Profile</span>
          </h1>
          <p className="text-zinc-500 font-medium text-sm mt-2">
            Update administrative node details and credentials
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
                <h3 className="text-red-800 font-bold text-sm tracking-tight mb-1">Update Error</h3>
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
                <UserCheck size={14} className="text-zinc-400" /> Username (Immutable)
              </label>
              <input 
                type="text"
                disabled
                value={supervisor?.username}
                className="w-full px-6 py-5 bg-zinc-100 border-2 border-zinc-200 rounded-3xl text-sm font-bold text-zinc-500 cursor-not-allowed"
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

            <div className="space-y-2 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 flex items-center gap-2">
                <Lock size={14} className="text-admin-primary" /> Reset Password (Optional)
              </label>
              <input 
                type="password"
                name="password"
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="w-full px-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
                placeholder="Leave blank to keep current password"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 flex flex-col md:flex-row gap-4">
            <Link 
              href={`/admin/supervisors/${id}`}
              className="flex-1 flex items-center justify-center gap-3 px-10 py-6 bg-zinc-100 text-zinc-700 rounded-[32px] text-sm font-bold uppercase tracking-[0.08em] hover:bg-zinc-200 transition-all"
            >
              Cancel
            </Link>
            <button 
              type="submit"
              disabled={saving}
              className="flex-[2] flex items-center justify-center gap-3 px-10 py-6 bg-zinc-900 text-white rounded-[32px] text-sm font-bold uppercase tracking-[0.08em] hover:bg-admin-primary hover:shadow-xl hover:shadow-admin-primary/30 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
