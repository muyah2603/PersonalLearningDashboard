import API from './api';

// ── Register ─────────────────────────────────────────────
export const register = (
  data,
  config = {}
) =>
  API.post(
    '/auth/register',
    data,
    config
  );

// ── Login ────────────────────────────────────────────────
export const login = (
  data,
  config = {}
) =>
  API.post(
    '/auth/login',
    data,
    config
  );

// ── Google Login ─────────────────────────────────────────
export const loginWithGoogle = (
  credential,
  config = {}
) =>
  API.post(
    '/auth/google/login',
    { credential },
    config
  );

// ── Get Profile ──────────────────────────────────────────
export const getProfile = (
  config = {}
) =>
  API.get(
    '/auth/profile',
    config
  );

// ── Change Password ──────────────────────────────────────
export const changePassword = (
  data,
  config = {}
) =>
  API.put(
    '/auth/change-password',
    data,
    config
  );

// ── Forgot Password ──────────────────────────────────────
export const forgotPassword = (
  data,
  config = {}
) =>
  API.post(
    '/auth/forgot-password',
    data,
    config
  );

// ── Upload Avatar ────────────────────────────────────────
export const uploadAvatar = (
  formData,
  config = {}
) =>
  API.post(
    '/auth/upload-avatar',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    }
  );