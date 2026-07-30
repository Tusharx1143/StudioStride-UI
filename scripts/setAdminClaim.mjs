/**
 * Sets the `admin: true` custom claim on a Firebase Auth user.
 *
 * ── Setup ──
 * 1. Firebase Console → Project settings → Service accounts
 *    → "Generate new private key" → download the JSON.
 * 2. Run:
 *      GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json" node scripts/setAdminClaim.mjs
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = "stride-stories-143";

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/setAdminClaim.mjs shubhamtaral007@gmail.com Stride@143");
  process.exit(1);
}

try {
  const user = await getAuth().createUser({ email, password });
  await getAuth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`✓ Created user: ${email}`);
  console.log(`✓ admin claim set (UID: ${user.uid})`);
} catch (err) {
  if (/** @type {import('firebase-admin/auth').FirebaseAuthError} */ (err).code === "auth/email-already-exists") {
    // User exists — just set the claim
    const user = await getAuth().getUserByEmail(email);
    await getAuth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✓ User ${email} already existed — admin claim set`);
  } else {
    throw err;
  }
}
