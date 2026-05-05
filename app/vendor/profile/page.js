'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { 
  User, Mail, Phone, Store, MapPin, 
  Upload, Image as ImageIcon, Loader2, Save, 
  Map, Navigation, ShieldCheck, LocateFixed, ArrowLeft,
  ChevronRight, Globe, Info, Edit3, Camera
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStates, getDistricts, getMandals } from '../../../utils/locationData';
import dynamic from 'next/dynamic';

const VendorMap = dynamic(() => import('../../../components/VendorMap'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
});

export default function VendorProfileWrapper() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VendorProfilePage />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-[#005596]" />
    </div>
  );
}

function VendorProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 17.3850, lng: 78.4867 });
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    storeName: '',
    categoryId: '',
    storeAbout: '',
    state: '',
    district: '',
    mandal: '',
    fullAddress: '',
    locationCoordinates: [78.4867, 17.3850],
    thumbnailUrl: '',
    bannerUrl: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/vendor/profile', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('vendorToken')}` }
      });
      const result = await res.json();
      if (result.success) {
        const data = result.data;
        setProfile(data);
        setFormData({
          fullName: data.fullName || '',
          email: data.email || '',
          mobileNumber: data.mobileNumber || '',
          storeName: data.storeName || '',
          categoryId: data.categoryId?._id || data.categoryId || '',
          storeAbout: data.storeAbout || '',
          state: data.location?.state || '',
          district: data.location?.district || '',
          mandal: data.location?.mandal || '',
          fullAddress: data.fullAddress || '',
          locationCoordinates: data.locationCoordinates?.coordinates || [78.4867, 17.3850],
          thumbnailUrl: data.media?.thumbnailUrl || '',
          bannerUrl: data.media?.bannerUrl || ''
        });

        if (data.locationCoordinates?.coordinates) {
          setMapCenter({ 
            lat: data.locationCoordinates.coordinates[1], 
            lng: data.locationCoordinates.coordinates[0] 
          });
        }
      } else {
        router.push('/vendor/login');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Reset district/mandal if parent changes
      if (name === 'state') { updated.district = ''; updated.mandal = ''; }
      if (name === 'district') { updated.mandal = ''; }
      return updated;
    });
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('vendorId', profile._id);
      form.append('docType', type === 'thumbnail' ? 'thumbnail' : 'banner');

      const res = await fetch('/api/modules/vendor/upload', {
        method: 'POST',
        body: form
      });
      const data = await res.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          [`${type}Url`]: data.data.url,
          [`${type}Key`]: data.data.key
        }));
        alert(`${type === 'thumbnail' ? 'Thumbnail' : 'Banner'} uploaded successfully!`);
      }
    } catch (err) {
      alert('Upload failed');
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data.display_name) {
        setFormData(prev => ({
          ...prev,
          fullAddress: data.display_name
        }));
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
  };

  const onMapMoveEnd = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      locationCoordinates: [lng, lat]
    }));
    reverseGeocode(lat, lng);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vendorToken')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Profile updated successfully!');
        fetchProfile();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-[#005596] text-white pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Vendor Profile</h1>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-[#005596] px-6 py-2 rounded-full font-bold shadow-lg hover:bg-slate-100 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-[40px] shadow-2xl shadow-blue-900/10 p-8 md:p-10">
          
          {/* Banner & Thumbnail Section */}
          <div className="relative mb-12">
            <div className="h-48 w-full rounded-3xl bg-slate-100 overflow-hidden relative group">
              {formData.bannerUrl ? (
                <img src={formData.bannerUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'banner')} />
                <div className="flex flex-col items-center gap-2 text-white">
                   <Camera className="w-8 h-8" />
                   <span className="font-bold">Update Banner</span>
                </div>
              </label>
            </div>
            
            <div className="absolute -bottom-8 left-10 w-32 h-32 rounded-3xl border-4 border-white bg-white shadow-xl overflow-hidden group">
              {formData.thumbnailUrl ? (
                <img src={formData.thumbnailUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Store className="w-10 h-10" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'thumbnail')} />
                <Camera className="w-6 h-6 text-white" />
              </label>
            </div>
          </div>

          {/* Profile Details Tabs */}
          <div className="flex gap-6 mb-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
            {['basic', 'business', 'location'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-2 font-bold text-sm transition-all relative capitalize ${
                  activeTab === tab ? 'text-[#005596]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab} Details
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#005596] rounded-full" />}
              </button>
            ))}
          </div>

          {/* Form Sections */}
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Owner Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#005596]" />
                    <input 
                      name="fullName" value={formData.fullName} onChange={handleInputChange}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#005596]" />
                    <input 
                      name="email" value={formData.email} onChange={handleInputChange}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Mobile Number (Fixed)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      disabled value={formData.mobileNumber}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50/50 text-slate-400 rounded-2xl border-none font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'business' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Store Name</label>
                    <input 
                      name="storeName" value={formData.storeName} onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Category</label>
                    <select 
                      name="categoryId" value={formData.categoryId} onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium appearance-none transition-all"
                    >
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">About Store</label>
                  <textarea 
                    name="storeAbout" value={formData.storeAbout} onChange={handleInputChange} rows={4}
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-8">
                {/* Map Implementation */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pin Location (Drag map)</label>
                  <div className="relative aspect-video rounded-3xl bg-slate-100 overflow-hidden border border-slate-100 shadow-inner z-0">
                    <VendorMap 
                      center={mapCenter} 
                      onMoveEnd={onMapMoveEnd} 
                    />
                  </div>
                </div>

                {/* Dynamic Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">State</label>
                    <select 
                      name="state" value={formData.state} onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium"
                    >
                      <option value="">Select State</option>
                      {getStates().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">District</label>
                    <select 
                      name="district" value={formData.district} onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium"
                    >
                      <option value="">Select District</option>
                      {getDistricts(formData.state).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Mandal</label>
                    <select 
                      name="mandal" value={formData.mandal} onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium"
                    >
                      <option value="">Select Mandal</option>
                      {getMandals(formData.state, formData.district).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Full Address</label>
                  <textarea 
                    name="fullAddress" value={formData.fullAddress} onChange={handleInputChange} rows={3}
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 font-medium transition-all"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
