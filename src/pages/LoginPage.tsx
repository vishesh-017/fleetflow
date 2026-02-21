import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Truck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/services/mock-api';
import { toast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

const forgotSchema = z.object({ email: z.string().trim().email('Invalid email').max(255) });
const resetSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type LoginForm = z.infer<typeof loginSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onLogin = async (data: LoginForm) => {
    if (isLocked) return;
    setLoading(true);
    try {
      const result = await api.auth.login(data.email, data.password);
      setAuth(result);
      setFailedAttempts(0);
      toast({ title: 'Welcome back!', description: `Logged in as ${result.user.name}` });
      navigate('/dashboard');
    } catch {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        setLockoutUntil(Date.now() + 30000);
        toast({ title: 'Account locked', description: 'Too many failed attempts. Try again in 30 seconds.', variant: 'destructive' });
      } else {
        toast({ title: 'Login failed', description: `Invalid credentials. ${5 - attempts} attempts remaining.`, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const onForgotSubmit = async (data: ForgotForm) => {
    setForgotEmail(data.email);
    await api.auth.forgotPassword(data.email);
    toast({ title: 'OTP Sent', description: 'If the email exists, you will receive a code.' });
    setForgotStep('reset');
  };

  const onResetSubmit = async (data: ResetForm) => {
    await api.auth.resetPassword(forgotEmail, data.otp, data.newPassword);
    toast({ title: 'Password Reset', description: 'Your password has been reset. Please log in.' });
    setForgotOpen(false);
    setForgotStep('email');
  };

  // Lockout timer
  useEffect(() => {
    if (!lockoutUntil) return;
    const timer = setInterval(() => {
      if (Date.now() >= lockoutUntil) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-sidebar px-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar-primary">
            <Truck className="h-7 w-7 text-sidebar-primary-foreground" />
          </div>
          <span className="text-3xl font-bold text-sidebar-foreground">FleetOps</span>
        </div>
        <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight mb-4">
          Manage your entire fleet from one command center.
        </h2>
        <p className="text-sidebar-muted text-lg leading-relaxed">
          Track vehicles, dispatch trips, monitor maintenance, and analyze costs — all in real time.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-4">
          {[
            { label: 'Active Vehicles', value: '10,000+' },
            { label: 'Trips Managed', value: '2.4M' },
            { label: 'Cost Savings', value: '23%' },
            { label: 'Uptime', value: '99.97%' },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg bg-sidebar-accent px-4 py-3">
              <p className="text-2xl font-bold text-sidebar-foreground">{stat.value}</p>
              <p className="text-sm text-sidebar-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">FleetOps</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@fleetops.io" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setForgotOpen(true)} className="text-sm text-primary hover:underline">
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLocked ? `Locked (${Math.ceil(((lockoutUntil || 0) - Date.now()) / 1000)}s)` : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Use any email with any password to sign in (demo mode)
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={forgotOpen} onOpenChange={(o) => { setForgotOpen(o); if (!o) setForgotStep('email'); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{forgotStep === 'email' ? 'Forgot Password' : 'Reset Password'}</DialogTitle>
          </DialogHeader>
          {forgotStep === 'email' ? (
            <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Email address</Label>
                <Input type="email" placeholder="you@example.com" {...forgotForm.register('email')} />
                {forgotForm.formState.errors.email && <p className="text-xs text-destructive">{forgotForm.formState.errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full">Send OTP</Button>
            </form>
          ) : (
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>6-digit OTP</Label>
                <Input placeholder="123456" maxLength={6} {...resetForm.register('otp')} />
                {resetForm.formState.errors.otp && <p className="text-xs text-destructive">{resetForm.formState.errors.otp.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" {...resetForm.register('newPassword')} />
                {resetForm.formState.errors.newPassword && <p className="text-xs text-destructive">{resetForm.formState.errors.newPassword.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" {...resetForm.register('confirmPassword')} />
                {resetForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{resetForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full">Reset Password</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
