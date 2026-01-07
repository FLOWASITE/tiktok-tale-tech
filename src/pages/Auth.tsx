import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Zap, Palette, Share2, Bot, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';
import logoImage from '@/assets/logo.png';

const emailSchema = z.string().email('Email không hợp lệ');
const passwordSchema = z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự');

const features = [
  { icon: Zap, text: 'Tạo script video chuyên nghiệp' },
  { icon: Palette, text: 'Thiết kế carousel đa nền tảng' },
  { icon: Share2, text: 'Nội dung đa kênh tự động' },
  { icon: Bot, text: 'AI hỗ trợ sáng tạo' },
];

export default function Auth() {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });
  
  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFullName, setRegisterFullName] = useState('');
  
  // Error state
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  
  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setLoginError(err.errors[0].message);
        return;
      }
    }
    
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setLoginError('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin đăng nhập.');
      } else if (error.message.includes('Email not confirmed')) {
        setLoginError('Vui lòng xác nhận email trước khi đăng nhập.');
      } else {
        setLoginError('Đăng nhập thất bại. Vui lòng thử lại sau.');
      }
      return;
    }
    
    toast.success('Đăng nhập thành công!');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    
    try {
      emailSchema.parse(registerEmail);
      passwordSchema.parse(registerPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setRegisterError(err.errors[0].message);
        return;
      }
    }
    
    setIsLoading(true);
    const { error } = await signUp(registerEmail, registerPassword, registerFullName);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        setRegisterError('Email này đã được đăng ký. Vui lòng đăng nhập.');
        setTimeout(() => {
          setActiveTab('login');
          setLoginEmail(registerEmail);
        }, 1500);
      } else {
        setRegisterError('Đăng ký thất bại. Vui lòng thử lại sau.');
      }
      return;
    }
    
    toast.success('Đăng ký thành công!');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-secondary/20 animate-ping" style={{ animationDelay: '0.5s' }} />
            <img src={logoImage} alt="Flowa Logo" className="relative w-16 h-16 object-contain logo-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Simple subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 bg-muted/30">
        <div className="max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Flowa Logo" className="w-12 h-12 object-contain" />
            <div>
              <span className="text-3xl font-bold text-primary">Flowa</span>
              <div className="text-xs text-muted-foreground tracking-wide">Content Platform</div>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground leading-tight">
              One Flow. <span className="text-primary">All Content.</span>
            </h1>
            <p className="text-muted-foreground">
              Nền tảng AI tạo nội dung đa kênh thông minh, giúp bạn tiết kiệm thời gian.
            </p>
          </div>

          {/* Features - simple list */}
          <div className="space-y-3">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-3">
                <feature.icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl bg-card border border-border p-6">
            {/* Mobile logo */}
            <div className="lg:hidden pb-4 flex items-center justify-center gap-2">
              <img src={logoImage} alt="Flowa Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold text-primary">Flowa</span>
            </div>

            {/* Header */}
            <div className="text-center pb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h2>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                <TabsTrigger value="register">Đăng ký</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">{loginError}</p>
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="email@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm">Mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="remember-me" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => {
                          setRememberMe(checked === true);
                          localStorage.setItem('rememberMe', checked === true ? 'true' : 'false');
                        }}
                      />
                      <Label htmlFor="remember-me" className="text-muted-foreground cursor-pointer">
                        Ghi nhớ
                      </Label>
                    </div>
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  
                  <ForgotPasswordDialog 
                    open={showForgotPassword} 
                    onOpenChange={setShowForgotPassword} 
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      'Đăng nhập'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  {registerError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">{registerError}</p>
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="register-name" className="text-sm">Họ và tên</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={registerFullName}
                      onChange={(e) => setRegisterFullName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-email" className="text-sm">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="email@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-password" className="text-sm">Mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Ít nhất 6 ký tự"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={registerPassword} />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo tài khoản...
                      </>
                    ) : (
                      'Tạo tài khoản'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-center text-muted-foreground pt-4">
              Bằng việc đăng ký, bạn đồng ý với{' '}
              <a href="#" className="text-primary hover:underline">Điều khoản</a>
              {' '}và{' '}
              <a href="#" className="text-primary hover:underline">Chính sách bảo mật</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
