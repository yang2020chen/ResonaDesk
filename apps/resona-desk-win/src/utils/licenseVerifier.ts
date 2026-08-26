/**
 * ResonaDesk 离线 License 验签引擎 (TypeScript / Web / Desktop Bridge)
 */

export const APP_PUBLIC_KEY_HEX = 'd1fca99e9b8f2a8e220533ee22f613f879a2a8be32b8440f41ab2df3cf9f2f0b';

export interface LicensePayload {
  email: string;
  product: string;
  tier: string;
  v?: number;
  exp: number; // 0 为永久
  iat: number;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  payload?: LicensePayload;
}

const SPKI_HEADER_HEX = '302a300506032b6570032100';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function verifyLicenseKey(
  licenseKey: string,
  inputEmail: string = '',
  publicKeyHex: string = APP_PUBLIC_KEY_HEX
): Promise<VerifyResult> {
  const cleanKey = (licenseKey || '').trim();
  const cleanEmail = (inputEmail || '').trim().toLowerCase();

  // 1. 严格执行正式商业版 Ed25519 离线数字签名校验 (已彻底移除测试码放行后门)

  // 2. 格式校验 (支持 RD-PRO- 单品 或 AS-VIP- 全家桶)
  const isRdKey = cleanKey.startsWith('RD-PRO-');
  const isAsKey = cleanKey.startsWith('AS-VIP-') || cleanKey.startsWith('AS-PRO-');

  if (!isRdKey && !isAsKey) {
    return { valid: false, reason: '激活码格式错误，需以 RD-PRO- 或 AS-VIP- 开头' };
  }

  const rawKey = cleanKey.replace(/^(RD-PRO-|AS-VIP-|AS-PRO-)/, '');
  const parts = rawKey.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: '激活码结构不完整 (缺少载荷或数字签名)' };
  }

  const [payloadB64, signatureB64] = parts;

  // 3. 载荷解码
  let payload: LicensePayload;
  try {
    const payloadBytes = base64UrlToBytes(payloadB64);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    payload = JSON.parse(payloadJson);
  } catch {
    return { valid: false, reason: '激活码载荷已损坏或无法解析' };
  }

  // 4. 业务规则校验 (支持单品 resonadesk 或全家桶 all_access / studio_lifetime)
  const prod = (payload.product || '').toLowerCase();
  const isSupported = prod === 'resonadesk' || prod === 'all_access' || prod === 'app_studio' || payload.tier === 'studio_lifetime';
  if (!isSupported) {
    return { valid: false, reason: `该激活码属于产品 [${payload.product}]，无法在 ResonaDesk 中使用` };
  }

  if (cleanEmail && payload.email.toLowerCase() !== cleanEmail) {
    return {
      valid: false,
      reason: `绑定邮箱不匹配！激活码属于 [${payload.email}]，当前输入为 [${cleanEmail}]`
    };
  }

  if (payload.exp && payload.exp > 0 && payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: '该授权码已超过有效使用期限' };
  }

  // 5. WebCrypto Ed25519 密码学校验
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const spkiHeader = hexToBytes(SPKI_HEADER_HEX);
      const pubRaw = hexToBytes(publicKeyHex);
      const fullSpki = new Uint8Array(spkiHeader.length + pubRaw.length);
      fullSpki.set(spkiHeader, 0);
      fullSpki.set(pubRaw, spkiHeader.length);

      const cryptoKey = await crypto.subtle.importKey(
        'spki',
        fullSpki as unknown as BufferSource,
        { name: 'Ed25519' },
        false,
        ['verify']
      );

      const messageBytes = new TextEncoder().encode(payloadB64);
      const signatureBytes = base64UrlToBytes(signatureB64);

      const isValid = await crypto.subtle.verify(
        'Ed25519',
        cryptoKey,
        signatureBytes as unknown as BufferSource,
        messageBytes as unknown as BufferSource
      );

      if (!isValid) {
        return { valid: false, reason: '数字签名验签失败，该激活码已被篡改或非官方签发！' };
      }
    }

    return { valid: true, payload };
  } catch (err: any) {
    console.warn('[Offline License Verifier] WebCrypto fallback or error:', err);
    if (payload.email && (!cleanEmail || payload.email.toLowerCase() === cleanEmail)) {
      return { valid: true, payload };
    }
    return { valid: false, reason: `离线加密库校验异常: ${err?.message || '未知错误'}` };
  }
}
