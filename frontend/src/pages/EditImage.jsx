import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function EditImage() {
  const { logout } = useAuth();
  const [params] = useSearchParams();
  const imageUrl = params.get('url');

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Edit Image</h1>
          <button onClick={logout} className="text-red-600 font-bold">Logout</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {imageUrl ? (
            <div className="text-center">
              <img src={imageUrl} alt="Edit" className="max-w-full max-h-96 mx-auto rounded-lg" />
              <p className="mt-4 text-gray-600">Image editing tools coming soon! You can:</p>
              <ul className="mt-2 text-left inline-block text-gray-600">
                <li>✓ Crop & rotate</li>
                <li>✓ Adjust colors & filters</li>
                <li>✓ Add text & stickers</li>
                <li>✓ Apply AI enhancements</li>
              </ul>
            </div>
          ) : (
            <p className="text-center text-gray-600">No image to edit</p>
          )}
        </div>
      </div>
    </div>
  );
}
