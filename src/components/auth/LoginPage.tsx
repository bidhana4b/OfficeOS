import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth, getRoleDashboardPath, type UserRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  Shield,
  Palette,
  Megaphone,
  Users,
  DollarSign,
  Smartphone,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  Lock,
  Mail,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Settings,
  Loader2,
} from 'lucide-react';

interface DemoAccount {
  email: string;
  password: string;
  role: UserRole;
  label: string;
  icon: typeof Shield;
  description: string;
  color: string;
}

const demoAccounts: DemoAccount[] = [
  {
    email: 'super@demo.com',
    password: '123456',
    role: 'super_admin',
    label: 'Super Admin',
    icon: Shield,
    description: 'Full system access — CEO view',
    color: '#00D9FF',
  },
  {
    email: 'designer@demo.com',
    password: '123456',
    role: 'designer',
    label: 'Designer',
    icon: Palette,
    description: 'Creative workspace & deliverables',
    color: '#7B61FF',
  },
  {
    email: 'mediabuyer@demo.com',
    password: '123456',
    role: 'media_buyer',
    label: 'Media Buyer',
    icon: Megaphone,
    description: 'Campaign analytics & ad management',
    color: '#FF006E',
  },
  {
    email: 'manager@demo.com',
    password: '123456',
    role: 'account_manager',
    label: 'Account Manager',
    icon: Users,
    description: 'Client relationships & projects',
    color: '#39FF14',
  },
  {
    email: 'finance@demo.com',
    password: '123456',
    role: 'finance',
    label: 'Finance',
    icon: DollarSign,
    description: 'Invoicing, billing & ledger',
    color: '#FFB800',
  },
  {
    email: 'client@demo.com',
    password: '123456',
    role: 'client',
    label: 'Client Portal',
    icon: Smartphone,
    description: 'Mobile-first client dashboard',
    color: '#00D9FF',
  },
];

type LoginView = 'login' | 'forgot-password' | 'reset-success';

export default function LoginPage() {
  const { login, resetPassword, loading, error, isDemoMode, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPasswordReset = searchParams.get('reset') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [view, setView] = useState<LoginView>(isPasswordReset ? 'reset-success' : 'login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [setupMessage, setSetupMessage] = useState('');
  const setupRan = useRef(false);

  // Auto-migrate demo users to Supabase Auth on first visit
  useEffect(() => {
    if (setupRan.current) return;
    setupRan.current = true;

    const autoMigrate = async () => {
      try {
        // Check if demo users are already migrated by trying a test query
        const { data: demoUser } = await supabase
          .from('demo_users')
          .select('email, auth_user_id')
          .eq('email', 'super@demo.com')
          .single();

        if (demoUser && !demoUser.auth_user_id) {
          // Need migration - run it silently
          console.log('[Auth Setup] Demo users need migration, running...');
          setSetupStatus('running');
          setSetupMessage('Setting up authentication...');
          
          const { data, error: fnError } = await supabase.functions.invoke(
            'supabase-functions-migrate-demo-users',
            { body: {} }
          );

          if (fnError) {
            console.warn('[Auth Setup] Migration edge function error:', fnError);
            setSetupStatus('error');
            setSetupMessage('Auto-setup failed. Use "Setup System" button below.');
          } else {
            console.log('[Auth Setup] Migration result:', data);
            setSetupStatus('done');
            setSetupMessage(`✓ System ready! ${data?.message || 'Users migrated.'}`);
            setTimeout(() => setSetupStatus('idle'), 3000);
          }
        } else if (demoUser?.auth_user_id) {
          // Already migrated
          console.log('[Auth Setup] Demo users already migrated');
        }
      } catch (err) {
        console.warn('[Auth Setup] Auto-migration check failed:', err);
      }
    };

    autoMigrate();
  }, []);

  const handleSetupSystem = async () => {
    setSetupStatus('running');
    setSetupMessage('Migrating demo users to Supabase Auth...');

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'supabase-functions-migrate-demo-users',
        { body: {} }
      );

      if (fnError) {
        setSetupStatus('error');
        setSetupMessage(`Setup failed: ${fnError.message}`);
      } else {
        setSetupStatus('done');
        setSetupMessage(`✓ ${data?.message || 'System ready!'}`);
        setTimeout(() => setSetupStatus('idle'), 5000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSetupStatus('error');
      setSetupMessage(`Setup failed: ${message}`);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoginLoading(true);
    setLoginSuccess(false);
    const success = await login(email, password);
    if (success) {
      setLoginSuccess(true);
      // Small delay for auth state to propagate, then navigate
      setTimeout(() => {
        // Try user from context first, then fallback to email lookup
        if (user?.role) {
          navigate(getRoleDashboardPath(user.role));
        } else {
          const account = demoAccounts.find((a) => a.email === email.toLowerCase().trim());
          navigate(getRoleDashboardPath(account?.role || 'super_admin'));
        }
      }, 500);
    }
    setLoginLoading(false);
  };

  const handleQuickLogin = async (account: DemoAccount) => {
    setSelectedRole(account.email);
    setEmail(account.email);
    setPassword(account.password);
    setLoginLoading(true);
    setLoginSuccess(false);
    const success = await login(account.email, account.password);
    if (success) {
      setLoginSuccess(true);
      setTimeout(() => {
        navigate(getRoleDashboardPath(account.role));
      }, 300);
    }
    setLoginLoading(false);
    setSelectedRole(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);

    const result = await resetPassword(resetEmail);
    if (result.success) {
      setResetSent(true);
    } else {
      setResetError(result.error || 'Failed to send reset email');
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-3 sm:p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-[-200px] left-[-100px] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-titan-cyan/[0.06] blur-[150px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-titan-purple/[0.08] blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-titan-magenta/[0.04] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-titan-cyan/10 border border-titan-cyan/20 mb-3 sm:mb-4">
            <Zap className="w-3.5 h-3.5 text-titan-cyan" />
            <span className="font-mono text-[10px] sm:text-xs text-titan-cyan">
              {isDemoMode ? 'DEMO MODE' : 'SECURE LOGIN'} — Powered by Supabase Auth
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-white mb-2">
            TITAN DEV <span className="text-gradient-cyan">AI</span>
          </h1>
          <p className="font-mono text-xs sm:text-sm text-white/40">
            Marketing Operations Command Center
          </p>
        </motion.div>

        {/* System Setup Status Banner */}
        <AnimatePresence>
          {setupStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "mb-4 p-3 rounded-xl border flex items-center gap-2",
                setupStatus === 'running' && "bg-titan-cyan/10 border-titan-cyan/20",
                setupStatus === 'done' && "bg-titan-lime/10 border-titan-lime/20",
                setupStatus === 'error' && "bg-titan-magenta/10 border-titan-magenta/20"
              )}
            >
              {setupStatus === 'running' && <Loader2 className="w-4 h-4 text-titan-cyan animate-spin shrink-0" />}
              {setupStatus === 'done' && <CheckCircle2 className="w-4 h-4 text-titan-lime shrink-0" />}
              {setupStatus === 'error' && <AlertCircle className="w-4 h-4 text-titan-magenta shrink-0" />}
              <span className={cn(
                "font-mono text-xs",
                setupStatus === 'running' && "text-titan-cyan",
                setupStatus === 'done' && "text-titan-lime",
                setupStatus === 'error' && "text-titan-magenta"
              )}>
                {setupMessage}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Password Reset Success Banner */}
        <AnimatePresence>
          {view === 'reset-success' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-titan-lime/10 border border-titan-lime/20 flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-titan-lime shrink-0" />
              <div>
                <p className="font-display font-bold text-sm text-titan-lime">Password Updated!</p>
                <p className="font-mono text-xs text-white/40">Your password has been reset. Please log in with your new password.</p>
              </div>
              <button
                onClick={() => setView('login')}
                className="ml-auto font-mono text-xs text-white/40 hover:text-white/60"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forgot Password View */}
        {view === 'forgot-password' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="glass-card p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-titan-cyan/[0.03] via-transparent to-titan-purple/[0.03]" />
              <div className="relative z-10">
                <button
                  onClick={() => { setView('login'); setResetSent(false); setResetError(null); }}
                  className="flex items-center gap-1 font-mono text-xs text-white/40 hover:text-white/60 mb-4"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Login
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-5 h-5 text-titan-cyan" />
                  <h2 className="font-display font-bold text-lg text-white">Reset Password</h2>
                </div>
                <p className="font-mono text-xs text-white/40 mb-6">
                  Enter your email and we'll send you a link to reset your password.
                </p>

                {resetSent ? (
                  <div className="p-4 rounded-xl bg-titan-lime/10 border border-titan-lime/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-titan-lime" />
                      <p className="font-display font-bold text-sm text-titan-lime">Email Sent!</p>
                    </div>
                    <p className="font-mono text-xs text-white/40">
                      Check your inbox for <span className="text-white/60">{resetEmail}</span>.
                      Follow the link to reset your password.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="font-mono text-xs text-white/40 mb-1.5 block">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/40 focus:ring-1 focus:ring-titan-cyan/20 transition-all"
                        />
                      </div>
                    </div>

                    {resetError && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20">
                        <AlertCircle className="w-3.5 h-3.5 text-titan-magenta shrink-0" />
                        <p className="font-mono text-xs text-titan-magenta">{resetError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading || !resetEmail}
                      className="w-full py-3 rounded-lg bg-gradient-to-r from-titan-cyan/20 to-titan-purple/20 border border-titan-cyan/30 text-white font-display font-bold text-sm hover:from-titan-cyan/30 hover:to-titan-purple/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                      {resetLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Send Reset Link
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Main Login View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
            {/* Left: Quick Login Cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-3"
            >
              <h2 className="font-display font-bold text-xs sm:text-sm text-white/60 mb-2 sm:mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-titan-cyan" />
                QUICK LOGIN — Select a Role
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {demoAccounts.map((account, i) => {
                  const Icon = account.icon;
                  const isLoading = selectedRole === account.email && loginLoading;
                  return (
                    <motion.button
                      key={account.email}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i + 0.3, duration: 0.3 }}
                      onClick={() => handleQuickLogin(account)}
                      disabled={loginLoading}
                      className={cn(
                        "group relative glass-card p-3 sm:p-4 text-left transition-all duration-300 hover:border-white/20 active:scale-[0.97] disabled:opacity-50",
                        isLoading && loginSuccess && "border-titan-lime/40"
                      )}
                      style={{
                        boxShadow: isLoading
                          ? loginSuccess
                            ? `0 0 20px rgba(57,255,20,0.3)`
                            : `0 0 20px ${account.color}30`
                          : undefined,
                        borderColor: isLoading
                          ? loginSuccess
                            ? 'rgba(57,255,20,0.4)'
                            : `${account.color}40`
                          : undefined,
                      }}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                          style={{
                            background: `${account.color}15`,
                            border: `1px solid ${account.color}30`,
                          }}
                        >
                          {isLoading ? (
                            <div
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 rounded-full animate-spin"
                              style={{
                                borderColor: `${account.color}30`,
                                borderTopColor: account.color,
                              }}
                            />
                          ) : (
                            <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" style={{ color: account.color }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-white/90 truncate">
                              {account.label}
                            </span>
                            {account.role === 'client' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-titan-cyan/15 text-titan-cyan border border-titan-cyan/20">
                                MOBILE
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-white/35 mt-0.5 truncate">
                            {account.description}
                          </p>
                        </div>
                        <ArrowRight
                          className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-all duration-200 group-hover:translate-x-0.5 mt-1 shrink-0"
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Right: Manual Login Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="glass-card p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-titan-cyan/[0.03] via-transparent to-titan-purple/[0.03]" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <Lock className="w-4 h-4 text-titan-cyan" />
                    <h2 className="font-display font-bold text-sm text-white/80">
                      Sign In
                    </h2>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="font-mono text-xs text-white/40 mb-1.5 block">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/40 focus:ring-1 focus:ring-titan-cyan/20 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-xs text-white/40 mb-1.5 block">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-12 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/40 focus:ring-1 focus:ring-titan-cyan/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Forgot Password Link */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setView('forgot-password')}
                        className="font-mono text-xs text-titan-cyan/60 hover:text-titan-cyan transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-3 py-2 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20"
                        >
                          <p className="font-mono text-xs text-titan-magenta">{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loginLoading || !email || !password}
                      className={cn(
                        "w-full py-3 rounded-lg border text-white font-display font-bold text-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2",
                        loginSuccess
                          ? "bg-gradient-to-r from-titan-lime/20 to-titan-lime/10 border-titan-lime/30"
                          : "bg-gradient-to-r from-titan-cyan/20 to-titan-purple/20 border-titan-cyan/30 hover:from-titan-cyan/30 hover:to-titan-purple/30"
                      )}
                    >
                      {loginLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : loginSuccess ? (
                        <>
                          <span className="text-titan-lime">✓ Redirecting...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <p className="font-mono text-[10px] text-white/25 leading-relaxed">
                      🔐 Quick login uses demo accounts. For production, create users via the Settings → Users & Roles panel.
                      {isDemoMode && (
                        <span className="block mt-1 text-titan-cyan/40">
                          ⚡ Running in demo mode — auto-migration to Supabase Auth in progress.
                        </span>
                      )}
                    </p>
                    {/* Setup System Button */}
                    <button
                      onClick={handleSetupSystem}
                      disabled={setupStatus === 'running'}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-titan-cyan/10 border border-titan-cyan/20 font-mono text-[10px] text-titan-cyan hover:bg-titan-cyan/20 transition-all disabled:opacity-50"
                    >
                      {setupStatus === 'running' ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Setting up...
                        </>
                      ) : setupStatus === 'done' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          System Ready
                        </>
                      ) : (
                        <>
                          <Settings className="w-3 h-3" />
                          Setup / Fix Auth System
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
