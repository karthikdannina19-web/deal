"use client";

import React, { useEffect, useState } from 'react';
import { dbConnect } from "@/config/database";
import SubscriptionPlan from "@/models/subscriptionPlan.model";
import { Plus, MoreHorizontal, Check, X, IndianRupee, Layers, Star, Loader2, X as CloseIcon } from "lucide-react";
import { toast } from "react-hot-toast";

// Client-side fetching instead of server-side for easier interactivity

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    creditsIncluded: '',
    billingCycle: 'monthly',
    badge: '',
    features: [{ label: '1 post = 1 credit', included: true }, { label: 'Post your ad with ease', included: true }]
  });

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/subscription-plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          creditsIncluded: Number(formData.creditsIncluded)
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          description: '',
          price: '',
          creditsIncluded: '',
          billingCycle: 'monthly',
          badge: '',
          features: [{ label: '1 post = 1 credit', included: true }, { label: 'Post your ad with ease', included: true }]
        });
        fetchPlans();
      } else {
        alert(data.message || 'Failed to create plan');
      }
    } catch (err) {
      alert('Error creating plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Subscription Plans</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage vendor subscription tiers and pricing.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors shadow-sm"
        >
          <Plus size={16} />
          Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {isLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p>Loading subscription tiers...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            No subscription plans found. Create one to get started.
          </div>
        ) : (
          plans.map((plan) => (
            <div 
              key={plan._id} 
              className={`bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border transition-all relative overflow-hidden
                ${plan.isPopular ? 'border-blue-500 ring-1 ring-blue-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}
              `}
            >
              {plan.isPopular && (
                <div className="absolute top-0 inset-x-0 h-1 bg-blue-500"></div>
              )}
              
              {!plan.isActive && (
                <div className="absolute top-4 right-4 px-2 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded dark:bg-red-900/30 dark:text-red-400">
                  Inactive
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div>
                  {plan.badge && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">
                      {plan.badge.replace('_', ' ')}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1 h-10 line-clamp-2">{plan.description}</p>
                </div>
              </div>

              <div className="my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center">
                    {plan.currency === 'INR' ? <IndianRupee size={24} className="mr-1" /> : '$'}
                    {plan.price}
                  </span>
                  <span className="text-zinc-500 text-sm font-medium">/ {plan.billingCycle.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <Layers size={16} className="text-blue-500" />
                  <span className="font-semibold">{plan.creditsIncluded}</span> Ad Credits
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <Star size={16} className="text-yellow-500" />
                  Max <span className="font-semibold">{plan.maxAds === 0 ? 'Unlimited' : plan.maxAds}</span> Active Ads
                </div>
                
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-4"></div>
                
                <ul className="space-y-2">
                  {plan.features?.slice(0, 4).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {feature.included ? (
                        <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <X size={16} className="text-zinc-300 dark:text-zinc-600 shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "" : "text-zinc-400 dark:text-zinc-500"}>
                        {feature.label}
                      </span>
                    </li>
                  ))}
                  {(plan.features?.length > 4) && (
                    <li className="text-xs text-zinc-400 pl-6 italic">+{plan.features.length - 4} more features</li>
                  )}
                </ul>
              </div>

              <div className="mt-auto pt-4 flex gap-2">
                <button className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors
                  ${plan.isPopular 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  Edit Plan
                </button>
                <button className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 transition-colors">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Create New Plan</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <CloseIcon size={20} className="text-zinc-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Plan Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Near Business Pro"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="What's included in this plan?"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Price (INR)</label>
                  <input 
                    required
                    type="number" 
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    placeholder="4999"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Ad Credits</label>
                  <input 
                    required
                    type="number" 
                    value={formData.creditsIncluded}
                    onChange={e => setFormData({...formData, creditsIncluded: e.target.value})}
                    placeholder="20"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Billing Cycle</label>
                  <select 
                    value={formData.billingCycle}
                    onChange={e => setFormData({...formData, billingCycle: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half_yearly">Half Yearly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Badge (Optional)</label>
                  <select 
                    value={formData.badge}
                    onChange={e => setFormData({...formData, badge: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-all"
                  >
                    <option value="">None</option>
                    <option value="popular">Popular</option>
                    <option value="best_value">Best Value</option>
                    <option value="starter">Starter</option>
                  </select>
                </div>
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
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
