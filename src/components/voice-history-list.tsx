/**
 * VoiceHistoryList — shared component used in Dashboard and Profile.
 * Each row: play/pause, waveform, text, meta, download, delete.
 * Delete shows an advanced confirmation dialog before removing.
 */
import { useRef, useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Icon } from '@/components/icon';
import { GradientButton } from '@/components/primitives';
import { deleteGeneration, type Generation } from '@/lib/user-store';
import type { Timestamp } from 'firebase/firestore';

const LANG_FLAG: Record<string, string> = {
  English: '🇬🇧',
  Bangla:  '🇧🇩',
  Hindi:   '🇮🇳',
};

function getRemaining(expiresAt: unknown, now: number): number | null {
  if (!expiresAt) return null;
  try {
    const ms = (expiresAt as Timestamp).toMillis();
    return ms - now;
  } catch { return null; }
}

function formatExpiry(remainingMs: number): string {
  const totalSecs = Math.max(0, Math.floor(remainingMs / 1000));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `Exp in ${h}h ${m}m`;
  if (m > 0) return `Exp in ${m}m`;
  return `Exp in ${s}s`;
}

/* ── Delete Confirmation Dialog ─────────────────────── */
interface ConfirmDeleteProps {
  gen: Generation;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirmDialog({ gen, onConfirm, onCancel, deleting }: ConfirmDeleteProps) {
  const preview = gen.text.length > 60 ? gen.text.slice(0, 60) + '…' : gen.text;

  function onBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !deleting) onCancel();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onBackdrop}
    >
      {/* Sheet — full width on mobile, constrained on sm+ */}
      <div className="w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-card shadow-2xl">

        {/* Drag pill — mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border/70" />
        </div>

        {/* Hero danger zone */}
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-5 text-center">
          {/* Animated icon ring */}
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" style={{ animationDuration: '2s' }} />
            <span className="absolute inset-0 rounded-full bg-red-500/10" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/30 text-red-500">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold">Delete this voice?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This is <span className="font-semibold text-foreground">permanent</span> — it cannot be recovered.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-border/50" />

        {/* Voice preview */}
        <div className="px-6 py-4">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Voice to delete</p>
          <div className="rounded-2xl bg-secondary/60 px-4 py-3.5 space-y-2">
            <p className="text-sm font-medium leading-relaxed">{preview}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span>{LANG_FLAG[gen.language] ?? '🌐'}</span>
                <span>{gen.language}</span>
              </span>
              <span className="opacity-30">·</span>
              <span>{gen.voice}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-8 sm:pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-2xl border border-border bg-secondary/60 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-[0.97] disabled:opacity-40"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}
          >
            {deleting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            )}
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main List ──────────────────────────────────────── */
interface Props {
  generations: Generation[];
  isOwner?: boolean;
  ownerName?: string;
}

export function VoiceHistoryList({ generations, isOwner, ownerName }: Props) {
  const [playingId,     setPlayingId]     = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmId,     setConfirmId]     = useState<string | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const deletingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function getAudioUrl(g: Generation): string | null {
    return g.audioUrl ?? null;
  }

  function togglePlay(g: Generation) {
    if (playingId === g.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    setPlayingId(null);
    const url = getAudioUrl(g);
    if (!url) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(g.id);
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
  }

  async function handleDownload(g: Generation) {
    const url = getAudioUrl(g);
    if (!url) return;
    setDownloadingId(g.id);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const name = g.text.slice(0, 30).replace(/[^\w\u0080-\uFFFF\s]/g, '').trim() || 'voice';
      const a = document.createElement('a');
      a.href     = blobUrl;
      a.download = `${name}.mp3`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteGeneration(id);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  /* The generation currently being confirmed for deletion */
  const confirmGen = confirmId ? generations.find(g => g.id === confirmId) ?? null : null;

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-soft text-brand">
          <Icon name="microphone" size={26} />
        </span>
        <div>
          <p className="text-sm font-medium">No voices yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isOwner
              ? 'Generate your first voice to see it here.'
              : `${ownerName ?? 'This user'} hasn't generated any voices yet.`}
          </p>
        </div>
        {isOwner && (
          <Link href="/generator">
            <GradientButton icon="soundwave">Generate a voice</GradientButton>
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {generations.map((g, i) => {
          const remaining = getRemaining(g.expiresAt, now);

          /* Auto-delete when expired */
          if (remaining !== null && remaining <= 0) {
            if (!deletingRef.current.has(g.id)) {
              deletingRef.current.add(g.id);
              deleteGeneration(g.id).catch(() => {});
            }
            return null;
          }

          const isPlaying     = playingId     === g.id;
          const isDownloading = downloadingId === g.id;
          const isDeleting    = deletingId    === g.id;
          const flag          = LANG_FLAG[g.language] ?? '🌐';
          const expiryLabel   = remaining !== null ? formatExpiry(remaining) : null;
          const expiringSoon  = remaining !== null && remaining < 5 * 60 * 1000;

          return (
            <li
              key={g.id}
              className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-secondary/40 sm:gap-4 sm:px-5"
            >
              {/* Index */}
              <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-soft text-xs font-semibold text-brand sm:flex">
                {i + 1}
              </span>

              {/* Play / Pause */}
              <button
                type="button"
                title={isPlaying ? 'Pause' : 'Play voice'}
                onClick={() => togglePlay(g)}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95
                  ${isPlaying
                    ? 'border-brand-2 bg-brand-2/10 text-brand-2'
                    : 'border-border bg-card text-muted-foreground hover:border-brand-2 hover:text-brand-2 group-hover:border-brand-2/50'}`}
              >
                <Icon name={isPlaying ? 'pause' : 'play'} size={16} />
              </button>

              {/* Waveform icon */}
              <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition sm:flex
                ${isPlaying ? 'border-brand-2 bg-brand-2/10 text-brand-2' : 'border-border bg-card text-muted-foreground'}`}>
                <Icon name="soundwave" size={17} className={isPlaying ? 'animate-pulse' : ''} />
              </span>

              {/* Text + meta */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-snug">{g.text}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{flag} {g.language}</span>
                  <span className="opacity-40">·</span>
                  <span>{g.voice}</span>
                  {expiryLabel && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className={`font-medium ${expiringSoon ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
                        {expiryLabel}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Cost pill */}
              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-gradient-soft px-2.5 py-1 text-xs text-muted-foreground sm:flex">
                <Icon name="bolt" size={11} className="text-brand-2" />
                {g.cost}
              </span>

              {/* Download */}
              <button
                type="button"
                title="Download MP3"
                onClick={() => handleDownload(g)}
                disabled={isDownloading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition hover:border-brand-2 hover:text-brand-2 active:scale-95 disabled:opacity-50"
              >
                {isDownloading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-2/30 border-t-brand-2" />
                ) : (
                  <Icon name="download" size={15} />
                )}
              </button>

              {/* Delete */}
              {isOwner && (
                <button
                  type="button"
                  title="Delete voice"
                  onClick={() => setConfirmId(g.id)}
                  disabled={isDeleting}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition hover:border-red-500 hover:bg-red-500/8 hover:text-red-500 active:scale-95 disabled:opacity-40"
                >
                  {isDeleting ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400/30 border-t-red-500" />
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Confirmation dialog portal */}
      {confirmGen && (
        <DeleteConfirmDialog
          gen={confirmGen}
          deleting={deletingId === confirmGen.id}
          onConfirm={() => handleDelete(confirmGen.id)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}
