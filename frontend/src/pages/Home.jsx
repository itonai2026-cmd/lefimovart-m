import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Settings } from 'lucide-react';
import AppLogo from '../components/AppLogo';
import imageButtonBg from '../assets/landing-image-bg.png';
import videoButtonBg from '../assets/landing-video-bg.png';

export default function Home() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(Boolean(Number(user?.accepted_terms || 0)));
  const termsAcceptedKey = useMemo(
    () => `lefimovart:termsAccepted:${user?.email || 'anonymous'}`,
    [user?.email]
  );

  useEffect(() => {
    const acceptedInAccount = Boolean(Number(user?.accepted_terms || 0));
    setAcceptedTerms(acceptedInAccount || localStorage.getItem(termsAcceptedKey) === 'true');
  }, [termsAcceptedKey, user?.accepted_terms]);

  const handleNavigate = (path) => {
    if (!acceptedTerms) return;
    navigate(path);
  };

  const handleTermsChange = async (event) => {
    const checked = event.target.checked;
    setAcceptedTerms(checked);
    localStorage.setItem(termsAcceptedKey, checked ? 'true' : 'false');
    try {
      const response = await fetch('/wp/lefimovart/api/auth/updateme.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ accepted_terms: checked ? 1 : 0 }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Could not save terms acceptance');
      if (data.user) setUser(data.user);
    } catch {
      setAcceptedTerms(!checked);
      localStorage.setItem(termsAcceptedKey, !checked ? 'true' : 'false');
    }
  };

  const buttonClassName = `w-full group relative overflow-hidden rounded-2xl border border-white/20 dark:border-slate-700 p-8 min-h-[148px] text-white font-bold transition-all duration-300 bg-cover bg-center shadow-lg shadow-black/20 ${
    acceptedTerms
      ? 'hover:shadow-2xl hover:scale-105 active:scale-95 cursor-pointer'
      : 'opacity-70 cursor-not-allowed grayscale-[0.25]'
  }`;

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
          <p className="text-lg italic text-slate-600 dark:text-slate-400">
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
            onClick={() => handleNavigate('/ai-images')}
            disabled={!acceptedTerms}
            className={buttonClassName}
            style={{ backgroundImage: `url('${imageButtonBg}')` }}
          >
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/20 transition-colors" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="relative flex min-h-[84px] flex-col items-center justify-center gap-2">
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-wide drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]">AI Image Generation</p>
                <p className="text-base sm:text-lg font-semibold text-violet-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">Generate & Modify Images</p>
              </div>
            </div>
          </button>

          {/* AI Video Generation */}
          <button
            onClick={() => handleNavigate('/ai-videos')}
            disabled={!acceptedTerms}
            className={buttonClassName}
            style={{ backgroundImage: `url('${videoButtonBg}')` }}
          >
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/20 transition-colors" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="relative flex min-h-[84px] flex-col items-center justify-center gap-2">
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-wide drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]">AI Video Generation</p>
                <p className="text-base sm:text-lg font-semibold text-purple-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">Create Amazing Videos</p>
              </div>
            </div>
          </button>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-white/20 dark:border-slate-700 bg-white/10 dark:bg-slate-800/50 px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={handleTermsChange}
            className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
          />
          <span>
            I agree to the{' '}
            <Link to="/terms" className="font-semibold text-indigo-600 dark:text-violet-400 hover:underline">
              Terms of use
            </Link>{' '}
            and the{' '}
            <Link to="/privacy" className="font-semibold text-indigo-600 dark:text-violet-400 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        {/* Credits info */}
        <div className="rounded-xl bg-white/10 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-bold text-indigo-600 dark:text-violet-400">{user?.credits || 0} 🪙</span> Available
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Only AI operations consume credits
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            You only pay for what you use — no subscriptions!
          </p>
        </div>
      </div>
    </div>
  );
}
