import * as crypto from 'crypto';

function getSecret(): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('QR_TOKEN_SECRET must be at least 32 characters');
  }
  return secret;
}

export function generateQrToken(ticketId: string): string {
  const issuedAt = Date.now().toString();
  const payload = `${ticketId}:${issuedAt}`;
  const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifyQrToken(token: string): { ticketId: string; issuedAt: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const lastColonIdx = decoded.lastIndexOf(':');
    if (lastColonIdx === -1) return null;

    const signature = decoded.slice(lastColonIdx + 1);
    const payloadPart = decoded.slice(0, lastColonIdx);

    const [ticketId, issuedAt] = payloadPart.split(':');
    if (!ticketId || !issuedAt) return null;

    const expectedSig = crypto
      .createHmac('sha256', getSecret())
      .update(payloadPart)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    return { ticketId, issuedAt: parseInt(issuedAt) };
  } catch {
    return null;
  }
}
