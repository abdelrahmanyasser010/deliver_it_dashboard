import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Package,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocale, setLocale } from '../i18n';
import './Login.css';

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [identifier, setIdentifier] = useState('admin@fix365.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const valid = identifier.trim().length >= 3 && password.length >= 6;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || isLoading) return;
    await login({ identifier, password });
  };

  const locale = getLocale();
  const en = locale === 'en';
  const changeLanguage = () => {
    setLocale(en ? 'ar' : 'en');
    window.location.reload();
  };

  const setDemoRole = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
  };

  return (
    <main className="login-root" dir={en ? 'ltr' : 'rtl'}>
      {/* Background Decorative Ambient Glows */}
      <div className="login-ambient-glow glow-top" />
      <div className="login-ambient-glow glow-bottom" />

      <div className="login-container">
        {/* Left Side: Brand Showcase & Features */}
        <section className="login-hero-showcase">
          <div className="showcase-header">
            <div className="brand-badge">
              <div className="brand-icon-box" style={{ background: 'transparent', padding: 0 }}>
                <img src="/trust_logo.png" alt="TRUST Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
              </div>
              <div>
                <strong className="brand-title" style={{ color: '#F97316' }}>TRUST — تراست</strong>
                <span className="brand-subtitle">
                  {en ? 'TRUST Logistic Service' : 'تراست للخدمات اللوجستية والشحن'}
                </span>
              </div>
            </div>
            <span className="version-pill">v2.4 Enterprise</span>
          </div>

          <div className="showcase-content">
            <div className="showcase-tag">
              <Sparkles size={14} />
              <span>{en ? 'Next-Gen Logistics Operating System' : 'الجيل القادم لإدارة العمليات والتوصيل'}</span>
            </div>
            <h1 className="showcase-headline">
              {en ? (
                <>
                  Seamless Shipping, <span>Real-time Control.</span>
                </>
              ) : (
                <>
                  إدارة ذكية للشحنات، <span>وتحكم شامل في الوقت الفعلي.</span>
                </>
              )}
            </h1>
            <p className="showcase-description">
              {en
                ? 'Centralize your delivery operations, driver dispatching, automated merchant settlements, and barcode warehouse intake in one unified platform.'
                : 'تحكم في حركة الشحنات، تكليف المناديب، مسح واستلام المخزن، وتسويات تحصيل التجار والمناديب بدقة محاسبية فورية.'}
            </p>

            {/* Feature Highlight Cards */}
            <div className="showcase-cards-grid">
              <div className="showcase-card">
                <div className="showcase-card-icon icon-cyan">
                  <Zap size={18} />
                </div>
                <div>
                  <strong>{en ? 'Automated Dispatch & Live Tracking' : 'توجيه آلي وتتبع حي'}</strong>
                  <p>{en ? 'Dispatch orders & track drivers live on map.' : 'تكليف سريع للطرود ومتابعة خطوط سير المناديب.'}</p>
                </div>
              </div>

              <div className="showcase-card">
                <div className="showcase-card-icon icon-indigo">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <strong>{en ? 'Financial & Merchant Settlements' : 'تسويات التجار وتحصيل المناديب'}</strong>
                  <p>{en ? 'Reconcile driver collections and merchant payouts instantly.' : 'توريد تحصيل المناديب وصرف مستحقات التجار بضغطة زر.'}</p>
                </div>
              </div>

              <div className="showcase-card">
                <div className="showcase-card-icon icon-emerald">
                  <Package size={18} />
                </div>
                <div>
                  <strong>{en ? 'Smart Barcode Intake' : 'استلام ذكي بالباركود والميزان'}</strong>
                  <p>{en ? 'High-speed parcel scanning with rate adjustments.' : 'مسح فائق السرعة مع احتساب الأوزان والأبعاد.'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="showcase-footer">
            <div className="trust-metric">
              <CheckCircle2 size={16} />
              <span>{en ? '99.9% Uptime Guarantee' : 'جاهزية تشغيلية 99.9%'}</span>
            </div>
            <div className="trust-metric">
              <ShieldCheck size={16} />
              <span>{en ? 'End-to-End Encrypted' : 'تشفير وأمان بيانات كامل'}</span>
            </div>
          </div>
        </section>

        {/* Right Side: Login Form Card */}
        <section className="login-form-wrapper" aria-labelledby="login-heading">
          <div className="login-card-inner">
            {/* Top Toolbar */}
            <div className="card-top-toolbar">
              <div className="status-indicator">
                <span className="pulse-dot" />
                <small>{en ? 'System Operational' : 'النظام متصل بالخادم'}</small>
              </div>

              <button
                type="button"
                className="lang-switcher-btn"
                onClick={changeLanguage}
                title={en ? 'Switch to Arabic' : 'التحويل إلى الإنجليزية'}
              >
                <Globe size={15} />
                <span>{en ? 'العربية' : 'English'}</span>
              </button>
            </div>

            {/* Form Header */}
            <div className="login-form-header">
              <div className="lock-icon-container">
                <LockKeyhole size={24} />
              </div>
              <h2 id="login-heading">{en ? 'Welcome back' : 'تسجيل الدخول'}</h2>
              <p>{en ? 'Enter your authorized credentials to access your dashboard' : 'أدخل بيانات حسابك المصرح له للوصول إلى لوحة التحكم'}</p>
            </div>

            {/* Login Form */}
            <form onSubmit={submit} noValidate className="login-form">
              <div className="form-group">
                <label htmlFor="login-identifier">
                  <span>{en ? 'Email or Phone Number' : 'البريد الإلكتروني أو رقم الهاتف'}</span>
                </label>
                <div className={`input-field-wrapper ${submitted && identifier.trim().length < 3 ? 'has-error' : ''}`}>
                  <span className="input-leading-icon">
                    <UserRound size={18} />
                  </span>
                  <input
                    id="login-identifier"
                    type="text"
                    autoFocus
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={en ? 'name@company.com / 01...' : 'name@company.com / 01...'}
                    dir="ltr"
                  />
                </div>
                {submitted && identifier.trim().length < 3 && (
                  <small className="error-message">
                    {en ? 'Please enter a valid email or phone.' : 'يرجى كتابة البريد الإلكتروني أو رقم الهاتف بشكل صحيح.'}
                  </small>
                )}
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="login-password">
                    <span>{en ? 'Password' : 'كلمة المرور'}</span>
                  </label>
                </div>
                <div className={`input-field-wrapper ${submitted && password.length < 6 ? 'has-error' : ''}`}>
                  <span className="input-leading-icon">
                    <KeyRound size={18} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {submitted && password.length < 6 && (
                  <small className="error-message">
                    {en ? 'Password must be at least 6 characters.' : 'كلمة المرور يجب ألا تقل عن 6 أحرف.'}
                  </small>
                )}
              </div>

              {error && (
                <div className="login-error-banner" role="alert">
                  <LockKeyhole size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoaderCircle size={18} className="spin-animation" />
                    <span>{en ? 'Authenticating…' : 'جارٍ التحقق والمصادقة...'}</span>
                  </>
                ) : (
                  <>
                    <span>{en ? 'Sign in to Dashboard' : 'دخول إلى لوحة التحكم'}</span>
                    {en ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Access Bar */}
            <div className="demo-accounts-box">
              <span className="demo-title">{en ? 'Quick Demo Credentials:' : 'حسابات تجريبية سريعة:'}</span>
              <div className="demo-badges">
                <button
                  type="button"
                  className={`demo-pill ${identifier.includes('admin') ? 'active' : ''}`}
                  onClick={() => setDemoRole('admin@fix365.com', 'password123')}
                >
                  {en ? 'Admin' : 'مدير النظام'}
                </button>
                <button
                  type="button"
                  className={`demo-pill ${identifier.includes('dispatch') ? 'active' : ''}`}
                  onClick={() => setDemoRole('operations@fix365.com', 'password123')}
                >
                  {en ? 'Operations' : 'مشرف العمليات'}
                </button>
                <button
                  type="button"
                  className={`demo-pill ${identifier.includes('account') ? 'active' : ''}`}
                  onClick={() => setDemoRole('finance@fix365.com', 'password123')}
                >
                  {en ? 'Accountant' : 'المحاسب المالي'}
                </button>
              </div>
            </div>

            {/* Card Footer */}
            <div className="login-card-footer">
              <ShieldCheck size={14} />
              <span>
                {en
                  ? 'Protected by SSL / TLS 1.3 enterprise-grade security.'
                  : 'جلسة آمنة ومشفرة بالكامل وفق معايير الحماية المصرفية.'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}




