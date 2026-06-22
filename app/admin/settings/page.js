"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Loader2,
  Link2,
  CheckCircle2,
  AlertCircle,
  Globe2,
  RefreshCw
} from "lucide-react";
import { cmsAdminService } from "@/services/admin/cms.service";
import { cn } from "@/utils/cn";

const PLATFORM_FIELDS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/your-page" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/your-brand" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@your-channel" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/your-page" },
  { key: "x", label: "X", placeholder: "https://x.com/your-page" }
];

const EMPTY_FORM = PLATFORM_FIELDS.reduce((acc, item) => {
  acc[item.key] = "";
  return acc;
}, {});

function parseJsonContent(content) {
  if (!content || typeof content !== "string") {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse app settings JSON:", error);
    return null;
  }
}

function extractFormValues(links = []) {
  const values = { ...EMPTY_FORM };

  links.forEach((item) => {
    const platform = String(item?.platform || "").trim().toLowerCase();
    const normalizedPlatform = platform === "twitter" ? "x" : platform;
    if (normalizedPlatform in values) {
      values[normalizedPlatform] = typeof item?.url === "string" ? item.url : "";
    }
  });

  return values;
}

function buildSocialLinksPayload(formValues) {
  return PLATFORM_FIELDS.map((item, index) => ({
    platform: item.key,
    url: formValues[item.key]?.trim() || "",
    isActive: Boolean(formValues[item.key]?.trim()),
    order: index + 1,
    iconKey: item.key
  }));
}

export default function AdminSettingsPage() {
  const [title, setTitle] = useState("App Settings");
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      setMessage(null);

      try {
        const response = await cmsAdminService.getPage("app-settings", "shared");
        const rawPage = response?.data;
        const parsedSettings = parseJsonContent(rawPage?.content);

        if (isMounted && parsedSettings?.socialLinks) {
          setTitle(rawPage?.title || parsedSettings?.title || "App Settings");
          setFormValues(extractFormValues(parsedSettings.socialLinks));
          setLastUpdated(rawPage?.lastUpdated || null);
          setIsLoading(false);
          return;
        }

        const fallbackResponse = await fetch("/api/content/contact-us?audience=user", { cache: "no-store" });
        const fallbackJson = await fallbackResponse.json();
        const fallbackData = fallbackJson?.data || {};

        if (isMounted) {
          setTitle("App Settings");
          setFormValues(
            fallbackData?.socialProfiles
              ? { ...EMPTY_FORM, ...fallbackData.socialProfiles }
              : extractFormValues(fallbackData?.socialLinks || [])
          );
          setLastUpdated(null);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        if (isMounted) {
          setMessage({ type: "error", text: "Failed to load social media settings." });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (key, value) => {
    setFormValues((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payload = {
        slug: "app-settings",
        title: title.trim() || "App Settings",
        contentType: "json",
        audience: "shared",
        content: JSON.stringify({
          title: title.trim() || "App Settings",
          socialLinks: buildSocialLinksPayload(formValues)
        })
      };

      const response = await cmsAdminService.upsertPage(payload);

      if (!response?.success) {
        throw new Error(response?.message || "Failed to save settings");
      }

      setLastUpdated(new Date().toISOString());
      setMessage({ type: "success", text: "Social media links updated successfully." });
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({
        type: "error",
        text: error?.response?.data?.message || error?.message || "Failed to save settings."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-24">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-admin-primary/5 rounded-full border border-admin-primary/10"
          >
            <Globe2 size={14} className="text-admin-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-admin-primary">Platform Settings</span>
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-zinc-900 tracking-tighter">
              Social <span className="text-admin-primary italic">Links</span>
            </h1>
            <p className="text-sm font-bold text-zinc-500 max-w-3xl">
              Update the brand social pages once here. These shared links now feed the app contact content for Facebook, LinkedIn, YouTube, Instagram, and X.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="px-4 py-2 rounded-2xl bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Synced {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
          <button
            type="submit"
            form="social-settings-form"
            disabled={isLoading || isSaving}
            className="flex items-center justify-center gap-3 px-8 py-5 bg-zinc-900 text-white rounded-[28px] text-sm font-black uppercase tracking-[0.2em] hover:bg-admin-primary hover:shadow-2xl hover:shadow-admin-primary/30 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Links
          </button>
        </div>
      </div>

      <form id="social-settings-form" onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-8">
        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl shadow-zinc-200/40 overflow-hidden">
          <div className="p-8 border-b border-zinc-100 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900">Shared Social Profiles</h2>
              <p className="text-xs font-bold text-zinc-400 mt-2">
                Leave any field empty if that platform should stay hidden in the app.
              </p>
            </div>
            <div className="w-14 h-14 rounded-[20px] bg-admin-primary/10 text-admin-primary flex items-center justify-center">
              <Link2 size={24} />
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Settings Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full px-5 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold text-zinc-800 focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all"
                placeholder="App Settings"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PLATFORM_FIELDS.map((platform) => (
                <div key={platform.key} className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
                    {platform.label} URL
                  </label>
                  <input
                    type="url"
                    value={formValues[platform.key]}
                    onChange={(event) => handleInputChange(platform.key, event.target.value)}
                    placeholder={platform.placeholder}
                    className="w-full px-5 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-semibold text-zinc-800 placeholder:text-zinc-300 focus:border-admin-primary focus:ring-2 focus:ring-admin-primary/10 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 text-white rounded-[36px] p-8 shadow-2xl shadow-zinc-900/10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-admin-primary">App Sync</p>
            <h3 className="text-2xl font-black tracking-tight mt-3">What updates from here</h3>
            <p className="text-sm text-zinc-300 leading-relaxed mt-4">
              Saving this form updates the shared social link payload used by the app’s contact content API.
            </p>
            <div className="mt-6 space-y-3">
              {PLATFORM_FIELDS.map((platform) => (
                <div key={platform.key} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{platform.label}</span>
                  <span className="text-xs font-semibold text-white truncate">
                    {formValues[platform.key]?.trim() || "Not set"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-zinc-100 p-6 shadow-lg shadow-zinc-200/30">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <RefreshCw size={18} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Notes</h4>
                <p className="text-sm font-medium text-zinc-500 leading-relaxed">
                  Existing contact page content stays separate. This settings screen manages only the shared social platform URLs.
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn(
                  "rounded-[28px] p-5 flex items-start gap-3 border",
                  message.type === "success"
                    ? "bg-green-50 border-green-100 text-green-700"
                    : "bg-red-50 border-red-100 text-red-700"
                )}
              >
                {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">
                    {message.type === "success" ? "Saved" : "Issue"}
                  </p>
                  <p className="text-sm font-semibold mt-1">{message.text}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading && (
            <div className="rounded-[28px] border border-zinc-100 bg-white p-6 flex items-center gap-3 text-zinc-500">
              <Loader2 size={18} className="animate-spin text-admin-primary" />
              <span className="text-sm font-semibold">Loading current social links...</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
