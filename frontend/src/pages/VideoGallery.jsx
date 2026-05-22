import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';

export default function VideoGallery() {
  const { logout } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Videos</h1>
          <button onClick={logout} className="text-red-600 font-bold">Logout</button>
        </div>

        {loading ? (
          <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div></div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No videos yet. Start generating!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(video => (
              <div key={video.id} className="bg-white rounded-lg overflow-hidden shadow">
                <div className="bg-gray-200 h-48 flex items-center justify-center">
                  {video.status === 'completed' && video.video_url ? (
                    <video controls className="w-full h-full object-cover" src={video.video_url}></video>
                  ) : (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">{video.status}</p>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-600 line-clamp-2">{video.prompt}</p>
                  <p className="text-xs mt-2 text-gray-500">Model: {video.model_used}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
