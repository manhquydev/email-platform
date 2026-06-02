import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loading } from '../../components/Loading';
import toast from 'react-hot-toast';
import { tokenManager } from '../../utils/token-manager';

export function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const error = searchParams.get('error');
    // SAML/OIDC now set httpOnly cookies and redirect with ?success=true (no token in URL).
    const success = searchParams.get('success');
    // Back-compat: some provider flows may still pass a short-lived token in the query.
    const legacyToken = searchParams.get('accessToken');

    if (error) {
      toast.error(decodeURIComponent(error) || 'Login failed');
      navigate('/login');
      return;
    }

    (async () => {
      try {
        if (legacyToken) {
          tokenManager.setTokens(legacyToken, '');
        } else if (success) {
          // Exchange the httpOnly refresh cookie for an in-memory access token.
          await tokenManager.refreshAccessToken();
        } else {
          navigate('/login');
          return;
        }
        toast.success('Đăng nhập thành công');
        // Full reload so AuthContext re-initializes the session.
        window.location.href = '/app';
      } catch (err) {
        console.error('SSO Error:', err);
        toast.error('Failed to complete sign-in');
        navigate('/login');
      }
    })();
  }, [searchParams, navigate]);

  return <Loading fullScreen message="Đang xác thực..." />;
}
