"use client";

import React, { useEffect, useState } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Upload, 
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  Monitor,
  Layout,
  ExternalLink,
  MessageSquare,
  MapPin,
  MousePointerClick
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/utils/cn";
import { priorityService } from '@/services/admin/priority.service';

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toString) return value.toString();
  return String(value);
}

export default function SectionsDashboard() {
  const [activeTab, setActiveTab] = useState('tags'); // 'tags', 'banners', 'tracking'
  const [sections, setSections] = useState([]);
  const [banners, setBanners] = useState([]);
  const [ads, setAds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locationTree, setLocationTree] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tag Modal State
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  
  // Banner Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // Ad Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [currentAd, setCurrentAd] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Form States
  const [tagForm, setTagForm] = useState({
    name: '',
    description: '',
    order: 0,
    isActive: true,
    visibilityLevel: 'global',
    visibilityStateId: '',
    visibilityDistrictId: '',
    visibilityMandalId: ''
  });
  const [bannerForm, setBannerForm] = useState({
    placementType: 'section',
    section: '',
    categoryId: '',
    title: '',
    location: '',
    locationLabel: '',
    visibilityLevel: '',
    visibilityStateId: '',
    visibilityDistrictId: '',
    visibilityMandalId: '',
    viewUrl: '',
    whatsappLink: '',
    storeLink: '',
    order: 0,
    isActive: true
  });
  
  const [tagImage, setTagImage] = useState(null);
  const [tagImagePreview, setTagImagePreview] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState(null);
  const [isBannerSaving, setIsBannerSaving] = useState(false);
  const [priorityScopeLevel, setPriorityScopeLevel] = useState('global');
  const [priorityStateId, setPriorityStateId] = useState('');
  const [priorityDistrictId, setPriorityDistrictId] = useState('');
  const [priorityMandalId, setPriorityMandalId] = useState('');
  const [sectionPriorityDrafts, setSectionPriorityDrafts] = useState({});
  const [isPrioritySaving, setIsPrioritySaving] = useState(false);

  const trackingAds = ads
    .filter((ad) => ad.status === 'approved' || ad.status === 'active')
    .map((ad) => ({
      ...ad,
      sectionKey: normalizeId(ad.section?._id || ad.section),
    }));

  const trackingSectionCounts = sections.reduce((acc, section) => {
    acc[normalizeId(section._id)] = 0;
    return acc;
  }, {});

  trackingAds.forEach((ad) => {
    if (ad.sectionKey) {
      trackingSectionCounts[ad.sectionKey] = (trackingSectionCounts[ad.sectionKey] || 0) + 1;
    }
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [secRes, banRes, adsRes, locRes, catRes] = await Promise.all([
        fetch('/api/admin/sections'),
        fetch('/api/admin/banners'),
        fetch('/api/admin/ads?status=approved&activeOnly=true'),
        fetch('/api/locations/tree'),
        fetch('/api/admin/categories')
      ]);
      
      const secData = await secRes.json();
      const banData = await banRes.json();
      const adsData = await adsRes.json();
      const locData = await locRes.json();
      const catData = await catRes.json();
      
      if (secData.success) setSections(secData.data);
      if (banData.success) setBanners(banData.data);
      if (adsData.success) setAds(adsData.ads);
      if (locData.success) setLocationTree(locData.data || []);
      if (catData.success) setCategories(catData.categories || catData.data || []);
    } catch (err) {
      console.error('Data fetch failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const loadPriorityRules = async () => {
      try {
        const result = await priorityService.listRules({
          entityType: 'section',
          scopeLevel: priorityScopeLevel,
          stateId: priorityStateId,
          districtId: priorityDistrictId,
          mandalId: priorityMandalId,
        });

        const nextDrafts = {};
        for (const rule of result.data || []) {
          nextDrafts[String(rule.entityId)] = String(rule.priority);
        }
        setSectionPriorityDrafts(nextDrafts);
      } catch (error) {
        console.error('Failed to load section priority rules', error);
        setSectionPriorityDrafts({});
      }
    };

    if (priorityScopeLevel === 'global') {
      loadPriorityRules();
      return;
    }

    if (priorityScopeLevel === 'state' && priorityStateId) {
      loadPriorityRules();
      return;
    }

    if (priorityScopeLevel === 'district' && priorityStateId && priorityDistrictId) {
      loadPriorityRules();
      return;
    }

    if (priorityScopeLevel === 'mandal' && priorityStateId && priorityDistrictId && priorityMandalId) {
      loadPriorityRules();
      return;
    }

    setSectionPriorityDrafts({});
  }, [priorityScopeLevel, priorityStateId, priorityDistrictId, priorityMandalId]);

  // --- Tag Logic ---
  const handleOpenTagModal = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setTagForm({
        name: tag.name,
        description: tag.description || '',
        order: tag.order || 0,
        isActive: tag.isActive,
        visibilityLevel: tag.visibilityLevel || 'global',
        visibilityStateId: normalizeId(tag.visibilityStateId),
        visibilityDistrictId: normalizeId(tag.visibilityDistrictId),
        visibilityMandalId: normalizeId(tag.visibilityMandalId)
      });
      setTagImagePreview(tag.image?.url || null);
    } else {
      setEditingTag(null);
      setTagForm({
        name: '',
        description: '',
        order: sections.length + 1,
        isActive: true,
        visibilityLevel: 'global',
        visibilityStateId: '',
        visibilityDistrictId: '',
        visibilityMandalId: ''
      });
      setTagImagePreview(null);
    }
    setTagImage(null);
    setIsTagModalOpen(true);
  };

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(tagForm).forEach(key => data.append(key, tagForm[key]));
    if (tagImage) data.append('image', tagImage);

    const url = editingTag ? `/api/admin/sections/${editingTag._id}` : '/api/admin/sections';
    const res = await fetch(url, { method: editingTag ? 'PUT' : 'POST', body: data });
    if ((await res.json()).success) {
      setIsTagModalOpen(false);
      fetchData();
    }
  };

  // --- Banner Logic ---
  const handleOpenBannerModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerForm({ 
        placementType: banner.placementType || (banner.isTopBanner ? 'home_top' : 'section'),
        section: normalizeId(banner.section?._id || banner.section), 
        categoryId: normalizeId(banner.categoryId?._id || banner.categoryId),
        title: banner.title || '',
        location: banner.location || '', 
        locationLabel: banner.locationLabel || '',
        visibilityLevel: banner.visibilityLevel || 'global',
        visibilityStateId: normalizeId(banner.visibilityStateId),
        visibilityDistrictId: normalizeId(banner.visibilityDistrictId),
        visibilityMandalId: normalizeId(banner.visibilityMandalId),
        viewUrl: banner.viewUrl || '', 
        whatsappLink: banner.whatsappLink || '', 
        storeLink: banner.storeLink || '', 
        order: banner.order || 0, 
        isActive: banner.isActive 
      });
      setBannerImagePreview(banner.image?.url || null);
    } else {
      setEditingBanner(null);
      setBannerForm({
        placementType: 'section',
        section: sections[0]?._id || '',
        categoryId: '',
        title: '',
        location: '',
        locationLabel: '',
        visibilityLevel: 'global',
        visibilityStateId: '',
        visibilityDistrictId: '',
        visibilityMandalId: '',
        viewUrl: '',
        whatsappLink: '',
        storeLink: '',
        order: 0,
        isActive: true
      });
      setBannerImagePreview(null);
    }
    setBannerImage(null);
    setIsBannerModalOpen(true);
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    setIsBannerSaving(true);

    try {
      const data = new FormData();
      Object.keys(bannerForm).forEach(key => {
        if (bannerForm[key] !== undefined && bannerForm[key] !== null) {
          data.append(key, bannerForm[key]);
        }
      });

      const stateName = selectedState?.name || '';
      const districtName = selectedDistrict?.name || '';
      const mandalName = (selectedDistrict?.mandals || []).find((mandal) => mandal.id === bannerForm.visibilityMandalId)?.name || '';
      data.append('state', stateName);
      data.append('district', districtName);
      data.append('mandal', mandalName);
      if (bannerImage) data.append('image', bannerImage);

      const url = editingBanner ? `/api/admin/banners/${editingBanner._id}` : '/api/admin/banners';
      const res = await fetch(url, { method: editingBanner ? 'PUT' : 'POST', body: data });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to save banner');
      }

      setIsBannerModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.message || 'Unable to save promotional banner');
      console.error('Banner save failed', error);
    } finally {
      setIsBannerSaving(false);
    }
  };

  const selectedState = locationTree.find((state) => state.id === bannerForm.visibilityStateId);
  const selectedDistrict = selectedState?.districts?.find((district) => district.id === bannerForm.visibilityDistrictId);
  const selectedTagState = locationTree.find((state) => state.id === tagForm.visibilityStateId);
  const selectedTagDistrict = selectedTagState?.districts?.find((district) => district.id === tagForm.visibilityDistrictId);
  const selectedPriorityState = locationTree.find((state) => state.id === priorityStateId);
  const selectedPriorityDistrict = selectedPriorityState?.districts?.find((district) => district.id === priorityDistrictId);
  const sectionCategories = categories.filter((category) => normalizeId(category.sectionId?._id || category.sectionId) === bannerForm.section);

  const handleDeleteBanner = async (id) => {
    if (!confirm('Delete this banner?')) return;
    const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
    if ((await res.json()).success) fetchData();
  };

  const handleOpenAssignModal = (ad) => {
    setCurrentAd(ad);
    setSelectedSectionId(ad.section?._id || ad.section || '');
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!currentAd) return;

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/admin/ads/${currentAd._id}/section`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: selectedSectionId })
      });

      const data = await res.json();
      if (data.success) {
        setIsAssignModalOpen(false);
        fetchData();
      } else {
        alert(data.message || 'Failed to assign section');
      }
    } catch (err) {
      console.error('Assignment failed', err);
      alert('Network error during assignment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSectionPriorities = async () => {
    const rules = sections
      .map((section) => ({
        entityId: section._id,
        scopeLevel: priorityScopeLevel,
        stateId: priorityStateId || null,
        districtId: priorityDistrictId || null,
        mandalId: priorityMandalId || null,
        priority: Number(sectionPriorityDrafts[String(section._id)]),
      }))
      .filter((rule) => Number.isFinite(rule.priority) && rule.priority > 0);

    try {
      setIsPrioritySaving(true);
      await priorityService.saveRules({
        entityType: 'section',
        rules,
      });
      alert('Section priorities saved successfully.');
    } catch (error) {
      alert(error || 'Failed to save section priorities.');
    } finally {
      setIsPrioritySaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Ad <span className="text-admin-primary">Curator</span>
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Manage tags, promotional banners, and monitor performance.
          </p>
        </div>
        
        <div className="flex bg-white dark:bg-zinc-900 p-1.5 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          {[
            { id: 'tags', label: 'Tags & Sections', icon: Tag },
            { id: 'banners', label: 'Promotional Banners', icon: Monitor },
            { id: 'tracking', label: 'Ads Tracking', icon: Layout },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-lg" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* --- TAGS TAB --- */}
        {activeTab === 'tags' && (
          <motion.div 
            key="tags-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
             <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[32px] border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-admin-primary/10 text-admin-primary flex items-center justify-center">
                      <Tag size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50">Manage Sections</h3>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Create and order category tags</p>
                   </div>
                </div>
                <button 
                  onClick={() => handleOpenTagModal()}
                  className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
                >
                  <Plus size={18} /> Add Tag
                </button>
             </div>

             <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
               <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                 <div>
                   <h4 className="text-lg font-black text-zinc-900">Location Priority Rules</h4>
                   <p className="text-sm text-zinc-500 font-medium mt-1">
                     Set how sections should rank for users in a specific state, district, or mandal.
                   </p>
                 </div>
                 <button
                   type="button"
                   onClick={handleSaveSectionPriorities}
                   disabled={isPrioritySaving}
                   className="px-5 py-3 rounded-2xl bg-admin-primary text-white text-sm font-black shadow-lg shadow-admin-primary/20 disabled:opacity-60"
                 >
                   {isPrioritySaving ? 'Saving...' : 'Save Priority Rules'}
                 </button>
               </div>

               <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                 <div>
                   <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Scope</label>
                   <select
                     value={priorityScopeLevel}
                     onChange={(e) => {
                       setPriorityScopeLevel(e.target.value);
                       setPriorityStateId('');
                       setPriorityDistrictId('');
                       setPriorityMandalId('');
                     }}
                     className="w-full px-5 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl font-bold text-zinc-900 outline-none"
                   >
                     <option value="global">Global</option>
                     <option value="state">State</option>
                     <option value="district">District</option>
                     <option value="mandal">Mandal</option>
                   </select>
                 </div>

                 {priorityScopeLevel !== 'global' && (
                   <div>
                     <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">State</label>
                     <select
                       value={priorityStateId}
                       onChange={(e) => {
                         setPriorityStateId(e.target.value);
                         setPriorityDistrictId('');
                         setPriorityMandalId('');
                       }}
                       className="w-full px-5 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl font-bold text-zinc-900 outline-none"
                     >
                       <option value="">Select state</option>
                       {locationTree.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                     </select>
                   </div>
                 )}

                 {['district', 'mandal'].includes(priorityScopeLevel) && (
                   <div>
                     <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">District</label>
                     <select
                       value={priorityDistrictId}
                       onChange={(e) => {
                         setPriorityDistrictId(e.target.value);
                         setPriorityMandalId('');
                       }}
                       className="w-full px-5 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl font-bold text-zinc-900 outline-none"
                     >
                       <option value="">Select district</option>
                       {(selectedPriorityState?.districts || []).map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
                     </select>
                   </div>
                 )}

                 {priorityScopeLevel === 'mandal' && (
                   <div>
                     <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Mandal</label>
                     <select
                       value={priorityMandalId}
                       onChange={(e) => setPriorityMandalId(e.target.value)}
                       className="w-full px-5 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl font-bold text-zinc-900 outline-none"
                     >
                       <option value="">Select mandal</option>
                       {(selectedPriorityDistrict?.mandals || []).map((mandal) => <option key={mandal.id} value={mandal.id}>{mandal.name}</option>)}
                     </select>
                   </div>
                 )}
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sections.map(section => (
                  <div key={section._id} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 hover:shadow-2xl hover:shadow-zinc-200/50 dark:hover:shadow-none transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleOpenTagModal(section)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 hover:text-admin-primary transition-colors">
                          <Edit2 size={16} />
                       </button>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-16 h-16 rounded-[20px] bg-zinc-50 dark:bg-zinc-800 overflow-hidden flex items-center justify-center border border-zinc-100 dark:border-zinc-700">
                          {section.image?.url ? <img src={section.image.url} className="w-full h-full object-cover" /> : <Tag size={24} className="text-zinc-300" />}
                       </div>
                       <div>
                          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Section {section.order}</p>
                          <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-50">{section.name}</h4>
                       </div>
                    </div>
                    
                    <p className="text-sm text-zinc-500 line-clamp-2 mb-6 font-medium">{section.description || 'No description provided.'}</p>

                    <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Location priority</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={sectionPriorityDrafts[String(section._id)] || ''}
                          onChange={(event) => setSectionPriorityDrafts((current) => ({
                            ...current,
                            [String(section._id)]: event.target.value,
                          }))}
                          placeholder="1"
                          className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-black text-zinc-900 outline-none focus:border-admin-primary"
                        />
                        <p className="text-xs font-semibold text-zinc-500">
                          {priorityScopeLevel === 'global' ? 'Global fallback order' : `Overrides order in selected ${priorityScopeLevel}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-zinc-50 dark:border-zinc-800">
                       <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", section.isActive ? "bg-green-500" : "bg-zinc-300")} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{section.isActive ? 'Active' : 'Inactive'}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black text-zinc-600 dark:text-zinc-400">
                             {section.adCount || 0} ADS
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-admin-primary/10 text-admin-primary rounded-lg text-[10px] font-black uppercase tracking-widest">
                             {section.visibilityLevel || 'global'}
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </motion.div>
        )}

        {/* --- BANNERS TAB --- */}
        {activeTab === 'banners' && (
          <motion.div 
            key="banners-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
             <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[32px] border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Monitor size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50">Section Banners</h3>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Add multi-banners per category tag</p>
                   </div>
                </div>
                <button 
                  onClick={() => handleOpenBannerModal()}
                  className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
                >
                  <Plus size={18} /> New Banner
                </button>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {banners.map(banner => (
                   <div key={banner._id} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-4 flex flex-col md:flex-row gap-6 hover:shadow-2xl transition-all duration-500">
                      <div className="w-full md:w-64 aspect-[4/3] rounded-[32px] overflow-hidden relative shadow-lg">
                         <img src={banner.image?.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button onClick={() => handleOpenBannerModal(banner)} className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:scale-110 transition-all"><Edit2 size={18} /></button>
                            <button onClick={() => handleDeleteBanner(banner._id)} className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-all"><Trash2 size={18} /></button>
                         </div>
                      </div>
                      
                      <div className="flex-1 space-y-4 py-2">
                         <div className="flex justify-between items-start">
                            <div>
                               <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500">{banner.section?.name || 'Unassigned'}</span>
                               <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1 flex items-center gap-2">
                                  {banner.title || banner.location || 'Untitled Banner'}
                                  <MapPin size={16} className="text-zinc-400" />
                               </h4>
                               <p className="mt-1 text-xs text-zinc-500 capitalize">
                                 {(banner.visibilityLevel || 'global')} visibility
                               </p>
                               <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-admin-primary">
                                 {(banner.placementType || (banner.isTopBanner ? 'home_top' : 'section')).replace('_', ' ')}
                               </p>
                            </div>
                            <div className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest", banner.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-400")}>
                               {banner.isActive ? 'Live' : 'Paused'}
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center gap-3">
                               <MousePointerClick size={18} className="text-zinc-400" />
                               <div>
                                  <p className="text-[10px] text-zinc-400 font-black uppercase">Views</p>
                                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{banner.clicks || 0}</p>
                               </div>
                            </div>
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center gap-3">
                               <MessageSquare size={18} className="text-green-500" />
                               <div className="truncate">
                                  <p className="text-[10px] text-zinc-400 font-black uppercase">WhatsApp</p>
                                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">{banner.whatsappLink ? 'Active' : 'None'}</p>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex gap-2">
                            {banner.viewUrl && (
                               <a href={banner.viewUrl} target="_blank" className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
                                  <ExternalLink size={14} /> Visit Link
                               </a>
                            )}
                            {banner.storeLink && (
                               <a href={banner.storeLink} target="_blank" className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
                                  <ArrowUpRight size={14} /> Store Profile
                               </a>
                            )}
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </motion.div>
        )}

        {/* --- TRACKING TAB --- */}
        {activeTab === 'tracking' && (
          <motion.div 
            key="tracking-tab"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl shadow-zinc-200/20">
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                   <div>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">Advertisement Insights</h3>
                      <p className="text-sm text-zinc-500 font-medium">Real-time performance tracking by tag section</p>
                   </div>
                   <div className="flex gap-2">
                      {sections.map(s => (
                         <div key={s._id} className="flex flex-col items-center px-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.name}</span>
                            <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{trackingSectionCounts[normalizeId(s._id)] || 0}</span>
                         </div>
                      ))}
                   </div>
                </div>
                
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Ad Content</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Section Tag</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Vendor</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Engagement</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Date Linked</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                         {trackingAds.map((ad, idx) => {
                            const section = sections.find((s) => normalizeId(s._id) === ad.sectionKey);
                            return (
                               <motion.tr 
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ delay: idx * 0.05 }}
                                 key={ad._id} 
                                 className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                               >
                                  <td className="px-8 py-6">
                                     <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden shadow-sm">
                                           <img src={ad.images?.[0]?.url} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                           <p className="font-black text-zinc-900 dark:text-zinc-50 text-sm line-clamp-1 w-48">{ad.title}</p>
                                           <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">ID: {ad._id.slice(-6)}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-8 py-6">
                                     <div className="flex items-center gap-3 group/tag">
                                       {section ? (
                                          <span className="px-3 py-1 bg-admin-primary/10 text-admin-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                                             {section.name}
                                          </span>
                                       ) : (
                                          <span className="text-zinc-400 text-[10px] font-bold">Unassigned</span>
                                       )}
                                       <button 
                                          onClick={() => handleOpenAssignModal(ad)}
                                          className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-400 hover:text-admin-primary transition-all shadow-sm"
                                          title="Assign Section"
                                       >
                                          <Edit2 size={12} />
                                       </button>
                                     </div>
                                  </td>
                                  <td className="px-8 py-6">
                                     <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{ad.vendor?.storeName || 'Independent'}</p>
                                  </td>
                                  <td className="px-8 py-6">
                                     <div className="flex items-center justify-center gap-6">
                                        <div className="text-center">
                                           <p className="text-[10px] text-zinc-400 font-bold uppercase">Views</p>
                                           <p className="font-black text-zinc-900 dark:text-zinc-50">{ad.views || 0}</p>
                                        </div>
                                        <div className="text-center">
                                           <p className="text-[10px] text-zinc-400 font-bold uppercase">Clicks</p>
                                           <p className="font-black text-zinc-900 dark:text-zinc-50">{ad.clicks || 0}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-8 py-6 text-right font-bold text-xs text-zinc-500">
                                     {new Date(ad.reviewedAt || ad.createdAt).toLocaleDateString()}
                                  </td>
                               </motion.tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODALS --- */}
      
      {/* Tag Modal */}
      <AnimatePresence>
        {isTagModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTagModalOpen(false)} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
               <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <h3 className="text-2xl font-black">{editingTag ? 'Edit Tag' : 'Add New Tag'}</h3>
                  <button onClick={() => setIsTagModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-xl"><X /></button>
               </div>
               <form onSubmit={handleTagSubmit} className="p-8 space-y-6">
                  <div className="flex gap-6">
                     <div onClick={() => document.getElementById('tag-img').click()} className="w-32 h-32 rounded-[32px] bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                        {tagImagePreview ? <img src={tagImagePreview} className="w-full h-full object-cover" /> : <><ImageIcon className="text-zinc-300 dark:text-zinc-600 group-hover:text-admin-primary transition-colors" /><span className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 mt-2">Icon</span></>}
                        <input id="tag-img" type="file" hidden onChange={e => {
                           const file = e.target.files[0];
                           if(file) { setTagImage(file); setTagImagePreview(URL.createObjectURL(file)); }
                        }} />
                     </div>
                     <div className="flex-1 space-y-4">
                        <div>
                           <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Tag Name</label>
                           <input required value={tagForm.name} onChange={e => setTagForm({...tagForm, name: e.target.value})} className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 ring-admin-primary/20 font-bold text-zinc-900 dark:text-white" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Description</label>
                           <input value={tagForm.description} onChange={e => setTagForm({...tagForm, description: e.target.value})} className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Display Order</label>
                           <input type="number" value={tagForm.order} onChange={e => setTagForm({...tagForm, order: e.target.value})} className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white" />
                        </div>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Visibility Level</label>
                        <select
                          value={tagForm.visibilityLevel}
                          onChange={e => setTagForm({
                            ...tagForm,
                            visibilityLevel: e.target.value,
                            visibilityStateId: e.target.value === 'global' ? '' : tagForm.visibilityStateId,
                            visibilityDistrictId: ['district', 'mandal'].includes(e.target.value) ? tagForm.visibilityDistrictId : '',
                            visibilityMandalId: e.target.value === 'mandal' ? tagForm.visibilityMandalId : ''
                          })}
                          className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        >
                          <option value="global">All Users</option>
                          <option value="state">State</option>
                          <option value="district">District</option>
                          <option value="mandal">Mandal</option>
                        </select>
                     </div>
                     {tagForm.visibilityLevel !== 'global' && (
                       <div>
                          <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">State</label>
                          <select
                            value={tagForm.visibilityStateId}
                            onChange={e => setTagForm({
                              ...tagForm,
                              visibilityStateId: e.target.value,
                              visibilityDistrictId: '',
                              visibilityMandalId: ''
                            })}
                            className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                          >
                            <option value="">Select state</option>
                            {locationTree.map(state => <option key={state.id} value={state.id}>{state.name}</option>)}
                          </select>
                       </div>
                     )}
                  </div>
                  {['district', 'mandal'].includes(tagForm.visibilityLevel) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">District</label>
                        <select
                          value={tagForm.visibilityDistrictId}
                          onChange={e => setTagForm({
                            ...tagForm,
                            visibilityDistrictId: e.target.value,
                            visibilityMandalId: ''
                          })}
                          className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        >
                          <option value="">Select district</option>
                          {(selectedTagState?.districts || []).map(district => <option key={district.id} value={district.id}>{district.name}</option>)}
                        </select>
                      </div>
                      {tagForm.visibilityLevel === 'mandal' && (
                        <div>
                          <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Mandal</label>
                          <select
                            value={tagForm.visibilityMandalId}
                            onChange={e => setTagForm({...tagForm, visibilityMandalId: e.target.value})}
                            className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                          >
                            <option value="">Select mandal</option>
                            {(selectedTagDistrict?.mandals || []).map(mandal => <option key={mandal.id} value={mandal.id}>{mandal.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <button type="submit" className="w-full py-4 bg-admin-primary text-white font-black rounded-[24px] shadow-lg shadow-admin-primary/20">Save Tag</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Banner Modal */}
      <AnimatePresence>
        {isBannerModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBannerModalOpen(false)} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
               <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <h3 className="text-2xl font-black">{editingBanner ? 'Edit Banner' : 'New Section Banner'}</h3>
                  <button onClick={() => setIsBannerModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-xl"><X /></button>
               </div>
               <form onSubmit={handleBannerSubmit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                  <div onClick={() => document.getElementById('ban-img').click()} className="aspect-[21/9] w-full rounded-[32px] bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                     {bannerImagePreview ? <img src={bannerImagePreview} className="w-full h-full object-cover" /> : <><Upload className="text-zinc-300 dark:text-zinc-600 group-hover:text-admin-primary transition-colors" /><span className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mt-2">Upload Banner Image</span></>}
                     <input id="ban-img" type="file" hidden onChange={e => {
                        const file = e.target.files[0];
                        if(file) { setBannerImage(file); setBannerImagePreview(URL.createObjectURL(file)); }
                     }} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Placement Type</label>
                        <select
                          value={bannerForm.placementType}
                          onChange={e => setBannerForm({
                            ...bannerForm,
                            placementType: e.target.value,
                            section: e.target.value === 'home_top' ? '' : bannerForm.section || sections[0]?._id || '',
                            categoryId: e.target.value === 'home_top' ? '' : bannerForm.categoryId
                          })}
                          className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        >
                          <option value="section">Section Banner</option>
                          <option value="home_top">Home Hero</option>
                        </select>
                     </div>
                     {bannerForm.placementType === 'section' ? (
                     <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Category Tag</label>
                        <select value={bannerForm.section} onChange={e => setBannerForm({...bannerForm, section: e.target.value, categoryId: ''})} className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white">
                           {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                     </div>
                     ) : (
                     <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <p className="text-xs font-bold text-blue-900">Home Hero Banner</p>
                        <p className="mt-1 text-[11px] font-semibold text-blue-700">This banner will be eligible only for <code>/api/banners/top</code>.</p>
                     </div>
                     )}
                     <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Title</label>
                        <input value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} placeholder="Festival Offer" className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white" />
                     </div>
                  </div>
                  {bannerForm.placementType === 'section' && (
                  <div>
                     <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Assigned Category</label>
                     <select value={bannerForm.categoryId} onChange={e => setBannerForm({...bannerForm, categoryId: e.target.value})} className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white">
                        <option value="">All categories in this section</option>
                        {sectionCategories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}
                     </select>
                  </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Visibility Level</label>
                        <select
                          value={bannerForm.visibilityLevel}
                          onChange={e => setBannerForm({
                            ...bannerForm,
                            visibilityLevel: e.target.value,
                            visibilityStateId: e.target.value === 'global' ? '' : bannerForm.visibilityStateId,
                            visibilityDistrictId: ['district', 'mandal'].includes(e.target.value) ? bannerForm.visibilityDistrictId : '',
                            visibilityMandalId: e.target.value === 'mandal' ? bannerForm.visibilityMandalId : ''
                          })}
                          className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        >
                          <option value="global">All Users</option>
                          <option value="state">State</option>
                          <option value="district">District</option>
                          <option value="mandal">Mandal</option>
                        </select>
                     </div>
                     {bannerForm.visibilityLevel !== 'global' && (
                     <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">State</label>
                        <select
                          value={bannerForm.visibilityStateId}
                          onChange={e => setBannerForm({
                            ...bannerForm,
                            visibilityStateId: e.target.value,
                            visibilityDistrictId: '',
                            visibilityMandalId: ''
                          })}
                          className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        >
                          <option value="">Select state</option>
                          {locationTree.map(state => <option key={state.id} value={state.id}>{state.name}</option>)}
                        </select>
                     </div>
                     )}
                  </div>

                  {bannerForm.visibilityLevel !== 'global' && bannerForm.visibilityLevel !== 'state' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">District</label>
                        <select
                          value={bannerForm.visibilityDistrictId}
                          onChange={e => setBannerForm({
                            ...bannerForm,
                            visibilityDistrictId: e.target.value,
                            visibilityMandalId: ''
                          })}
                          className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        >
                          <option value="">Select district</option>
                          {(selectedState?.districts || []).map(district => <option key={district.id} value={district.id}>{district.name}</option>)}
                        </select>
                      </div>
                      {bannerForm.visibilityLevel === 'mandal' && (
                        <div>
                          <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Mandal</label>
                          <select
                            value={bannerForm.visibilityMandalId}
                            onChange={e => setBannerForm({...bannerForm, visibilityMandalId: e.target.value})}
                            className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                          >
                            <option value="">Select mandal</option>
                            {(selectedDistrict?.mandals || []).map(mandal => <option key={mandal.id} value={mandal.id}>{mandal.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                     <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Location Label</label>
                     <input value={bannerForm.locationLabel} onChange={e => setBannerForm({...bannerForm, locationLabel: e.target.value})} placeholder="Festival Offer - Anantapur" className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">View/Redirect URL</label>
                        <input value={bannerForm.viewUrl} onChange={e => setBannerForm({...bannerForm, viewUrl: e.target.value})} placeholder="https://..." className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">WhatsApp Number</label>
                        <input value={bannerForm.whatsappLink} onChange={e => setBannerForm({...bannerForm, whatsappLink: e.target.value})} placeholder="+91..." className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white" />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block">Store Profile Link</label>
                     <input value={bannerForm.storeLink} onChange={e => setBannerForm({...bannerForm, storeLink: e.target.value})} placeholder="Deep link or slug" className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white" />
                  </div>

                  <button type="submit" disabled={isBannerSaving} className="w-full py-4 bg-admin-primary text-white font-black rounded-[24px] shadow-lg shadow-admin-primary/20 mt-4 disabled:cursor-not-allowed disabled:opacity-60">
                    {isBannerSaving ? 'Saving...' : 'Save Promotional Banner'}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Section Assignment Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isUpdating && setIsAssignModalOpen(false)} 
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
               <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <div>
                    <h3 className="text-2xl font-black">Assign Section</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Select ad placement</p>
                  </div>
                  <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"><X /></button>
               </div>
               
               <form onSubmit={handleAssignSubmit} className="p-8 space-y-6">
                  {currentAd && (
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                        <img src={currentAd.images?.[0]?.url} className="w-full h-full object-cover" />
                      </div>
                      <div className="truncate">
                        <p className="font-black text-sm text-zinc-900 dark:text-zinc-50 truncate">{currentAd.title}</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">ID: {currentAd._id.slice(-6)}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-1">Select Tag/Section</label>
                    <div className="grid grid-cols-1 gap-2">
                       <button
                         type="button"
                         onClick={() => setSelectedSectionId('')}
                         className={cn(
                           "flex items-center justify-between px-6 py-4 rounded-[20px] text-sm font-bold border-2 transition-all",
                           selectedSectionId === '' 
                            ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-lg" 
                            : "bg-zinc-50 dark:bg-zinc-800 border-transparent text-zinc-500 hover:border-zinc-200"
                         )}
                       >
                         None / Unassign
                         {selectedSectionId === '' && <CheckCircle2 size={18} />}
                       </button>

                       {sections.map(s => (
                         <button
                           key={s._id}
                           type="button"
                           onClick={() => setSelectedSectionId(s._id)}
                           className={cn(
                             "flex items-center justify-between px-6 py-4 rounded-[20px] text-sm font-bold border-2 transition-all",
                             selectedSectionId === s._id 
                              ? "bg-admin-primary text-white border-admin-primary shadow-lg shadow-admin-primary/20" 
                              : "bg-zinc-50 dark:bg-zinc-800 border-transparent text-zinc-500 hover:border-zinc-200"
                           )}
                         >
                           {s.name}
                           {selectedSectionId === s._id && <CheckCircle2 size={18} />}
                         </button>
                       ))}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black rounded-[24px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={20} /> : 'Update Assignment'}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
