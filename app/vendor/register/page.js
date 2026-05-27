'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, ArrowRight, ArrowLeft, 
  Store, MapPin, CheckCircle, Upload, Image as ImageIcon,
  Loader2, Map, Navigation, ShieldCheck, LocateFixed, Pin
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const VendorMap = dynamic(() => import('../../../components/VendorMap'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
});

// Wrap the main component in Suspense to handle useSearchParams()
export default function VendorRegistrationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-[#005596]" /></div>}>
      <RegistrationForm />
    </Suspense>
  );
}

function RegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMobile = searchParams.get('mobileNumber') || '';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locationTree, setLocationTree] = useState([]);
  const [vendorId, setVendorId] = useState(null);
  const [uploading, setUploading] = useState({ thumbnail: false, banner: false });

  // Form State
  const [formData, setFormData] = useState({
    // Step 1
    ownerName: '',
    email: '',
    mobileNumber: initialMobile,
    
    // Step 2
    category: '',
    storeName: '',
    storeAbout: '',
    state: '',
    district: '',
    mandal: '',
    thumbnailUrl: '',
    thumbnailKey: '',
    bannerUrl: '',
    bannerKey: '',

    // Step 3
    fullAddress: '',
    agentCode: '',
    locationCoordinates: [78.4867, 17.3850] // Default to Hyderabad [lng, lat]
  });

  const [mapCenter, setMapCenter] = useState({ lat: 17.3850, lng: 78.4867 });

  useEffect(() => {
    fetchCategories();
    fetchLocations();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (res.ok) setCategories(data.data || []);
    } catch (err) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations/tree');
      const data = await res.json();
      if (res.ok && data.success) {
        setLocationTree(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch locations');
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

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    if (!vendorId) {
      alert('Please complete Step 1 first.');
      return;
    }

    const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isValidType) {
      alert('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.');
      return;
    }

    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('vendorId', vendorId);
      form.append('docType', type === 'thumbnail' ? 'thumbnail' : 'banner');

      const res = await fetch('/api/modules/vendor/upload', {
        method: 'POST',
        body: form
      });
      const data = await res.json();

      if (!res.ok || !data?.success || !data?.data?.url) {
        throw new Error(data?.error?.message || data?.message || 'Image upload failed');
      }

      setFormData(prev => ({
        ...prev,
        thumbnailUrl: type === 'thumbnail' ? data.data.url : prev.thumbnailUrl,
        thumbnailKey: type === 'thumbnail' ? data.data.key : prev.thumbnailKey,
        bannerUrl: type === 'banner' ? data.data.url : prev.bannerUrl,
        bannerKey: type === 'banner' ? data.data.key : prev.bannerKey
      }));
    } catch (err) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleNextStep = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        if (!/^[6-9]\d{9}$/.test(formData.mobileNumber || '')) {
          alert('Please enter a valid 10-digit mobile number');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/vendor/register/step-1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerName: formData.ownerName,
            email: formData.email,
            mobileNumber: formData.mobileNumber
          })
        });
        const data = await res.json();
        if (res.ok) {
          setVendorId(data.vendorId);
          setStep(2);
        } else {
          alert(data.message || 'Step 1 failed');
        }
      } else if (step === 2) {
        const res = await fetch('/api/vendor/register/step-2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId,
            storeName: formData.storeName,
            category: formData.category,
            storeAbout: formData.storeAbout,
            state: formData.state,
            district: formData.district,
            mandal: formData.mandal,
            thumbnailUrl: formData.thumbnailUrl,
            thumbnailKey: formData.thumbnailKey,
            bannerUrl: formData.bannerUrl,
            bannerKey: formData.bannerKey
          })
        });
        if (res.ok) setStep(3);
        else {
          const data = await res.json();
          alert(data.message || 'Step 2 failed');
        }
      }
    } catch (err) {
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendor/register/step-3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          fullAddress: formData.fullAddress,
          locationCoordinates: formData.locationCoordinates,
          agentCode: formData.agentCode
        })
      });
      if (res.ok) {
        setStep(4); // Success Step
      } else {
        const data = await res.json();
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      alert('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData(prev => ({
          ...prev,
          locationCoordinates: [longitude, latitude]
        }));
        setMapCenter({ lat: latitude, lng: longitude });
        alert('Location captured successfully!');
      }, (err) => {
        console.error(err);
        alert('Could not get your location. Please ensure location permissions are enabled.');
      });
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

  const selectedState = locationTree.find((state) => state.name === formData.state);
  const selectedDistrict = selectedState?.districts?.find((district) => district.name === formData.district);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 p-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-[#1E293B]" />
          </button>
          <h1 className="text-xl font-bold text-[#1E293B]">Vendor Registration</h1>
          <div className="w-10 h-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-xl mx-auto p-6 pb-24">
        {/* Progress Bar */}
        {step < 4 && (
          <div className="mb-10">
             <div className="flex justify-center mb-4">
                <span className="px-4 py-1.5 bg-[#005596]/10 text-[#005596] rounded-full text-xs font-bold uppercase tracking-wider">
                  Step 0{step} of 03
                </span>
             </div>
             <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div 
                    key={s} 
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      s <= step ? 'bg-[#005596]' : 'bg-slate-200'
                    }`} 
                  />
                ))}
             </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#005596]/10 focus:border-[#005596] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@company.com"
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#005596]/10 focus:border-[#005596] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                       <span className="text-slate-900 font-bold">+91</span>
                    </div>
                    <input 
                      type="tel" 
                      maxLength={10}
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, '') }))}
                      className="w-full pl-16 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-medium outline-none focus:ring-2 focus:ring-[#005596]/10 focus:border-[#005596]"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleNextStep}
                disabled={!formData.ownerName || !formData.email || loading}
                className="w-full bg-[#005596] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#005596]/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue to Business Details <ArrowRight className="w-5 h-5" /></>}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-slate-100/50 p-6 rounded-3xl space-y-6 border border-slate-200/50">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Store Category</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#005596]/10"
                  >
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Store Name</label>
                  <input 
                    type="text" 
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    placeholder="Enter your business name"
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#005596]/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Store About</label>
                  <textarea 
                    name="storeAbout"
                    value={formData.storeAbout}
                    onChange={handleInputChange}
                    placeholder="Write about your store in detail."
                    rows="4"
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#005596]/10 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Select State</label>
                    <select 
                      name="state" value={formData.state} onChange={handleInputChange} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none"
                    >
                      <option value="">Select state</option>
                      {locationTree.map((state) => <option key={state.id} value={state.name}>{state.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Select District</label>
                      <select 
                        name="district" value={formData.district} onChange={handleInputChange} 
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none"
                      >
                        <option value="">Select district</option>
                        {(selectedState?.districts || []).map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Select Mandal</label>
                      <select 
                        name="mandal" value={formData.mandal} onChange={handleInputChange} 
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none"
                      >
                        <option value="">Select mandal</option>
                        {(selectedDistrict?.mandals || []).map((mandal) => <option key={mandal.id} value={mandal.name}>{mandal.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploads Section */}
              <div className="bg-slate-100/50 p-6 rounded-3xl space-y-6 border border-slate-200/50">
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Store Thumbnail</label>
                  <label className="aspect-square w-full border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white hover:border-[#005596] transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-[#005596]/5 rounded-full flex items-center justify-center group-hover:bg-[#005596]/10 transition-colors">
                       <Upload className="w-6 h-6 text-[#005596]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">Square ratio (1:1)</p>
                      <p className="text-xs text-slate-400">
                        {uploading.thumbnail ? 'Uploading...' : (formData.thumbnailUrl ? 'Uploaded' : 'PNG or JPG, max 5MB')}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0], 'thumbnail')}
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Store Banner</label>
                  <label className="aspect-[16/9] w-full border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white hover:border-[#005596] transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-[#005596]/5 rounded-full flex items-center justify-center group-hover:bg-[#005596]/10 transition-colors">
                       <ImageIcon className="w-6 h-6 text-[#005596]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">Wide ratio (16:9)</p>
                      <p className="text-xs text-slate-400">
                        {uploading.banner ? 'Uploading...' : (formData.bannerUrl ? 'Uploaded' : 'Recommended 1920x1080')}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0], 'banner')}
                    />
                  </label>
                </div>
                </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 bg-white text-slate-700 py-4 rounded-2xl font-bold border border-slate-200 active:scale-95 transition-all">Back</button>
                <button 
                  onClick={handleNextStep}
                  disabled={!formData.storeName || !formData.category || loading || uploading.thumbnail || uploading.banner}
                  className="flex-[2] bg-[#005596] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#005596]/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-[#005596]">Final Details</h2>
                <p className="text-slate-500 font-medium">Complete your registration to start managing your listings.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#005596] mb-3">Business Location (Move map to select)</label>
                  <div className="relative aspect-video rounded-3xl bg-slate-200 overflow-hidden border border-slate-200 shadow-inner z-0">
                    <VendorMap 
                      center={mapCenter} 
                      onMoveEnd={onMapMoveEnd} 
                    />
                    
                    <button 
                      onClick={getCurrentLocation}
                      className="absolute bottom-4 right-4 bg-white text-[#005596] p-3 rounded-full shadow-lg hover:bg-slate-50 transition-all z-[500]"
                      title="Get Current Location"
                    >
                      <LocateFixed className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                    Drag the map to position your shop under the pin
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#005596] mb-2">Full address</label>
                  <textarea 
                    name="fullAddress"
                    value={formData.fullAddress}
                    onChange={handleInputChange}
                    placeholder="Enter your street address, city, and zip code"
                    rows="3"
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#005596]/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#005596] mb-2">Agent code</label>
                  <input 
                    type="text" 
                    name="agentCode"
                    value={formData.agentCode}
                    onChange={handleInputChange}
                    placeholder="Enter the Agent code"
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#005596]/10"
                  />
                </div>

                <div className="bg-slate-100 p-6 rounded-2xl flex gap-4 items-start">
                   <ShieldCheck className="w-6 h-6 text-[#005596] shrink-0" />
                   <p className="text-xs text-slate-500 font-medium leading-relaxed">
                     By clicking Register, you agree to our Vendor Terms of Service and Privacy Policy. Your location data helps us verify your business premises.
                   </p>
                </div>
              </div>

              <button 
                onClick={handleRegister}
                disabled={!formData.fullAddress || loading}
                className="w-full bg-[#005596] text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-2 shadow-[0_10px_40px_rgba(0,85,150,0.3)] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Register <ArrowRight className="w-5 h-5" /></>}
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-12 space-y-6"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-[#1E293B]">Application Submitted!</h2>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">Your vendor registration is currently pending approval. We will notify you once it's active.</p>
              </div>
              <button 
                onClick={() => router.push('/vendor/login')}
                className="bg-[#005596] text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-[#005596]/20 transition-all active:scale-95"
              >
                Back to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

