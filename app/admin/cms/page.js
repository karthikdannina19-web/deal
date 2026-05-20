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
  Edit3,
  Phone,
  Plus,
  Trash2,
  Globe,
  Mail,
  Link2
} from 'lucide-react';
import { cmsAdminService } from "@/services/admin/cms.service";
import RichTextEditor from "../components/RichTextEditor";
import { cn } from '@/utils/cn';

const PAGES = [
  { id: 'terms-and-conditions', label: 'Terms & Conditions', icon: BookOpen, description: 'Legal guidelines and user agreements' },
  { id: 'privacy-policy', label: 'Privacy Policy', icon: Shield, description: 'Data handling and privacy protocols' },
  { id: 'about-us', label: 'About Us', icon: Info, description: 'Brand story and platform overview' },
  { id: 'contact-us', label: 'Contact Us', icon: Phone, description: 'Contact channels and social media' },
];

const DEFAULT_CONTENT_SEEDS = {
  'about-us': {
    title: 'About Us',
    introParagraphs: [
      'Welcome to our platform. We are dedicated to providing the best local deals and store discoveries.',
      'Our mission is to connect local businesses with customers seamlessly.'
    ],
    sectionTitle: 'Why Choose Us',
    sectionParagraphs: [
      'We curate the top offers.',
      'We verify every store for quality and authenticity.'
    ],
    features: [
      { id: '1', title: 'Trusted Vendors', description: 'All our vendors are verified.', iconKey: 'shield', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2091/2091665.png', order: 1, isActive: true },
      { id: '2', title: 'Best Deals', description: 'Unbeatable discounts every day.', iconKey: 'tag', iconUrl: 'https://cdn-icons-png.flaticon.com/512/1040/1040230.png', order: 2, isActive: true },
    ]
  },
  'contact-us': {
    title: 'Contact Us',
    heading: 'Get in Touch',
    subheading: 'We would love to hear from you. Reach out to our support team.',
    contactMethods: [
      { type: 'email', label: 'Email Support', value: 'support@example.com', actionLabel: 'Send Email', actionUrl: 'mailto:support@example.com', iconKey: 'email', iconUrl: 'https://cdn-icons-png.flaticon.com/512/542/542740.png' },
      { type: 'phone', label: 'Call Us', value: '+1 234 567 8900', actionLabel: 'Call Now', actionUrl: 'tel:+12345678900', iconKey: 'phone', iconUrl: 'https://cdn-icons-png.flaticon.com/512/724/724664.png' },
      { type: 'whatsapp', label: 'WhatsApp', value: '+1 234 567 8900', actionLabel: 'Chat', actionUrl: 'https://wa.me/12345678900', iconKey: 'whatsapp', iconUrl: 'https://cdn-icons-png.flaticon.com/512/733/733585.png' }
    ],
    socialLinks: [
      { platform: 'facebook', url: 'https://facebook.com/example', isActive: true, order: 1, iconKey: 'facebook' },
      { platform: 'instagram', url: 'https://instagram.com/example', isActive: true, order: 2, iconKey: 'instagram' },
      { platform: 'twitter', url: 'https://twitter.com/example', isActive: true, order: 3, iconKey: 'twitter' }
    ],
    footerText: '© 2026 Example Inc. All rights reserved.',
    officeAddress: '123 Main Street, City, Country',
    supportHours: 'Mon - Fri, 9:00 AM - 6:00 PM'
  }
};

export default function CMSPage() {
  const [activeTab, setActiveTab] = useState(PAGES[0].id);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [jsonState, setJsonState] = useState(null);

  /**
   * Fetch page data from backend
   */
  const fetchPageData = useCallback(async (slug) => {
    setIsLoading(true);
    setJsonState(null);
    try {
      const response = await cmsAdminService.getPage(slug);
      if (response.success && response.data) {
        setTitle(response.data.title || PAGES.find(p => p.id === slug).label);
        setContent(response.data.content);
        setLastUpdated(response.data.lastUpdated);
        
        if (slug === 'about-us' || slug === 'contact-us') {
          try {
            const parsed = JSON.parse(response.data.content);
            setJsonState(parsed);
          } catch (e) {
            console.error('Failed to parse CMS JSON, loading default seed data:', e);
            setJsonState(DEFAULT_CONTENT_SEEDS[slug]);
          }
        }
      } else {
        // Page not found in DB
        setTitle(PAGES.find(p => p.id === slug).label);
        setContent("");
        setLastUpdated(null);
        if (slug === 'about-us' || slug === 'contact-us') {
          setJsonState(DEFAULT_CONTENT_SEEDS[slug]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch CMS page:', error);
      setTitle(PAGES.find(p => p.id === slug).label);
      setContent("");
      setLastUpdated(null);
      if (slug === 'about-us' || slug === 'contact-us') {
        setJsonState(DEFAULT_CONTENT_SEEDS[slug]);
      }
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
    let payloadContent = content;
    let payloadContentType = 'html';

    if (activeTab === 'about-us' || activeTab === 'contact-us') {
      if (!jsonState) {
        setMessage({ type: 'error', text: 'Content cannot be empty' });
        return;
      }
      payloadContent = JSON.stringify(jsonState);
      payloadContentType = 'json';
    } else {
      if (!content || !content.trim() || content === '<p></p>') {
        setMessage({ type: 'error', text: 'Content cannot be empty' });
        return;
      }
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const response = await cmsAdminService.upsertPage({
        slug: activeTab,
        title,
        content: payloadContent,
        contentType: payloadContentType
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
            Orchestrate legal, informational, and dynamic channels across the <span className="text-zinc-900 font-black underline decoration-admin-primary/30 decoration-4">Rhock Deal</span> ecosystem
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => setActiveTab(page.id)}
            className={cn(
              "p-6 rounded-[40px] border-2 transition-all duration-500 text-left relative overflow-hidden group",
              activeTab === page.id 
                ? "bg-white border-admin-primary shadow-2xl shadow-admin-primary/10 scale-[1.02]" 
                : "bg-white/50 border-zinc-100 hover:border-zinc-200"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500",
              activeTab === page.id ? "bg-admin-primary text-white" : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
            )}>
              <page.icon size={24} />
            </div>
            <h3 className={cn(
              "text-md font-black tracking-tight mb-2",
              activeTab === page.id ? "text-zinc-900" : "text-zinc-400"
            )}>
              {page.label}
            </h3>
            <p className="text-[10px] font-bold text-zinc-400 leading-relaxed">
              {page.description}
            </p>
            {activeTab === page.id && (
              <motion.div 
                layoutId="active-bg"
                className="absolute top-0 right-0 p-4 opacity-5"
              >
                <page.icon size={100} />
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
                <p className="text-xs font-bold text-zinc-400">
                  {activeTab === 'about-us' || activeTab === 'contact-us' 
                    ? "Structured JSON configuration editor. Changes will instantly propagate to User Mobile App screens." 
                    : "Content supports Rich Text formatting. Changes will be reflected immediately in the mobile app."}
                </p>
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
            {/* Standard rich text editor for legal pages */}
            {(activeTab === 'terms-and-conditions' || activeTab === 'privacy-policy') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Page Header Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                  />
                </div>
                <RichTextEditor 
                  value={content}
                  onChange={setContent}
                  placeholder={`Write the ${title} content here...`}
                />
              </div>
            )}

            {/* About Us Editor */}
            {activeTab === 'about-us' && jsonState && (
              <div className="space-y-12">
                {/* Page Title */}
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Header Page Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                  />
                </div>

                {/* Intro Paragraphs */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Introduction Paragraphs</h3>
                    <button 
                      onClick={() => {
                        const updated = { ...jsonState, introParagraphs: [...(jsonState.introParagraphs || []), ""] };
                        setJsonState(updated);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-admin-primary transition-all"
                    >
                      <Plus size={14} /> Add Paragraph
                    </button>
                  </div>
                  
                  {jsonState.introParagraphs?.map((paragraph, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <textarea 
                        value={paragraph} 
                        onChange={(e) => {
                          const newParagraphs = [...jsonState.introParagraphs];
                          newParagraphs[index] = e.target.value;
                          setJsonState({ ...jsonState, introParagraphs: newParagraphs });
                        }}
                        placeholder={`Enter intro paragraph #${index + 1}...`}
                        className="flex-1 px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800 min-h-[100px]"
                      />
                      <button 
                        onClick={() => {
                          const newParagraphs = jsonState.introParagraphs.filter((_, i) => i !== index);
                          setJsonState({ ...jsonState, introParagraphs: newParagraphs });
                        }}
                        className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all self-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {(!jsonState.introParagraphs || jsonState.introParagraphs.length === 0) && (
                    <p className="text-xs text-zinc-400 italic">No paragraphs configured. Click Add Paragraph to start.</p>
                  )}
                </div>

                {/* Why Choose Us Title & Paragraphs */}
                <div className="space-y-6">
                  <div className="border-b border-zinc-100 pb-4">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">"Why Choose Us" Section</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Section Title</label>
                    <input 
                      type="text" 
                      value={jsonState.sectionTitle || ""} 
                      onChange={(e) => setJsonState({ ...jsonState, sectionTitle: e.target.value })} 
                      className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Section Paragraphs</label>
                      <button 
                        onClick={() => {
                          const updated = { ...jsonState, sectionParagraphs: [...(jsonState.sectionParagraphs || []), ""] };
                          setJsonState(updated);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-admin-primary transition-all"
                      >
                        <Plus size={14} /> Add Paragraph
                      </button>
                    </div>
                    
                    {jsonState.sectionParagraphs?.map((paragraph, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <textarea 
                          value={paragraph} 
                          onChange={(e) => {
                            const newParagraphs = [...jsonState.sectionParagraphs];
                            newParagraphs[index] = e.target.value;
                            setJsonState({ ...jsonState, sectionParagraphs: newParagraphs });
                          }}
                          placeholder={`Enter section paragraph #${index + 1}...`}
                          className="flex-1 px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800 min-h-[100px]"
                        />
                        <button 
                          onClick={() => {
                            const newParagraphs = jsonState.sectionParagraphs.filter((_, i) => i !== index);
                            setJsonState({ ...jsonState, sectionParagraphs: newParagraphs });
                          }}
                          className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all self-center"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {(!jsonState.sectionParagraphs || jsonState.sectionParagraphs.length === 0) && (
                      <p className="text-xs text-zinc-400 italic">No paragraphs configured. Click Add Paragraph to start.</p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Core Features / Selling Points</h3>
                    <button 
                      onClick={() => {
                        const nextId = String((jsonState.features || []).length + 1);
                        const newFeature = { id: nextId, title: "New Feature", description: "Enter feature description...", iconKey: "shield", iconUrl: "", order: (jsonState.features || []).length + 1, isActive: true };
                        setJsonState({ ...jsonState, features: [...(jsonState.features || []), newFeature] });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-admin-primary transition-all"
                    >
                      <Plus size={14} /> Add Feature
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {jsonState.features?.map((feature, index) => (
                      <div key={index} className="p-6 rounded-[32px] border-2 border-zinc-100 bg-zinc-50/50 space-y-4 relative group">
                        <button 
                          onClick={() => {
                            const newFeatures = jsonState.features.filter((_, i) => i !== index);
                            setJsonState({ ...jsonState, features: newFeatures });
                          }}
                          className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Feature #{index + 1} Title</label>
                          <input 
                            type="text" 
                            value={feature.title} 
                            onChange={(e) => {
                              const newFeatures = [...jsonState.features];
                              newFeatures[index].title = e.target.value;
                              setJsonState({ ...jsonState, features: newFeatures });
                            }}
                            className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                            placeholder="Feature Title"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Description</label>
                          <textarea 
                            value={feature.description} 
                            onChange={(e) => {
                              const newFeatures = [...jsonState.features];
                              newFeatures[index].description = e.target.value;
                              setJsonState({ ...jsonState, features: newFeatures });
                            }}
                            className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:border-admin-primary outline-none transition-all text-zinc-800 h-16 resize-none"
                            placeholder="Feature Description"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Icon Key</label>
                            <select 
                              value={feature.iconKey || "shield"} 
                              onChange={(e) => {
                                const newFeatures = [...jsonState.features];
                                newFeatures[index].iconKey = e.target.value;
                                setJsonState({ ...jsonState, features: newFeatures });
                              }}
                              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                            >
                              <option value="shield">Shield (Security)</option>
                              <option value="tag">Tag (Deals)</option>
                              <option value="gift">Gift (Rewards)</option>
                              <option value="star">Star (Premium)</option>
                              <option value="clock">Clock (Time)</option>
                              <option value="map-pin">Map Pin (Location)</option>
                              <option value="phone">Phone (Contact)</option>
                              <option value="email">Email (Mail)</option>
                              <option value="users">Users (Community)</option>
                              <option value="info">Info (About)</option>
                              <option value="facebook">Facebook (Social)</option>
                              <option value="instagram">Instagram (Social)</option>
                              <option value="twitter">Twitter (Social)</option>
                              <option value="linkedin">LinkedIn (Social)</option>
                              <option value="youtube">YouTube (Social)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Icon URL (Optional)</label>
                            <input 
                              type="text" 
                              value={feature.iconUrl || ""} 
                              onChange={(e) => {
                                const newFeatures = [...jsonState.features];
                                newFeatures[index].iconUrl = e.target.value;
                                setJsonState({ ...jsonState, features: newFeatures });
                              }}
                              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                              placeholder="https://example.com/icon.png"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={feature.isActive !== false} 
                              onChange={(e) => {
                                const newFeatures = [...jsonState.features];
                                newFeatures[index].isActive = e.target.checked;
                                setJsonState({ ...jsonState, features: newFeatures });
                              }}
                              id={`feat-active-${index}`}
                              className="w-4 h-4 rounded text-admin-primary border-zinc-300 focus:ring-admin-primary/20 focus:ring-2"
                            />
                            <label htmlFor={`feat-active-${index}`} className="text-xs font-bold text-zinc-500">Active</label>
                          </div>
                          
                          <div className="flex items-center gap-2 justify-end">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mr-2">Sort Order</label>
                            <input 
                              type="number" 
                              value={feature.order || 1} 
                              onChange={(e) => {
                                const newFeatures = [...jsonState.features];
                                newFeatures[index].order = parseInt(e.target.value) || 1;
                                setJsonState({ ...jsonState, features: newFeatures });
                              }}
                              className="w-16 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!jsonState.features || jsonState.features.length === 0) && (
                      <p className="text-xs text-zinc-400 italic md:col-span-2">No features configured. Click Add Feature to start.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contact Us Editor */}
            {activeTab === 'contact-us' && jsonState && (
              <div className="space-y-12">
                {/* Page Title & Headers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Header Page Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Section Title / Heading</label>
                    <input 
                      type="text" 
                      value={jsonState.heading || ""} 
                      onChange={(e) => setJsonState({ ...jsonState, heading: e.target.value })} 
                      className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Subheading Description</label>
                  <input 
                    type="text" 
                    value={jsonState.subheading || ""} 
                    onChange={(e) => setJsonState({ ...jsonState, subheading: e.target.value })} 
                    className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                  />
                </div>

                {/* Contact Methods */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Contact Channels</h3>
                    <button 
                      onClick={() => {
                        const newMethod = { type: "email", label: "New Channel", value: "contact@example.com", actionLabel: "Write to us", actionUrl: "mailto:contact@example.com", iconKey: "email", iconUrl: "" };
                        setJsonState({ ...jsonState, contactMethods: [...(jsonState.contactMethods || []), newMethod] });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-admin-primary transition-all"
                    >
                      <Plus size={14} /> Add Channel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {jsonState.contactMethods?.map((method, index) => (
                      <div key={index} className="p-6 rounded-[32px] border-2 border-zinc-100 bg-zinc-50/50 space-y-4 relative group">
                        <button 
                          onClick={() => {
                            const newMethods = jsonState.contactMethods.filter((_, i) => i !== index);
                            setJsonState({ ...jsonState, contactMethods: newMethods });
                          }}
                          className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Type</label>
                            <select 
                              value={method.type || "email"} 
                              onChange={(e) => {
                                const newMethods = [...jsonState.contactMethods];
                                newMethods[index].type = e.target.value;
                                setJsonState({ ...jsonState, contactMethods: newMethods });
                              }}
                              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                            >
                              <option value="email">Email</option>
                              <option value="phone">Phone Call</option>
                              <option value="whatsapp">WhatsApp</option>
                              <option value="location">Office Location</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Label</label>
                            <input 
                              type="text" 
                              value={method.label} 
                              onChange={(e) => {
                                const newMethods = [...jsonState.contactMethods];
                                newMethods[index].label = e.target.value;
                                setJsonState({ ...jsonState, contactMethods: newMethods });
                              }}
                              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                              placeholder="e.g. Email Support"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Display Value</label>
                            <input 
                              type="text" 
                              value={method.value} 
                              onChange={(e) => {
                                const newMethods = [...jsonState.contactMethods];
                                newMethods[index].value = e.target.value;
                                setJsonState({ ...jsonState, contactMethods: newMethods });
                              }}
                              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:border-admin-primary outline-none transition-all text-zinc-800"
                              placeholder="e.g. support@example.com"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Action Button Label</label>
                            <input 
                              type="text" 
                              value={method.actionLabel || ""} 
                              onChange={(e) => {
                                const newMethods = [...jsonState.contactMethods];
                                newMethods[index].actionLabel = e.target.value;
                                setJsonState({ ...jsonState, contactMethods: newMethods });
                              }}
                              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                              placeholder="e.g. Send Email"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Action URI Link</label>
                          <input 
                            type="text" 
                            value={method.actionUrl || ""} 
                            onChange={(e) => {
                              const newMethods = [...jsonState.contactMethods];
                              newMethods[index].actionUrl = e.target.value;
                              setJsonState({ ...jsonState, contactMethods: newMethods });
                            }}
                            className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:border-admin-primary outline-none transition-all text-zinc-800"
                            placeholder="mailto:support@example.com or tel:+1..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Icon Key</label>
                            <select 
                              value={method.iconKey || "email"} 
                              onChange={(e) => {
                                const newMethods = [...jsonState.contactMethods];
                                newMethods[index].iconKey = e.target.value;
                                setJsonState({ ...jsonState, contactMethods: newMethods });
                              }}
                              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                            >
                              <option value="email">Email</option>
                              <option value="phone">Phone</option>
                              <option value="whatsapp">WhatsApp</option>
                              <option value="map-pin">Map Pin</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Icon URL (Optional)</label>
                            <input 
                              type="text" 
                              value={method.iconUrl || ""} 
                              onChange={(e) => {
                                const newMethods = [...jsonState.contactMethods];
                                newMethods[index].iconUrl = e.target.value;
                                setJsonState({ ...jsonState, contactMethods: newMethods });
                              }}
                              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                              placeholder="https://example.com/icon.png"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!jsonState.contactMethods || jsonState.contactMethods.length === 0) && (
                      <p className="text-xs text-zinc-400 italic md:col-span-2">No contact methods configured. Click Add Channel to start.</p>
                    )}
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Social Media Links</h3>
                    <button 
                      onClick={() => {
                        const newSocial = { platform: "facebook", url: "https://facebook.com", isActive: true, order: (jsonState.socialLinks || []).length + 1, iconKey: "facebook" };
                        setJsonState({ ...jsonState, socialLinks: [...(jsonState.socialLinks || []), newSocial] });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-admin-primary transition-all"
                    >
                      <Plus size={14} /> Add Social Link
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {jsonState.socialLinks?.map((social, index) => (
                      <div key={index} className="p-6 rounded-[32px] border-2 border-zinc-100 bg-zinc-50/50 space-y-4 relative group">
                        <button 
                          onClick={() => {
                            const newSocials = jsonState.socialLinks.filter((_, i) => i !== index);
                            setJsonState({ ...jsonState, socialLinks: newSocials });
                          }}
                          className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Platform</label>
                          <select 
                            value={social.platform || "facebook"} 
                            onChange={(e) => {
                              const newSocials = [...jsonState.socialLinks];
                              newSocials[index].platform = e.target.value;
                              newSocials[index].iconKey = e.target.value;
                              setJsonState({ ...jsonState, socialLinks: newSocials });
                            }}
                            className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                          >
                            <option value="facebook">Facebook</option>
                            <option value="instagram">Instagram</option>
                            <option value="twitter">Twitter</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="youtube">YouTube</option>
                            <option value="website">Custom Website</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Profile URL</label>
                          <input 
                            type="text" 
                            value={social.url} 
                            onChange={(e) => {
                              const newSocials = [...jsonState.socialLinks];
                              newSocials[index].url = e.target.value;
                              setJsonState({ ...jsonState, socialLinks: newSocials });
                            }}
                            className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:border-admin-primary outline-none transition-all text-zinc-800"
                            placeholder="https://social.com/username"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={social.isActive !== false} 
                              onChange={(e) => {
                                const newSocials = [...jsonState.socialLinks];
                                newSocials[index].isActive = e.target.checked;
                                setJsonState({ ...jsonState, socialLinks: newSocials });
                              }}
                              id={`social-active-${index}`}
                              className="w-4 h-4 rounded text-admin-primary border-zinc-300 focus:ring-admin-primary/20 focus:ring-2"
                            />
                            <label htmlFor={`social-active-${index}`} className="text-xs font-bold text-zinc-500">Active</label>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mr-2">Order</label>
                            <input 
                              type="number" 
                              value={social.order || 1} 
                              onChange={(e) => {
                                const newSocials = [...jsonState.socialLinks];
                                newSocials[index].order = parseInt(e.target.value) || 1;
                                setJsonState({ ...jsonState, socialLinks: newSocials });
                              }}
                              className="w-16 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-bold focus:border-admin-primary outline-none transition-all text-zinc-800"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!jsonState.socialLinks || jsonState.socialLinks.length === 0) && (
                      <p className="text-xs text-zinc-400 italic md:col-span-3">No social links configured. Click Add Social Link to start.</p>
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-6">
                  <div className="border-b border-zinc-100 pb-4">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Additional Settings</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Office Physical Address</label>
                      <input 
                        type="text" 
                        value={jsonState.officeAddress || ""} 
                        onChange={(e) => setJsonState({ ...jsonState, officeAddress: e.target.value })} 
                        className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                        placeholder="123 Corporate Ave, Suite 100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Support Hours</label>
                      <input 
                        type="text" 
                        value={jsonState.supportHours || ""} 
                        onChange={(e) => setJsonState({ ...jsonState, supportHours: e.target.value })} 
                        className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                        placeholder="Mon - Fri, 9:00 AM - 6:00 PM"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Footer Text / Copyright</label>
                    <input 
                      type="text" 
                      value={jsonState.footerText || ""} 
                      onChange={(e) => setJsonState({ ...jsonState, footerText: e.target.value })} 
                      className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all text-zinc-800"
                      placeholder="e.g. © 2026 Example Inc. All rights reserved."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
