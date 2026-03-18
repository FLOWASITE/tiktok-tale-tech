import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Zap, Palette, Share2, Bot, AlertCircle, CheckCircle2, Mail, Lock, User } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';
import { lovable } from '@/integrations/lovable/index';
import logoImage from '@/assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';

const emailSchema = z.string().email('Email không hợp lệ');
const passwordSchema = z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự');
const nameSchema = z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự');

const features = [
  { icon: Zap, text: 'Tạo script video chuyên nghiệp' },
  { icon: Palette, text: 'Thiết kế carousel đa nền tảng' },
  { icon: Share2, text: 'Nội dung đa kênh tự động' },
  { icon: Bot, text: 'AI hỗ trợ sáng tạo' },
];

const staggerChild = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function Auth() {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });
  
  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerFullName, setRegisterFullName] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  
  // Error state
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  
  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Google loading
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setLoginError(null);
    setRegisterError(null);
    try {
      const from = (location.state as any)?.from?.pathname;
      const redirectUri = from 
        ? `${window.location.origin}${from}` 
        : window.location.origin;
      
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
        extraParams: {
          prompt: "select_account",
        },
      });
      if (error) {
        const errorMsg = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
        if (activeTab === 'login') setLoginError(errorMsg);
        else setRegisterError(errorMsg);
      }
    } catch {
      const errorMsg = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      if (activeTab === 'login') setLoginError(errorMsg);
      else setRegisterError(errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

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
      nameSchema.parse(registerFullName);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setRegisterError(err.errors[0].message);
        return;
      }
    }

    try {
      emailSchema.parse(registerEmail);
      passwordSchema.parse(registerPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setRegisterError(err.errors[0].message);
        return;
      }
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Mật khẩu nhập lại không khớp.');
      return;
    }

    if (!agreeToTerms) {
      setRegisterError('Bạn cần đồng ý với Điều khoản và Chính sách bảo mật.');
      return;
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
    
    setRegisterSuccess(true);
  };

  const GoogleButton = () => (
    <Button
      type="button"
      variant="outline"
      className="w-full h-12 gap-3 text-sm font-medium border-border/80 hover:bg-muted/60 hover:shadow-md transition-all duration-200"
      onClick={handleGoogleSignIn}
      disabled={googleLoading || isLoading}
    >
      {googleLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      )}
      Tiếp tục với Google
    </Button>
  );

  const Divider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/60" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-3 text-muted-foreground/70 font-medium tracking-wider">hoặc</span>
      </div>
    </div>
  );

  const InputWithIcon = ({ icon: Icon, ...props }: { icon: React.ElementType } & React.ComponentProps<typeof Input>) => (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
      <Input {...props} className={`pl-10 h-11 ${props.className || ''}`} />
    </div>
  );

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
      {/* Gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[300px] -left-[200px] w-[700px] h-[700px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute -bottom-[200px] -right-[200px] w-[600px] h-[600px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, hsl(var(--secondary) / 0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(280 70% 50% / 0.1) 0%, transparent 60%)', filter: 'blur(60px)' }} />
      </div>

      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative items-center justify-center p-12">
        {/* Decorative gradient blob */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--secondary) / 0.06) 0%, transparent 70%)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative max-w-md space-y-10"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Flowa Logo" className="w-14 h-14 object-contain" />
            <div>
              <span className="text-3xl font-extrabold text-primary tracking-tight">Flowa</span>
              <div className="text-xs text-muted-foreground tracking-widest uppercase font-medium">Content Platform</div>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold text-foreground leading-[1.15]">
              One Flow.{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                All Content.
              </span>
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Nền tảng AI tạo nội dung đa kênh thông minh, giúp bạn tiết kiệm thời gian và nâng cao hiệu quả sáng tạo.
            </p>
          </div>

          {/* Features with icon circles */}
          <div className="space-y-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.text}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={staggerChild}
                className="flex items-center gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12">
        {/* Mobile branding */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden mb-6 text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2.5">
            <img src={logoImage} alt="Flowa Logo" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-extrabold text-primary tracking-tight">Flowa</span>
          </div>
          <p className="text-sm text-muted-foreground">Nền tảng AI tạo nội dung đa kênh</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-[440px]"
        >
          <div className="rounded-2xl bg-card border border-border/50 shadow-xl shadow-primary/[0.03] p-7 sm:p-8">
            {/* Header */}
            <div className="text-center pb-5">
              <h2 className="text-xl font-bold text-foreground">
                {activeTab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'login' ? 'Đăng nhập để tiếp tục sáng tạo' : 'Bắt đầu hành trình sáng tạo nội dung'}
              </p>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'login' | 'register'); setRegisterSuccess(false); setLoginError(null); setRegisterError(null); }}>
              <TabsList className="grid w-full grid-cols-2 mb-5 h-11">
                <TabsTrigger value="login" className="text-sm font-medium">Đăng nhập</TabsTrigger>
                <TabsTrigger value="register" className="text-sm font-medium">Đăng ký</TabsTrigger>
              </TabsList>
              
              <AnimatePresence mode="wait">
                <TabsContent value="login" className="space-y-4 mt-0" key="login">
                  <GoogleButton />
                  <Divider />

                  <form onSubmit={handleLogin} className="space-y-4">
                    {loginError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                      >
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-destructive">{loginError}</p>
                      </motion.div>
                    )}
                    
                    <motion.div custom={0} initial="hidden" animate="visible" variants={staggerChild} className="space-y-1.5">
                      <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                      <InputWithIcon
                        icon={Mail}
                        id="login-email"
                        type="email"
                        placeholder="email@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </motion.div>
                    
                    <motion.div custom={1} initial="hidden" animate="visible" variants={staggerChild} className="space-y-1.5">
                      <Label htmlFor="login-password" className="text-sm font-medium">Mật khẩu</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          className="pl-10 pr-10 h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </motion.div>

                    <motion.div custom={2} initial="hidden" animate="visible" variants={staggerChild} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="remember-me" 
                          checked={rememberMe}
                          onCheckedChange={(checked) => {
                            setRememberMe(checked === true);
                            localStorage.setItem('rememberMe', checked === true ? 'true' : 'false');
                          }}
                        />
                        <Label htmlFor="remember-me" className="text-muted-foreground cursor-pointer font-normal">
                          Ghi nhớ
                        </Label>
                      </div>
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Quên mật khẩu?
                      </button>
                    </motion.div>
                    
                    <ForgotPasswordDialog 
                      open={showForgotPassword} 
                      onOpenChange={setShowForgotPassword} 
                    />

                    <motion.div custom={3} initial="hidden" animate="visible" variants={staggerChild}>
                      <Button
                        type="submit"
                        className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 shadow-lg shadow-primary/20 transition-all duration-200"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang đăng nhập...
                          </>
                        ) : (
                          'Đăng nhập'
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4 mt-0" key="register">
                  {registerSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-4 py-6"
                    >
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Mail className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-foreground">Kiểm tra email của bạn</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Chúng tôi đã gửi email xác nhận đến <span className="font-semibold text-foreground">{registerEmail}</span>. 
                          Vui lòng mở email và nhấn vào liên kết xác nhận để kích hoạt tài khoản.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-2 h-11"
                        onClick={() => {
                          setRegisterSuccess(false);
                          setActiveTab('login');
                          setLoginEmail(registerEmail);
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Đã xác nhận? Đăng nhập
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <GoogleButton />
                      <Divider />

                      <form onSubmit={handleRegister} className="space-y-4">
                        {registerError && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                          >
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-destructive">{registerError}</p>
                          </motion.div>
                        )}
                        
                        {/* Name */}
                        <motion.div custom={0} initial="hidden" animate="visible" variants={staggerChild} className="space-y-1.5">
                          <Label htmlFor="register-name" className="text-sm font-medium">Họ và tên <span className="text-destructive">*</span></Label>
                          <InputWithIcon
                            icon={User}
                            id="register-name"
                            type="text"
                            placeholder="Nguyễn Văn A"
                            value={registerFullName}
                            onChange={(e) => setRegisterFullName(e.target.value)}
                            required
                            disabled={isLoading}
                          />
                        </motion.div>

                        {/* Email */}
                        <motion.div custom={1} initial="hidden" animate="visible" variants={staggerChild} className="space-y-1.5">
                          <Label htmlFor="register-email" className="text-sm font-medium">Email <span className="text-destructive">*</span></Label>
                          <InputWithIcon
                            icon={Mail}
                            id="register-email"
                            type="email"
                            placeholder="email@example.com"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            required
                            disabled={isLoading}
                          />
                        </motion.div>

                        {/* Password group */}
                        <motion.div custom={2} initial="hidden" animate="visible" variants={staggerChild} className="space-y-3 rounded-xl bg-muted/30 border border-border/40 p-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="register-password" className="text-sm font-medium">Mật khẩu <span className="text-destructive">*</span></Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                              <Input
                                id="register-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Ít nhất 6 ký tự"
                                value={registerPassword}
                                onChange={(e) => setRegisterPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="pl-10 pr-10 h-11"
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

                          <div className="space-y-1.5">
                            <Label htmlFor="register-confirm-password" className="text-sm font-medium">Nhập lại mật khẩu <span className="text-destructive">*</span></Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                              <Input
                                id="register-confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Nhập lại mật khẩu"
                                value={registerConfirmPassword}
                                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="pl-10 pr-10 h-11"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            {registerConfirmPassword && registerPassword !== registerConfirmPassword && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Mật khẩu không khớp
                              </p>
                            )}
                          </div>
                        </motion.div>

                        {/* Terms */}
                        <motion.div custom={3} initial="hidden" animate="visible" variants={staggerChild} className="flex items-start gap-2.5 rounded-xl bg-muted/20 border border-border/30 p-3.5">
                          <Checkbox
                            id="agree-terms"
                            checked={agreeToTerms}
                            onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                            className="mt-0.5"
                          />
                          <Label htmlFor="agree-terms" className="text-sm text-muted-foreground cursor-pointer leading-snug font-normal">
                            Tôi đồng ý với{' '}
                            <a href="https://flowa.one/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Điều khoản dịch vụ</a>
                            {' '}và{' '}
                            <a href="https://flowa.one/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Chính sách bảo mật</a>
                          </Label>
                        </motion.div>

                        <motion.div custom={4} initial="hidden" animate="visible" variants={staggerChild}>
                          <Button
                            type="submit"
                            className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 shadow-lg shadow-primary/20 transition-all duration-200"
                            disabled={isLoading || !agreeToTerms}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang tạo tài khoản...
                              </>
                            ) : (
                              'Tạo tài khoản'
                            )}
                          </Button>
                        </motion.div>
                      </form>
                    </>
                  )}
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            © 2026 Flowa. Nền tảng AI tạo nội dung đa kênh.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
