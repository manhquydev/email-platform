import axios from 'axios';

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export async function verifyRecaptcha(token: string, remoteIp?: string): Promise<boolean> {
  if (!RECAPTCHA_SECRET_KEY) {
    // If no secret key configured, skip verification (for development)
    return true;
  }

  try {
    const response = await axios.post(RECAPTCHA_VERIFY_URL, null, {
      params: {
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
        remoteip: remoteIp
      }
    });

    const data = response.data;

    return data.success === true && (data.score === undefined || data.score > 0.5);
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}