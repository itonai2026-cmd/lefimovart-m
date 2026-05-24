import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, ImageIcon, Edit2, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import PromptInput from '../components/PromptInput';
import ImageSettings, { getCost } from '../components/ImageSettings';
import StyleSelector from '../components/StyleSelector';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import AppLogo from '../components/AppLogo';

import GalleryPage from './Gallery';

export default function ImagesDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [credits, setCredits] = useState(user?.credits || 0);

  const tabs = [
    { id: 'generate', label: 'Generate', icon: Wand2 },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'edit', label: 'Edit', icon: Edit2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabChange = (tabId) => {
    if (tabId === 'edit') {
      navigate('/edit');
    } else if (tabId === 'settings') {
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
  const [settings, setSettings] = useState({ format: '1:1', renderQuality: 'standard' });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const cost = getCost(settings.format, settings.renderQuality);
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
      navigate(`/edit?url=${encodeURIComponent(data.image.url)}`);
    } catch (e) {
      toast.error(e.message || 'Image generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-background dark:bg-slate-950" role="region" aria-label="Image generation">
      <div className="relative z-10 px-4 py-4 sm:py-10">
        <AppLogo className="w-24 h-24 sm:w-28 sm:h-28 mb-3" />
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

        {isLoading && (
          <div className="flex flex-col items-center mt-8 gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
            <p className="text-sm text-slate-400 animate-pulse">Creating your image...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryTab() {
  return <GalleryPage />;
}
