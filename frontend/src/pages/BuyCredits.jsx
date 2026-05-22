import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';

export default function BuyCredits() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout, user, setUser } = useAuth();
  const [loading, setLoading] = useState(null);

  const plans = [
    { id: 'bronze', name: 'Bronze', credits: 40, price: '$2.99' },
    { id: 'silver', name: 'Silver', credits: 88, price: '$5.99' },
    { id: 'gold', name: 'Gold', credits: 180, price: '$9.99' },
  ];

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const plan = searchParams.get('plan');
    if (sessionId && plan) {
      verifyPayment(sessionId, plan);
    }
  }, []);

  const verifyPayment = async (sessionId, plan) => {
    try {
      const res = await fetch('/wp/lefimovart/api/payments/verify_stripe.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ session_id: sessionId, plan })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Payment successful! ${data.credits} credits added.`);
        const meRes = await fetch('/wp/lefimovart/api/auth/me.php', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const meData = await meRes.json();
        if (meData.user) setUser(meData.user);
      }
    } catch (e) {
      toast.error('Payment verification failed');
    }
  };

  const handleBuyCredits = async (plan) => {
    setLoading(plan);
    try {
      const res = await fetch('/wp/lefimovart/api/payments/create_checkout.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-blue-600 font-bold hover:underline">&larr; Home</button>
            <h1 className="text-3xl font-bold">Buy Credits</h1>
          </div>
          <button onClick={logout} className="text-red-600 font-bold">Logout</button>
        </div>

        <div className="bg-white rounded-lg p-6 mb-8 text-center">
          <p className="text-lg text-gray-700">Current Balance: <span className="text-2xl font-bold text-blue-600">{user?.credits} credits</span></p>
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
