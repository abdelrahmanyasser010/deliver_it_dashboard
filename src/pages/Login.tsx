import { KeyRound, LoaderCircle, LockKeyhole, TruckIcon, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocale, setLocale } from '../i18n';
import './Login.css';

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const valid = identifier.trim().length >= 3 && password.length >= 6;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitted(true);
    if (!valid || isLoading) return;
    await login({ identifier, password });
  };

  const locale = getLocale();
  const en = locale === 'en';
  const changeLanguage = () => { setLocale(en ? 'ar' : 'en'); window.location.reload(); };

  return <main className="login-page" dir={en ? 'ltr' : 'rtl'}>
    <section className="login-card glass-panel" aria-labelledby="login-title">
      <div className="login-brand"><div className="login-logo"><TruckIcon size={27}/></div><div><strong>Deliver It</strong><span>{en ? 'Company Dashboard' : 'لوحة إدارة الشركة'}</span></div><button type="button" className="outline-btn" onClick={changeLanguage}>{en ? 'العربية' : 'English'}</button></div>
      <header><LockKeyhole size={28}/><div><h1 id="login-title">{en ? 'Sign in' : 'تسجيل الدخول'}</h1><p>{en ? 'Use an authorized staff account for your company.' : 'استخدم حساب الموظف المصرح له داخل شركتك.'}</p></div></header>
      <form onSubmit={submit} noValidate>
        <label><span>{en ? 'Email or phone number' : 'البريد أو رقم الهاتف'}</span><div className="login-input"><UserRound size={17}/><input autoFocus autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="name@company.com / 01..."/></div>{submitted && identifier.trim().length < 3 && <small>{en ? 'Enter your email or phone number.' : 'أدخل البريد أو رقم الهاتف.'}</small>}</label>
        <label><span>{en ? 'Password' : 'كلمة المرور'}</span><div className="login-input"><KeyRound size={17}/><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"/></div>{submitted && password.length < 6 && <small>{en ? 'Enter your password.' : 'أدخل كلمة المرور.'}</small>}</label>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="btn-primary login-submit" disabled={isLoading}>{isLoading ? <><LoaderCircle size={17} className="spin"/> {en ? 'Checking…' : 'جاري التحقق...'}</> : en ? 'Open dashboard' : 'دخول لوحة التحكم'}</button>
      </form>
      <footer>{en ? 'Sessions and permissions are enforced by the server; roles cannot be switched locally.' : 'الجلسة والصلاحيات تُقرأ من الخادم ولا يمكن تبديل الدور محليًا.'}</footer>
    </section>
  </main>;
}
