import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wand2, ImageIcon, Edit2, Settings, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import PromptInput from '../components/PromptInput';
import ImageSettings, { getCost } from '../components/ImageSettings';
import StyleSelector from '../components/StyleSelector';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import GalleryPage from './Gallery';

export default function ImagesDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const initialTab = searchParams.get('tab') === 'gallery' ? 'gallery' : 'generate';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [credits, setCredits] = useState(user?.credits || 0);

  const tabs = [
    { id: 'generate', label: 'Generate', icon: Wand2 },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'edit', label: 'Edit', icon: Edit2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    setActiveTab(searchParams.get('tab') === 'gallery' ? 'gallery' : 'generate');
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    if (tabId === 'edit') {
      navigate('/edit');
    } else if (tabId === 'settings') {
      navigate('/settings');
    } else if (tabId === 'gallery') {
      setSearchParams({ tab: 'gallery' });
    } else {
      setSearchParams({});
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
        <GenerateImageTab credits={credits} setCredits={setCredits} />
      )}
      {activeTab === 'gallery' && (
        <GalleryTab />
      )}
    </Layout>
  );
}

function GenerateImageTab({ credits, setCredits }) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [styleFilters, setStyleFilters] = useState({ artistic: '', lighting: '', technical: '' });
  const [settings, setSettings] = useState({ format: '1:1', renderQuality: 'standard', model: 'flux_dev' });
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState('processing');
  const [overlayError, setOverlayError] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const cost = getCost(settings.format, settings.renderQuality, settings.model);
    if (credits < cost) {
      toast.error('Not enough credits.');
      navigate('/buy-credits');
      return;
    }

    const styleParts = [
      styleFilters.artistic && `style ${styleFilters.artistic}`,
      styleFilters.technical && `quality and technique ${styleFilters.technical}`,
      styleFilters.lighting && `light and atmosphere ${styleFilters.lighting}`,
    ].filter(Boolean);
    const fullPrompt = styleParts.length
      ? `${prompt}. Use the following: ${styleParts.join(', ')}.`
      : prompt;

    setIsLoading(true);
    setOverlayStatus('processing');
    setOverlayError('');
    setGeneratedUrl('');
    setShowOverlay(true);
    try {
      let referenceImageUrl = '';
      if (referenceImage) {
        const uploadData = new FormData();
        uploadData.append('file', referenceImage);
        const uploadResponse = await fetch('/wp/lefimovart/api/requests/upload.php', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: uploadData,
        });
        const uploaded = await uploadResponse.json();
        if (!uploaded.ok) throw new Error(uploaded.error || 'Image upload failed');
        referenceImageUrl = uploaded.file_url;
      }

      const saveData = new FormData();
      saveData.append('prompt', fullPrompt);
      saveData.append('format', settings.format);
      saveData.append('render_quality', settings.renderQuality);
      saveData.append('model', settings.model);
      if (referenceImageUrl) saveData.append('reference_image_url', referenceImageUrl);

      const saveResponse = await fetch('/wp/lefimovart/api/requests/create.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: saveData
      });
      const saveContentType = saveResponse.headers.get('content-type') || '';
      if (!saveContentType.includes('application/json')) {
        throw new Error(`Saving the image request failed on the server (HTTP ${saveResponse.status}).`);
      }
      const savedRequest = await saveResponse.json();
      if (!savedRequest.ok) throw new Error(savedRequest.error || 'Image request could not be saved');

      const generationData = new FormData();
      generationData.append('request_id', String(savedRequest.request_id));
      const generationResponse = await fetch('/wp/lefimovart/api/requests/process.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: generationData
      });
      const generationContentType = generationResponse.headers.get('content-type') || '';
      if (!generationContentType.includes('application/json')) {
        throw new Error(`Image generation failed on the server (HTTP ${generationResponse.status}).`);
      }
      const data = await generationResponse.json();
      if (!data.ok) throw new Error(data.error || 'Image generation failed');

      toast.success('Image generated!');
      setCredits(data.credits_remaining ?? credits - cost);
      setStyleFilters({ artistic: '', lighting: '', technical: '' });
      setGeneratedUrl(data.image.url);
      setOverlayStatus('completed');
      setTimeout(() => {
        setShowOverlay(false);
        navigate(`/edit?url=${encodeURIComponent(data.image.url)}`);
      }, 1500);
    } catch (e) {
      setOverlayStatus('failed');
      setOverlayError(e.message || 'Image generation failed');
      toast.error(e.message || 'Image generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-background dark:bg-slate-950" role="region" aria-label="Image generation">
      <div className="relative z-10 px-4 py-4 sm:py-10">
        <img src="/wp/lefimovart/lefi-image-logo.png" alt="Image Generation" className="w-24 h-24 sm:w-28 sm:h-28 mb-3 object-contain mx-auto" />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-indigo-600 dark:text-white mb-2">
            Generate Images
          </h1>
        </motion.div>

        <PromptInput
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />
        <ImageSettings
          settings={settings}
          setSettings={setSettings}
          credits={credits}
          onImageUpload={setReferenceImage}
          referenceImage={referenceImage}
        />
        <StyleSelector styles={styleFilters} onStylesChange={setStyleFilters} />
      </div>

      {/* Image Generation Overlay */}
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

            {/* Animated spinner / status icon */}
            <div className="relative w-36 h-36 mx-auto mb-6">
              {overlayStatus === 'processing' && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-900/50" />
                  <svg className="absolute inset-0 w-36 h-36 animate-spin" style={{ animationDuration: '2.5s' }} viewBox="0 0 144 144">
                    <defs>
                      <linearGradient id="imgSpinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <circle cx="72" cy="72" r="66" fill="none" stroke="url(#imgSpinGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="300 120" />
                  </svg>
                  <div className="absolute inset-[1.125rem] rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 animate-pulse flex items-center justify-center">
                    <img src="/wp/lefimovart/lefi-image-logo.png" alt="Image Generation" className="w-[3.75rem] h-[3.75rem] rounded-full object-contain" />
                  </div>
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 w-4 h-4 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50" />
                  </div>
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 w-3 h-3 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/50" />
                  </div>
                </>
              )}
              {overlayStatus === 'completed' && (
                <div className="w-36 h-36 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-[4.5rem] h-[4.5rem] text-emerald-500" />
                </div>
              )}
              {overlayStatus === 'failed' && (
                <div className="w-36 h-36 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-[4.5rem] h-[4.5rem] text-red-500" />
                </div>
              )}
            </div>

            {overlayStatus === 'processing' && (
              <>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Generating your image...
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  AI models are working on creating your image.
                </p>
              </>
            )}

            {overlayStatus === 'completed' && (
              <>
                <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                  Your image is ready!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Redirecting to Editor...
                </p>
              </>
            )}

            {overlayStatus === 'failed' && (
              <>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                  Generation failed
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {overlayError || 'An error occurred while generating the image.'}
                </p>
              </>
            )}

            <div className="space-y-2">
              {overlayStatus === 'completed' && generatedUrl && (
                <button
                  onClick={() => { setShowOverlay(false); navigate(`/edit?url=${encodeURIComponent(generatedUrl)}`); }}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl px-6 py-3 font-medium shadow-lg shadow-violet-500/25 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Go to Editor
                </button>
              )}
              {overlayStatus === 'processing' && (
                <button
                  onClick={() => setShowOverlay(false)}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-2 transition-colors"
                >
                  Continue generating
                </button>
              )}
              {overlayStatus === 'failed' && (
                <button
                  onClick={() => setShowOverlay(false)}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-2 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function GalleryTab() {
  return <GalleryPage />;
}
