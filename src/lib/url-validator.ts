// SSRF protection — block private/reserved IP ranges

const BLOCKED_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^224\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^fd/,
  /^localhost$/i,
];

export function validateUrl(input: string): { valid: boolean; url?: URL; error?: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { valid: false, error: "Only HTTP/HTTPS URLs are allowed" };
  }

  const hostname = url.hostname;

  for (const pattern of BLOCKED_RANGES) {
    if (pattern.test(hostname)) {
      return { valid: false, error: "Private/reserved addresses are not allowed" };
    }
  }

  // Block metadata endpoints
  if (hostname === "metadata.google.internal" || hostname === "169.254.169.254") {
    return { valid: false, error: "Metadata endpoints are not allowed" };
  }

  return { valid: true, url };
}
