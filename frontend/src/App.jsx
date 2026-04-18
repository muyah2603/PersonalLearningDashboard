import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login/index.jsx';
import Register from './pages/Register/index.jsx';
import Dashboard from './pages/Dashboard/index.jsx';
import Goals from './pages/Goals/index.jsx';
import Sessions from './pages/Sessions/index.jsx';
import Analytics from './pages/Analytics/index.jsx';
import Profile from './pages/Profile/index.jsx';
import NewSession from './pages/NewSession/index.jsx';
import SessionDetail from './pages/SessionDetail/index.jsx';
import Support from './pages/Support/index.jsx';
import ForgotPassword from './pages/ForgotPassword/index.jsx';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '121799730028-qjh9oqtvqqn3m14q1vlgssefleehpopp.apps.googleusercontent.com';

const App = () => (
  <GoogleOAuthProvider clientId={clientId}>
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/sessions" element={<PrivateRoute><Sessions /></PrivateRoute>} />
        <Route path="/sessions/new" element={<PrivateRoute><NewSession /></PrivateRoute>} />
        <Route path="/sessions/:id" element={<PrivateRoute><SessionDetail /></PrivateRoute>} />
        <Route path="/goals" element={<PrivateRoute><Goals /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/support" element={<PrivateRoute><Support /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
</GoogleOAuthProvider>
);

export default App;
