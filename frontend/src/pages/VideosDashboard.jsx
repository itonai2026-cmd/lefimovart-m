import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Wand2, Film, Settings, ImageIcon, ChevronDown, Sparkles, Loader2, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

const VIDEO_MODELS = {
  kling_o3: {
    name: 'Kling O3',
    description: 'Latest Kling model with realistic motion and multi-shot support. Great value.',
    tier: 'low',
    aspect_ratios: ['16:9', '9:16', '1:1'],
    resolutions: ['720p', '1080p'],
    cost_table: {
      '720p':  { 4: 3, 6: 5, 8: 7, 10: 8 },
      '1080p': { 4: 4, 6: 7, 8: 9, 10: 11 },
    },
  },
  wan_27: {
    name: 'Wan 2.7',
    description: 'Enhanced motion smoothness and scene fidelity. Best quality-to-price ratio.',
    tier: 'medium',
    aspect_ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    resolutions: ['720p', '1080p'],
    cost_table: {
      '720p':  { 4: 4, 6: 6, 8: 8, 10: 10 },
      '1080p': { 4: 6, 6: 9, 8: 12, 10: 15 },
    },
  },
  kling_25: {
    name: 'Kling 2.5',
    description: 'Top-tier cinematic quality with unparalleled motion fluidity and prompt precision.',
    tier: 'high',
    aspect_ratios: ['16:9', '9:16', '1:1'],
    resolutions: ['720p', '1080p'],
    cost_table: {
      '720p':  { 4: 5, 6: 7, 8: 10, 10: 12 },
      '1080p': { 4: 7, 6: 11, 8: 14, 10: 18 },
    },
  },
};

function getCost(modelKey, resolution, duration) {
  const m = VIDEO_MODELS[modelKey];
  if (!m) return 0;
  const table = m.cost_table[resolution] || Object.values(m.cost_table)[0] || {};
  return table[duration] ?? table[8] ?? 0;
}

function getMinCost(modelKey) {
  const m = VIDEO_MODELS[modelKey];
  if (!m) return 0;
  let min = Infinity;
  for (const res of Object.values(m.cost_table)) {
    for (const c of Object.values(res)) {
      if (c < min) min = c;
    }
  }
  return min === Infinity ? 0 : min;
}

const RES_LABELS = { '480p': '480p SD', '720p': '720p HD', '1080p': '1080p FHD' };

const EST_TIME = {
  kling_o3:  { '720p': { 4: '1-2',  6: '1.5-2.5', 8: '2-3',   10: '2.5-4' },
               '1080p': { 4: '1.5-3', 6: '2-3.5', 8: '2.5-4', 10: '3-5' } },
  wan_27:    { '720p': { 4: '2-3',  6: '2.5-4', 8: '3-5',   10: '3.5-5' },
               '1080p': { 4: '2.5-4', 6: '3-5',   8: '4-6',   10: '4.5-7' } },
  kling_25:  { '720p': { 4: '2-3',  6: '2-3',   8: '3-5',   10: '3-5' },
               '1080p': { 4: '2.5-4', 6: '2.5-4', 8: '4-6',   10: '4-6' } },
};

function getEstTime(modelKey, resolution, duration) {
  return EST_TIME[modelKey]?.[resolution]?.[duration] || '2-5';
}

const TIER_COLORS = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-700',
};

const TIER_LABELS = { low: 'Budget', medium: 'Balanced', high: 'Premium' };

const ARTISTIC_STYLES = [
  { label: 'Photorealistic', suffix: 'photorealistic, fine details' },
  { label: 'Oil Painting', suffix: 'oil painting, thick textures' },
  { label: 'Watercolor', suffix: 'watercolor, transparent colors' },
  { label: 'Anime / Manga', suffix: 'Japanese animation style' },
  { label: 'Comic Book', suffix: 'comic book style' },
  { label: 'Pixel Art', suffix: 'retro pixelated graphics' },
];

const LIGHTING_STYLES = [
  { label: 'Cinematic', suffix: 'cinematic setting, dramatic lights' },
  { label: 'Golden Hour', suffix: 'warm sunset light' },
  { label: 'Neon / Cyberpunk', suffix: 'neon lights, futuristic' },
];

const TECHNICAL_STYLES = [
  { label: '3D Render', suffix: 'photorealistic 3D rendering' },
  { label: 'Isometric', suffix: 'isometric perspective' },
  { label: 'Minimalist', suffix: 'simple, few elements' },
  { label: 'Vintage / Retro', suffix: 'aged look, sepia' },
];

export default function VideosDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [credits, setCredits] = useState(user?.credits || 0);

  const tabs = [
    { id: 'generate', label: 'Generate', icon: Wand2 },
    { id: 'videos', label: 'My Videos', icon: Film },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabChange = (tabId) => {
    if (tabId === 'settings') {
      navigate('/settings');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <Layout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerCredits={credits}
    >
      {activeTab === 'generate' && (
        <GenerateVideoTab credits={credits} setCredits={setCredits} onGoToGallery={() => setActiveTab('videos')} />
      )}
      {activeTab === 'videos' && (
        <VideoGalleryTab />
      )}
    </Layout>
  );
}

function StyleDropdown({ title, options, value, onChange }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none text-sm font-medium rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer ${
            value
              ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-600'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
          }`}>
          <option value="">None</option>
          {options.map((opt) => (
            <option key={opt.label} value={opt.suffix}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-400" />
      </div>
    </div>
  );
}

function GenerateVideoTab({ credits, setCredits, onGoToGallery }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('wan_27');
  const [duration, setDuration] = useState('8');
  const [resolution, setResolution] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [styleFilters, setStyleFilters] = useState({ artistic: '', lighting: '', technical: '' });
  const fileInputRef = useRef(null);

  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayEstTime, setOverlayEstTime] = useState('');
  const currentModel = VIDEO_MODELS[model];
  const cost = getCost(model, resolution, parseInt(duration, 10));
  const estTime = getEstTime(model, resolution, parseInt(duration, 10));

  const referenceImageUrl = useMemo(
    () => (referenceImage ? URL.createObjectURL(referenceImage) : null),
    [referenceImage]
  );

  useEffect(() => {
    return () => {
      if (referenceImageUrl) URL.revokeObjectURL(referenceImageUrl);
    };
  }, [referenceImageUrl]);

  useEffect(() => {
    if (currentModel) {
      if (!currentModel.aspect_ratios.includes(aspectRatio)) {
        setAspectRatio(currentModel.aspect_ratios[0]);
      }
      const avail = currentModel.resolutions || ['default'];
      if (!avail.includes(resolution)) {
        setResolution(avail[0]);
      }
    }
  }, [model]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image too large. Maximum 20MB.');
      return;
    }
    setReferenceImage(file);
  };

  const handleGenerate = async (e) => {
    e?.preventDefault?.();
    if (!prompt.trim() && !referenceImage) {
      toast.error('Please enter a prompt or upload an image');
      return;
    }

    if (credits < cost) {
      toast.error('Not enough credits');
      return;
    }

    const styleParts = [
      styleFilters.artistic && `style ${styleFilters.artistic}`,
      styleFilters.technical && `quality and technique ${styleFilters.technical}`,
      styleFilters.lighting && `light and atmosphere ${styleFilters.lighting}`,
    ].filter(Boolean);
    const fullPrompt = styleParts.length && prompt.trim()
      ? `${prompt}. Use the following: ${styleParts.join(', ')}.`
      : prompt;

    setLoading(true);
    try {
      let imageUrl = '';
      if (referenceImage) {
        const uploadData = new FormData();
        uploadData.append('file', referenceImage);
        const uploadRes = await fetch('/wp/lefimovart/api/requests/upload.php', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: uploadData,
        });
        const uploaded = await uploadRes.json();
        if (!uploaded.ok) throw new Error(uploaded.error || 'Image upload failed');
        imageUrl = window.location.origin + uploaded.file_url;
      }

      const requestData = new FormData();
      if (fullPrompt.trim()) requestData.append('prompt', fullPrompt);
      requestData.append('model', model);
      requestData.append('duration', String(parseInt(duration, 10)));
      requestData.append('aspect_ratio', aspectRatio);
      requestData.append('resolution', resolution);
      if (imageUrl) requestData.append('image_url', imageUrl);

      const res = await fetch('/wp/lefimovart/api/videos/create.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: requestData
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Video request failed on the server (HTTP ${res.status}).`);
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setCredits(credits - cost);
      setOverlayEstTime(getEstTime(model, resolution, parseInt(duration, 10)));
      setShowOverlay(true);
      setPrompt('');
      setReferenceImage(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading && (prompt.trim() || referenceImage)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="relative z-10 px-4 py-6 max-w-2xl mx-auto space-y-3">
      {/* Prompt Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full"
      >
        <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-black/30 rounded-2xl overflow-hidden">
          <div className="m-3 rounded-xl overflow-hidden">
            <textarea
              placeholder={referenceImage
                ? 'Describe the motion or transformation for this image...'
                : 'Describe the video you want to generate...'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              rows={4}
              style={{ resize: 'none', outline: 'none' }}
              className="w-full bg-slate-50 dark:bg-slate-950 text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-transparent focus:border-slate-300 dark:focus:border-slate-600 rounded-xl p-4 transition-colors"
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="text-sm text-slate-400 dark:text-slate-500">
              <span className="text-xs block">
                {referenceImage ? 'Image-to-Video mode' : 'Text-to-Video mode'}
              </span>
              <span className="text-xs block">Enter &rarr; Generate</span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || (!prompt.trim() && !referenceImage) || credits < cost}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl px-6 min-h-[44px] font-medium shadow-lg shadow-violet-500/25 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate ({cost} &#x1FA99; / ~{estTime} min)
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Settings Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
        <div className="flex flex-wrap gap-5 items-center justify-evenly">
          {/* Reference Image */}
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
              {referenceImage ? 'DEL' : 'IMG'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => referenceImage ? setReferenceImage(null) : fileInputRef.current?.click()}
              aria-label={referenceImage ? 'Remove reference image' : 'Upload reference image'}
              className={`rounded-lg min-h-[44px] min-w-[44px] transition-all border-2 overflow-hidden ${
                referenceImage
                  ? 'border-violet-500 dark:border-violet-400'
                  : 'border-dashed border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
              }`}
            >
              {referenceImageUrl ? (
                <img src={referenceImageUrl} alt="Reference" className="w-11 h-11 object-cover" />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-500 m-2.5" />
              )}
            </button>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Duration</span>
            <div className="grid grid-cols-4 gap-1.5">
              {['4', '6', '8', '10'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`min-h-[36px] min-w-[36px] rounded-xl border text-sm font-bold transition-all ${
                    duration === d
                      ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Cost</span>
            <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl px-3 py-1.5">
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{cost}</span>
              <span className="text-base leading-none" aria-hidden>&#x1FA99;</span>
            </div>
          </div>

          {/* Credits */}
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Credits</span>
            <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl px-3 py-1.5">
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{credits}</span>
              <span className="text-base leading-none" aria-hidden>&#x1FA99;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 text-center">
          AI Video Model
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(VIDEO_MODELS).map(([key, m]) => {
            const active = model === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setModel(key)}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${
                  active
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 ring-1 ring-violet-500'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${active ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {m.name}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_COLORS[m.tier]}`}>
                    {TIER_LABELS[m.tier]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mb-1.5">
                  {m.description}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">from</span>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{getMinCost(key)}</span>
                  <span className="text-xs">&#x1FA99;</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resolution Selector */}
      {currentModel && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 text-center">
            Resolution
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {currentModel.resolutions.map((res) => {
              const active = resolution === res;
              return (
                <button
                  key={res}
                  type="button"
                  onClick={() => setResolution(res)}
                  aria-pressed={active}
                  className={`min-h-[48px] min-w-[80px] rounded-xl border px-4 py-2 text-center transition-all ${
                    active
                      ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="block text-sm font-bold">{RES_LABELS[res] || res}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Format / Aspect Ratio Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 text-center">
          Video Format
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {(currentModel?.aspect_ratios || ['16:9', '9:16', '1:1']).map((ratio) => {
            const active = aspectRatio === ratio;
            return (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                aria-pressed={active}
                className={`min-h-[48px] min-w-[64px] rounded-xl border px-4 py-2 text-center transition-all ${
                  active
                    ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <span className="block text-sm font-bold">{ratio}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 text-center">
          Video Style
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <StyleDropdown
            title="Artistic"
            options={ARTISTIC_STYLES}
            value={styleFilters.artistic}
            onChange={(v) => setStyleFilters({ ...styleFilters, artistic: v })}
          />
          <StyleDropdown
            title="Lighting"
            options={LIGHTING_STYLES}
            value={styleFilters.lighting}
            onChange={(v) => setStyleFilters({ ...styleFilters, lighting: v })}
          />
          <StyleDropdown
            title="Technical"
            options={TECHNICAL_STYLES}
            value={styleFilters.technical}
            onChange={(v) => setStyleFilters({ ...styleFilters, technical: v })}
          />
        </div>
      </div>

      {/* Generation Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 px-8 py-10 max-w-sm w-full mx-4 text-center"
          >
            <button
              onClick={() => setShowOverlay(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Animated spinner */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-900/50" />
              {/* Spinning gradient ring */}
              <svg className="absolute inset-0 w-24 h-24 animate-spin" style={{ animationDuration: '2.5s' }} viewBox="0 0 96 96">
                <defs>
                  <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <circle cx="48" cy="48" r="44" fill="none" stroke="url(#spinGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="200 80" />
              </svg>
              {/* Inner pulsing circle */}
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 animate-pulse flex items-center justify-center">
                <Film className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              </div>
              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 w-2.5 h-2.5 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50" />
              </div>
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 w-2 h-2 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/50" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              Se generează videoclipul...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              Modelele AI lucrează la crearea videoclipului tău.
            </p>
            <div className="inline-flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl px-4 py-2 mb-6">
              <Clock className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Estimare: ~{overlayEstTime} min
              </span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { setShowOverlay(false); onGoToGallery(); }}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl px-6 py-3 font-medium shadow-lg shadow-violet-500/25 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Film className="w-4 h-4" />
                Mergi la Galerie
              </button>
              <button
                onClick={() => setShowOverlay(false)}
                className="w-full text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-2 transition-colors"
              >
                Continuă să generezi
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function VideoGalleryTab() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchVideos();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const hasProcessing = videos.some(v => v.status === 'processing');
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(() => pollProcessingVideos(), 10000);
    } else if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [videos]);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/wp/lefimovart/api/videos/list.php', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (e) {
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const pollProcessingVideos = async () => {
    const processing = videos.filter(v => v.status === 'processing');
    for (const video of processing) {
      try {
        const res = await fetch(`/wp/lefimovart/api/videos/status.php?id=${video.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.ok && data.video.status !== 'processing') {
          setVideos(prev =>
            prev.map(v =>
              v.id === video.id ? { ...v, ...data.video } : v
            )
          );
          if (data.video.status === 'completed') {
            toast.success('Video ready!');
          } else if (data.video.status === 'failed') {
            toast.error(`Video failed: ${data.video.error_message || 'Unknown error'}`);
          }
        }
      } catch (e) {
        // Silent fail on poll
      }
    }
  };

  const modelDisplayName = (key) => VIDEO_MODELS[key]?.name || key;

  return (
    <div className="relative z-10 px-4 py-6">
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No videos yet. Start generating!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {videos.map(video => (
            <div
              key={video.id}
              className="bg-card rounded-lg overflow-hidden shadow shadow-black/10 border border-border hover:shadow-md transition-shadow"
            >
              <div className="bg-muted h-48 flex items-center justify-center relative">
                {video.status === 'completed' && video.video_url ? (
                  <>
                    <video
                      controls
                      className="w-full h-full object-cover"
                      src={video.video_url}
                    />
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Ready
                    </span>
                  </>
                ) : video.status === 'failed' ? (
                  <div className="text-center p-4">
                    <p className="text-red-400 font-bold text-sm">Failed</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.error_message || 'Generation failed'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Processing...</p>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {video.prompt}
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Model: {modelDisplayName(video.model_used)}
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Status: <span className="font-semibold capitalize">{video.status}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
