"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, UserCheck, Image as ImageIcon, Link as LinkIcon, Info, CheckCircle2, AlertCircle, Loader2, History, Calendar, ExternalLink } from "lucide-react";
import { notificationService } from "@/services/admin/notification.service";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'welcome',
    targetType: 'all',
    imageUrl: '',
    actionType: 'none',
    actionTarget: '',
  });

  const notificationTypes = [
    { value: 'welcome', label: 'Welcome' },
    { value: 'flash_deal', label: 'Flash Deal' },
    { value: 'coins_earned', label: 'Coins Earned' },
    { value: 'store_update', label: 'Store Update' },
    { value: 'offer_expiring', label: 'Offer Expiring' },
    { value: 'cashback', label: 'Cashback' },
    { value: 'referral_bonus', label: 'Referral Bonus' },
    { value: 'deal_reminder', label: 'Deal Reminder' },
    { value: 'profile_updated', label: 'Profile Updated' },
    { value: 'daily_checkin', label: 'Daily Checkin' },
    { value: 'nearby_store', label: 'Nearby Store' },
    { value: 'order_reward', label: 'Order Reward' },
    { value: 'survey', label: 'Survey' },
    { value: 'security', label: 'Security' },
    { value: 'food_offer', label: 'Food Offer' },
  ];

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await notificationService.getBroadcastHistory();
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        title: formData.title,
        body: formData.body,
        type: formData.type,
        targetType: formData.targetType,
        imageUrl: formData.imageUrl || null,
        action: formData.actionType !== 'none' ? {
          type: formData.actionType,
          target: formData.actionTarget,
          params: {}
        } : { type: 'none' }
      };

      const result = await notificationService.sendBroadcast(payload);
      setSuccess(result.message);
      setFormData({
        title: '',
        body: '',
        type: 'welcome',
        targetType: 'all',
        imageUrl: '',
        actionType: 'none',
        actionTarget: '',
      });
      // Refresh history after sending
      fetchHistory();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Broadcast Notifications</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Send global alerts and updates to your app users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Notification Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Weekend Flash Sale! ⚡" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Message Body</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="Tell your users what's happening..." 
                  value={formData.body}
                  onChange={(e) => setFormData({...formData, body: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium resize-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Category Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white"
                  >
                    {notificationTypes.map(t => (
                      <option key={t.value} value={t.value} className="bg-white dark:bg-zinc-900">{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Target Audience</label>
                  <select 
                    value={formData.targetType}
                    onChange={(e) => setFormData({...formData, targetType: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white"
                  >
                    <option value="all" className="bg-white dark:bg-zinc-900">All App Users</option>
                    <option value="login_only" className="bg-white dark:bg-zinc-900">Active Login Users</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Media & Actions (Optional)</h3>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  <ImageIcon size={16} className="text-zinc-400" /> Image URL
                </label>
                <input 
                  type="url" 
                  placeholder="https://example.com/banner.jpg" 
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Action Type
                  </label>
                  <select 
                    value={formData.actionType}
                    onChange={(e) => setFormData({...formData, actionType: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium text-zinc-900 dark:text-white"
                  >
                    <option value="none" className="bg-white dark:bg-zinc-900">No Action</option>
                    <option value="route" className="bg-white dark:bg-zinc-900">App Route (Deep Link)</option>
                    <option value="external" className="bg-white dark:bg-zinc-900">External Website</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Target Path/URL</label>
                  <input 
                    type="text" 
                    disabled={formData.actionType === 'none'}
                    placeholder={formData.actionType === 'route' ? '/deals/hot' : 'https://...'} 
                    value={formData.actionTarget}
                    onChange={(e) => setFormData({...formData, actionTarget: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 ring-admin-primary/20 transition-all font-medium disabled:opacity-50 text-zinc-900 dark:text-white placeholder:text-zinc-400"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-admin-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-admin-primary/25 hover:shadow-admin-primary/40 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Send size={18} />
                  Send Broadcast Now
                </>
              )}
            </button>

            {success && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 size={20} className="shrink-0" />
                <p className="text-sm font-medium">{success}</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in zoom-in duration-300">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Preview / Tips Section */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-admin-primary to-admin-primary/80 rounded-3xl p-6 text-white shadow-xl shadow-admin-primary/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Info size={20} />
              Quick Tips
            </h3>
            <ul className="space-y-4 text-sm opacity-90">
              <li className="flex gap-3">
                <Users size={18} className="shrink-0" />
                <span><b>All App Users</b> reaches everyone registered in the system database.</span>
              </li>
              <li className="flex gap-3">
                <UserCheck size={18} className="shrink-0" />
                <span><b>Active Login Users</b> targets users who have logged in at least once recently.</span>
              </li>
              <li className="flex gap-3">
                <Bell size={18} className="shrink-0" />
                <span>Notifications are stored for in-app viewing and trigger push alerts for users with active tokens.</span>
              </li>
            </ul>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-admin-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-500 mb-4">Live Preview</h3>
            
            <div className="space-y-4 relative">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-admin-primary/20 flex items-center justify-center text-admin-primary shrink-0">
                  <Bell size={24} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm truncate max-w-[150px]">
                    {formData.title || "Your Title Here"}
                  </p>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {formData.body || "Your message content will appear here for the user."}
                  </p>
                  <p className="text-[10px] text-zinc-500 pt-1">Just now</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-zinc-500 text-center uppercase tracking-[0.2em]">
              User Mobile Experience
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-admin-primary/10 rounded-lg text-admin-primary">
            <History size={20} />
          </div>
          <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Broadcast History</h3>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Targeting</th>
                  <th className="px-6 py-4">Impact</th>
                  <th className="px-6 py-4">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {historyLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3 text-zinc-500">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Loading history...</span>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-zinc-500 font-medium">
                      No broadcast history found.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                            <Bell size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{item.body}</p>
                            {item.action?.type !== 'none' && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-admin-primary uppercase tracking-wider">
                                <ExternalLink size={10} />
                                {item.action.target}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                          ${item.targetType === 'all' 
                            ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' 
                            : 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50'
                          }`}
                        >
                          {item.targetType === 'all' ? <Users size={12} /> : <UserCheck size={12} />}
                          {item.targetType === 'all' ? 'All Users' : 'Login Only'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{item.totalNotified}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Recipients</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                          <Calendar size={14} className="opacity-50" />
                          <span className="text-xs font-medium">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
