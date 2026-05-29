import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Wand2, Film, Settings, ImageIcon, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

const VIDEO_MODELS = {
  ltx_video: {
    name: 'LTX Video 0.9.7',
    description: 'Fast & affordable open-source model. Good for quick drafts and iterations.',
    tier: 'low',
    credit_cost: 4,
    aspect_ratios: ['16:9', '9:16', '1:1'],
  },
  wan_27: {
    name: 'Wan 2.7',
    description: 'Enhanced motion smoothness and scene fidelity. Best quality-to-price ratio.',
    tier: 'medium',
    credit_cost: 6,
    aspect_ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
  },
  kling_25: {
    name: 'Kling 2.5 Pro',
    description: 'Top-tier cinematic quality with unparalleled motion fluidity and prompt precision.',
    tier: 'high',
    credit_cost: 10,
    aspect_ratios: ['16:9', '9:16', '1:1'],
  },
};

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
        <GenerateVideoTab credits={credits} setCredits={setCredits} />
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

function GenerateVideoTab({ credits, setCredits }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('wan_27');
  const [duration, setDuration] = useState('8');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [styleFilters, setStyleFilters] = useState({ artistic: '', lighting: '', technical: '' });
  const fileInputRef = useRef(null);

  const currentModel = VIDEO_MODELS[model];
  const cost = currentModel?.credit_cost || 6;

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
    if (currentModel && !currentModel.aspect_ratios.includes(aspectRatio)) {
      setAspectRatio(currentModel.aspect_ratios[0]);
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

      toast.success('Video generation started! Check your videos list for status.');
      setCredits(credits - cost);
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
                  Generate ({cost} &#x1FA99;)
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
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{m.credit_cost}</span>
                  <span className="text-xs">&#x1FA99;</span>
                  <span className="text-[10px] text-slate-400">/ video</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
