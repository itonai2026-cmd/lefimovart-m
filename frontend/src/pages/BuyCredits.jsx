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
    { id: 'bronze', name: 'Bronze', credits: 16, price: '€2.99', icon: '/wp/lefimovart/512_Bronze.png' },
    { id: 'silver', name: 'Silver', credits: 34, price: '€5.99', icon: '/wp/lefimovart/512_Silver.png' },
    { id: 'gold', name: 'Gold', credits: 65, price: '€9.99', icon: '/wp/lefimovart/512_Gold.png' },
    { id: 'diamond', name: 'Diamond', credits: 134, price: '€19.99', icon: '/wp/lefimovart/512_Diamond.png' },
    { id: 'rhodium', name: 'Rhodium', credits: 204, price: '€29.99', icon: '/wp/lefimovart/512_Rhodium.png' },
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
        toast.success(`Payment successful! ${data.credits} 🪙 added.`);
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-primary font-bold hover:underline">&larr; Home</button>
            <h1 className="text-3xl font-bold text-foreground">Buy Credits</h1>
          </div>
          <button onClick={logout} className="text-red-400 font-bold">Logout</button>
        </div>

        <div className="bg-card rounded-lg p-6 mb-8 text-center border border-border">
          <p className="text-lg text-muted-foreground">Current Balance: <span className="text-2xl font-bold text-primary">{user?.credits} 🪙</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-card rounded-lg shadow-lg shadow-black/10 p-6 text-center border border-border hover:shadow-xl transition">
              <img src={plan.icon} alt={`${plan.name} plan`} className="w-20 h-20 mx-auto mb-3 object-contain" />
              <h3 className="text-2xl font-bold mb-2 text-foreground">{plan.name}</h3>
              <p className="text-4xl font-bold text-primary mb-2">{plan.price}</p>
              <p className="text-lg text-muted-foreground mb-6">{plan.credits} 🪙</p>
              <button
                onClick={() => handleBuyCredits(plan.id)}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
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
