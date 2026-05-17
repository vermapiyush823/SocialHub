"use client";

import { useAuth } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import { resolveAvatarUrl } from '@/lib/cloudinary';

interface Msg { _id: string; chatId: string; senderId: { _id: string; name: string; profilePicPublicId?: string; profilePicUrl?: string } | string; content: string; type: string; status: string; readBy: string[]; createdAt: string }
interface ChatInfo { _id: string; isGroup: boolean; groupName: string; isGlobal: boolean; description: string; admin: string; participants: Array<{ _id: string; name: string; profilePicPublicId?: string; profilePicUrl?: string; isOnline: boolean; lastSeen: string }> }
interface JoinRequest { _id: string; name: string; profilePicPublicId?: string; profilePicUrl?: string; email: string }

export default function ChatRoomPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const other = chatInfo?.participants?.find(p => p._id !== user?._id);
  const chatName = chatInfo?.isGroup ? chatInfo.groupName : other?.name || 'Chat';
  const getSenderId = (m: Msg) => typeof m.senderId === 'string' ? m.senderId : m.senderId._id;
  const getSenderName = (m: Msg) => typeof m.senderId === 'string' ? '' : m.senderId.name;
  const fmtTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    
    if (date.toDateString() === now.toDateString()) {
      return `today at ${timeStr}`;
    }
    
    const day = date.getDate();
    const month = date.toLocaleDateString([], { month: 'short' }).toLowerCase();
    return `${day} ${month} at ${timeStr}`;
  };

  useEffect(() => {
    if (!chatId || !token) return;
    (async () => {
      try {
        const [cR, mR] = await Promise.all([api.get('/chat/conversations'), api.get(`/chat/${chatId}/messages`)]);
        const c = cR.data.conversations.find((x: any) => x._id === chatId);
        if (c) {
          setChatInfo(c);
          if (c.admin === user?._id) {
            const reqs = await api.get(`/chat/group/${chatId}/requests`);
            setJoinRequests(reqs.data.requests);
          }
        }
        setMessages(mR.data.messages);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    })();
  }, [chatId, token]);

  useEffect(() => {
    if (!token || !chatId) return;
    const s = connectSocket(token); socketRef.current = s;
    s.emit('join_chat', { chatId }); s.emit('mark_read', { chatId });
    const onMsg = (m: Msg) => { if (m.chatId === chatId || (m as any).chatId?._id === chatId) { setMessages(p => p.some(x => x._id === m._id) ? p : [...p, m]); const sid = typeof m.senderId === 'string' ? m.senderId : m.senderId._id; if (sid !== user?._id) s.emit('mark_read', { chatId }); } };
    const onType = (d: any) => { if (d.chatId === chatId && d.userId !== user?._id) setTypingUsers(p => p.includes(d.userName) ? p : [...p, d.userName]); };
    const onStop = (d: any) => { if (d.chatId === chatId) setTypingUsers([]); };
    const onRead = (d: any) => { if (d.chatId === chatId) setMessages(p => p.map(m => { const sid = typeof m.senderId === 'string' ? m.senderId : m.senderId._id; return sid === user?._id ? { ...m, status: 'read', readBy: [...(m.readBy||[]), d.readBy] } : m; })); };
    s.on('receive_message', onMsg); s.on('user_typing', onType); s.on('user_stop_typing', onStop); s.on('messages_read', onRead);
    return () => { s.off('receive_message', onMsg); s.off('user_typing', onType); s.off('user_stop_typing', onStop); s.off('messages_read', onRead); };
  }, [token, chatId, user?._id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingUsers]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => { setInput(e.target.value); if (socketRef.current) { socketRef.current.emit('typing_start', { chatId }); if (typingRef.current) clearTimeout(typingRef.current); typingRef.current = setTimeout(() => socketRef.current?.emit('typing_stop', { chatId }), 2000); } };
  const send = (e: React.FormEvent) => { e.preventDefault(); if (!socketRef.current || !input.trim()) return; socketRef.current.emit('send_message', { chatId, content: input.trim(), type: 'text' }); socketRef.current.emit('typing_stop', { chatId }); setInput(''); inputRef.current?.focus(); };
  const statusIcon = (m: Msg) => { const sid = typeof m.senderId === 'string' ? m.senderId : m.senderId._id; if (sid !== user?._id) return null; if (m.status === 'read') return <span className="text-blue-400 text-xs ml-1">✓✓</span>; if (m.status === 'delivered') return <span className="text-white/50 text-xs ml-1">✓✓</span>; return <span className="text-white/50 text-xs ml-1">✓</span>; };

  const handleRequest = async (userId: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/chat/group/${chatId}/${action}`, { userId });
      setJoinRequests(p => p.filter(r => r._id !== userId));
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try { 
      const r = await api.get(`/users?q=${encodeURIComponent(q)}`); 
      // Filter out existing participants
      const participantsIds = chatInfo?.participants.map(p => p._id) || [];
      setSearchResults(r.data.users.filter((u: any) => u._id !== user?._id && !participantsIds.includes(u._id)));
    }
    catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const inviteUser = async (userId: string) => {
    try {
      await api.post(`/chat/group/${chatId}/invite`, { userId });
      setSearchResults(p => p.filter(u => u._id !== userId));
      alert('Invitation sent!');
    } catch (e: any) { 
      console.error(e); 
      alert(e.response?.data?.error || 'Failed to send invite');
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-gradient-to-b from-stone-100 to-stone-50 dark:from-dm-bg dark:to-dm-surface overflow-hidden">
      <div className="bg-white dark:bg-dm-surface border-b border-stone-200 dark:border-dm-border px-4 py-3 flex items-center gap-3 shrink-0 z-10">
        <button onClick={() => router.push('/chat')} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-dm-surface2 text-stone-900 dark:text-dm-text cursor-pointer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base overflow-hidden ${chatInfo?.isGlobal ? 'bg-gradient-to-br from-coral-gradient-start to-coral-primary text-white shadow-md' : 'bg-coral-light text-coral-primary'}`}>
            {chatInfo?.isGlobal ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            ) : resolveAvatarUrl(other) ? (
              <img src={resolveAvatarUrl(other)} alt={chatName} className="w-full h-full object-cover" />
            ) : (
              chatName.charAt(0).toUpperCase()
            )}
          </div>
          {other && !chatInfo?.isGroup && <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${other.isOnline ? 'bg-green-500' : 'bg-stone-400'}`} />}
        </div>
        <div className="flex-1">
          <div className={`font-semibold text-[15px] ${chatInfo?.isGlobal ? 'text-coral-hover' : 'text-stone-900 dark:text-dm-text'}`}>{chatName}</div>
          <div className={`text-xs ${typingUsers.length > 0 ? 'text-green-500 italic' : 'text-stone-400'}`}>
            {typingUsers.length > 0 ? 'typing...' : chatInfo?.isGlobal || chatInfo?.isGroup ? (chatInfo.description || `${chatInfo.participants?.length || 0} members`) : (other?.isOnline ? 'Online' : other?.lastSeen ? `Last seen ${fmtTime(other.lastSeen)}` : '')}
          </div>
        </div>
        {chatInfo?.isGroup && !chatInfo.isGlobal && chatInfo.admin === user?._id && (
          <div className="flex gap-2">
            {joinRequests.length > 0 && (
              <button onClick={() => setShowRequests(true)} className="px-3 py-1.5 rounded-lg bg-orange-50 text-coral-hover text-xs font-bold shrink-0 cursor-pointer hover:bg-coral-light relative">
                Requests <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral-primary text-white rounded-full flex items-center justify-center text-[10px]">{joinRequests.length}</span>
              </button>
            )}
            <button onClick={() => setShowInvite(true)} className="px-3 py-1.5 rounded-lg bg-coral-primary text-white text-xs font-bold shrink-0 cursor-pointer hover:bg-coral-hover shadow-sm">
              + Invite
            </button>
          </div>
        )}
      </div>

      {showRequests && (
        <div className="fixed inset-0 z-[1001] bg-black/40 flex justify-center items-start pt-20" onClick={() => setShowRequests(false)}>
          <div className="bg-white dark:bg-dm-surface rounded-2xl w-full max-w-sm mx-4 p-5 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold dark:text-dm-text">Join Requests</h2><button onClick={() => setShowRequests(false)} className="text-stone-400 dark:text-dm-muted cursor-pointer hover:text-stone-700">✕</button></div>
            {joinRequests.map(r => (
              <div key={r._id} className="flex items-center gap-3 mb-3 p-3 border border-stone-100 dark:border-dm-border rounded-xl bg-bg dark:bg-dm-surface2">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-100 shrink-0">
                  {resolveAvatarUrl(r) ? (
                    <img src={resolveAvatarUrl(r)} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-50 to-coral-light flex items-center justify-center font-bold text-coral-primary">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0"><div className="font-bold text-sm text-stone-900 dark:text-dm-text truncate">{r.name}</div></div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleRequest(r._id, 'approve')} className="px-3 py-1.5 bg-coral-primary text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-coral-hover">Approve</button>
                  <button onClick={() => handleRequest(r._id, 'reject')} className="px-3 py-1.5 bg-stone-200 text-stone-600 text-xs font-semibold rounded-lg cursor-pointer hover:bg-stone-300">Reject</button>
                </div>
              </div>
            ))}
            {joinRequests.length === 0 && <p className="text-center text-stone-400 text-sm py-4">No pending requests.</p>}
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 z-[1001] bg-black/40 flex justify-center items-start pt-20" onClick={() => { setShowInvite(false); setSearchQuery(''); setSearchResults([]); }}>
          <div className="bg-white dark:bg-dm-surface rounded-2xl w-full max-w-sm mx-4 p-5 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold dark:text-dm-text">Invite Members</h2><button onClick={() => setShowInvite(false)} className="text-stone-400 dark:text-dm-muted cursor-pointer hover:text-stone-700">✕</button></div>
            
            <input className="w-full px-4 py-2.5 border-[1.5px] border-stone-200 dark:border-dm-border rounded-xl text-sm outline-none mb-4 focus:border-coral-primary bg-bg dark:bg-dm-surface2 text-stone-900 dark:text-dm-text placeholder:text-stone-400 dark:placeholder:text-dm-muted"
              placeholder="Search users by name..." value={searchQuery} onChange={e => handleSearch(e.target.value)} autoFocus />
            
            {isSearching && <p className="text-center text-stone-400 text-xs py-2">Searching...</p>}
            
            <div className="max-h-[50vh] overflow-y-auto">
              {searchResults.map(u => (
                <div key={u._id} className="flex items-center gap-3 mb-2 p-2.5 rounded-xl hover:bg-bg dark:hover:bg-dm-surface2 transition-colors">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-stone-100 shrink-0">
                    {resolveAvatarUrl(u) ? (
                      <img src={resolveAvatarUrl(u)} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-50 to-coral-light flex items-center justify-center font-bold text-coral-primary text-sm">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0"><div className="font-semibold text-sm text-stone-900 dark:text-dm-text truncate">{u.name}</div><div className="text-xs text-stone-400 dark:text-dm-muted truncate">{u.email}</div></div>
                  <button onClick={() => inviteUser(u._id)} className="px-3 py-1.5 bg-orange-50 text-coral-hover text-xs font-semibold rounded-lg cursor-pointer hover:bg-coral-light">Invite</button>
                </div>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && <p className="text-center text-stone-400 text-sm py-4">No available users found.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {isLoading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-3 border-stone-200 border-t-coral-primary rounded-full animate-spin" /></div>
        : messages.length === 0 ? (
          <div className="text-center py-16 text-stone-400 flex flex-col items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>No messages yet. Say hello!</span>
          </div>
        )
        : messages.map((m, i) => {
          const isMe = getSenderId(m) === user?._id;
          const showAv = !isMe && (i === 0 || getSenderId(messages[i-1]) !== getSenderId(m));
          return (
            <div key={m._id||i} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${showAv ? 'mt-3' : ''}`}>
              {!isMe && showAv && (
                <div className="w-7 h-7 rounded-full overflow-hidden border border-stone-100 shrink-0">
                  {resolveAvatarUrl(typeof m.senderId === 'string' ? null : m.senderId) ? (
                    <img src={resolveAvatarUrl(typeof m.senderId === 'string' ? null : m.senderId)} alt={getSenderName(m)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-50 to-coral-light flex items-center justify-center font-bold text-coral-primary text-[10px]">
                      {getSenderName(m).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              {!isMe && !showAv && <div className="w-7 shrink-0" />}
              <div className={`max-w-[70%] px-3.5 py-2.5 break-words text-[15px] leading-snug ${isMe ? 'bg-coral-primary text-white rounded-2xl rounded-br-sm shadow-[0_2px_8px_rgba(244,63,94,0.25)]' : 'bg-white dark:bg-dm-surface text-stone-900 dark:text-dm-text rounded-2xl rounded-bl-sm shadow-sm'}`}>
                <div>{m.content}</div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className={`text-[11px] ${isMe ? 'text-white/60' : 'text-stone-400 dark:text-dm-muted'}`}>{fmtTime(m.createdAt)}</span>
                  {statusIcon(m)}
                </div>
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && <div className="flex items-center gap-2 py-2"><div className="bg-white dark:bg-dm-surface px-4 py-2.5 rounded-2xl shadow-sm flex gap-1">{[0,1,2].map(i=><span key={i} className="w-[7px] h-[7px] rounded-full bg-stone-400 dark:bg-dm-muted" style={{animation:`typingBounce 1.4s infinite ease-in-out ${i*0.15}s`}}/>)}</div></div>}
        <div ref={endRef} />
      </div>

      <div className="bg-white dark:bg-dm-surface border-t border-stone-200 dark:border-dm-border px-4 py-3 shrink-0">
        <form onSubmit={send} className="flex gap-2.5 items-center max-w-2xl mx-auto">
          <input ref={inputRef} type="text" value={input} onChange={handleInput} placeholder="Type a message..." className="flex-1 px-5 py-3 rounded-3xl border-[1.5px] border-stone-200 dark:border-dm-border text-[15px] bg-bg dark:bg-dm-surface2 text-stone-900 dark:text-dm-text outline-none focus:border-coral-primary focus:shadow-[0_0_0_3px_#eef2ff] placeholder:text-stone-400 dark:placeholder:text-dm-muted" />
          <button type="submit" disabled={!input.trim()} className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${input.trim() ? 'bg-coral-primary shadow-md hover:bg-coral-hover hover:scale-105' : 'bg-stone-100'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={input.trim()?'#fff':'#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
