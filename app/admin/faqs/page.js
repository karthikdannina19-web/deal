"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HelpCircle, 
  Plus, 
  Save, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Layers,
  Search,
  Edit3
} from 'lucide-react';
import { cmsAdminService } from "@/services/admin/cms.service";
import RichTextEditor from "../components/RichTextEditor";
import { cn } from '@/utils/cn';

export default function FAQsPage() {
  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("general");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);

  /**
   * Fetch FAQs from backend
   */
  const fetchFaqs = useCallback(async (category) => {
    setIsLoading(true);
    try {
      const response = await cmsAdminService.getFaqs(category);
      if (response.success) {
        setFaqs(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
      setMessage({ type: 'error', text: 'Failed to load FAQs intelligence' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs(activeCategory);
  }, [activeCategory, fetchFaqs]);

  /**
   * Add a new empty FAQ
   */
  const handleAddFaq = () => {
    const newFaq = {
      _id: 'temp-' + Date.now(),
      question: "",
      answer: "",
      category: activeCategory,
      sortOrder: faqs.length + 1,
      isActive: true,
      isNew: true
    };
    setFaqs([newFaq, ...faqs]);
    setEditingId(newFaq._id);
  };

  /**
   * Update FAQ locally
   */
  const updateFaqLocally = (id, field, value) => {
    setFaqs(faqs.map(f => f._id === id ? { ...f, [field]: value } : f));
  };

  /**
   * Save a single FAQ
   */
  const handleSaveFaq = async (faq) => {
    if (!faq.question?.trim() || !faq.answer?.trim() || faq.answer === '<p></p>') {
      setMessage({ type: 'error', text: 'Question and answer cannot be empty' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sortOrder: faq.sortOrder,
        isActive: faq.isActive
      };
      
      // If not temporary ID, pass as 'id' for update
      if (!faq.isNew) {
        payload.id = faq._id;
      }

      const response = await cmsAdminService.upsertFaq(payload);
      if (response.success) {
        setMessage({ type: 'success', text: 'FAQ unit synchronized!' });
        fetchFaqs(activeCategory);
        setEditingId(null);
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to save FAQ:', error);
      setMessage({ type: 'error', text: 'Synchronization failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-24">
      {/* 1. Header Area */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-admin-primary/5 rounded-full border border-admin-primary/10"
          >
            <HelpCircle size={14} className="text-admin-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-admin-primary">Support Intelligence</span>
          </motion.div>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tighter">
            FAQ <span className="text-admin-primary italic">Manager</span>
          </h1>
          <p className="text-zinc-500 font-bold text-sm">
            Configure automated response nodes for the <span className="text-zinc-900 font-black underline decoration-admin-primary/30 decoration-4">{faqs.length}</span> active query vectors
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-all" size={20} />
            <input 
              type="text" 
              placeholder="Search queries..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-8 py-5 bg-white border-2 border-zinc-100 rounded-[28px] text-sm font-bold text-zinc-900 focus:ring-8 ring-admin-primary/5 focus:border-admin-primary/20 outline-none transition-all"
            />
          </div>
          <button 
            onClick={handleAddFaq}
            className="flex items-center justify-center gap-3 px-10 py-5 bg-zinc-900 text-white rounded-[28px] text-sm font-black uppercase tracking-[0.2em] hover:bg-admin-primary hover:shadow-2xl hover:shadow-admin-primary/30 transition-all w-full sm:w-auto group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            New Unit
          </button>
        </div>
      </div>

      {/* 2. Intelligence Ledger */}
      <div className="glass-card rounded-[48px] border-white/60 overflow-hidden shadow-2xl bg-white relative min-h-[500px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-admin-primary animate-spin" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Syncing Intelligence</p>
          </div>
        )}

        <div className="divide-y divide-zinc-50">
          <AnimatePresence mode="popLayout">
            {filteredFaqs.length === 0 && !isLoading ? (
               <div className="px-10 py-32 text-center">
                  <div className="flex flex-col items-center gap-6">
                     <div className="w-24 h-24 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-200">
                        <HelpCircle size={48} />
                     </div>
                     <p className="font-black text-zinc-400 uppercase tracking-widest text-sm">No knowledge units found</p>
                  </div>
               </div>
            ) : filteredFaqs.map((faq, i) => (
              <motion.div 
                key={faq._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "group transition-all duration-500",
                  editingId === faq._id ? "bg-zinc-50/80 p-12" : "hover:bg-zinc-50/30 p-10"
                )}
              >
                {editingId === faq._id ? (
                  <div className="space-y-8">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-admin-primary/10 flex items-center justify-center text-admin-primary">
                              <HelpCircle size={18} />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Editing Knowledge Unit</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <button 
                             onClick={() => setEditingId(null)}
                             className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                           >
                              Discard
                           </button>
                           <button 
                             onClick={() => handleSaveFaq(faq)}
                             disabled={isSaving}
                             className="px-8 py-3 bg-admin-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-admin-primary/20 flex items-center gap-2"
                           >
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              Synchronize
                           </button>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Question Vector</label>
                           <input 
                             type="text" 
                             value={faq.question}
                             onChange={(e) => updateFaqLocally(faq._id, 'question', e.target.value)}
                             placeholder="What is the core inquiry?"
                             className="w-full px-8 py-5 bg-white border-2 border-zinc-100 rounded-2xl font-bold text-zinc-900 focus:border-admin-primary/30 outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Response Payload (Rich Text)</label>
                           <RichTextEditor 
                             value={faq.answer}
                             onChange={(val) => updateFaqLocally(faq._id, 'answer', val)}
                             placeholder="Detailed intelligence response..."
                           />
                        </div>
                     </div>

                     <div className="flex flex-wrap items-center gap-8 pt-4">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Order Priority</span>
                           <input 
                             type="number" 
                             value={faq.sortOrder}
                             onChange={(e) => updateFaqLocally(faq._id, 'sortOrder', parseInt(e.target.value))}
                             className="w-20 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-center font-black"
                           />
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Node</span>
                           <button 
                             onClick={() => updateFaqLocally(faq._id, 'isActive', !faq.isActive)}
                             className={cn(
                               "w-12 h-6 rounded-full relative transition-all duration-500",
                               faq.isActive ? "bg-green-500" : "bg-zinc-200"
                             )}
                           >
                             <div className={cn(
                               "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-500",
                               faq.isActive ? "right-1" : "left-1"
                             )} />
                           </button>
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-8">
                     <div className="pt-2">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-admin-primary/10 group-hover:text-admin-primary transition-all duration-500">
                           <HelpCircle size={24} />
                        </div>
                     </div>
                     <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                           <h4 className="text-xl font-black text-zinc-900 tracking-tight group-hover:text-admin-primary transition-colors italic">
                              {faq.question || "Undefined Question Node"}
                           </h4>
                           {!faq.isActive && <span className="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest">Inactive</span>}
                        </div>
                        <div className="text-sm font-bold text-zinc-400 leading-relaxed max-w-4xl line-clamp-2" dangerouslySetInnerHTML={{ __html: faq.answer || "No response payload configured." }} />
                     </div>
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingId(faq._id)}
                          className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 hover:bg-admin-primary hover:text-white transition-all flex items-center justify-center"
                        >
                           <Plus size={20} className="rotate-45" />
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 text-zinc-300 flex items-center justify-center cursor-move">
                           <GripVertical size={20} />
                        </div>
                     </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Console Messaging */}
        <AnimatePresence>
           {message && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className="fixed bottom-10 right-10 z-[200]"
             >
                <div className={cn(
                  "px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 text-xs font-black uppercase tracking-widest",
                  message.type === 'success' ? "bg-zinc-900 text-white border border-admin-primary/30" : "bg-red-500 text-white"
                )}>
                   {message.type === 'success' ? <CheckCircle2 className="text-admin-primary" size={20} /> : <AlertCircle size={20} />}
                   {message.text}
                </div>
             </motion.div>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
}
