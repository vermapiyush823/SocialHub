"use client";

import { useState, useRef } from 'react';
import api from '@/lib/api';

interface Props { onPostCreated: (p: any) => void; onClose: () => void }

export default function CreatePostModal({ onPostCreated, onClose }: Props) {
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !selectedFile) return;
    setIsSubmitting(true); setError('');
    try {
      let mediaUrls: string[] = [];
      if (selectedFile) {
        const fd = new FormData(); fd.append('file', selectedFile);
        const ur = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        mediaUrls = [ur.data.url];
      }
      const r = await api.post('/posts', { caption: caption.trim(), mediaUrls });
      onPostCreated(r.data.post); onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create post');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[1001] bg-black/50 flex items-start justify-center pt-12" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-900">Create Post</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5">
            {error && <div className="px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm mb-3 border border-red-200">{error}</div>}
            <textarea
              className="w-full min-h-[100px] border-none outline-none text-base text-stone-900 resize-none placeholder:text-stone-400 leading-relaxed"
              placeholder="What's on your mind?"
              value={caption} onChange={e => setCaption(e.target.value)}
              maxLength={2000} autoFocus
            />
            {previewUrl && (
              <div className="relative mt-4 rounded-xl overflow-hidden border border-stone-200">
                <img src={previewUrl} alt="Preview" className="w-full max-h-[300px] object-cover" />
                <button type="button" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-stone-100">
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              Photo / Video
            </button>
            <button type="submit" disabled={isSubmitting || (!caption.trim() && !selectedFile)}
              className="px-6 py-2.5 rounded-xl bg-coral-primary text-white font-semibold text-sm cursor-pointer hover:bg-coral-hover transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed shadow-sm shadow-coral-primary/20"
            >{isSubmitting ? 'Posting...' : 'Post'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
