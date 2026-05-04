'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VendorLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState('mobile'); // 'mobile' or 'otp'
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-focus logic
  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById(step === 'mobile' ? 'mobile-input' : 'otp-input')?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [step]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (mobileNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Check if vendor exists
      const checkRes = await fetch('/api/vendor/check-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
      });

      const checkData = await checkRes.json();

      if (checkRes.status === 404) {
        // Vendor doesn't exist -> Redirect to Register
        router.push(`/vendor/register?mobileNumber=${mobileNumber}`);
        return;
      }

      if (!checkData.exists) {
         router.push(`/vendor/register?mobileNumber=${mobileNumber}`);
         return;
      }

      // 2. Vendor exists -> Send OTP
      const otpRes = await fetch('/api/vendor/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
      });

      if (otpRes.ok) {
        setStep('otp');
      } else {
        const data = await otpRes.json();
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/vendor/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        // Store token and redirect to dashboard
        localStorage.setItem('vendorToken', data.token);
        router.push('/vendor/dashboard');
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#005596]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#005596]/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,85,150,0.1)] border border-[#005596]/5 overflow-hidden z-10"
      >
        <div className="p-8">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-[#005596]/10 rounded-2xl flex items-center justify-center mb-4">
              <img src="/logo.png" alt="RhockDeal" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Vendor Login</h1>
            <p className="text-slate-500 mt-2">Manage your business with RhockDeal</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'mobile' ? (
              <motion.form
                key="mobile-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOtp}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile Number</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium">+91</span>
                    </div>
                    <input
                      id="mobile-input"
                      type="tel"
                      maxLength="10"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#005596]/20 focus:border-[#005596] transition-all"
                      placeholder="9090909090"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading || mobileNumber.length !== 10}
                  className="w-full bg-[#005596] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#00447a] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      Continue <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                <button 
                  type="button" 
                  onClick={() => setStep('mobile')}
                  className="flex items-center gap-1 text-slate-500 text-sm hover:text-[#005596] transition-colors mb-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Change Number
                </button>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Enter OTP sent to <span className="text-[#005596]">+91 {mobileNumber}</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="otp-input"
                      type="text"
                      maxLength="4"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold tracking-[1em] focus:outline-none focus:ring-2 focus:ring-[#005596]/20 focus:border-[#005596] transition-all"
                      placeholder="••••"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 4}
                  className="w-full bg-[#005596] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#00447a] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </button>

                <p className="text-center text-sm text-slate-500">
                  Didn't receive OTP? <button type="button" className="text-[#005596] font-bold hover:underline">Resend</button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      <p className="mt-8 text-slate-400 text-sm">
        By continuing, you agree to our <a href="#" className="hover:text-slate-600 underline">Terms of Service</a> and <a href="#" className="hover:text-slate-600 underline">Privacy Policy</a>
      </p>
    </div>
  );
}
