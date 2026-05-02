"use client";

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { connectSocket } from '@/lib/socket';

type Tab = 'chats' | 'discover';
type NewChatMode = 'user' | 'group';

interface Conversation {
  _id: string; isGroup: boolean; groupName: string; isGlobal: boolean; joinMode: string;
  otherUser: { _id: string; name: string; profilePic: string; isOnline: boolean } | null;
  lastMessage: { content: string; senderId: { name: string } | null; timestamp: string };
  updatedAt: string;
}

export default function ChatListPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  
  const [tab, setTab] = useState<Tab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatMode, setNewChatMode] = useState<NewChatMode>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [groupForm, setGroupForm] = useState({ name: '', description: '', joinMode: 'invite_only' });

  useEffect(() => {
    loadData();
    if (token) {
      const socket = connectSocket(token);
      socket.on('message_notification', () => loadConversations());
      return () => { socket.off('message_notification'); };
    }
  }, [token]);

  useEffect(() => { if (tab === 'discover') loadDiscover(); }, [tab]);

  const loadData = async () => { await loadConversations(); setIsLoading(false); };
  
  const loadConversations = async () => {
    try { const r = await api.get('/chat/conversations'); setConversations(r.data.conversations); }
    catch (e) { console.error(e); }
  };

  const loadDiscover = async () => {
    try {
      const [invR, discR] = await Promise.all([
        api.get('/chat/groups/invitations'),
        api.get('/chat/groups/discover')
      ]);
      setInvitations(invR.data.invitations);
      setDiscoverGroups(discR.data.groups);
    } catch (e) { console.error(e); }
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try { const r = await api.get(`/users?q=${encodeURIComponent(q)}`); setSearchResults(r.data.users.filter((u: any) => u._id !== user?._id)); }
      catch (e) { console.error(e); }
      finally { setIsSearching(false); }
    }, 350);
  };

  const startChat = async (id: string) => {
    try {
      const r = await api.post('/chat/conversations', { participantId: id });
      setShowNewChat(false); setSearchQuery(''); setSearchResults([]);
      router.push(`/chat/${r.data.conversation._id}`);
    } catch (e) { console.error(e); }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;
    try {
      const r = await api.post('/chat/group', groupForm);
      setShowNewChat(false); setGroupForm({ name: '', description: '', joinMode: 'invite_only' });
      router.push(`/chat/${r.data.conversation._id}`);
    } catch (e) { console.error(e); }
  };

  const requestJoin = async (id: string) => {
    try {
      await api.post(`/chat/group/${id}/request`);
      setDiscoverGroups(p => p.map(g => g._id === id ? { ...g, hasRequested: true } : g));
      if (tab === 'chats') loadConversations(); // if it was public it might have joined immediately
    } catch (e) { console.error(e); }
  };

  const respondToInvite = async (id: string, action: 'accept' | 'decline') => {
    try {
      await api.post(`/chat/group/${id}/${action}-invite`);
      setInvitations(p => p.filter(g => g._id !== id));
      if (action === 'accept') loadConversations();
    } catch (e) { console.error(e); }
  };

  const formatTime = (d: string) => {
    if (!d) return '';
    const date = new Date(d); const hrs = (Date.now() - date.getTime()) / 3600000;
    if (hrs < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (hrs < 48) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-50/50 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[26px] font-black tracking-tight text-coral-primary" style={{ fontFamily: 'Georgia, serif' }}>Chats</h1>
          <button onClick={() => setShowNewChat(true)}
            className="px-5 py-2.5 rounded-full bg-coral-primary text-white text-[13px] font-bold shadow-sm shadow-coral-primary/20 hover:bg-coral-hover transition-all cursor-pointer"
          >+ New Chat</button>
        </div>
        <div className="flex gap-1 bg-bg p-1.5 rounded-2xl">
          <button onClick={() => setTab('chats')} className={`flex-1 py-2 text-[13px] font-bold rounded-xl transition-all cursor-pointer ${tab === 'chats' ? 'bg-white shadow-sm text-text-main' : 'text-text-muted hover:text-stone-700'}`}>My Chats</button>
          <button onClick={() => setTab('discover')} className={`flex-1 py-2 text-[13px] font-bold rounded-xl transition-all cursor-pointer ${tab === 'discover' ? 'bg-white shadow-sm text-text-main' : 'text-text-muted hover:text-stone-700'}`}>Discover Groups</button>
        </div>
      </header>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-[1001] bg-black/40 flex items-start justify-center pt-16"
          onClick={() => { setShowNewChat(false); setSearchQuery(''); setSearchResults([]); }}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl animate-slide-up max-h-[70vh] overflow-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Start Conversation</h2>
              <button onClick={() => setShowNewChat(false)} className="text-stone-400 hover:text-stone-700 text-xl cursor-pointer">✕</button>
            </div>
            
            <div className="flex gap-2 mb-4 border-b border-stone-100 pb-2">
              <button onClick={() => setNewChatMode('user')} className={`text-sm font-semibold pb-1 cursor-pointer ${newChatMode === 'user' ? 'text-coral-primary border-b-2 border-rose-500' : 'text-stone-400'}`}>Direct Message</button>
              <button onClick={() => setNewChatMode('group')} className={`text-sm font-semibold pb-1 cursor-pointer ${newChatMode === 'group' ? 'text-coral-primary border-b-2 border-rose-500' : 'text-stone-400'}`}>Create Group</button>
            </div>

            {newChatMode === 'user' ? (
              <>
                <input className="w-full px-4 py-3 border-[1.5px] border-stone-200 rounded-xl text-[15px] text-stone-900 outline-none mb-4 focus:border-rose-500 focus:ring-3 focus:ring-rose-100 placeholder:text-stone-400"
                  placeholder="Search by name..." value={searchQuery} onChange={e => handleSearch(e.target.value)} autoFocus />
                {isSearching && <p className="text-center text-stone-400 text-sm py-2">Searching...</p>}
                {searchResults.map(u => (
                  <button key={u._id} onClick={() => startChat(u._id)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-left hover:bg-bg transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-50 to-rose-100 flex items-center justify-center font-bold text-coral-primary text-sm shrink-0">
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-[15px]">{u.name}</div>
                      <div className="text-[13px] text-stone-400">{u.email}</div>
                    </div>
                  </button>
                ))}
                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <p className="text-center text-stone-400 text-sm py-5">No users found</p>
                )}
              </>
            ) : (
              <form onSubmit={createGroup} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Group Name</label>
                  <input required className="w-full px-3.5 py-2.5 border-[1.5px] border-stone-200 rounded-xl text-sm outline-none focus:border-rose-500" value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} placeholder="e.g. Hiking Club" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Description</label>
                  <input className="w-full px-3.5 py-2.5 border-[1.5px] border-stone-200 rounded-xl text-sm outline-none focus:border-rose-500" value={groupForm.description} onChange={e => setGroupForm({...groupForm, description: e.target.value})} placeholder="What is this group about?" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Privacy</label>
                  <select className="w-full px-3.5 py-2.5 border-[1.5px] border-stone-200 rounded-xl text-sm outline-none focus:border-rose-500 bg-white" value={groupForm.joinMode} onChange={e => setGroupForm({...groupForm, joinMode: e.target.value})}>
                    <option value="invite_only">Private (Invite Only)</option>
                    <option value="request_to_join">Public (Request to Join)</option>
                  </select>
                </div>
                <button type="submit" disabled={!groupForm.name.trim()} className="mt-2 w-full py-3 rounded-xl bg-coral-primary text-white font-semibold text-sm cursor-pointer hover:bg-coral-hover disabled:opacity-50">Create Group</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-3 py-2">
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-3 border-stone-200 border-t-rose-500 rounded-full animate-spin" /></div>
        ) : tab === 'chats' ? (
          conversations.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p className="font-semibold text-stone-500 mb-1">No conversations yet</p>
            </div>
          ) : (
            conversations.map(c => {
              const name = c.isGlobal ? c.groupName : c.isGroup ? c.groupName : c.otherUser?.name || 'Unknown';
              const online = !c.isGroup && !c.isGlobal && (c.otherUser?.isOnline || false);
              return (
                <button key={c._id} onClick={() => router.push(`/chat/${c._id}`)}
                  className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-left hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${c.isGlobal ? 'bg-gradient-to-br from-coral-gradient-start to-coral-primary text-white shadow-md' : 'bg-gradient-to-br from-orange-50 to-rose-100 text-coral-primary'}`}>
                      {c.isGlobal ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> : name.charAt(0).toUpperCase()}
                    </div>
                    {online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`font-semibold text-[15px] ${c.isGlobal ? 'text-rose-600' : 'text-stone-900'}`}>{name}</span>
                      <span className="text-xs text-stone-400 shrink-0">{formatTime(c.lastMessage?.timestamp)}</span>
                    </div>
                    <p className="text-[13px] text-stone-400 truncate">{c.lastMessage?.content || 'No messages yet'}</p>
                  </div>
                </button>
              );
            })
          )
        ) : (
          <div className="flex flex-col gap-4">
            {invitations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-1">Invitations</h3>
                {invitations.map(g => (
                  <div key={g._id} className="flex items-center gap-3 w-full p-4 mb-2 rounded-xl bg-orange-50 border border-rose-100 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center font-bold text-coral-primary text-lg shrink-0">
                      {g.groupName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15px] text-stone-900">{g.groupName}</div>
                      <div className="text-xs text-stone-500 mb-1">Invited by {g.admin?.name}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => respondToInvite(g._id, 'accept')} className="px-3 py-1.5 bg-coral-primary text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-coral-hover">Accept</button>
                      <button onClick={() => respondToInvite(g._id, 'decline')} className="px-3 py-1.5 bg-stone-200 text-stone-600 text-xs font-semibold rounded-lg cursor-pointer hover:bg-stone-300">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-1">Public Groups</h3>
              {discoverGroups.length === 0 ? (
                <div className="text-center py-12 text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-white/50">
                  <span className="text-stone-300 mb-3 block flex justify-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                  <p className="font-medium text-sm">No public groups found.</p>
                </div>
              ) : (
                discoverGroups.map(g => (
                  <div key={g._id} className="flex items-center gap-3 w-full p-4 mb-3 rounded-xl bg-white border border-stone-100 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center font-bold text-stone-500 text-lg shrink-0">
                      {g.groupName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15px] text-stone-900">{g.groupName}</div>
                      <div className="text-xs text-stone-500 mb-1">{g.participantCount} members • Admin: {g.admin?.name}</div>
                      {g.description && <div className="text-[13px] text-stone-600 truncate">{g.description}</div>}
                    </div>
                    <button onClick={() => !g.hasRequested && requestJoin(g._id)} disabled={g.hasRequested}
                      className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${g.hasRequested ? 'bg-stone-100 text-stone-400 cursor-default' : 'bg-orange-50 text-rose-600 hover:bg-rose-100'}`}>
                      {g.hasRequested ? 'Requested' : g.joinMode === 'public' ? 'Join' : 'Request'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
