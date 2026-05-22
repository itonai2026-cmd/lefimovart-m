import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';

export default function Gallery() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const res = await fetch('/wp/lefimovart/api/images/gallery.php', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setImages(data.images || []);
    } catch (e) {
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this image?')) return;
    try {
      const res = await fetch('/wp/lefimovart/api/images/gallery.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setImages(images.filter(img => img.id !== id));
        toast.success('Image deleted');
      }
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-blue-600 font-bold hover:underline">&larr; Home</button>
            <h1 className="text-3xl font-bold">Image Gallery</h1>
          </div>
          <button onClick={logout} className="text-red-600 font-bold">Logout</button>
        </div>

        {loading ? (
          <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div></div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No images yet. Start generating!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(img => (
              <div key={img.id} className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition">
                <img src={img.image_url} alt={img.prompt} className="w-full h-48 object-cover" />
                <div className="p-3">
                  <p className="text-xs text-gray-600 line-clamp-2">{img.prompt}</p>
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="mt-2 text-red-600 text-xs hover:underline font-bold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
