import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function BuyCredits() {
  const { logout, user } = useAuth();
  const [loading, setLoading] = useState(null);

  const plans = [
    { id: 'bronze', name: 'Bronze', credits: 40, price: '$2.99' },
    { id: 'silver', name: 'Silver', credits: 88, price: '$5.99' },
    { id: 'gold', name: 'Gold', credits: 180, price: '$9.99' },
  ];

  const handleBuyCredits = async (plan) => {
    setLoading(plan);
    // Stripe Payment Link integration would go here
    // For now, show placeholder
    alert(`Redirecting to Stripe for ${plan}...`);
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Buy Credits</h1>
          <button onClick={logout} className="text-red-600 font-bold">Logout</button>
        </div>

        <div className="bg-white rounded-lg p-6 mb-8 text-center">
          <p className="text-lg text-gray-700">Current Balance: <span className="text-2xl font-bold text-blue-600">{user?.credits} 💰</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">{plan.price}</p>
              <p className="text-lg text-gray-700 mb-6">{plan.credits} Credits</p>
              <button
                onClick={() => handleBuyCredits(plan.id)}
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading === plan.id ? 'Processing...' : 'Buy Now'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
