import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, Images, Edit2 } from 'lucide-react';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

// Import the existing pages
import Home from './Home';
import Gallery from './Gallery';

export default function ImagesDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [credits, setCredits] = useState(user?.credits || 0);

  const tabs = [
    { id: 'generate', label: 'Generate', icon: Wand2 },
    { id: 'gallery', label: 'Gallery', icon: Images },
    { id: 'edit', label: 'Edit', icon: Edit2 },
  ];

  const handleTabChange = (tabId) => {
    if (tabId === 'edit') {
      navigate('/edit');
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('1024');
  const [loading, setLoading] = useState(false);

  const RESOLUTION_COSTS = { '512': 2, '1024': 4 };
  const cost = RESOLUTION_COSTS[resolution] || 0;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (credits < cost) {
      toast.error('Not enough credits');
      navigate('/buy-credits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/wp/lefimovart/api/images/generate.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt, resolution })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      toast.success('Image generated!');
      setCredits(credits - cost);
      setPrompt('');
      navigate(`/edit?url=${encodeURIComponent(data.image.url)}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 px-4 py-6 max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl shadow-lg shadow-black/10 p-8 border border-border">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Generate Image with AI</h2>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Your Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="w-full h-32 px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="512">512x512 (2 credits)</option>
              <option value="1024">1024x1024 (4 credits)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim() || credits < cost}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Generating...' : `Generate Image (${cost} credits)`}
          </button>
        </form>

        {credits < 2 && (
          <button
            onClick={() => window.location.href = '/wp/lefimovart/#/buy-credits'}
            className="w-full mt-4 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700"
          >
            Buy More Credits
          </button>
        )}
      </div>
    </div>
  );
}

function GalleryTab() {
  return <Gallery />;
}
