import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

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

      <div className="relative z-10 text-center max-w-md mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
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
        <div className="space-y-4">
          {/* AI Image Generation & Modification */}
          <button
            onClick={() => navigate('/ai-images')}
            className="w-full group relative overflow-hidden rounded-2xl p-8 text-white font-bold text-lg transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 group-hover:from-violet-700 group-hover:to-indigo-700 transition-all" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity" />
            <div className="relative flex flex-col items-center gap-3">
              <span className="text-4xl">🎨</span>
              <div>
                <p className="font-bold">AI Image Generation</p>
                <p className="text-sm font-normal text-violet-100">Generate & Modify Images</p>
              </div>
            </div>
          </button>

          {/* AI Video Generation */}
          <button
            onClick={() => navigate('/ai-videos')}
            className="w-full group relative overflow-hidden rounded-2xl p-8 text-white font-bold text-lg transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:from-indigo-700 group-hover:to-purple-700 transition-all" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity" />
            <div className="relative flex flex-col items-center gap-3">
              <span className="text-4xl">🎬</span>
              <div>
                <p className="font-bold">AI Video Generation</p>
                <p className="text-sm font-normal text-purple-100">Create Amazing Videos</p>
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
