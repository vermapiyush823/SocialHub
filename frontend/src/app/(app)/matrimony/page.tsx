"use client";

import { useAuth } from '@/lib/auth';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

interface Profile {
  _id: string; userId: { _id: string; name: string; profilePicPublicId?: string; profilePicUrl?: string; isOnline?: boolean };
  age: number; gender: string; height: string; religion: string; caste: string; motherTongue: string; maritalStatus: string;
  education: string; occupation: string; income: string; city: string; state: string; country: string; about: string; interestSent?: boolean;
}

type Tab = 'discover' | 'profile' | 'interests';

export default function MatrimonyPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('discover');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ gender: '', ageMin: '', ageMax: '', city: '', religion: '', education: '', occupation: '', maritalStatus: '', income: '', motherTongue: '', sort: 'newest' });
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({ age: '', gender: 'male', height: '', religion: '', caste: '', motherTongue: '', maritalStatus: 'never_married', education: '', occupation: '', income: '', city: '', state: '', country: 'India', about: '' });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (tab === 'interests') loadInterests(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pR, bR] = await Promise.all([api.get('/matrimony/profile'), api.get('/matrimony/browse')]);
      if (pR.data.profile) { setMyProfile(pR.data.profile); const p = pR.data.profile; setForm({ age: p.age?.toString()||'', gender: p.gender||'male', height: p.height||'', religion: p.religion||'', caste: p.caste||'', motherTongue: p.motherTongue||'', maritalStatus: p.maritalStatus||'never_married', education: p.education||'', occupation: p.occupation||'', income: p.income||'', city: p.city||'', state: p.state||'', country: p.country||'India', about: p.about||'' }); }
      setProfiles(bR.data.profiles);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const saveProfile = async (e: React.FormEvent) => { e.preventDefault(); try { const r = await api.post('/matrimony/profile', { ...form, age: parseInt(form.age)||0 }); setMyProfile(r.data.profile); setShowSetup(false); setTab('profile'); loadData(); } catch (e) { console.error(e); } };
  const sendInterest = async (id: string) => { try { await api.post(`/matrimony/interest/${id}`); setProfiles(p => p.map(x => x._id === id ? { ...x, interestSent: true } : x)); } catch (e: any) { const msg = e.response?.data?.error || 'Failed to send interest'; if (msg.includes('Create your profile')) { setShowSetup(true); } alert(msg); } };
  const loadInterests = async () => { try { const r = await api.get('/matrimony/interests'); setInterests(r.data.interests); } catch (e) { console.error(e); } };
  const browse = useCallback(async (f?: typeof filters) => {
    const cur = f || filters;
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      Object.entries(cur).forEach(([k, v]) => { if (v) params.set(k, v); });
      const r = await api.get(`/matrimony/browse?${params.toString()}`);
      setProfiles(r.data.profiles);
      setTotal(r.data.total);
    } catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  }, [filters]);

  const updateFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => browse(next), 400);
  };

  const resetFilters = () => {
    const empty = { gender: '', ageMin: '', ageMax: '', city: '', religion: '', education: '', occupation: '', maritalStatus: '', income: '', motherTongue: '', sort: 'newest' };
    setFilters(empty);
    browse(empty);
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort').length;
  const fmtStatus = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-stone-200 text-sm text-stone-900 bg-white outline-none focus:border-coral-primary focus:ring-3 focus:ring-coral-light placeholder:text-stone-400";
  const selectCls = "w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-stone-200 text-sm text-stone-900 bg-white outline-none focus:border-coral-primary";

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-50/50 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-black tracking-tight text-coral-primary flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 4 18 2-9h4"/></svg>Matrimony</h1>
          {!showSetup && <button onClick={() => { setShowSetup(true); setTab('profile'); }} className="px-5 py-2.5 rounded-full bg-coral-primary text-white text-[13px] font-bold hover:bg-coral-hover transition-all cursor-pointer">{myProfile ? 'Edit Profile' : '+ Create Profile'}</button>}
        </div>
        {!showSetup && (
          <div className="flex gap-1 mt-3 bg-stone-100 rounded-xl p-1">
            {(['discover', 'interests', 'profile'] as Tab[]).map(t => (
              <button key={t} onClick={() => t === 'profile' && !myProfile ? (setTab(t), setShowSetup(true)) : (setTab(t), setShowSetup(false))}
                className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
                {t === 'discover' ? 'Discover' : t === 'interests' ? 'Interests' : 'My Profile'}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="p-4 max-w-[580px] mx-auto">
        {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-3 border-stone-200 border-t-coral-primary rounded-full animate-spin" /></div>
        : showSetup ? (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{myProfile ? 'Edit' : 'Create'} Your Profile</h2>
              <button onClick={() => setShowSetup(false)} className="text-stone-400 hover:text-stone-600 cursor-pointer text-lg">✕</button>
            </div>
            <form onSubmit={saveProfile} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">Age</label><input className={inputCls} type="number" min="18" max="100" value={form.age} onChange={e => setForm({...form, age: e.target.value})} required /></div>
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">Gender</label><select className={selectCls} value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">Height</label><input className={inputCls} placeholder="e.g. 5'8&quot;" value={form.height} onChange={e => setForm({...form, height: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">Religion</label><input className={inputCls} placeholder="e.g. Hindu" value={form.religion} onChange={e => setForm({...form, religion: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">Mother Tongue</label><input className={inputCls} placeholder="e.g. Hindi" value={form.motherTongue} onChange={e => setForm({...form, motherTongue: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">Marital Status</label><select className={selectCls} value={form.maritalStatus} onChange={e => setForm({...form, maritalStatus: e.target.value})}><option value="never_married">Never Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option><option value="separated">Separated</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">Education</label><input className={inputCls} placeholder="e.g. B.Tech" value={form.education} onChange={e => setForm({...form, education: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">Occupation</label><input className={inputCls} placeholder="e.g. Engineer" value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-stone-500 mb-1">Annual Income</label><input className={inputCls} placeholder="e.g. 5-10 LPA" value={form.income} onChange={e => setForm({...form, income: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">City</label><input className={inputCls} placeholder="e.g. Mumbai" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-stone-500 mb-1">State</label><input className={inputCls} placeholder="e.g. Maharashtra" value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-stone-500 mb-1">About Me</label><textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder="Tell about yourself..." value={form.about} onChange={e => setForm({...form, about: e.target.value})} maxLength={500} /></div>
              <button type="submit" className="py-3 rounded-xl bg-gradient-to-r from-coral-gradient-start to-coral-primary text-white font-bold text-[15px] shadow-sm shadow-coral-primary/20 hover:-translate-y-0.5 transition-all cursor-pointer mt-2">Save Profile</button>
            </form>
          </div>
        ) : tab === 'profile' ? (
          <div>
            <h3 className="text-[15px] font-bold text-stone-900 mb-3 pl-1">My Profile</h3>
            {myProfile ? (
              <div className="bg-white rounded-[24px] border-none shadow-[0_8px_30px_rgba(244,107,92,0.06)] overflow-hidden">
                <div className="flex items-center gap-3 p-5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center font-bold text-coral-primary text-2xl shrink-0">{user?.name?.charAt(0)?.toUpperCase()}</div>
                    <span className="absolute bottom-0 right-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-[#00C853]" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="font-bold text-lg text-stone-900 leading-tight mb-0.5">{user?.name}</div>
                    <div className="text-[13px] font-medium text-stone-400">{myProfile.age && `${myProfile.age} yrs`}{myProfile.height && ` · ${myProfile.height}`}{myProfile.city && ` · ${myProfile.city}`}</div>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  {myProfile.about && <p className="text-[15px] text-stone-600 leading-relaxed mb-4">{myProfile.about}</p>}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {myProfile.religion && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-red-50 text-red-500">{myProfile.religion}</span>}
                    {myProfile.education && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-orange-50 text-orange-500">{myProfile.education}</span>}
                    {myProfile.occupation && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-green-50 text-green-600">{myProfile.occupation}</span>}
                    {myProfile.maritalStatus && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-red-50 text-red-500">{fmtStatus(myProfile.maritalStatus)}</span>}
                    {myProfile.income && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-orange-50 text-orange-500">{myProfile.income}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-stone-400">
                <div className="mb-4 flex justify-center text-stone-300"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><path d="M2 12l10-10 10 10"/></svg></div><h3 className="font-semibold text-stone-500 mb-1">Create your Matrimony profile</h3><p className="text-sm mb-5">Set up your profile to start discovering matches</p>
                <button onClick={() => setShowSetup(true)} className="px-5 py-2.5 rounded-full bg-coral-primary text-white text-[13px] font-bold hover:bg-coral-hover hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm shadow-coral-primary/20">Create Profile</button>
              </div>
            )}
          </div>
        ) : tab === 'discover' ? (
          <div>
            {/* Filter Bar */}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                  activeFilterCount > 0 ? 'bg-coral-primary text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-700 hover:border-coral-primary'
                }`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
                Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
              </button>
              <select className="px-3 py-2.5 rounded-full border border-stone-200 text-[13px] text-stone-700 bg-white outline-none focus:border-coral-primary cursor-pointer font-medium"
                value={filters.sort} onChange={e => updateFilter('sort', e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="age_asc">Age: Low → High</option>
                <option value="age_desc">Age: High → Low</option>
              </select>
              {isSearching && <div className="w-5 h-5 border-2 border-stone-200 border-t-coral-primary rounded-full animate-spin ml-auto" />}
              {!isSearching && <span className="text-[13px] text-text-muted ml-auto font-medium">{total} found</span>}
            </div>

            {/* Filter Sheet */}
            {showFilters && (
              <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgba(244,107,92,0.06)] p-5 mb-5 animate-slide-up">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-stone-900">Smart Filters</h3>
                  {activeFilterCount > 0 && <button onClick={resetFilters} className="text-[13px] text-coral-primary font-semibold cursor-pointer hover:text-coral-hover">Clear All</button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Gender</label>
                    <select className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary cursor-pointer"
                      value={filters.gender} onChange={e => updateFilter('gender', e.target.value)}>
                      <option value="">Any</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Marital Status</label>
                    <select className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary cursor-pointer"
                      value={filters.maritalStatus} onChange={e => updateFilter('maritalStatus', e.target.value)}>
                      <option value="">Any</option><option value="never_married">Never Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option><option value="separated">Separated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Age Min</label>
                    <input type="number" min="18" max="100" placeholder="18" className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary placeholder:text-stone-400"
                      value={filters.ageMin} onChange={e => updateFilter('ageMin', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Age Max</label>
                    <input type="number" min="18" max="100" placeholder="60" className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary placeholder:text-stone-400"
                      value={filters.ageMax} onChange={e => updateFilter('ageMax', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Religion</label>
                    <input placeholder="e.g. Hindu" className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary placeholder:text-stone-400"
                      value={filters.religion} onChange={e => updateFilter('religion', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Mother Tongue</label>
                    <input placeholder="e.g. Hindi" className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary placeholder:text-stone-400"
                      value={filters.motherTongue} onChange={e => updateFilter('motherTongue', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Education</label>
                    <input placeholder="e.g. B.Tech" className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary placeholder:text-stone-400"
                      value={filters.education} onChange={e => updateFilter('education', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Occupation</label>
                    <input placeholder="e.g. Engineer" className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary placeholder:text-stone-400"
                      value={filters.occupation} onChange={e => updateFilter('occupation', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">City</label>
                    <input placeholder="e.g. Mumbai" className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary placeholder:text-stone-400"
                      value={filters.city} onChange={e => updateFilter('city', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Income</label>
                    <input placeholder="e.g. 5-10 LPA" className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-[13px] bg-bg outline-none focus:border-coral-primary placeholder:text-stone-400"
                      value={filters.income} onChange={e => updateFilter('income', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {!myProfile && (
              <div className="mb-6 p-4 bg-coral-light border border-coral-light rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-coral-primary text-[15px]">Want to find matches?</h3>
                  <p className="text-[13px] text-stone-600">Create your matrimony profile to connect with others.</p>
                </div>
                <button onClick={() => setShowSetup(true)} className="px-5 py-2 rounded-full bg-coral-primary text-white text-[13px] font-bold hover:bg-coral-hover transition-all shadow-sm shadow-coral-primary/20 shrink-0">Create Profile</button>
              </div>
            )}
            {profiles.length === 0 ? (
              <div className="text-center py-12 text-stone-400"><div className="mb-4 flex justify-center text-stone-300"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><h3 className="font-semibold text-stone-500 mb-1">No profiles found</h3><p className="text-sm">Try adjusting your filters</p></div>
            ) : profiles.map(p => (
              <div key={p._id} className="bg-white rounded-[24px] border-none shadow-[0_8px_30px_rgba(244,107,92,0.06)] mb-4 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 p-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center font-bold text-coral-primary text-2xl shrink-0">{p.userId?.name?.charAt(0)?.toUpperCase()}</div>
                    <span className={`absolute bottom-0 right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${p.userId?.isOnline ? 'bg-[#00C853]' : 'bg-stone-400'}`} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="font-bold text-lg text-stone-900 leading-tight mb-0.5">{p.userId?.name}</div>
                    <div className="text-[13px] font-medium text-stone-400">{p.age && `${p.age} yrs`}{p.height && ` · ${p.height}`}{p.city && ` · ${p.city}`}</div>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  {p.about && <p className="text-sm text-stone-600 leading-relaxed mb-3">{p.about}</p>}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {p.religion && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-red-50 text-red-500">{p.religion}</span>}
                    {p.education && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-orange-50 text-orange-500">{p.education}</span>}
                    {p.occupation && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-green-50 text-green-600">{p.occupation}</span>}
                    {p.maritalStatus && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-red-50 text-red-500">{fmtStatus(p.maritalStatus)}</span>}
                    {p.income && <span className="px-3 py-1 rounded-md text-[13px] font-medium bg-orange-50 text-orange-500">{p.income}</span>}
                  </div>
                  <button onClick={() => !p.interestSent && sendInterest(p._id)} disabled={!!p.interestSent}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${p.interestSent ? 'bg-stone-100 text-stone-400 cursor-default' : 'bg-gradient-to-r from-coral-gradient-start to-coral-primary text-white shadow-sm shadow-coral-primary/20 hover:-translate-y-0.5'}`}>
                    {p.interestSent ? '✓ Interest Sent' : '+ Send Interest'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <h3 className="text-[15px] font-bold text-stone-900 mb-3 pl-1">Received Interests</h3>
            {interests.length === 0 ? (
              <div className="text-center py-12 text-stone-400"><div className="mb-4 flex justify-center text-stone-300"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><h3 className="font-semibold text-stone-500 mb-1">No interests yet</h3><p className="text-sm">When someone sends you interest, it&apos;ll show up here</p></div>
            ) : interests.map((item: any, i: number) => (
              <div key={i} className="bg-white rounded-[24px] border-none shadow-[0_8px_30px_rgba(244,107,92,0.06)] mb-4 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-coral-light to-coral-light flex items-center justify-center font-bold text-coral-primary text-lg">{item.profile?.userId?.name?.charAt(0)?.toUpperCase()}</div>
                  <div><div className="font-bold text-stone-900">{item.profile?.userId?.name}</div><div className="text-[13px] text-stone-500">{item.profile?.age && `${item.profile.age} yrs`}{item.profile?.city && ` · ${item.profile.city}`}</div></div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-coral-gradient-start to-coral-primary text-white font-semibold text-sm cursor-pointer">Accept</button>
                  <button className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-500 font-semibold text-sm cursor-pointer hover:bg-stone-200">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
