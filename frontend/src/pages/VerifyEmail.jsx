import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const emailFromQuery = params.get('email') || '';

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/wp/lefimovart/api/auth/verify.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      toast.success('Email verified! You can now sign in.');
      navigate('/login');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card rounded-2xl shadow-xl shadow-black/20 p-8 w-full max-w-md border border-border">
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">LefiMovArt</h1>
        <p className="text-center text-muted-foreground mb-8">Verify Your Email</p>

        <p className="text-sm text-muted-foreground mb-4 text-center">
          We sent a verification code to <strong className="text-foreground">{email || 'your email'}</strong>. Enter it below.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          {!emailFromQuery && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          )}
          <input
            type="text"
            placeholder="6-digit verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">&larr; Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
