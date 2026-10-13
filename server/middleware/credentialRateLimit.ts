import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export function createCredentialRateLimiter(accountScoped = false) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) =>
      accountScoped && req.user
        ? `user:${req.user.id}`
        : `ip:${ipKeyGenerator(req.ip || req.socket.remoteAddress || '')}`,
    message: {
      message: 'Too many failed authentication attempts. Try again later.',
    },
  });
}

export const authenticationRateLimiter = createCredentialRateLimiter();
export const accountLinkRateLimiter = createCredentialRateLimiter(true);
