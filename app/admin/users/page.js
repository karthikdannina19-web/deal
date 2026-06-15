"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAdminStore } from "@/store/useAdminStore";
import { userService } from "@/services/admin/user.service";
import { Search, Filter, MoreHorizontal, User as UserIcon, Mail, Phone, Calendar, Loader2, MapPin, X } from "lucide-react";

function getUserFullName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || 'Unnamed user';
}

export default function UsersPage() {
  const { users, setUsers, isLoading, setLoading, setError } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    stateId: "",
    districtId: "",
    mandalId: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    stateId: "",
    districtId: "",
    mandalId: "",
  });

  const selectedState = locations.find((state) => state.id === draftFilters.stateId) || null;
  const availableDistricts = selectedState?.districts || [];
  const selectedDistrict = availableDistricts.find((district) => district.id === draftFilters.districtId) || null;
  const availableMandals = selectedDistrict?.mandals || [];

  const appliedState = locations.find((state) => state.id === appliedFilters.stateId) || null;
  const appliedDistrict = appliedState?.districts?.find((district) => district.id === appliedFilters.districtId) || null;
  const appliedMandal = appliedDistrict?.mandals?.find((mandal) => mandal.id === appliedFilters.mandalId) || null;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers(page, 20, searchTerm, appliedFilters);
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, searchTerm, setError, setLoading, setUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let cancelled = false;

    const loadLocations = async () => {
      try {
        setLocationsLoading(true);
        const response = await fetch('/api/locations/tree');
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load locations');
        }

        if (!cancelled) {
          setLocations(data.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setError(error.message || error);
        }
      } finally {
        if (!cancelled) {
          setLocationsLoading(false);
        }
      }
    };

    loadLocations();

    return () => {
      cancelled = true;
    };
  }, [setError]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleStateChange = (value) => {
    setDraftFilters({
      stateId: value,
      districtId: "",
      mandalId: "",
    });
  };

  const handleDistrictChange = (value) => {
    setDraftFilters((current) => ({
      ...current,
      districtId: value,
      mandalId: "",
    }));
  };

  const handleMandalChange = (value) => {
    setDraftFilters((current) => ({
      ...current,
      mandalId: value,
    }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = { stateId: "", districtId: "", mandalId: "" };
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const hasAppliedFilters = Boolean(
    appliedFilters.stateId || appliedFilters.districtId || appliedFilters.mandalId
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Users</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage user accounts and details.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:ring-2 ring-blue-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
            {hasAppliedFilters && (
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Filter Users By Location</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Narrow users by State, District, and Mandal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">State</span>
              <select
                value={draftFilters.stateId}
                onChange={(e) => handleStateChange(e.target.value)}
                disabled={locationsLoading}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500 disabled:opacity-60"
              >
                <option value="">All states</option>
                {locations.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">District</span>
              <select
                value={draftFilters.districtId}
                onChange={(e) => handleDistrictChange(e.target.value)}
                disabled={!draftFilters.stateId || locationsLoading}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500 disabled:opacity-60"
              >
                <option value="">All districts</option>
                {availableDistricts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mandal</span>
              <select
                value={draftFilters.mandalId}
                onChange={(e) => handleMandalChange(e.target.value)}
                disabled={!draftFilters.districtId || locationsLoading}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500 disabled:opacity-60"
              >
                <option value="">All mandals</option>
                {availableMandals.map((mandal) => (
                  <option key={mandal.id} value={mandal.id}>
                    {mandal.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              {hasAppliedFilters ? (
                <>
                  {appliedState && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      <MapPin size={14} />
                      {appliedState.name}
                    </span>
                  )}
                  {appliedDistrict && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {appliedDistrict.name}
                    </span>
                  )}
                  {appliedMandal && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {appliedMandal.name}
                    </span>
                  )}
                </>
              ) : (
                <span>No location filters applied.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 text-admin-primary animate-spin" />
                      <span className="text-zinc-500">Loading user registry...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <UserIcon size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {getUserFullName(user)}
                          </p>
                          <p className="text-xs text-zinc-500">ID: {user._id.substring(0, 8)}...</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {[user.mandal, user.district, user.state].filter(Boolean).join(', ') || 'Location not set'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                          <Mail size={14} className="text-zinc-400" />
                          <span className="truncate max-w-[150px]">{user.email || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                          <Phone size={14} className="text-zinc-400" />
                          <span>{user.phone || "N/A"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${user.status === 'active' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 
                          user.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50' : 
                          'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                        }`}
                      >
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
