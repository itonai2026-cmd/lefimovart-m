import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';

const googlePlayProducts = {
  bronze: 'lefimovart_credits_bronze',
  silver: 'lefimovart_credits_silver',
  gold: 'lefimovart_credits_gold',
  diamond: 'lefimovart_credits_diamond',
  rhodium: 'lefimovart_credits_rhodium',
};

const ANDROID_APP_USER_AGENT = 'LefiMovArtAndroid';
const GOOGLE_PLAY_BILLING_UNAVAILABLE =
  'Google Play Billing is not available in the Android app right now. Please install or update the app from Google Play and try again.';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getUserAgent = () => (typeof window === 'undefined' ? '' : window.navigator.userAgent);

const isAndroidAppUserAgent = () => getUserAgent().includes(ANDROID_APP_USER_AGENT);

const getCapacitorPlatform = () => {
  try {
    return Capacitor.getPlatform();
  } catch (e) {
    console.error('Could not read Capacitor platform:', e);
    return 'web';
  }
};

// Only the wrapped Capacitor Android app must use Google Play Billing (Play policy).
// A plain Android *browser* (no Capacitor native bridge) must fall back to Stripe,
// so we deliberately do NOT treat a generic "Android" user agent as the app.
const isNativeAndroidRuntime = () => {
  if (typeof window === 'undefined') return false;

  const globalCapacitor = window.Capacitor;
  const globalPlatform = globalCapacitor?.getPlatform?.();
  const isNativePlatform = globalCapacitor?.isNativePlatform?.() === true;

  return (
    getCapacitorPlatform() === 'android' ||
    globalPlatform === 'android' ||
    (isNativePlatform && globalPlatform !== 'web') ||
    Boolean(window.androidBridge) ||
    isAndroidAppUserAgent()
  );
};

const hasNativePurchasesPlugin = () => {
  if (typeof window === 'undefined') return false;

  const globalCapacitor = window.Capacitor;
  return Boolean(
    Capacitor.isPluginAvailable?.('NativePurchases') ||
    globalCapacitor?.isPluginAvailable?.('NativePurchases')
  );
};

const getGooglePlayBillingStatus = async ({ attempts = 8, delayMs = 250 } = {}) => {
  let lastStatus = {
    platform: getCapacitorPlatform(),
    isAndroidApp: isNativeAndroidRuntime(),
    isPluginAvailable: hasNativePurchasesPlugin(),
    isBillingSupported: false,
    error: null,
  };

  if (!lastStatus.isAndroidApp) {
    return lastStatus;
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = {
      platform: getCapacitorPlatform(),
      isAndroidApp: isNativeAndroidRuntime(),
      isPluginAvailable: hasNativePurchasesPlugin(),
      isBillingSupported: false,
      error: null,
    };

    if (status.isPluginAvailable) {
      try {
        const billing = await NativePurchases.isBillingSupported();
        status.isBillingSupported = Boolean(billing?.isBillingSupported);
        lastStatus = status;

        if (status.isBillingSupported) {
          return status;
        }
      } catch (e) {
        status.error = e;
        lastStatus = status;
        console.error('Native billing check failed:', e);
      }
    } else {
      lastStatus = status;
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return lastStatus;
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
  const [useGooglePlayBilling, setUseGooglePlayBilling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initBilling = async () => {
      console.log('Initializing billing check...');
      const billingStatus = await getGooglePlayBillingStatus();
      console.log('Billing status:', billingStatus);

      if (!isMounted) return;

      const shouldUseGooglePlay = billingStatus.isAndroidApp && billingStatus.isBillingSupported;
      setUseGooglePlayBilling(shouldUseGooglePlay);

      if (shouldUseGooglePlay) {
        await loadGooglePlayPrices();
      }

      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        verifyPayment(sessionId);
      }
    };

    initBilling();

    return () => {
      isMounted = false;
    };
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
      const { products } = await NativePurchases.getProducts({
        productIdentifiers: Object.values(googlePlayProducts),
        productType: PURCHASE_TYPE.INAPP,
      });

      const prices = {};
      products.forEach((product) => {
        const productId = product.identifier || product.productIdentifier;
        const displayPrice = product.priceString || product.localizedPrice || product.price;
        if (productId && displayPrice) {
          prices[productId] = displayPrice;
        }
      });
      setNativePrices(prices);
    } catch (e) {
      console.error("Could not load Google Play products:", e);
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
    console.log("Starting Google Play Purchase for plan:", plan);
    const productId = googlePlayProducts[plan];
    const appAccountToken = await hashAppAccountToken(user.id);

    try {
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.INAPP,
        appAccountToken,
        isConsumable: true,
        autoAcknowledgePurchases: false,
      });

      console.log("Transaction result:", transaction);

      if (transaction.purchaseState != null && String(transaction.purchaseState) !== '1') {
        throw new Error('Purchase is still pending in Google Play');
      }

      const purchaseToken = transaction.purchaseToken || transaction.transactionId;
      if (!purchaseToken) {
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
          purchase_token: purchaseToken,
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
    } catch (err) {
      console.error("Google Play Purchase Error:", err);
      throw err;
    }
  };

  const handleBuyCredits = async (plan) => {
    setLoading(plan);
    try {
      const billingStatus = await getGooglePlayBillingStatus({
        attempts: useGooglePlayBilling ? 1 : 8,
      });
      console.log('handleBuyCredits billing status:', billingStatus);

      if (billingStatus.isAndroidApp) {
        if (!billingStatus.isBillingSupported) {
          throw new Error(GOOGLE_PLAY_BILLING_UNAVAILABLE);
        }

        console.log('Using Google Play Billing path');
        await buyWithGooglePlay(plan);
        setLoading(null);
        return;
      }

      console.log("Using Stripe path (non-android)");
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
      console.error("Final catch error:", e);
      toast.error(e.message || 'Error processing purchase');
      setLoading(null);
    }
  };

  const plans = [
    { id: 'bronze', name: 'Bronze', credits: 16, price: '€2.99', icon: '/wp/lefimovart/icons/128_Bronze.png' },
    { id: 'silver', name: 'Silver', credits: 34, price: '€5.99', icon: '/wp/lefimovart/icons/128_Silver.png' },
    { id: 'gold', name: 'Gold', credits: 65, price: '€9.99', icon: '/wp/lefimovart/icons/128_Gold.png' },
    { id: 'diamond', name: 'Diamond', credits: 134, price: '€19.99', icon: '/wp/lefimovart/icons/128_Diamond.png' },
    { id: 'rhodium', name: 'Rhodium', credits: 204, price: '€29.99', icon: '/wp/lefimovart/icons/128_Rhodium.png' },
  ];

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
