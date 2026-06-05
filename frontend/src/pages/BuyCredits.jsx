import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';

const isAndroidApp = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const googlePlayProducts = {
  bronze: 'credits_bronze',
  silver: 'credits_silver',
  gold: 'credits_gold',
  diamond: 'credits_diamond',
  rhodium: 'credits_rhodium',
};

const hashAppAccountToken = async (userId) => {
  const value = `lefimovart:${userId}`;
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export default function BuyCredits() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout, user, setUser } = useAuth();
  const [loading, setLoading] = useState(null);
  const [nativePrices, setNativePrices] = useState({});
  const useGooglePlayBilling = isAndroidApp();

  const plans = [
    { id: 'bronze', name: 'Bronze', credits: 16, price: '€2.99', icon: '/wp/lefimovart/icons/128_Bronze.png' },
    { id: 'silver', name: 'Silver', credits: 34, price: '€5.99', icon: '/wp/lefimovart/icons/128_Silver.png' },
    { id: 'gold', name: 'Gold', credits: 65, price: '€9.99', icon: '/wp/lefimovart/icons/128_Gold.png' },
    { id: 'diamond', name: 'Diamond', credits: 134, price: '€19.99', icon: '/wp/lefimovart/icons/128_Diamond.png' },
    { id: 'rhodium', name: 'Rhodium', credits: 204, price: '€29.99', icon: '/wp/lefimovart/icons/128_Rhodium.png' },
  ];

  useEffect(() => {
    if (useGooglePlayBilling) {
      loadGooglePlayPrices();
      return;
    }

    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      verifyPayment(sessionId);
    }
  }, []);

  const refreshUser = async () => {
    const meRes = await fetch('/wp/lefimovart/api/auth/me.php', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const meData = await meRes.json();
    if (meData.user) setUser(meData.user);
  };

  const loadGooglePlayPrices = async () => {
    try {
      const billing = await NativePurchases.isBillingSupported();
      if (!billing.isBillingSupported) {
        toast.error('Google Play Billing is not available on this device.');
        return;
      }

      const { products } = await NativePurchases.getProducts({
        productIdentifiers: Object.values(googlePlayProducts),
        productType: PURCHASE_TYPE.INAPP,
      });

      const prices = {};
      products.forEach((product) => {
        prices[product.identifier] = product.priceString;
      });
      setNativePrices(prices);
    } catch (e) {
      toast.error(e.message || 'Could not load Google Play products');
    }
  };

  const verifyPayment = async (sessionId) => {
    try {
      const res = await fetch('/wp/lefimovart/api/payments/verify_stripe.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ session_id: sessionId })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Payment could not be confirmed');
      }
      if (data.already_processed) {
        toast.info('Payment already processed. Your credits are already in your balance.');
      } else {
        toast.success(`Payment successful! ${data.credits} 🪙 added.`);
      }
      await refreshUser();
      navigate('/buy-credits', { replace: true });
    } catch (e) {
      toast.error(`${e.message || 'Payment verification failed'}. Credits were not changed by this check.`);
    }
  };

  const buyWithGooglePlay = async (plan) => {
    const productId = googlePlayProducts[plan];
    const appAccountToken = await hashAppAccountToken(user.id);
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.INAPP,
      appAccountToken,
      isConsumable: false,
      autoAcknowledgePurchases: false,
    });

    if (transaction.purchaseState && transaction.purchaseState !== '1') {
      throw new Error('Purchase is still pending in Google Play');
    }

    if (!transaction.purchaseToken) {
      throw new Error('Google Play did not return a purchase token');
    }

    const res = await fetch('/wp/lefimovart/api/payments/verify_google_play.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        plan,
        product_id: transaction.productIdentifier || productId,
        purchase_token: transaction.purchaseToken,
        order_id: transaction.orderId,
        app_account_token: appAccountToken,
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Google Play payment could not be confirmed');
    }

    if (data.already_processed) {
      toast.info('Purchase already processed. Your credits are already in your balance.');
    } else {
      toast.success(`Purchase successful! ${data.credits} 🪙 added.`);
    }

    await refreshUser();
  };

  const handleBuyCredits = async (plan) => {
    setLoading(plan);
    try {
      if (useGooglePlayBilling) {
        await buyWithGooglePlay(plan);
        setLoading(null);
        return;
      }

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
              <p className="text-4xl font-bold text-primary mb-2">{nativePrices[googlePlayProducts[plan.id]] || plan.price}</p>
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
