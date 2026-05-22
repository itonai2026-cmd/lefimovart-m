import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function EditImage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [params] = useSearchParams();
  const imageUrl = params.get('url');

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Compact header - optimized for mobile */}
      <header className="flex items-center justify-between px-3 py-2 bg-card border-b border-border shrink-0">
        <button onClick={() => navigate('/')} className="text-primary text-sm font-bold hover:underline">&larr; Home</button>
        <h1 className="text-base font-bold text-foreground truncate mx-2">Edit Image</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/gallery')} className="text-muted-foreground text-xs hover:underline">Gallery</button>
          <button onClick={logout} className="text-red-400 text-xs font-bold">Logout</button>
        </div>
      </header>

      {/* Main editor area - takes all available space */}
      <main className="flex-1 flex items-center justify-center overflow-auto p-2">
        {imageUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <img
              src={imageUrl}
              alt="Edit"
              className="max-w-full max-h-[calc(100vh-8rem)] object-contain rounded-lg"
            />
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No image to edit</p>
        )}
      </main>

      {/* Compact footer toolbar - optimized for mobile */}
      <footer className="flex items-center justify-around px-2 py-2 bg-card border-t border-border shrink-0">
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground transition" title="Crop">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v4H3m14 0h4m0 14h-4m-14 0H3v-4m4-10h10v10H7z" /></svg>
          <span className="text-[10px] mt-0.5">Crop</span>
        </button>
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground transition" title="Rotate">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <span className="text-[10px] mt-0.5">Rotate</span>
        </button>
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground transition" title="Filter">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" /></svg>
          <span className="text-[10px] mt-0.5">Filter</span>
        </button>
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground transition" title="Text">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          <span className="text-[10px] mt-0.5">Text</span>
        </button>
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground transition" title="AI Enhance">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          <span className="text-[10px] mt-0.5">AI</span>
        </button>
        <a
          href={imageUrl || '#'}
          download
          className="flex flex-col items-center text-primary hover:text-primary/80 transition"
          title="Download"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span className="text-[10px] mt-0.5">Save</span>
        </a>
      </footer>
    </div>
  );
}
