import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, Zap, Palette, Share2, Bot } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';

const emailSchema = z.string().email('Email không hợp lệ');
const passwordSchema = z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự');

const features = [
  { icon: Zap, text: 'Tạo script video chuyên nghiệp', color: 'from-yellow-500 to-orange-500' },
  { icon: Palette, text: 'Thiết kế carousel đa nền tảng', color: 'from-pink-500 to-rose-500' },
  { icon: Share2, text: 'Nội dung đa kênh tự động', color: 'from-blue-500 to-cyan-500' },
  { icon: Bot, text: 'AI hỗ trợ sáng tạo', color: 'from-purple-500 to-violet-500' },
];

// Generate particles for background animation
const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 4,
  duration: 3 + Math.random() * 3,
  size: 2 + Math.random() * 4,
}));

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
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email hoặc mật khẩu không đúng');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Vui lòng xác nhận email trước khi đăng nhập');
      } else {
        toast.error('Đăng nhập thất bại. Vui lòng thử lại.');
      }
      return;
    }
    
    toast.success('Đăng nhập thành công!');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(registerEmail);
      passwordSchema.parse(registerPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    
    setIsLoading(true);
    const { error } = await signUp(registerEmail, registerPassword, registerFullName);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Email này đã được đăng ký. Vui lòng đăng nhập.');
        setActiveTab('login');
        setLoginEmail(registerEmail);
      } else {
        toast.error('Đăng ký thất bại. Vui lòng thử lại.');
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
            <div className="relative gradient-primary rounded-full p-4 logo-pulse">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1 morph-shape" />
        <div className="orb orb-2 morph-shape" />
        <div className="orb orb-3" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="max-w-lg space-y-10 animate-fade-in relative z-10">
          {/* Logo with glow */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 gradient-primary rounded-2xl blur-xl opacity-50 animate-pulse-glow" />
              <div className="relative gradient-primary rounded-2xl p-4 logo-pulse">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <div>
              <span className="text-5xl font-bold text-gradient text-glow">Flowa</span>
              <div className="text-sm text-muted-foreground font-medium tracking-widest uppercase mt-1">
                Content Platform
              </div>
            </div>
          </div>

          {/* Tagline with animation */}
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-foreground leading-tight">
              One Flow.
              <br />
              <span className="text-gradient text-glow">All Content.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Nền tảng AI tạo nội dung đa kênh thông minh, giúp bạn tiết kiệm thời gian và 
              <span className="text-foreground font-medium"> tăng 10x hiệu quả marketing</span>.
            </p>
          </div>

          {/* Features with animated icons */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div 
                key={feature.text}
                className="group flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm hover-lift cursor-default stagger-item"
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-3">
              {['🎨', '🚀', '💡', '⚡'].map((emoji, i) => (
                <div 
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-background gradient-primary flex items-center justify-center text-lg shadow-lg"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {emoji}
                </div>
              ))}
            </div>
            <div className="text-sm">
              <div className="font-bold text-foreground">10,000+</div>
              <div className="text-muted-foreground">người dùng tin tưởng</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 relative">
        {/* Gradient border card */}
        <div className="w-full max-w-md relative animate-scale-in">
          {/* Animated border */}
          <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-shimmer opacity-70" />
          
          {/* Card content */}
          <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl p-8 shadow-2xl">
            {/* Mobile logo */}
            <div className="lg:hidden pb-6 flex items-center justify-center gap-3">
              <div className="gradient-primary rounded-xl p-2.5 logo-pulse">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <span className="text-3xl font-bold text-gradient">Flowa</span>
            </div>

            {/* Header */}
            <div className="text-center space-y-2 pb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {activeTab === 'login' ? 'Chào mừng trở lại! 👋' : 'Tạo tài khoản mới ✨'}
              </h2>
              <p className="text-muted-foreground">
                {activeTab === 'login' 
                  ? 'Đăng nhập để tiếp tục sáng tạo nội dung' 
                  : 'Bắt đầu hành trình sáng tạo của bạn'}
              </p>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 p-1.5 bg-muted/50 rounded-xl mb-6">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Đăng nhập
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Đăng ký
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 animate-fade-in">
                <form onSubmit={handleLogin} className="space-y-4">
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
