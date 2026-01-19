import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export const BiometricAuth = {
  /**
   * Check if biometric authentication is available on the device
   */
  async isAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  },

  /**
   * Get the type of biometric authentication available
   */
  async getBiometricType(): Promise<string> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    }
    return 'Biometric';
  },

  /**
   * Authenticate with biometrics
   */
  async authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Mở khóa Ephemera',
      fallbackLabel: 'Sử dụng mật khẩu',
      cancelLabel: 'Hủy',
      disableDeviceFallback: false,
    });
    return result.success;
  },

  /**
   * Enable biometric authentication by storing token securely
   */
  async enableBiometric(token: string): Promise<void> {
    await SecureStore.setItemAsync('biometric_token', token, {
      requireAuthentication: true,
    });
    await SecureStore.setItemAsync('biometric_enabled', 'true');
  },

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    await SecureStore.deleteItemAsync('biometric_token');
    await SecureStore.deleteItemAsync('biometric_enabled');
  },

  /**
   * Check if biometric is enabled for this app
   */
  async isEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync('biometric_enabled');
    return enabled === 'true';
  },

  /**
   * Get the stored token using biometric authentication
   */
  async getBiometricToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('biometric_token', {
        requireAuthentication: true,
      });
    } catch {
      return null;
    }
  },
};
