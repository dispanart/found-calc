const PUBLIC_WIDGET_KEY_PREFIX = "fcw_";
const VERIFICATION_CHALLENGE_PREFIX = "fcv_";
const RANDOM_BYTES = 24;

const randomBase64Url = () => {
  const bytes = new Uint8Array(RANDOM_BYTES);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const opaquePattern = (prefix: string) => new RegExp(`^${prefix}[A-Za-z0-9_-]{32}$`);
const PUBLIC_WIDGET_KEY_PATTERN = opaquePattern(PUBLIC_WIDGET_KEY_PREFIX);
const VERIFICATION_CHALLENGE_PATTERN = opaquePattern(VERIFICATION_CHALLENGE_PREFIX);

export const generatePublicWidgetKey = (): string =>
  `${PUBLIC_WIDGET_KEY_PREFIX}${randomBase64Url()}`;

export const generateVerificationChallenge = (): string =>
  `${VERIFICATION_CHALLENGE_PREFIX}${randomBase64Url()}`;

export const isPublicWidgetKey = (value: unknown): value is string =>
  typeof value === "string" && PUBLIC_WIDGET_KEY_PATTERN.test(value);

export const isVerificationChallenge = (value: unknown): value is string =>
  typeof value === "string" && VERIFICATION_CHALLENGE_PATTERN.test(value);
