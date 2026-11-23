import { useState } from 'react';
import { useAuth } from '../AuthContext';

function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Register form state
  const [regForm, setRegForm] = useState({ email: '', username: '', name: '', password: '', confirm: '' });

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const result = await login(loginForm.username.trim(), loginForm.password);
    setLoading(false);
    if (!result.success) setError(result.message);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm) {
      return setError('Passwords do not match.');
    }
    if (regForm.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    setLoading(true);
    const result = await register({
      email:    regForm.email.trim(),
      username: regForm.username.trim(),
      name:     regForm.name.trim() || regForm.username.trim(),
      password: regForm.password,
    });
    setLoading(false);
    if (!result.success) setError(result.message);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="login-screen">
        {/* Left art panel */}
        <div className="login-art">
          <div className="login-art-bg" />
          <div className="login-art-content">
            <div className="login-brand">
              <div className="login-brand-mark">SC</div>
              <span>SmartCity</span>
            </div>
            <h2 className="sc-login-hero-title">Your City,<br />Connected.</h2>
            <p className="sc-login-hero-sub">
              Access city services, report issues, manage advertisements,
              track transit — all in one place.
            </p>
            <div className="login-features">
              {['🏙️ Explore the city map','📢 City announcements','⚠️ Report issues','🚆 Transit timetables','💼 Marketplace ads'].map(f => (
                <div className="login-feature" key={f}>{f}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right auth panel */}
        <div className="login-panel">
          <div className="login-box">
            {/* Mode toggle */}
            <div className="login-tabs">
              <button
                className={`login-tab${mode === 'login' ? ' login-tab-active' : ''}`}
                onClick={() => { setMode('login'); setError(''); }}
                id="login-tab-btn"
              >
                Sign In
              </button>
              <button
                className={`login-tab${mode === 'register' ? ' login-tab-active' : ''}`}
                onClick={() => { setMode('register'); setError(''); }}
                id="register-tab-btn"
              >
                Register
              </button>
            </div>

            {/* ── Sign In ── */}
            {mode === 'login' && (
              <>
                <div className="login-form-header">
                  <h2>Welcome back</h2>
                  <p>Sign in to your SmartCity account</p>
                </div>
                <form onSubmit={handleLogin} className="login-form" id="login-form">
                  <div className="form-field">
                    <label>Username</label>
                    <input
                      id="login-username"
                      value={loginForm.username}
                      onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="Enter your username"
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Password</label>
                    <input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  {error && <p className="login-error">{error}</p>}
                  <button type="submit" className="login-submit-btn" id="login-submit-btn" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                <div className="login-demo">
                  <p className="login-demo-label">Demo accounts</p>
                  <div className="login-demo-grid">
                    {[
                      { role: 'Admin',    user: 'admin1',    pass: 'admin123'  },
                      { role: 'Merchant', user: 'merchant1', pass: 'merch123'  },
                      { role: 'Citizen',  user: 'user1',     pass: 'user123'   },
                    ].map(d => (
                      <button
                        key={d.user}
                        className="login-demo-btn"
                        onClick={() => setLoginForm({ username: d.user, password: d.pass })}
                        type="button"
                      >
                        <span className="login-demo-role">{d.role}</span>
                        <span className="login-demo-cred">{d.user}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Register ── */}
            {mode === 'register' && (
              <>
                <div className="login-form-header">
                  <h2>Create account</h2>
                  <p>Join the SmartCity portal as a citizen</p>
                </div>
                <form onSubmit={handleRegister} className="login-form" id="register-form">
                  <div className="form-field">
                    <label>Email address</label>
                    <input
                      id="reg-email"
                      type="email"
                      value={regForm.email}
                      onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Username</label>
                    <input
                      id="reg-username"
                      value={regForm.username}
                      onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="Choose a username"
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Full name <span className="form-optional">(optional)</span></label>
                    <input
                      id="reg-name"
                      value={regForm.name}
                      onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </div>
                  <div className="form-field">
                    <label>Password</label>
                    <input
                      id="reg-password"
                      type="password"
                      value={regForm.password}
                      onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Confirm password</label>
                    <input
                      id="reg-confirm"
                      type="password"
                      value={regForm.confirm}
                      onChange={e => setRegForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {error && <p className="login-error">{error}</p>}
                  <button type="submit" className="login-submit-btn" id="register-submit-btn" disabled={loading}>
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
                <p className="login-fine-print">
                  New accounts are registered as <strong>citizens</strong>. Merchants and admins can be assigned by the city admin.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;

const CSS = `
  .login-screen {
    min-height: 100vh;
    display: flex;
    background: #f8fafc;
    font-family: 'Inter', 'Outfit', sans-serif;
  }

  /* ── Left art panel ── */
  .login-art {
    position: relative;
    width: 46%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  @media (max-width: 800px) { .login-art { display: none; } }

  .login-art-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(145deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%);
    z-index: 0;
  }
  .login-art-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 80%, rgba(59,130,246,.25) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(139,92,246,.2) 0%, transparent 55%);
  }

  .login-art-content {
    position: relative;
    z-index: 1;
    color: #fff;
    padding: 60px 52px;
    max-width: 440px;
  }

  .login-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 48px;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -.3px;
  }
  .login-brand-mark {
    width: 40px; height: 40px;
    border-radius: 10px;
    background: rgba(255,255,255,.18);
    border: 1.5px solid rgba(255,255,255,.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.05rem; font-weight: 800;
  }

  .login-art .sc-login-hero-title {
    font-size: 2.8rem;
    font-weight: 800;
    line-height: 1.15;
    margin: 0 0 18px;
    letter-spacing: -.5px;
    color: #ffffff;
  }
  .login-art .sc-login-hero-sub {
    font-size: 1.05rem;
    color: #ffffff;
    line-height: 1.65;
    margin: 0 0 36px;
  }

  .login-features {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .login-feature {
    font-size: .975rem;
    color: rgba(255,255,255,.8);
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 8px;
    padding: 9px 14px;
    transition: background .15s;
  }
  .login-feature:hover { background: rgba(255,255,255,.13); }

  /* ── Right auth panel ── */
  .login-panel {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
  }

  .login-box {
    width: 100%;
    max-width: 420px;
  }

  /* Tabs */
  .login-tabs {
    display: flex;
    background: #f1f5f9;
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 28px;
    gap: 4px;
  }
  .login-tab {
    flex: 1;
    padding: 9px 0;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: all .18s;
  }
  .login-tab-active {
    background: #fff;
    color: #0f172a;
    box-shadow: 0 1px 6px rgba(15,23,42,.1);
  }

  /* Form header */
  .login-form-header { margin-bottom: 24px; }
  .login-form-header h2 {
    font-size: 1.6rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 5px;
    letter-spacing: -.3px;
  }
  .login-form-header p { font-size: .975rem; color: #64748b; margin: 0; }

  /* Form fields */
  .login-form { display: flex; flex-direction: column; gap: 14px; }

  .form-field { display: flex; flex-direction: column; gap: 5px; }
  .form-field label {
    font-size: .9rem;
    font-weight: 600;
    color: #374151;
  }
  .form-optional { font-weight: 400; color: #94a3b8; }

  .form-field input {
    padding: 10px 14px;
    font-size: 1rem;
    font-family: inherit;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    background: #fff;
    color: #0f172a;
  }
  .form-field input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,.12);
  }

  .login-error {
    font-size: .9rem;
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 9px 12px;
    margin: 0;
  }

  .login-submit-btn {
    width: 100%;
    padding: 12px;
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    margin-top: 4px;
    transition: opacity .15s, transform .12s, box-shadow .15s;
    box-shadow: 0 4px 14px rgba(37,99,235,.35);
  }
  .login-submit-btn:hover:not(:disabled) {
    opacity: .92;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(37,99,235,.4);
  }
  .login-submit-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* Demo accounts */
  .login-demo { margin-top: 24px; }
  .login-demo-label {
    font-size: .8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #94a3b8;
    margin-bottom: 10px;
  }
  .login-demo-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
  .login-demo-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 9px 6px;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    background: #fff;
    cursor: pointer;
    transition: border-color .15s, box-shadow .15s;
  }
  .login-demo-btn:hover { border-color: #93c5fd; box-shadow: 0 2px 8px rgba(59,130,246,.1); }
  .login-demo-role { font-size: .8rem; font-weight: 700; color: #1e40af; }
  .login-demo-cred { font-size: .8rem; color: #64748b; font-family: monospace; }

  .login-fine-print {
    font-size: .875rem;
    color: #94a3b8;
    text-align: center;
    margin-top: 16px;
    line-height: 1.5;
  }
  .login-fine-print strong { color: #475569; }
`;
