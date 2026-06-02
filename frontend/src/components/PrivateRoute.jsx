import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// PrivateRoute: UX-only gate — checks if user is in AuthContext.
// Real authorization is enforced server-side via the `protect` middleware
// (Backend/src/middleware/auth.middleware.js).
// A 401 response from any endpoint triggers the api.js interceptor which
// clears the token and redirects to /login globally.
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Đang tải...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;