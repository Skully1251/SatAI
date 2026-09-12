/**
 * requireAuth — verifies the Firebase ID token on protected routes.
 *
 * The Expo app sends `Authorization: Bearer <idToken>`; the ID token is
 * verified against the Firebase project. On success the decoded token is
 * available downstream as `res.locals.auth`.
 *
 * Fail-closed by default: without an initialized firebase-admin, requests
 * get 503 (AUTH_DEV_MODE=1 opts out of verification for local development).
 */
import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth, isAdminReady } from '../config/firebaseAdmin';

declare global {
  namespace Express {
    interface Locals {
      auth?: DecodedIdToken;
    }
  }
}

const AUTH_DEV_MODE = process.env.AUTH_DEV_MODE === '1';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!isAdminReady) {
    if (AUTH_DEV_MODE) {
      console.warn('[auth] DEV MODE — request accepted without token verification');
      next();
      return;
    }
    res.status(503).json({ error: 'Auth not configured on server (service account missing)' });
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized — missing Bearer token' });
    return;
  }

  try {
    res.locals.auth = await getAdminAuth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
};
