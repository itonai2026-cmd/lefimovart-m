import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

export default function GenerateVideo() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('wan_fast');
  const [duration, setDuration] = useState('8');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

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
      setPrompt('');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-primary font-bold hover:underline">&larr; Home</button>
            <h1 className="text-3xl font-bold text-foreground">Generate Video</h1>
          </div>
          <button onClick={logout} className="text-red-400 font-bold">Logout</button>
        </div>

        <div className="bg-card rounded-lg shadow-lg shadow-black/10 p-8 border border-border">
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
              disabled={loading || !prompt.trim()}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Video'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
