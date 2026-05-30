import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import GalleryVideoMenu from '../components/GalleryVideoMenu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function VideoGallery() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchVideos();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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
          setVideos(prev => prev.map(v =>
            v.id === video.id ? { ...v, ...data.video } : v
          ));
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

  const handleFlagged = (videoId) => {
    setVideos(prev => prev.filter(v => v.id !== videoId));
  };

  const requestDelete = (video, e) => {
    e.stopPropagation();
    setDeleteTarget(video);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const res = await fetch('/wp/lefimovart/api/videos/list.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ id: deleteTarget.id })
      });
      const data = await res.json();
      if (data.ok) {
        setVideos(prev => prev.filter(v => v.id !== deleteTarget.id));
        toast.success('Video deleted.');
      } else {
        throw new Error(data.error || 'Delete failed.');
      }
    } catch (e) {
      toast.error(e.message || 'Delete failed.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-primary font-bold hover:underline">&larr; Home</button>
            <h1 className="text-3xl font-bold text-foreground">My Videos</h1>
          </div>
          <button onClick={logout} className="text-red-400 font-bold">Logout</button>
        </div>

        {loading ? (
          <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div></div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No videos yet. Start generating!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(video => (
              <div key={video.id} className="bg-card rounded-lg overflow-hidden shadow shadow-black/10 border border-border">
                <div className="bg-muted h-48 flex items-center justify-center relative">
                  <div className="absolute z-10" style={{ top: '4px', left: '4px' }}>
                    <GalleryVideoMenu videoId={video.id} onFlagged={handleFlagged} />
                  </div>
                  <button
                    type="button"
                    title="Delete"
                    onClick={(e) => requestDelete(video, e)}
                    className="absolute z-10 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center"
                    style={{ top: '4px', right: '4px', width: '30px', height: '30px' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {video.status === 'completed' && video.video_url ? (
                    <video controls className="w-full h-full object-cover" src={video.video_url}></video>
                  ) : video.status === 'failed' ? (
                    <div className="text-center p-4">
                      <p className="text-red-400 font-bold text-sm">Failed</p>
                      <p className="text-xs text-muted-foreground mt-1">{video.error_message || 'Generation failed'}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Processing...</p>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{video.prompt}</p>
                  <p className="text-xs mt-2 text-muted-foreground">Model: {video.model_used}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the video from your gallery and from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
