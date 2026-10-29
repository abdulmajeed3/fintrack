# ADR 0002: Opaque refresh tokens with SHA-256 hashing and rotation

**Status:** Accepted  
**Date:** 2026-10-28

## Context

Long-lived credentials stored in a database are a high-value attack target. If the database is compromised, raw tokens would give an attacker persistent access to every user's account. Additionally, stolen refresh tokens need to be detectable.

## Decision

1. **Opaque tokens:** Refresh tokens are 32-byte cryptographically random values, not JWTs. They carry no decodable payload.
2. **SHA-256 hashing:** Only the SHA-256 hash of the token is stored in the database. The raw token is returned to the client exactly once and never stored server-side.
3. **Rotation on use:** Every call to `POST /auth/refresh` invalidates the presented token and issues a new one. A token can only be used once.
4. **Revocation on password change:** `POST /users/me/password` deletes all refresh tokens for that user, forcing re-authentication on all devices.
5. **Client storage:** The raw refresh token is stored in `sessionStorage` (cleared when the tab closes). The access token is kept only in memory.

## Consequences

- **Positive:** Database compromise exposes only SHA-256 hashes, which cannot be reversed to the raw token.
- **Positive:** Token reuse (a replayed stolen token) is detectable — the second use will fail because the first use already rotated it.
- **Positive:** Password change immediately invalidates all sessions.
- **Negative:** If a legitimate client and an attacker both hold the same refresh token, the first one to use it wins; the other gets a 401. This is acceptable for a portfolio application but production systems may want a "token family" invalidation strategy.
- **Negative:** `sessionStorage` means users must log in again after closing the browser tab. This is intentional for security.
