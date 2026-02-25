import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loading } from '../../components/Loading';
import toast from 'react-hot-toast';
import { tokenManager } from '../../utils/token-manager';

export function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const error = searchParams.get('error');

    if (error) {
      toast.error(decodeURIComponent(error) || 'Login failed');
      navigate('/login');
      return;
    }

    if (accessToken) {
      try {
        // Store access token via tokenManager (consistent with login flow)
        // CSRF token is set as a shared-domain cookie by the API — no manual handling needed
        tokenManager.setTokens(accessToken, '');
        toast.success('Đăng nhập thành công');

        // Full reload so AuthContext re-initializes with the new token
        window.location.href = '/app';
      } catch (err) {
        console.error('SSO Error:', err);
        toast.error('Failed to save session');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return <Loading fullScreen message="Đang xác thực..." />;
}
