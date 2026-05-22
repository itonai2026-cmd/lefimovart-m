import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/wp/lefimovart/api/auth/forgot_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSent(true);
      toast.success('Reset link sent! Check your email.');
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
        <p className="text-center text-muted-foreground mb-8">Reset Your Password</p>

        {sent ? (
          <div className="text-center">
            <p className="text-foreground mb-4">If this email is registered, you will receive a password reset link shortly.</p>
            <Link to="/login" className="text-primary font-bold hover:underline">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">&larr; Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
