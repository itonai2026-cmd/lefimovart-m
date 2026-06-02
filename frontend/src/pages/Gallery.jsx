import React, { useState, useEffect } from "react";
import { ImageIcon, Trash2, Edit2, Film, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import GalleryImageMenu from "@/components/GalleryImageMenu";

const IMAGES_PER_PAGE = 20;

// Gallery cells are small, but generated images are stored at full resolution
// (up to 3584x2048). Decoding ~10 full-res images at once exhausts the image
// memory budget of mobile browsers, so later images never render. Request a
// downscaled thumbnail for local images instead; leave external URLs untouched.
function galleryThumb(imageUrl, width = 512) {
  if (!imageUrl) return imageUrl;
  try {
    const u = new URL(imageUrl, window.location.origin);
    const match = u.pathname.match(/^(.*)\/img\/([^/]+)$/);
    if (!match) return imageUrl;
    const [, base, file] = match;
    return `${base}/api/images/thumb.php?f=${encodeURIComponent(file)}&w=${width}`;
  } catch {
    return imageUrl;
  }
}

export default function Gallery() {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const res = await fetch('/wp/lefimovart/api/requests/gallery.php', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error(`Gallery request failed (${res.status})`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Gallery request failed');
        setImages(data.images || []);
      } catch (e) {
        toast.error(e.message || 'Failed to load gallery');
      } finally {
        setLoading(false);
      }
    };
    loadGallery();
  }, []);

  const requestDelete = (img, e) => {
    e.stopPropagation();
    setDeleteTarget(img);
    setDeleteDialogOpen(true);
  };

  const handleFlagged = (imageId) => {
    setImages((prev) => {
      const next = prev.filter((image) => image.id !== imageId);
      const maxPage = Math.max(1, Math.ceil(next.length / IMAGES_PER_PAGE));
      if (page > maxPage) setPage(maxPage);
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const res = await fetch('/wp/lefimovart/api/requests/gallery.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ id: deleteTarget.id })
      });
      const data = await res.json();
      if (data.ok) {
        setImages((prev) => {
          const next = prev.filter((x) => x.id !== deleteTarget.id);
          const maxPage = Math.max(1, Math.ceil(next.length / IMAGES_PER_PAGE));
          if (page > maxPage) setPage(maxPage);
          return next;
        });
        toast.success("Image deleted.");
      } else {
        throw new Error(data.error || "Delete failed.");
      }
    } catch (e) {
      toast.error(e.message || "Delete failed.");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-none dark:bg-slate-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-100/40 dark:bg-violet-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-4 py-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-4 text-slate-400">
            <ImageIcon className="w-12 h-12 opacity-40" />
            <p className="text-sm">No images yet. Start generating!</p>
          </div>
        ) : (
          <>
            {(() => {
              const totalPages = Math.ceil(images.length / IMAGES_PER_PAGE);
              if (totalPages <= 1) return null;
              return (
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`w-10 h-10 rounded-full text-sm transition-colors ${
                          pageNumber === page
                            ? "font-bold text-white bg-violet-600"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3">
              {images.slice((page - 1) * IMAGES_PER_PAGE, page * IMAGES_PER_PAGE).map((img, i) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}>
                  <div className="rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md active:scale-95 transition-all relative group">
                    <div className="absolute z-10" style={{ top: "2px", left: "2px" }}>
                      <GalleryImageMenu imageId={img.id} imageUrl={img.image_url} onFlagged={handleFlagged} />
                    </div>
                    <button
                      type="button"
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/edit?url=${encodeURIComponent(img.image_url)}`);
                      }}
                      className="absolute z-10 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center"
                      style={{ top: "2px", right: "2px", width: "30px", height: "30px" }}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Video"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/ai-videos?ref_image=${encodeURIComponent(img.image_url)}`);
                      }}
                      className="absolute z-10 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center"
                      style={{ top: "2px", right: "36px", width: "30px", height: "30px" }}>
                      <Film className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={(e) => requestDelete(img, e)}
                      className="absolute z-10 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center"
                      style={{ bottom: "38px", right: "2px", width: "30px", height: "30px" }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <img
                      src={img.thumbnail_url || galleryThumb(img.image_url)}
                      alt={img.prompt}
                      loading="lazy"
                      decoding="async"
                      className="w-full aspect-square object-cover"
                    />
                    {img.prompt && (
                      <p className="px-2 py-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {img.prompt}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the image from your gallery. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
