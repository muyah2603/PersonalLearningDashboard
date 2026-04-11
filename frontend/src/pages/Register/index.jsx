import { useState } from 'react';
import { register, loginWithGoogle } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import '../Login/Login.css';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      const { data } = await loginWithGoogle(response.credential);
      loginUser({ _id: data._id, name: data.name, email: data.email }, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký Google thất bại');
    }
  };

  return (
    <div className="clean-login-page">
      <div className="clean-brand">Learning</div>

      <div className="clean-login-container">
        <h1 className="clean-title">Welcome</h1>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <GoogleLogin 
            onSuccess={handleGoogleSuccess} 
            onError={() => setError('Google Registration Failed')}
            text="signup_with"
            type="standard"
            theme="outline"
            size="large"
            shape="rectangular"
            width="320"
          />
        </div>

        <div className="clean-divider">
          <span>OR SIGN UP WITH EMAIL</span>
        </div>

        <form className="clean-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="clean-form-group">
            <div className="clean-labels">
              <label htmlFor="name" className="clean-label">Full Name</label>
            </div>
            <input 
              id="name"
              name="name" 
              type="text" 
              placeholder="John Doe" 
              className="clean-input"
              value={form.name} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="clean-form-group">
            <div className="clean-labels">
              <label htmlFor="email" className="clean-label">Email Address</label>
            </div>
            <input 
              id="email"
              name="email" 
              type="email" 
              placeholder="name@gmail.com" 
              className="clean-input"
              value={form.email} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="clean-form-group">
            <div className="clean-labels">
              <label htmlFor="password" className="clean-label">Password</label>
            </div>
            <div className="password-wrapper">
              <input 
                id="password"
                name="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="clean-input"
                style={{ paddingRight: '48px' }}
                value={form.password} 
                onChange={handleChange} 
                required 
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-enter" style={{ marginTop: '16px' }}>
            CREATE ACCOUNT
          </button>

          <div className="clean-signup">
            Already have an account? <Link to="/login" className="clean-link">Log in</Link>
          </div>
        </form>

        <div className="clean-footer">
          <Link to="#">Privacy Policy</Link>
          <Link to="#">Terms of Service</Link>
          <Link to="#">Help Center</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
