import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth, getRoleDashboardPath, type UserRole } from '@/lib/auth';
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

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoginLoading(true);
    setLoginSuccess(false);
    const success = await login(email, password);
    if (success) {
      setLoginSuccess(true);
      const account = demoAccounts.find((a) => a.email === email);
      const role = account?.role || 'super_admin';
      // Brief delay for success feedback
      setTimeout(() => {
        navigate(getRoleDashboardPath(role));
      }, 300);
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
            <span className="font-mono text-[10px] sm:text-xs text-titan-cyan">DEMO MODE — No Signup Required</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-white mb-2">
            TITAN DEV <span className="text-gradient-cyan">AI</span>
          </h1>
          <p className="font-mono text-xs sm:text-sm text-white/40">
            Marketing Operations Command Center
          </p>
        </motion.div>

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
                    Manual Login
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
                        placeholder="super@demo.com"
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
                        placeholder="123456"
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
                    🔐 Demo Mode: All accounts use password <span className="text-titan-cyan/60">123456</span>.
                    Data resets periodically. No real authentication required.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
