import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import TextInput from '../../../shared/components/TextInput';
import { Button } from '../../../shared/components/Button';
import Seo from '../../../shared/components/Seo';
import { LuLock, LuCircleAlert } from 'react-icons/lu';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const targetPath = location.state?.from?.pathname || '/admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both administrative email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        navigate(targetPath, { replace: true });
      } else {
        setError(res.message || 'Invalid administrator credentials.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center py-16 px-5 bg-surface">
      <Seo title="Admin Portal Sign In" noIndex />

      <div className="w-full max-w-md bg-white border border-border p-8 sm:p-12 rounded-md shadow-xs space-y-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-ink">
            <LuLock className="w-5 h-5" />
          </div>
          <span className="text-xs uppercase tracking-widest text-muted font-medium block">
            Studio Management
          </span>
          <h1 className="font-abhaya text-3xl sm:text-4xl text-ink font-medium">
            Admin Sign In
          </h1>
          <p className="text-xs text-muted leading-relaxed">
            Restricted administrative access for Sabr Studio operations, enquiries, and catalog management.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 bg-error/5 border border-error/20 text-error text-xs rounded-sm flex items-start space-x-2.5"
          >
            <LuCircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <TextInput
            id="admin-email"
            name="email"
            type="email"
            label="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@sabrstudio.com"
            autoComplete="username"
          />

          <TextInput
            id="admin-password"
            name="password"
            type="password"
            label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
          />

          <div className="pt-3">
            <Button
              type="submit"
              variant="Primary"
              fullWidth
              size="default"
              loading={loading}
              label="Sign In to Portal"
            />
          </div>
        </form>

        <div className="text-center pt-2">
          <Link
            to="/"
            className="text-xs text-muted hover:text-ink transition-colors font-medium"
          >
            ← Return to Sabr Studio Public Site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
