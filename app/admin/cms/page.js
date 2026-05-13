"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Save, 
  Info, 
  Shield, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  Code,
  Edit3
} from 'lucide-react';
import { cmsAdminService } from "@/services/admin/cms.service";
import RichTextEditor from "../components/RichTextEditor";
import { cn } from '@/utils/cn';

const PAGES = [
  { id: 'terms-and-conditions', label: 'Terms & Conditions', icon: BookOpen, description: 'Legal guidelines and user agreements' },
  { id: 'privacy-policy', label: 'Privacy Policy', icon: Shield, description: 'Data handling and privacy protocols' },
  { id: 'about-us', label: 'About Us', icon: Info, description: 'Brand story and platform overview' },
];

export default function CMSPage() {
  const [activeTab, setActiveTab] = useState(PAGES[0].id);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  /**
   * Fetch page data from backend
   */
  const fetchPageData = useCallback(async (slug) => {
    setIsLoading(true);
    try {
      const response = await cmsAdminService.getPage(slug);
      if (response.success && response.data) {
        setTitle(response.data.title);
        setContent(response.data.content);
        setLastUpdated(response.data.lastUpdated);
      } else {
        // Page not found (returned null)
        setTitle(PAGES.find(p => p.id === slug).label);
        setContent("");
        setLastUpdated(null);
      }
    } catch (error) {
      console.error('Failed to fetch CMS page:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageData(activeTab);
  }, [activeTab, fetchPageData]);

  /**
   * Save content to backend
   */
  const handleSave = async () => {
    if (!content || !content.trim() || content === '<p></p>') {
      setMessage({ type: 'error', text: 'Content cannot be empty' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const response = await cmsAdminService.upsertPage({
        slug: activeTab,
        title,
        content,
        contentType: 'html'
      });
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Page updated successfully!' });
        setLastUpdated(new Date().toISOString());
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to save CMS page:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save changes' });
    } finally {
      setIsSaving(false);
    }
  };

  const activePageInfo = PAGES.find(p => p.id === activeTab);

  return (
    <div className="space-y-12 pb-24">
      {/* 1. Futuristic Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-admin-primary/5 rounded-full border border-admin-primary/10"
          >
            <FileText size={14} className="text-admin-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-admin-primary">Content Intelligence</span>
          </motion.div>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tighter">
            CMS <span className="text-admin-primary italic">Pages</span>
          </h1>
          <p className="text-zinc-500 font-bold text-sm">
            Orchestrate legal and informational nodes across the <span className="text-zinc-900 font-black underline decoration-admin-primary/30 decoration-4">Rhock Deal</span> ecosystem
          </p>
        </div>

        <div className="flex items-center gap-4">
           {lastUpdated && (
             <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-[10px] font-bold text-zinc-400">
               <Clock size={12} />
               Sync: {new Date(lastUpdated).toLocaleString()}
             </div>
           )}
           <button 
             onClick={handleSave}
             disabled={isSaving || isLoading}
             className="flex items-center justify-center gap-3 px-10 py-5 bg-zinc-900 text-white rounded-[28px] text-sm font-black uppercase tracking-[0.2em] hover:bg-admin-primary hover:shadow-2xl hover:shadow-admin-primary/30 transition-all disabled:opacity-50 group"
           >
             {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
             Deploy Changes
           </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => setActiveTab(page.id)}
            className={cn(
              "p-8 rounded-[40px] border-2 transition-all duration-500 text-left relative overflow-hidden group",
              activeTab === page.id 
                ? "bg-white border-admin-primary shadow-2xl shadow-admin-primary/10 scale-[1.02]" 
                : "bg-white/50 border-zinc-100 hover:border-zinc-200"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500",
              activeTab === page.id ? "bg-admin-primary text-white" : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
            )}>
              <page.icon size={28} />
            </div>
            <h3 className={cn(
              "text-lg font-black tracking-tight mb-2",
              activeTab === page.id ? "text-zinc-900" : "text-zinc-400"
            )}>
              {page.label}
            </h3>
            <p className="text-xs font-bold text-zinc-400 leading-relaxed">
              {page.description}
            </p>
            {activeTab === page.id && (
              <motion.div 
                layoutId="active-bg"
                className="absolute top-0 right-0 p-4 opacity-5"
              >
                <page.icon size={120} />
              </motion.div>
            )}
          </button>
        ))}
      </div>

      {/* 3. Editor Area */}
      <div className="glass-card rounded-[48px] border-white/60 overflow-hidden shadow-2xl bg-white relative min-h-[600px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-admin-primary animate-spin" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Syncing Intelligence</p>
          </div>
        )}

        <div className="p-12 space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-zinc-100 pb-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-[24px] bg-admin-primary/10 flex items-center justify-center text-admin-primary">
                 <Edit3 size={32} />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-zinc-900 tracking-tighter italic">Editing: {title}</h2>
                <p className="text-xs font-bold text-zinc-400">Content supports Rich Text formatting. Changes will be reflected immediately in the mobile app.</p>
              </div>
            </div>
            
            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "px-6 py-3 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest",
                    message.type === 'success' ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                  )}
                >
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />}
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <RichTextEditor 
              value={content}
              onChange={setContent}
              placeholder={`Write the ${title} content here...`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
