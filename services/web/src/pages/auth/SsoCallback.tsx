import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loading } from '../../components/Loading';
import toast from 'react-hot-toast';

export function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      toast.error(decodeURIComponent(error) || 'Login failed');
      navigate('/login');
      return;
    }

    if (accessToken) {
      try {
        // Store token in localStorage
        // The useLocalStorage hook typically expects a JSON stringified value
        window.localStorage.setItem('token', JSON.stringify(accessToken));

        if (refreshToken) {
          window.localStorage.setItem('refreshToken', JSON.stringify(refreshToken));
        }

        toast.success('Đăng nhập thành công');

        // Redirect to app dashboard
        // Using window.location to ensure AuthContext re-initializes with the new token
        window.location.href = '/app';
      } catch (err) {
        console.error('SSO Error:', err);
        toast.error('Failed to save session');
        navigate('/login');
      }
    } else {
      // No token found, redirect to login
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return <Loading fullScreen message="Đang xác thực..." />;
}
