import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, Zap, Palette, Share2, Bot, AlertCircle, XCircle } from 'lucide-react';
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
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <img src={logoImage} alt="Flowa Logo" className="w-16 h-16 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Flowa</h1>
            <p className="text-sm text-muted-foreground mt-1">Content Platform</p>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 relative">
        {/* Simple card */}
        <div className="w-full max-w-md">
          {/* Card content */}
          <div className="rounded-2xl bg-card border border-border/50 p-8 shadow-lg">
            {/* Mobile logo */}
            <div className="lg:hidden pb-6 flex items-center justify-center gap-3">
              <img src={logoImage} alt="Flowa Logo" className="w-10 h-10 object-contain" />
              <span className="text-2xl font-bold text-primary">Flowa</span>
            </div>

            {/* Header */}
            <div className="text-center space-y-1 pb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'login' 
                  ? 'Nhập thông tin để tiếp tục' 
                  : 'Đăng ký để bắt đầu'}
              </p>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 p-1 bg-muted rounded-lg mb-6">
                <TabsTrigger 
                  value="login" 
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Đăng nhập
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Đăng ký
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 animate-fade-in">
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Error Alert */}
                  {loginError && (
                    <div className="relative overflow-hidden rounded-xl border border-destructive/50 bg-destructive/10 p-4 animate-shake">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                            <XCircle className="h-5 w-5 text-destructive" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-destructive">
                            Đăng nhập không thành công
                          </p>
                          <p className="text-sm text-destructive/80">
                            {loginError}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLoginError(null)}
                          className="flex-shrink-0 text-destructive/60 hover:text-destructive transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Animated border */}
                      <div className="absolute bottom-0 left-0 h-1 bg-destructive/30 animate-pulse w-full" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className={`relative group rounded-xl transition-all duration-300 ${focusedField === 'login-email' ? 'input-glow' : ''}`}>
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-200 ${
                        focusedField === 'login-email' ? 'text-primary scale-110' : 'text-muted-foreground'
                      }`} />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="email@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onFocus={() => setFocusedField('login-email')}
                        onBlur={() => setFocusedField(null)}
                        required
                        disabled={isLoading}
                        className="pl-11 h-12 rounded-xl border-border/50 bg-muted/30 transition-all duration-200 focus:bg-background"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">
                      Mật khẩu
                    </Label>
                    <div className={`relative group rounded-xl transition-all duration-300 ${focusedField === 'login-password' ? 'input-glow' : ''}`}>
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-200 ${
                        focusedField === 'login-password' ? 'text-primary scale-110' : 'text-muted-foreground'
                      }`} />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onFocus={() => setFocusedField('login-password')}
                        onBlur={() => setFocusedField(null)}
                        required
                        disabled={isLoading}
                        className="pl-11 pr-11 h-12 rounded-xl border-border/50 bg-muted/30 transition-all duration-200 focus:bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember-me" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => {
                          setRememberMe(checked === true);
                          localStorage.setItem('rememberMe', checked === true ? 'true' : 'false');
                        }}
                        className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-md"
                      />
                      <Label 
                        htmlFor="remember-me" 
                        className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      >
                        Ghi nhớ
                      </Label>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  
                  <ForgotPasswordDialog 
                    open={showForgotPassword} 
                    onOpenChange={setShowForgotPassword} 
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 group" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      <>
                        Đăng nhập
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 animate-fade-in">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Error Alert */}
                  {registerError && (
                    <div className="relative overflow-hidden rounded-xl border border-destructive/50 bg-destructive/10 p-4 animate-shake">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                            <XCircle className="h-5 w-5 text-destructive" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-destructive">
                            Đăng ký không thành công
                          </p>
                          <p className="text-sm text-destructive/80">
                            {registerError}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRegisterError(null)}
                          className="flex-shrink-0 text-destructive/60 hover:text-destructive transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Animated border */}
                      <div className="absolute bottom-0 left-0 h-1 bg-destructive/30 animate-pulse w-full" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-sm font-medium">
                      Họ và tên
                    </Label>
                    <div className={`relative group rounded-xl transition-all duration-300 ${focusedField === 'register-name' ? 'input-glow' : ''}`}>
                      <User className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-200 ${
                        focusedField === 'register-name' ? 'text-primary scale-110' : 'text-muted-foreground'
                      }`} />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={registerFullName}
                        onChange={(e) => setRegisterFullName(e.target.value)}
                        onFocus={() => setFocusedField('register-name')}
                        onBlur={() => setFocusedField(null)}
                        disabled={isLoading}
                        className="pl-11 h-12 rounded-xl border-border/50 bg-muted/30 transition-all duration-200 focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className={`relative group rounded-xl transition-all duration-300 ${focusedField === 'register-email' ? 'input-glow' : ''}`}>
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-200 ${
                        focusedField === 'register-email' ? 'text-primary scale-110' : 'text-muted-foreground'
                      }`} />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="email@example.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        onFocus={() => setFocusedField('register-email')}
                        onBlur={() => setFocusedField(null)}
                        required
                        disabled={isLoading}
                        className="pl-11 h-12 rounded-xl border-border/50 bg-muted/30 transition-all duration-200 focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-medium">
                      Mật khẩu
                    </Label>
                    <div className={`relative group rounded-xl transition-all duration-300 ${focusedField === 'register-password' ? 'input-glow' : ''}`}>
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-200 ${
                        focusedField === 'register-password' ? 'text-primary scale-110' : 'text-muted-foreground'
                      }`} />
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Ít nhất 6 ký tự"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        onFocus={() => setFocusedField('register-password')}
                        onBlur={() => setFocusedField(null)}
                        required
                        disabled={isLoading}
                        className="pl-11 pr-11 h-12 rounded-xl border-border/50 bg-muted/30 transition-all duration-200 focus:bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={registerPassword} />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 group" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang tạo tài khoản...
                      </>
                    ) : (
                      <>
                        Tạo tài khoản
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Terms notice */}
            <p className="text-xs text-center text-muted-foreground pt-6">
              Bằng việc đăng ký, bạn đồng ý với{' '}
              <a href="#" className="text-primary hover:underline font-medium">Điều khoản</a>
              {' '}và{' '}
              <a href="#" className="text-primary hover:underline font-medium">Chính sách bảo mật</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
