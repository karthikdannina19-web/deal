"use client";

import React, { useEffect, useState } from 'react';
import { useAdminStore } from "@/store/useAdminStore";
import { adsService } from "@/services/admin/ads.service";
import { priorityService } from "@/services/admin/priority.service";
import { Search, Filter, MoreHorizontal, Megaphone, Eye, MousePointerClick, Calendar, CheckCircle2, XCircle, Clock, Loader2, Plus, X as CloseIcon, Upload, Check } from "lucide-react";

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return normalizeId(value._id);
  if (typeof value === 'object' && value.id) return normalizeId(value.id);
  if (typeof value === 'object' && value.toString) return value.toString();
  return String(value);
}

function getVisibilityLabel(level) {
  return level === 'global' ? 'All Users' : `${level} Visibility`;
}

export default function AdsPage() {
  const { ads, setAds, isLoading, setLoading, setError, updateAdStatus, removeAd } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [processingId, setProcessingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    category: 'General',
    vendorId: '' 
  });

  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [categories, setCategories] = useState([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedVisibilityLevel, setSelectedVisibilityLevel] = useState("global");
  const [selectedPriority, setSelectedPriority] = useState("");

  const fetchAds = async () => {
    try {
      setLoading(true);
      const data = await adsService.getAds({ 
        page, 
        limit: 20, 
        search: searchTerm,
        status: statusFilter === 'all' ? '' : statusFilter
      });
      setAds(data.ads || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch('/api/admin/sections');
      const result = await res.json();
      if (result.success) setSections(result.data);
    } catch (err) {
      console.error('Failed to fetch sections', err);
    }
  };

  const fetchCategories = async () => {
    try {
      setIsCategoryLoading(true);
      const res = await fetch('/api/admin/categories');
      const result = await res.json();
      if (result && result.success) {
        setCategories(result.categories || result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setIsCategoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
    fetchSections();
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    if (isModerationModalOpen) {
      fetchCategories();
    }
  }, [isModerationModalOpen]);

  const handleOpenModeration = (ad) => {
    setSelectedAd(ad);
    const nextSectionId = normalizeId(ad.section?._id || ad.section);
    setSelectedSection(nextSectionId);
    setSelectedCategory(ad.category || '');
    setSelectedCategoryId(normalizeId(ad.categoryId?._id || ad.categoryId));
    setSelectedVisibilityLevel(ad.vendor?.visibilityLevel || 'global');
    setSelectedPriority("");
    setReviewNotes("");
    setIsModerationModalOpen(true);
  };

  const handleReview = async (
    id,
    status,
    sectionId = null,
    notes = "Admin moderation",
    category = undefined,
    categoryId = undefined,
    visibilityLevel = undefined,
    visibilityStateId = undefined,
    visibilityDistrictId = undefined,
    visibilityMandalId = undefined,
    priority = undefined,
    priorityScopeLevel = undefined
  ) => {
    setProcessingId(id);
    try {
      await adsService.reviewAd(
        id,
        status,
        notes,
        sectionId,
        category,
        categoryId,
        visibilityLevel,
        visibilityStateId,
        visibilityDistrictId,
        visibilityMandalId,
        priority,
        priorityScopeLevel
      );
      updateAdStatus(id, status === 'approve' || status === 'activate' ? 'approved' : status === 'reject' ? 'rejected' : status);
      await fetchAds();
      setIsModerationModalOpen(false);
    } catch (err) {
      alert(err || 'Failed to update ad status');
    } finally {
      setProcessingId(null);
    }
  };

  const sectionCategories = categories;
  useEffect(() => {
    if (!selectedAd) {
      setSelectedPriority("");
      return;
    }

    const scopeLevel = selectedVisibilityLevel || 'global';
    const stateId = normalizeId(selectedAd.vendor?.storeStateId || selectedAd.visibilityStateId);
    const districtId = normalizeId(selectedAd.vendor?.storeDistrictId || selectedAd.visibilityDistrictId);
    const mandalId = normalizeId(selectedAd.vendor?.storeMandalId || selectedAd.visibilityMandalId);
    let cancelled = false;

    const loadPriority = async () => {
      try {
        const result = await priorityService.listRules({
          entityType: 'ad',
          entityId: selectedAd._id,
          scopeLevel,
          stateId,
          districtId,
          mandalId,
        });

        if (!cancelled) {
          setSelectedPriority(result.data?.[0]?.priority ? String(result.data[0].priority) : "");
        }
      } catch {
        if (!cancelled) {
          setSelectedPriority("");
        }
      }
    };

    loadPriority();

    return () => {
      cancelled = true;
    };
  }, [selectedAd, selectedVisibilityLevel]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    if (!imageFile) return alert("Please upload an ad image (450x525)");

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('url', formData.url);
      data.append('media', imageFile);
      // We'll use the vendor API's logic for simplicity, or we can use an admin-specific one.
      // But admin needs to specify which vendor. For now, we'll assume the admin is creating for a test vendor or we need a vendorId field.
      
      const res = await fetch('/api/vendor/ads', { // Reusing vendor API for consistency in logic
        method: 'POST',
        body: data
      });
      
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        setFormData({ title: '', description: '', url: '', category: 'General', vendorId: '' });
        setImageFile(null);
        setImagePreview(null);
        fetchAds();
      } else {
        alert(result.message || 'Failed to create ad');
      }
    } catch (err) {
      alert('Error creating ad');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAd = async (adId) => {
    if (!confirm('Delete this ad? This will remove it from active listings.')) return;

    setProcessingId(adId);
    try {
      await adsService.deleteAd(adId);
      removeAd(adId);
    } catch (err) {
      alert(err || 'Failed to delete ad');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Advertisements</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Review, approve, and manage vendor ads.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  statusFilter === status 
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Search ads..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:ring-2 ring-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Create Ad
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-visible shadow-sm">
        <div className="overflow-x-auto overflow-y-visible no-scrollbar rounded-t-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
              <tr>
                <th className="px-6 py-4">Ad Campaign</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Performance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 text-admin-primary animate-spin" />
                      <span className="text-zinc-500">Scanning active campaigns...</span>
                    </div>
                  </td>
                </tr>
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                    No ads found.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => {
                  const businessName = ad.vendor?.storeName || ad.vendor?.fullName || 'Unknown Vendor';
                  const primaryImageUrl = ad.images?.find(img => img.isPrimary)?.url || ad.images?.[0]?.url;

                  return (
                    <tr key={ad._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {primaryImageUrl ? (
                            <img src={primaryImageUrl} alt={ad.title} className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                              <Megaphone size={20} />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 w-48" title={ad.title}>
                              {ad.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                              <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{ad.category}</span>
                              {ad.priceType === 'fixed' && <span>₹{ad.price}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">{businessName}</p>
                          <p className="text-xs text-zinc-500 flex flex-col">
                            <span>{ad.user?.firstName} {ad.user?.lastName}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border
                            ${ad.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 
                              ad.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50' : 
                              ad.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50' : 
                              ad.status === 'expired' ? 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' :
                              'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50'
                            }`}
                          >
                            {ad.status === 'approved' && <CheckCircle2 size={12} />}
                            {ad.status === 'pending' && <Clock size={12} />}
                            {ad.status === 'rejected' && <XCircle size={12} />}
                            <span className="capitalize">{ad.status}</span>
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold mt-1">
                            {ad.creditType} Listing
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-4">
                           <div className="flex flex-col items-center">
                             <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-xs">
                               <Eye size={14} /> Views
                             </div>
                             <span className="font-semibold text-zinc-800 dark:text-zinc-200">{ad.views || 0}</span>
                           </div>
                           <div className="flex flex-col items-center">
                             <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-xs">
                               <MousePointerClick size={14} /> Clicks
                             </div>
                             <span className="font-semibold text-zinc-800 dark:text-zinc-200">{ad.clicks || 0}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Actions for Pending */}
                          <div className="flex flex-col gap-2">
                            {ad.status === 'pending' ? (
                              <button 
                                onClick={() => handleOpenModeration(ad)}
                                disabled={!!processingId}
                                className="px-3 py-1 bg-admin-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                              >
                                Review & Approve
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenModeration(ad)}
                                disabled={!!processingId}
                                className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                              >
                                Edit Section / Category
                              </button>
                            )}

                            {ad.status !== 'pending' && (
                              <div className="flex gap-2">
                                {ad.status === 'suspended' || ad.status === 'rejected' || ad.status === 'expired' ? (
                                  <button 
                                    onClick={() => handleReview(ad._id, 'activate')}
                                    disabled={!!processingId}
                                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors disabled:opacity-50"
                                  >
                                    Activate
                                  </button>
                                ) : ad.status === 'approved' ? (
                                  <button 
                                    onClick={() => handleReview(ad._id, 'suspend')}
                                    disabled={!!processingId}
                                    className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 transition-colors disabled:opacity-50"
                                  >
                                    Suspend
                                  </button>
                                ) : null}
                              </div>
                            )}
                          </div>

                          <div className="relative group">
                            <button className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                              <MoreHorizontal size={18} />
                            </button>
                            
                            {/* Action Dropdown (Hover-based for simplicity) */}
                            <div className="absolute right-0 bottom-full mb-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-30 hidden group-hover:block group-focus-within:block animate-in fade-in zoom-in-95 duration-150">
                              <button 
                                onClick={() => handleReview(ad._id, 'expire')}
                                className="w-full text-left px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                              >
                                Force Expire
                              </button>
                              <button 
                                onClick={() => handleReview(ad._id, 'suspend')}
                                className="w-full text-left px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                              >
                                Suspend Ad
                              </button>
                              <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                              <button 
                                onClick={() => handleDeleteAd(ad._id)}
                                disabled={processingId === ad._id}
                                className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50"
                              >
                                {processingId === ad._id ? 'Deleting...' : 'Delete Ad'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-sm text-zinc-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create Ad Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Create New Advertisement</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <CloseIcon size={20} className="text-zinc-500" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAd} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Ad Image (Must be 450x525)</label>
                <div 
                  onClick={() => document.getElementById('ad-image-upload').click()}
                  className="aspect-[450/525] w-full max-w-[200px] mx-auto bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden relative group"
                >
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-zinc-400 group-hover:text-blue-500 mb-2" />
                      <span className="text-xs text-zinc-500">Upload Image</span>
                    </>
                  )}
                  <input id="ad-image-upload" type="file" hidden accept="image/*" onChange={handleImageChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Ad Title</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. 50% Off Summer Sale"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Tell customers about this offer..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all resize-none text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Target URL (Optional)</label>
                <input 
                  type="url" 
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all text-zinc-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} />}
                  Create Ad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Moderation Modal */}
      {isModerationModalOpen && selectedAd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-5 py-4 sm:px-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Moderate Advertisement</h3>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium">Review content, map section/category, and set visibility.</p>
              </div>
              <button onClick={() => setIsModerationModalOpen(false)} className="p-2 sm:p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors shrink-0">
                <CloseIcon size={20} className="text-zinc-500" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-5">
                <div className="space-y-5">
                  <div className="flex gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                    <img
                      src={selectedAd.images?.[0]?.url}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-black text-zinc-900 dark:text-zinc-50 line-clamp-2">{selectedAd.title}</p>
                      <p className="text-xs text-zinc-500 line-clamp-4 mt-1">{selectedAd.description}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2.5">Moderation Notes</label>
                    <textarea
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      placeholder="e.g. Content looks good, high quality images."
                      rows={5}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 ring-admin-primary/20 focus:border-admin-primary transition-all font-bold resize-none text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-500">Assign to Section</label>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{sections.length} available</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSection('');
                          setSelectedCategory('');
                          setSelectedCategoryId('');
                        }}
                        className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                          !selectedSection
                            ? 'border-admin-primary bg-admin-primary/10 text-admin-primary'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:border-admin-primary/50'
                        }`}
                      >
                        <p className="font-black text-sm">No Section</p>
                        <p className="mt-1 text-[11px] font-semibold opacity-70">Standard listing only</p>
                      </button>
                      {sections.map(section => {
                        const sectionId = normalizeId(section._id || section.id);
                        const isSelected = selectedSection === sectionId;
                        return (
                          <button
                            key={sectionId}
                            type="button"
                            onClick={() => {
                              setSelectedSection(sectionId);
                              setSelectedCategory('');
                              setSelectedCategoryId('');
                            }}
                            className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                              isSelected
                                ? 'border-admin-primary bg-admin-primary/10 text-admin-primary'
                                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:border-admin-primary/50'
                            }`}
                          >
                            <p className="font-black text-sm line-clamp-1">{section.name}</p>
                            <p className="mt-1 text-[11px] font-semibold opacity-70">Curated discovery</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-500">Assigned Category</label>
                      {isCategoryLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-admin-primary" />
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{categories.length} taxonomy</span>
                      )}
                    </div>
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3">
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('');
                            setSelectedCategoryId('');
                          }}
                          className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
                            !selectedCategoryId
                              ? 'bg-admin-primary text-white'
                              : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          All categories
                        </button>
                        {sectionCategories.map(cat => {
                          const categoryId = normalizeId(cat._id || cat.id);
                          const isSelected = selectedCategoryId === categoryId;
                          return (
                            <button
                              key={categoryId}
                              type="button"
                              onClick={() => {
                                setSelectedCategoryId(categoryId);
                                setSelectedCategory(cat.name || '');
                              }}
                              className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
                                isSelected
                                  ? 'bg-admin-primary text-white'
                                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-admin-primary/50'
                              }`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                        {!isCategoryLoading && sectionCategories.length === 0 && (
                          <p className="text-sm font-bold text-zinc-500">No categories found in Category Taxonomy.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2.5">Visibility Target</label>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/20 mb-3">
                      <p className="text-xs font-bold text-blue-800 dark:text-blue-200">
                        Store location: {selectedAd.vendor?.location?.mandal || 'Unknown mandal'}, {selectedAd.vendor?.location?.district || 'Unknown district'}, {selectedAd.vendor?.location?.state || 'Unknown state'}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-blue-700/70 dark:text-blue-200/70">
                        Location IDs are applied automatically from the approved store profile.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-admin-primary bg-admin-primary/10 px-4 py-3 text-admin-primary">
                      <p className="font-black text-sm capitalize">{getVisibilityLabel(selectedVisibilityLevel)}</p>
                      <p className="text-xs opacity-70 mt-1">
                        This ad automatically inherits the store visibility target and cannot be broadened separately.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2.5">Location Priority</label>
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={selectedPriority}
                          onChange={(event) => setSelectedPriority(event.target.value)}
                          placeholder="1"
                          className="w-28 rounded-2xl border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-sm font-black text-zinc-900 dark:text-white outline-none focus:border-admin-primary"
                        />
                        <p className="text-xs font-semibold text-zinc-500">
                          Lower number will show this ad earlier for users in the selected visibility target.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-4 sm:px-6 border-t border-zinc-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={() => handleReview(selectedAd._id, 'reject', null, reviewNotes)}
                  disabled={!!processingId}
                  className="py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Reject Ad
                </button>
                <button 
                  onClick={() => handleReview(
                    selectedAd._id,
                    'approve',
                    selectedSection,
                    reviewNotes,
                    selectedCategory,
                    selectedCategoryId || null,
                    selectedVisibilityLevel || 'global',
                    undefined,
                    undefined,
                    undefined,
                    selectedPriority || null,
                    selectedVisibilityLevel || 'global'
                  )}
                  disabled={!!processingId}
                  className="py-4 bg-admin-primary text-white font-black rounded-2xl hover:shadow-xl hover:shadow-admin-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === selectedAd._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 size={20} />}
                  {selectedAd?.status === 'approved' ? 'Update Ad' : 'Approve Ad'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
