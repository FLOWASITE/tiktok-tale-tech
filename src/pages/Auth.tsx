import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

const emailSchema = z.string().email('Email không hợp lệ');
const passwordSchema = z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự');

const features = [
  'Tạo script video chuyên nghiệp',
  'Thiết kế carousel đa nền tảng',
  'Nội dung đa kênh tự động',
  'AI hỗ trợ sáng tạo'
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
            <div className="relative gradient-primary rounded-full p-4">
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
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-secondary/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-2xl animate-float" />
        <div className="absolute bottom-1/3 left-1/3 w-48 h-48 bg-secondary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="max-w-md space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="gradient-primary rounded-xl p-3 glow-primary">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-4xl font-bold text-gradient">Flowa</span>
          </div>

          {/* Tagline */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground leading-tight">
              One Flow.<br />
              <span className="text-gradient">All Content.</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Nền tảng AI tạo nội dung đa kênh thông minh, giúp bạn tiết kiệm thời gian và tăng hiệu quả marketing.
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-4 pt-4">
            {features.map((feature, index) => (
              <div 
                key={feature}
                className="flex items-center gap-3 stagger-item"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-foreground font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* Decorative elements */}
          <div className="absolute bottom-12 left-12 right-12 flex items-center gap-2 text-muted-foreground text-sm">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium"
                >
                  {i}K
                </div>
              ))}
            </div>
            <span>người dùng tin tưởng</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
        <Card className="w-full max-w-md relative z-10 border-border/50 shadow-2xl backdrop-blur-sm bg-card/95 animate-scale-in">
          {/* Mobile logo */}
          <div className="lg:hidden pt-6 pb-2 flex items-center justify-center gap-2">
            <div className="gradient-primary rounded-lg p-2">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-gradient">Flowa</span>
          </div>

          <CardHeader className="text-center space-y-2 pb-4">
            <CardTitle className="text-2xl font-bold">
              {activeTab === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {activeTab === 'login' 
                ? 'Đăng nhập để tiếp tục sáng tạo nội dung' 
                : 'Bắt đầu hành trình sáng tạo của bạn'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  Đăng nhập
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  Đăng ký
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                        focusedField === 'login-email' ? 'text-primary' : 'text-muted-foreground'
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
                        className="pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">
                      Mật khẩu
                    </Label>
                    <div className="relative group">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                        focusedField === 'login-password' ? 'text-primary' : 'text-muted-foreground'
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
                        className="pl-10 pr-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                        className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label 
                        htmlFor="remember-me" 
                        className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      >
                        Ghi nhớ đăng nhập
                      </Label>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                      onClick={() => toast.info('Tính năng đang được phát triển')}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-primary text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 group" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      <>
                        Đăng nhập
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-sm font-medium">
                      Họ và tên
                    </Label>
                    <div className="relative group">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                        focusedField === 'register-name' ? 'text-primary' : 'text-muted-foreground'
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
                        className="pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                        focusedField === 'register-email' ? 'text-primary' : 'text-muted-foreground'
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
                        className="pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-medium">
                      Mật khẩu
                    </Label>
                    <div className="relative group">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                        focusedField === 'register-password' ? 'text-primary' : 'text-muted-foreground'
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
                        className="pl-10 pr-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={registerPassword} />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-primary text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 group" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo tài khoản...
                      </>
                    ) : (
                      <>
                        Tạo tài khoản
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Terms notice */}
            <p className="text-xs text-center text-muted-foreground pt-2">
              Bằng việc đăng ký, bạn đồng ý với{' '}
              <a href="#" className="text-primary hover:underline">Điều khoản dịch vụ</a>
              {' '}và{' '}
              <a href="#" className="text-primary hover:underline">Chính sách bảo mật</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
