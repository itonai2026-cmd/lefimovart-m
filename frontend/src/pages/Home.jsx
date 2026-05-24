import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Settings } from 'lucide-react';
import AppLogo from '../components/AppLogo';
import imageButtonBg from '../assets/landing-image-bg.png';
import videoButtonBg from '../assets/landing-video-bg.png';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Blur background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-100/40 dark:bg-violet-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="fixed top-4 right-4 z-20 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-violet-400 hover:bg-white/10 transition-all"
        aria-label="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      <div className="relative z-10 text-center max-w-md mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <AppLogo className="w-28 h-28 sm:w-32 sm:h-32" />
          <h1 className="text-4xl sm:text-5xl font-bold text-indigo-600 dark:text-violet-400 tracking-widest">
            LefiMovArt
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Welcome, {user?.email}!
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Create stunning AI images and videos with a few clicks.
          </p>
        </div>

        {/* Main buttons */}
        <div className="flex flex-col gap-5">
          {/* AI Image Generation & Modification */}
          <button
            onClick={() => navigate('/ai-images')}
            className="w-full group relative overflow-hidden rounded-2xl border border-white/20 dark:border-slate-700 p-8 min-h-[148px] text-white font-bold transition-all duration-300 bg-cover bg-center shadow-lg shadow-black/20 hover:shadow-2xl hover:scale-105 active:scale-95"
            style={{ backgroundImage: `url('${imageButtonBg}')` }}
          >
            <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative flex min-h-[84px] flex-col items-center justify-center gap-2">
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-wide drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]">AI Image Generation</p>
                <p className="text-base sm:text-lg font-semibold text-violet-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">Generate & Modify Images</p>
              </div>
            </div>
          </button>

          {/* AI Video Generation */}
          <button
            onClick={() => navigate('/ai-videos')}
            className="w-full group relative overflow-hidden rounded-2xl border border-white/20 dark:border-slate-700 p-8 min-h-[148px] text-white font-bold transition-all duration-300 bg-cover bg-center shadow-lg shadow-black/20 hover:shadow-2xl hover:scale-105 active:scale-95"
            style={{ backgroundImage: `url('${videoButtonBg}')` }}
          >
            <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative flex min-h-[84px] flex-col items-center justify-center gap-2">
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-wide drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]">AI Video Generation</p>
                <p className="text-base sm:text-lg font-semibold text-purple-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">Create Amazing Videos</p>
              </div>
            </div>
          </button>
        </div>

        {/* Credits info */}
        <div className="rounded-xl bg-white/10 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-bold text-indigo-600 dark:text-violet-400">{user?.credits || 0} Credits</span> Available
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Each operation costs credits. Buy more if needed!
          </p>
        </div>
      </div>
    </div>
  );
}
