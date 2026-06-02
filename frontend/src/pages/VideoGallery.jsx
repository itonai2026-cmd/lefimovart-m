import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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

const VIDEOS_PER_PAGE = 10;

export default function VideoGallery() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
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
    setVideos(prev => {
      const next = prev.filter(v => v.id !== videoId);
      const maxPage = Math.max(1, Math.ceil(next.length / VIDEOS_PER_PAGE));
      if (page > maxPage) setPage(maxPage);
      return next;
    });
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
        setVideos(prev => {
          const next = prev.filter(v => v.id !== deleteTarget.id);
          const maxPage = Math.max(1, Math.ceil(next.length / VIDEOS_PER_PAGE));
          if (page > maxPage) setPage(maxPage);
          return next;
        });
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
          <>
          {(() => {
            const totalPages = Math.ceil(videos.length / VIDEOS_PER_PAGE);
            if (totalPages <= 1) return null;
            return (
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setPage((c) => Math.max(1, c - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pn) => (
                    <button
                      key={pn}
                      type="button"
                      onClick={() => setPage(pn)}
                      className={`w-10 h-10 rounded-full text-sm transition-colors ${
                        pn === page
                          ? 'font-bold text-white bg-violet-600'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pn}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            );
          })()}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.slice((page - 1) * VIDEOS_PER_PAGE, page * VIDEOS_PER_PAGE).map(video => (
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
                    <video
                      controls
                      preload="metadata"
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      src={video.video_url}
                    ></video>
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
          </>
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
