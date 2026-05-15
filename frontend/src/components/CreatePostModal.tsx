"use client";

import { useState, useRef } from 'react';
import api from '@/lib/api';

// ─── Client-side upload limits (mirrored from backend) ───────────────────────
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;   // 10 MB
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;  // 100 MB

interface MediaPayload {
  publicId: string;
  type: 'image' | 'video';
}

interface Props {
  onPostCreated: (p: any) => void;
  onClose: () => void;
}

export default function CreatePostModal({ onPostCreated, onClose }: Props) {
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // ── Client-side size validation ──────────────────────────────────────────
    const fileIsVideo = f.type.startsWith('video/');
    const limit = fileIsVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
    const limitMb = limit / 1024 / 1024;

    if (f.size > limit) {
      setError(`${fileIsVideo ? 'Video' : 'Image'} must be under ${limitMb} MB. Your file is ${(f.size / 1024 / 1024).toFixed(1)} MB.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (fileIsVideo) {
      // ── Client-side duration validation ────────────────────────────────────
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 90) {
          setError(`Video is too long (${Math.ceil(video.duration)}s). Maximum allowed is 90 seconds.`);
          setSelectedFile(null);
          setPreviewUrl(null);
          if (fileRef.current) fileRef.current.value = '';
        } else {
          setError('');
          setIsVideo(true);
          setSelectedFile(f);
          setPreviewUrl(URL.createObjectURL(f));
        }
      };
      video.onerror = () => {
        setError('Could not process video file. Please try another.');
      };
      video.src = URL.createObjectURL(f);
    } else {
      setError('');
      setIsVideo(false);
      setSelectedFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !selectedFile) return;

    setIsSubmitting(true);
    setError('');

    try {
      let media: MediaPayload[] = [];

      if (selectedFile) {
        // Upload to the appropriate endpoint and receive { publicId, type }
        const endpoint = isVideo ? '/upload/video' : '/upload/image';
        const fd = new FormData();
        fd.append('file', selectedFile);

        const uploadRes = await api.post(endpoint, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        media = [{
          publicId: uploadRes.data.publicId,
          type: uploadRes.data.type as 'image' | 'video',
        }];
      }

      const r = await api.post('/posts', { caption: caption.trim(), media });
      onPostCreated(r.data.post);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearMedia = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    if (fileRef.current) fileRef.current.value = '';
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
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm mb-3 border border-red-200">
                {error}
              </div>
            )}
            <textarea
              className="w-full min-h-[100px] border-none outline-none text-base text-stone-900 resize-none placeholder:text-stone-400 leading-relaxed"
              placeholder="What's on your mind?"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={2000}
              autoFocus
            />

            {/* Media preview */}
            {previewUrl && (
              <div className="relative mt-4 rounded-xl overflow-hidden border border-stone-200">
                {isVideo ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    className="w-full max-h-[300px] bg-black"
                  />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full max-h-[300px] object-cover" />
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
                {/* File info badge */}
                {selectedFile && (
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full">
                    {isVideo ? '🎬' : '🖼️'} {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-stone-100">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/mov,video/webm"
              onChange={handleFile}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                Photo / Video
              </button>
              {/* Upload limit hint */}
              <span className="text-[11px] text-stone-400">
                {isVideo ? 'Max 100 MB · 90s' : 'Images up to 10 MB'}
              </span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || (!caption.trim() && !selectedFile)}
              className="px-6 py-2.5 rounded-xl bg-coral-primary text-white font-semibold text-sm cursor-pointer hover:bg-coral-hover transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed shadow-sm shadow-coral-primary/20"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
