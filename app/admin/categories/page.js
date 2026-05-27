"use client";

import React, { useState, useEffect } from 'react';
import { useAdminStore } from "@/store/useAdminStore";
import { categoryService } from "@/services/admin/category.service";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Plus, 
  Search, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Trash2,
  Edit2,
  Filter
} from 'lucide-react';
import { cn } from '../../../utils/cn';

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toString) return value.toString();
  return String(value);
}

/**
 * Admin Categories Management Page
 * Handles visualization and logic for business categories.
 */
export default function CategoriesPage() {
  const { categories, setCategories, isLoading, setLoading, setError } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sections, setSections] = useState([]);
  const [locationTree, setLocationTree] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sectionId: '',
    visibilityLevel: 'global',
    visibilityStateId: '',
    visibilityDistrictId: '',
    visibilityMandalId: '',
    isActive: true,
    icon: null,
    image: null
  });
  const [previews, setPreviews] = useState({
    icon: null,
    image: null
  });

  // Fetch categories from the backend
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getCategories();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to sync categories:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSections();
    fetchLocations();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await fetch('/api/admin/sections');
      const data = await res.json();
      if (data.success) setSections(data.data || []);
    } catch (error) {
      console.error('Failed to load sections', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations/tree');
      const data = await res.json();
      if (data.success) setLocationTree(data.data || []);
    } catch (error) {
      console.error('Failed to load locations', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sectionId: sections[0]?._id || '',
      visibilityLevel: 'global',
      visibilityStateId: '',
      visibilityDistrictId: '',
      visibilityMandalId: '',
      isActive: true,
      icon: null,
      image: null
    });
    setPreviews({ icon: null, image: null });
    setEditingCategory(null);
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        sectionId: normalizeId(category.sectionId?._id || category.sectionId),
        visibilityLevel: category.visibilityLevel || 'global',
        visibilityStateId: normalizeId(category.visibilityStateId),
        visibilityDistrictId: normalizeId(category.visibilityDistrictId),
        visibilityMandalId: normalizeId(category.visibilityMandalId),
        isActive: category.isActive,
        icon: null,
        image: null
      });
      setPreviews({
        icon: category.iconUrl,
        image: category.imageUrl
      });
    } else {
      setFormData({
        name: '',
        sectionId: sections[0]?._id || '',
        visibilityLevel: 'global',
        visibilityStateId: '',
        visibilityDistrictId: '',
        visibilityMandalId: '',
        isActive: true,
        icon: null,
        image: null
      });
      setPreviews({ icon: null, image: null });
      setEditingCategory(null);
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [type]: file }));
      setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('sectionId', formData.sectionId);
      data.append('visibilityLevel', formData.visibilityLevel);
      data.append('visibilityStateId', formData.visibilityLevel === 'global' ? '' : formData.visibilityStateId);
      data.append('visibilityDistrictId', ['district', 'mandal'].includes(formData.visibilityLevel) ? formData.visibilityDistrictId : '');
      data.append('visibilityMandalId', formData.visibilityLevel === 'mandal' ? formData.visibilityMandalId : '');
      data.append('isActive', formData.isActive);
      if (formData.icon) data.append('icon', formData.icon);
      if (formData.image) data.append('image', formData.image);

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory._id, data);
      } else {
        await categoryService.createCategory(data);
      }
      
      await fetchCategories();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      alert(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await categoryService.deleteCategory(id);
      await fetchCategories();
    } catch (error) {
      alert(error);
    }
  };

  // Filter logic
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedState = locationTree.find((state) => state.id === formData.visibilityStateId);
  const selectedDistrict = selectedState?.districts?.find((district) => district.id === formData.visibilityDistrictId);

  return (
    <div className="space-y-10 pb-20">
      {/* 1. Futuristic Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tighter mb-2">
            Category <span className="text-admin-primary">Taxonomy</span>
          </h1>
          <p className="text-zinc-500 font-bold text-sm bg-zinc-100/50 px-4 py-1.5 rounded-full inline-block">
            {categories.length} System Defined Categories
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-admin-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white focus:ring-4 ring-admin-primary/10 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-zinc-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-admin-primary transition-all w-full sm:w-auto"
          >
            <Plus size={20} />
            New Category
          </button>
        </div>
      </div>

      {/* 2. Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading && categories.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-100 animate-pulse rounded-[32px]" />
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredCategories.map((category, i) => (
              <motion.div
                key={category._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-[32px] p-8 border-white/60 hover:shadow-2xl transition-all group overflow-hidden relative"
              >
                {/* Decorative background image if available */}
                {category.imageUrl && (
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                    <img src={category.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-admin-primary-soft/30 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />

                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                   <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-900/20 group-hover:rotate-6 transition-transform overflow-hidden">
                     {category.iconUrl ? (
                        <img src={category.iconUrl} alt="" className="w-full h-full object-cover" />
                     ) : (
                        <Layers size={32} />
                     )}
                   </div>
                   
                   <div>
                     <h3 className="font-black text-xl text-zinc-900 tracking-tight">{category.name}</h3>
                     <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                       {(category.sectionId?.name || 'Unassigned Section')} • {category.visibilityLevel || 'global'}
                     </p>
                     <span className={cn(
                       "mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                       category.isActive ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                     )}>
                       {category.isActive ? "Active" : "Disabled"}
                     </span>
                   </div>

                   <div className="flex items-center gap-2 pt-4 w-full">
                      <button 
                        onClick={() => handleOpenModal(category)}
                        className="flex-1 p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-admin-primary hover:bg-admin-primary-soft transition-all"
                      >
                        <Edit2 size={16} className="mx-auto" />
                      </button>
                      <button 
                        onClick={() => handleDelete(category._id)}
                        className="flex-1 p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={16} className="mx-auto" />
                      </button>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* 3. Modern Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tighter">
                      {editingCategory ? 'Edit' : 'New'} <span className="text-admin-primary">Category</span>
                    </h2>
                    <p className="text-zinc-500 font-bold text-xs mt-1">Configure business taxonomy parameters</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all"
                  >
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Category Identity</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Premium Electronics"
                      className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl text-sm font-bold text-zinc-900 dark:text-white focus:ring-4 ring-admin-primary/10 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Assigned Section</label>
                    <select
                      value={formData.sectionId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sectionId: e.target.value }))}
                      className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 ring-admin-primary/10 outline-none transition-all"
                    >
                      <option value="">Select section</option>
                      {sections.map((section) => (
                        <option key={section._id} value={section._id}>{section.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Visibility Level</label>
                      <select
                        value={formData.visibilityLevel}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          visibilityLevel: e.target.value,
                          visibilityStateId: e.target.value === 'global' ? '' : prev.visibilityStateId,
                          visibilityDistrictId: ['district', 'mandal'].includes(e.target.value) ? prev.visibilityDistrictId : '',
                          visibilityMandalId: e.target.value === 'mandal' ? prev.visibilityMandalId : '',
                        }))}
                        className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 ring-admin-primary/10 outline-none transition-all"
                      >
                        <option value="global">Global</option>
                        <option value="state">State</option>
                        <option value="district">District</option>
                        <option value="mandal">Mandal</option>
                      </select>
                    </div>

                    {formData.visibilityLevel !== 'global' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">State</label>
                        <select
                          value={formData.visibilityStateId}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            visibilityStateId: e.target.value,
                            visibilityDistrictId: '',
                            visibilityMandalId: '',
                          }))}
                          className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 ring-admin-primary/10 outline-none transition-all"
                        >
                          <option value="">Select state</option>
                          {locationTree.map((state) => (
                            <option key={state.id} value={state.id}>{state.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {['district', 'mandal'].includes(formData.visibilityLevel) && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">District</label>
                        <select
                          value={formData.visibilityDistrictId}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            visibilityDistrictId: e.target.value,
                            visibilityMandalId: '',
                          }))}
                          className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 ring-admin-primary/10 outline-none transition-all"
                        >
                          <option value="">Select district</option>
                          {(selectedState?.districts || []).map((district) => (
                            <option key={district.id} value={district.id}>{district.name}</option>
                          ))}
                        </select>
                      </div>

                      {formData.visibilityLevel === 'mandal' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Mandal</label>
                          <select
                            value={formData.visibilityMandalId}
                            onChange={(e) => setFormData((prev) => ({ ...prev, visibilityMandalId: e.target.value }))}
                            className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 ring-admin-primary/10 outline-none transition-all"
                          >
                            <option value="">Select mandal</option>
                            {(selectedDistrict?.mandals || []).map((mandal) => (
                              <option key={mandal.id} value={mandal.id}>{mandal.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Category Icon</label>
                      <div className="relative group">
                        <div className="w-full aspect-square bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center overflow-hidden group-hover:border-admin-primary transition-all">
                          {previews.icon ? (
                            <img src={previews.icon} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Layers size={24} className="text-zinc-300 mb-2" />
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Select Icon</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'icon')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Banner Image</label>
                      <div className="relative group">
                        <div className="w-full aspect-square bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center overflow-hidden group-hover:border-admin-primary transition-all">
                          {previews.image ? (
                            <img src={previews.image} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Layers size={24} className="text-zinc-300 mb-2" />
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Select Banner</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'image')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Status Visibility</span>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className={cn(
                        "w-14 h-8 rounded-full relative transition-colors",
                        formData.isActive ? "bg-admin-primary" : "bg-zinc-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                        formData.isActive ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-zinc-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-admin-primary transition-all shadow-xl shadow-zinc-900/10 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : editingCategory ? 'Sync Changes' : 'Initialize Category'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!isLoading && filteredCategories.length === 0 && (
        <div className="text-center py-20">
           <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <Filter size={32} className="text-zinc-300" />
           </div>
           <h3 className="text-xl font-black text-zinc-900">No categories found</h3>
           <p className="text-zinc-500 font-bold mt-2">Try adjusting your search query</p>
        </div>
      )}
    </div>
  );
}
