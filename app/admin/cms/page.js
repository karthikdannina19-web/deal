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
  Edit3,
  Phone
} from "lucide-react";
import { cmsAdminService } from "@/services/admin/cms.service";
import RichTextEditor from "../components/RichTextEditor";
import { cn } from "@/utils/cn";

const PAGES = [
  { id: "terms-and-conditions", label: "Terms & Conditions", icon: BookOpen, description: "Legal guidelines and user agreements" },
  { id: "privacy-policy", label: "Privacy Policy", icon: Shield, description: "Data handling and privacy protocols" },
  { id: "about-us", label: "About Us", icon: Info, description: "Brand story and platform overview" },
  { id: "contact-us", label: "Contact Us", icon: Phone, description: "Contact channels and social media" },
];

const CMS_AUDIENCES = [
  { id: "user", label: "User App" },
  { id: "vendor", label: "Vendor App" },
];

const DEFAULT_HTML_CONTENT = {
  "terms-and-conditions": "<h1>Terms and Conditions</h1><p>Write your terms and conditions here.</p>",
  "privacy-policy": "<h1>Privacy Policy</h1><p>Write your privacy policy here.</p>",
  "about-us": "<h1>About Us</h1><p>Introduce your app, mission, and customer promise here.</p><h2>Why Choose Us</h2><p>Add your key points, brand story, and trust message here.</p>",
  "contact-us": "<h1>Contact Us</h1><p>Tell users how to reach your team.</p><p>Email: support@example.com</p><p>Phone: +91 98765 43210</p>",
};

function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function convertStructuredJsonToHtml(slug, title, parsed) {
  if (!parsed || typeof parsed !== "object") {
    return DEFAULT_HTML_CONTENT[slug] || "";
  }

  if (slug === "about-us") {
    const introParagraphs = (parsed.introParagraphs || [])
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
    const sectionParagraphs = (parsed.sectionParagraphs || [])
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
    const features = (parsed.features || [])
      .filter((feature) => feature && feature.isActive !== false)
      .map((feature) => `<li><strong>${escapeHtml(feature.title || "")}</strong>${feature.description ? `: ${escapeHtml(feature.description)}` : ""}</li>`)
      .join("");

    return `
      <h1>${escapeHtml(title || parsed.title || "About Us")}</h1>
      ${introParagraphs || "<p>Introduce your app here.</p>"}
      <h2>${escapeHtml(parsed.sectionTitle || "Why Choose Us")}</h2>
      ${sectionParagraphs || "<p>Add your main value proposition here.</p>"}
      ${features ? `<ul>${features}</ul>` : ""}
    `.trim();
  }

  if (slug === "contact-us") {
    const contactMethods = (parsed.contactMethods || [])
      .filter(Boolean)
      .map((method) => `<li><strong>${escapeHtml(method.label || method.type || "Contact")}</strong>${method.value ? `: ${escapeHtml(method.value)}` : ""}</li>`)
      .join("");
    const socialLinks = (parsed.socialLinks || [])
      .filter((item) => item && item.isActive !== false && item.url)
      .map((item) => `<li><strong>${escapeHtml(item.platform || "Social")}</strong>: <a href="${escapeHtml(item.url)}">${escapeHtml(item.url)}</a></li>`)
      .join("");

    return `
      <h1>${escapeHtml(title || parsed.title || "Contact Us")}</h1>
      <h2>${escapeHtml(parsed.heading || "Get in Touch")}</h2>
      <p>${escapeHtml(parsed.subheading || "Tell users how to reach your team.")}</p>
      ${parsed.officeAddress ? `<p><strong>Office:</strong> ${escapeHtml(parsed.officeAddress)}</p>` : ""}
      ${parsed.supportHours ? `<p><strong>Support Hours:</strong> ${escapeHtml(parsed.supportHours)}</p>` : ""}
      ${contactMethods ? `<h3>Contact Channels</h3><ul>${contactMethods}</ul>` : ""}
      ${socialLinks ? `<h3>Social Links</h3><ul>${socialLinks}</ul>` : ""}
      ${parsed.footerText ? `<p>${escapeHtml(parsed.footerText)}</p>` : ""}
    `.trim();
  }

  return DEFAULT_HTML_CONTENT[slug] || "";
}

export default function CMSPage() {
  const [audience, setAudience] = useState(CMS_AUDIENCES[0].id);
  const [activeTab, setActiveTab] = useState(PAGES[0].id);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchPageData = useCallback(async (slug, selectedAudience) => {
    setIsLoading(true);
    try {
      const response = await cmsAdminService.getPage(slug, selectedAudience);
      if (response.success && response.data) {
        setTitle(response.data.title || PAGES.find((page) => page.id === slug)?.label || "");
        setLastUpdated(response.data.lastUpdated || null);

        if (response.data.contentType === "json") {
          try {
            const parsed = JSON.parse(response.data.content);
            setContent(convertStructuredJsonToHtml(slug, response.data.title, parsed));
          } catch (error) {
            console.error("Failed to parse CMS JSON, falling back to default editor content:", error);
            setContent(DEFAULT_HTML_CONTENT[slug] || "");
          }
        } else {
          setContent(response.data.content || DEFAULT_HTML_CONTENT[slug] || "");
        }
      } else {
        setTitle(PAGES.find((page) => page.id === slug)?.label || "");
        setContent(DEFAULT_HTML_CONTENT[slug] || "");
        setLastUpdated(null);
      }
    } catch (error) {
      console.error("Failed to fetch CMS page:", error);
      setTitle(PAGES.find((page) => page.id === slug)?.label || "");
      setContent(DEFAULT_HTML_CONTENT[slug] || "");
      setLastUpdated(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageData(activeTab, audience);
  }, [activeTab, audience, fetchPageData]);

  const handleSave = async () => {
    if (!content || !content.trim() || content === "<p></p>") {
      setMessage({ type: "error", text: "Content cannot be empty" });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const response = await cmsAdminService.upsertPage({
        slug: activeTab,
        title,
        content,
        contentType: "html",
        audience,
      });

      if (response.success) {
        setMessage({ type: "success", text: "Page updated successfully!" });
        setLastUpdated(new Date().toISOString());
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Failed to save CMS page:", error);
      setMessage({ type: "error", text: error.response?.data?.message || "Failed to save changes" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-12 pb-24">
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
            {audience === "vendor" ? "Vendor App" : "User App"} <span className="text-admin-primary italic">CMS</span>
          </h1>
          <p className="text-zinc-500 font-bold text-sm">
            Manage Terms, Privacy, About, and Contact pages for the <span className="text-zinc-900 font-black underline decoration-admin-primary/30 decoration-4">{audience === "vendor" ? "Rhock vendor app" : "Rhock user app"}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-[10px] font-bold text-zinc-400">
              <Clock size={12} />
              Sync: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-admin-primary/10 bg-admin-primary/5 p-1">
            {CMS_AUDIENCES.map((item) => (
              <button
                key={item.id}
                onClick={() => setAudience(item.id)}
                className={cn(
                  "rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                  audience === item.id ? "bg-admin-primary text-white" : "text-admin-primary hover:bg-white/70"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => setActiveTab(page.id)}
            className={cn(
              "p-6 rounded-[40px] border-2 transition-all duration-500 text-left relative overflow-hidden group",
              activeTab === page.id ? "bg-white border-admin-primary shadow-2xl shadow-admin-primary/10 scale-[1.02]" : "bg-white/50 border-zinc-100 hover:border-zinc-200"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500",
                activeTab === page.id ? "bg-admin-primary text-white" : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
              )}
            >
              <page.icon size={24} />
            </div>
            <h3
              className={cn(
                "text-md font-black tracking-tight mb-2",
                activeTab === page.id ? "text-zinc-900" : "text-zinc-400"
              )}
            >
              {page.label}
            </h3>
            <p className="text-[10px] font-bold text-zinc-400 leading-relaxed">{page.description}</p>
            {activeTab === page.id && (
              <motion.div layoutId="active-bg" className="absolute top-0 right-0 p-4 opacity-5">
                <page.icon size={100} />
              </motion.div>
            )}
          </button>
        ))}
      </div>

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
                  {`Rich text content for the ${audience} app. Use headers, colors, lists, links, and formatting like a document editor.`}
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
                    message.type === "success" ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                  )}
                >
                  {message.type === "success" ? <CheckCircle2 size={16} /> : <Info size={16} />}
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
        </div>
      </div>
    </div>
  );
}
