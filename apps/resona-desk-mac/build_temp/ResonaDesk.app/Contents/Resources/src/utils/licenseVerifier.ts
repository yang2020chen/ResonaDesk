// Public Key HEX embedded in ResonaDesk client
export const DEFAULT_PUBLIC_KEY_HEX = '18992e59e95454659bba6238b72648fb166d34b5c7774e1eecfb8fae1f760773';

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface LicensePayload {
  email: string;
  product: string;
  tier: string;
  exp: number; // 0 for lifetime
  iat: number;
}

export interface VerifyResult {
  valid: boolean;
  payload?: LicensePayload;
  reason?: string;
}

export async function verifyLicenseKey(licenseKey: string, publicKeyHex = DEFAULT_PUBLIC_KEY_HEX): Promise<VerifyResult> {
  try {
    const key = licenseKey.trim();
    if (!key.startsWith('RD-PRO-') && !key.startsWith('WF-PRO-')) {
      return { valid: false, reason: '激活码格式错误 (需以 RD-PRO- 开头)' };
    }

    const raw = key.replace(/^(RD-PRO-|WF-PRO-)/, '');
    const parts = raw.split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: '激活码结构不完整' };
    }

    const [payloadB64, sigB64] = parts;
    const payloadBytes = base64UrlToBytes(payloadB64);
    const sigBytes = base64UrlToBytes(sigB64);
    const pubKeyBytes = hexToBytes(publicKeyHex);

    // Import public key into WebCrypto
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      pubKeyBytes,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    // Verify signature
    const isValid = await globalThis.crypto.subtle.verify(
      { name: 'Ed25519' },
      cryptoKey,
      sigBytes,
      payloadBytes
    );

    if (!isValid) {
      return { valid: false, reason: '签名无效或已被篡改' };
    }

    // Parse JSON payload
    const payloadText = new TextDecoder().decode(payloadBytes);
    const payload: LicensePayload = JSON.parse(payloadText);

    // Expiry check
    if (payload.exp !== 0 && payload.exp < Date.now() / 1000) {
      return { valid: false, payload, reason: '此授权码已过期' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, reason: `验签失败: ${err.message}` };
  }
}
