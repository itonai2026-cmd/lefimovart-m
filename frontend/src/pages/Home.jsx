import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('1024');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

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
      navigate(`/edit?url=${encodeURIComponent(data.image.url)}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">LefimovArt</h1>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">{user?.email}</p>
            <p className="text-sm text-primary">{user?.credits} credits</p>
            <button onClick={logout} className="text-red-400 text-sm hover:underline mt-1">Logout</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button onClick={() => navigate('/gallery')} className="bg-card rounded-lg p-6 shadow-md shadow-black/10 hover:shadow-lg border border-border transition text-left">
            <span className="text-3xl">🖼️</span>
            <h3 className="font-bold mt-2 text-foreground">Image Gallery</h3>
            <p className="text-sm text-muted-foreground">View your generated images</p>
          </button>
          <button onClick={() => navigate('/generate-video')} className="bg-card rounded-lg p-6 shadow-md shadow-black/10 hover:shadow-lg border border-border transition text-left">
            <span className="text-3xl">🎬</span>
            <h3 className="font-bold mt-2 text-foreground">Generate Video</h3>
            <p className="text-sm text-muted-foreground">Create AI videos</p>
          </button>
          <button onClick={() => navigate('/videos')} className="bg-card rounded-lg p-6 shadow-md shadow-black/10 hover:shadow-lg border border-border transition text-left">
            <span className="text-3xl">📹</span>
            <h3 className="font-bold mt-2 text-foreground">Video Gallery</h3>
            <p className="text-sm text-muted-foreground">View your videos</p>
          </button>
        </div>

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
              disabled={loading || !prompt.trim() || user.credits < 2}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Image'}
            </button>
          </form>

          {user.credits < 2 && (
            <button
              onClick={() => navigate('/buy-credits')}
              className="w-full mt-4 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700"
            >
              Buy More Credits
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
