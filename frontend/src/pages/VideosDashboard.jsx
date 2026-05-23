import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Film } from 'lucide-react';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

export default function VideosDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [credits, setCredits] = useState(user?.credits || 0);

  const tabs = [
    { id: 'generate', label: 'Generate', icon: Wand2 },
    { id: 'videos', label: 'My Videos', icon: Film },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <Layout 
      tabs={tabs} 
      activeTab={activeTab} 
      onTabChange={handleTabChange}
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

function GenerateVideoTab({ credits, setCredits }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('wan_fast');
  const [duration, setDuration] = useState('8');
  const [loading, setLoading] = useState(false);

  const MODEL_COSTS = {
    'wan_fast': 5,
    'ltx_video': 4,
    'kling_turbo': 8
  };

  const cost = MODEL_COSTS[model] || 5;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (credits < cost) {
      toast.error('Not enough credits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/wp/lefimovart/api/videos/generate.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt, model, duration: parseInt(duration) })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      toast.success('Video generation started! Check your videos list for status.');
      setCredits(credits - cost);
      setPrompt('');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 px-4 py-6 max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl shadow-lg shadow-black/10 p-8 border border-border">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Generate Video with AI</h2>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Your Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              className="w-full h-32 px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">AI Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="wan_fast">Wan 2.1 Fast (5 credits)</option>
              <option value="ltx_video">LTX Video (4 credits)</option>
              <option value="kling_turbo">Kling 1.6 (8 credits)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Duration (seconds)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="4">4 seconds</option>
              <option value="6">6 seconds</option>
              <option value="8">8 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim() || credits < cost}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Generating...' : `Generate Video (${cost} credits)`}
          </button>
        </form>
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
                      ✓ Ready
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
                  Model: {video.model_used}
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
