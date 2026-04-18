import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../../services/auth.service';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const { data } = await forgotPassword({ email });
      setSuccessMsg(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clean-login-page">
      <div className="clean-brand">Learning</div>

      <div className="clean-login-container">
        <Link to="/login" className="forgot-back">
          <ArrowLeft size={18} />
          <span>Back to Login</span>
        </Link>

        {successMsg ? (
          <div className="forgot-success-page">
            <div className="forgot-success-icon"><CheckCircle size={52} /></div>
            <h1 className="clean-title" style={{ fontSize: '28px', marginBottom: '12px' }}>Email Sent!</h1>
            <p className="forgot-desc">{successMsg}</p>
            <p className="forgot-sub-desc">Please check your inbox and use the new password to log in.</p>
            <Link to="/login" className="btn-enter" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="forgot-page-icon"><Mail size={36} color="#0059BB" /></div>
            <h1 className="clean-title" style={{ fontSize: '32px', marginBottom: '12px' }}>Forgot Password?</h1>
            <p className="forgot-desc">No worries! Enter your email address below and we'll send you a new password.</p>

            <form className="clean-form" onSubmit={handleSubmit}>
              {error && <div className="login-error">{error}</div>}

              <div className="clean-form-group">
                <div className="clean-labels">
                  <label htmlFor="forgot-email" className="clean-label">Email Address</label>
                </div>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="name@gmail.com"
                  className="clean-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn-enter" disabled={loading}>
                {loading ? <><Loader2 size={18} className="spin" /> Sending...</> : 'Send New Password'}
              </button>

              <div className="clean-signup">
                Remember your password? <Link to="/login" className="clean-link">Login</Link>
              </div>
            </form>
          </>
        )}

        <div className="clean-footer">
          <Link to="#">Privacy Policy</Link>
          <Link to="#">Terms of Service</Link>
          <Link to="#">Help Center</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
