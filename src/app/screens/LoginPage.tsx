import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { signIn } from '../../lib/auth';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = await signIn(email, password);

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${data.access_token}`
          }
        }
      )

      const profiles = await res.json()
      const profile = profiles[0]

      if (!profile) {
        setError('Profile not found. Contact admin.')
        return
      }

      setUser(profile)

      if (profile.role === 'employee') navigate('/employee/dashboard')
      else if (profile.role === 'manager') navigate('/manager/team-dashboard')
      else if (profile.role === 'admin') navigate('/admin/organization')

    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSignIn();
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#0F0F0F] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[32px] p-8 sm:p-10">
        
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[#F5A800] rounded-full flex items-center justify-center text-[#1A1A1A] font-bold text-[18px] mb-4 shadow-sm">
            AT
          </div>
          <h1 className="text-[22px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-1 tracking-tight">
            AtomTrack
          </h1>
          <p className="text-[13px] text-[#6B7280] dark:text-[#A0A0A0]">
            Your goals, tracked and aligned.
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="yourName@atomtrack.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
          />

          {error && (
            <div className="bg-[#FEF2F2] dark:bg-[#2A0000] border border-[#FECACA] dark:border-[#7F1D1D] rounded-[12px] px-4 py-3">
              <p className="text-[13px] text-[#991B1B] dark:text-[#F87171] text-center">{error}</p>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full h-11 bg-[#F5A800] hover:bg-[#D4900A] disabled:bg-[#F5A800]/50 disabled:cursor-not-allowed text-[#1A1A1A] font-medium text-[15px] rounded-full transition-colors duration-150 mt-1"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[12px] text-[#9CA3AF]">AtomTrack · Powered by Atomberg</p>
        </div>
      </div>
    </div>
  );
}