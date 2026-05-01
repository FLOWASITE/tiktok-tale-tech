/**
 * Generate ES256 (P-256) keypair for Bluesky OAuth confidential client.
 *
 * Output:
 *  - public/oauth/bluesky/jwks.json  (PUBLIC — commit to repo, served at https://app.flowa.one/oauth/bluesky/jwks.json)
 *  - scripts/.bluesky-private-jwk.json (PRIVATE — paste into Supabase secret BLUESKY_OAUTH_PRIVATE_JWK, then DELETE this file)
 *
 * Run: bun run scripts/generate-bluesky-jwk.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

async function main() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicJwk = await crypto.subtle.exportKey("jwk", publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", privateKey);

  // Stable kid based on public key thumbprint-ish
  const kid = `flowa-bsky-${Date.now()}`;
  publicJwk.kid = kid;
  publicJwk.use = "sig";
  publicJwk.alg = "ES256";
  privateJwk.kid = kid;
  privateJwk.use = "sig";
  privateJwk.alg = "ES256";

  const jwks = { keys: [publicJwk] };

  const pubPath = "public/oauth/bluesky/jwks.json";
  mkdirSync(dirname(pubPath), { recursive: true });
  writeFileSync(pubPath, JSON.stringify(jwks, null, 2));

  const privPath = "scripts/.bluesky-private-jwk.json";
  writeFileSync(privPath, JSON.stringify(privateJwk));

  console.log("✅ Public JWKS written to:", pubPath);
  console.log("🔐 Private JWK written to:", privPath);
  console.log("   kid =", kid);
  console.log("");
  console.log("NEXT STEPS:");
  console.log("1. Copy the FULL CONTENT of", privPath, "(single-line JSON)");
  console.log("2. Paste it as the value of Supabase secret: BLUESKY_OAUTH_PRIVATE_JWK");
  console.log("3. DELETE", privPath, "(it must NEVER be committed)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
