"use client";

import React, { useEffect, useState } from 'react';
import { useAdminStore } from "@/store/useAdminStore";
import { adsService } from "@/services/admin/ads.service";
import { Search, Filter, MoreHorizontal, Megaphone, Eye, MousePointerClick, Calendar, CheckCircle2, XCircle, Clock, Loader2, Plus, X as CloseIcon, Upload, Check } from "lucide-react";

export default function AdsPage() {
  const { ads, setAds, isLoading, setLoading, setError, updateAdStatus } = useAdminStore();
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
    vendorId: '' // In a real app, this would be a searchable dropdown
  });

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

  useEffect(() => {
    fetchAds();
  }, [page, searchTerm, statusFilter]);

  const handleReview = async (id, status) => {
    setProcessingId(id);
    try {
      await adsService.reviewAd(id, status, "Admin moderation");
      updateAdStatus(id, status === 'approve' ? 'approved' : 'rejected');
    } catch (err) {
      alert(err || 'Failed to update ad status');
    } finally {
      setProcessingId(null);
    }
  };

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
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 ring-blue-500 outline-none"
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

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
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
                          {ad.status === 'pending' ? (
                            <>
                              <button 
                                onClick={() => handleReview(ad._id, 'approve')}
                                disabled={!!processingId}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 shadow-sm"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleReview(ad._id, 'reject')}
                                disabled={!!processingId}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            /* Status Management for non-pending */
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

                          <div className="relative group">
                            <button className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                              <MoreHorizontal size={18} />
                            </button>
                            
                            {/* Action Dropdown (Hover-based for simplicity) */}
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-10 hidden group-hover:block animate-in fade-in zoom-in-95 duration-150">
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
                                onClick={() => {/* TODO: Implement Delete */}}
                                className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                              >
                                Delete Ad
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
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all"
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
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Target URL (Optional)</label>
                <input 
                  type="url" 
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all"
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
    </div>
  );
}
