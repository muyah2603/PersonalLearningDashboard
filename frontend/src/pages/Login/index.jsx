import { useState } from 'react';
import { login, loginWithGoogle } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import './Login.css';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
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
      const { data } = await login(form);
      loginUser({ _id: data._id, name: data.name, email: data.email }, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      const { data } = await loginWithGoogle(response.credential);
      loginUser({ _id: data._id, name: data.name, email: data.email }, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập Google thất bại');
    }
  };

  return (
    <div className="clean-login-page">
      <div className="clean-brand">Learning</div>

      <div className="clean-login-container">
        <h1 className="clean-title">Welcome Back</h1>
        
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin 
            onSuccess={handleGoogleSuccess} 
            onError={() => setError('Google Login Failed')}
            text="signin_with"
            type="standard"
            theme="outline"
            size="large"
            shape="rectangular"
            width="320"
          />
        </div>

        <div className="clean-divider">
          <span>OR LOGIN WITH EMAIL</span>
        </div>

        <form className="clean-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
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
              <Link to="/forgot-password" className="clean-link">Forgot Password?</Link>
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

          <div className="clean-checkbox-wrapper">
            <input type="checkbox" id="stay-signed-in" className="clean-checkbox" />
            <label htmlFor="stay-signed-in" className="clean-checkbox-label">Stay signed in</label>
          </div>

          <button type="submit" className="btn-enter">
            ENTER
          </button>

          <div className="clean-signup">
            Don't have an account? <Link to="/register" className="clean-link">Create an account</Link>
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

export default Login;
