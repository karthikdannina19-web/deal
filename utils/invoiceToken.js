import jwt from 'jsonwebtoken';

const INVOICE_ISSUER = 'rhock-api';
const INVOICE_AUDIENCE = 'vendor-subscription-invoice';

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for invoice downloads');
  }
  return process.env.JWT_SECRET;
}

export function generateInvoiceToken({ userId, subscriptionId }) {
  return jwt.sign(
    {
      purpose: 'vendor_subscription_invoice',
      userId: String(userId),
      subscriptionId: String(subscriptionId),
    },
    getSecret(),
    {
      expiresIn: '10m',
      issuer: INVOICE_ISSUER,
      audience: INVOICE_AUDIENCE,
    }
  );
}

export function verifyInvoiceToken(token) {
  const payload = jwt.verify(token, getSecret(), {
    issuer: INVOICE_ISSUER,
    audience: INVOICE_AUDIENCE,
  });

  if (payload.purpose !== 'vendor_subscription_invoice') {
    throw new Error('Invalid invoice token purpose');
  }

  return payload;
}
