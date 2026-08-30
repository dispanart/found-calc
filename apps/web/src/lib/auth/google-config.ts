export type FoundCalcGoogleAuthOptions = {
  readonly clientId: string;
  readonly clientSecret: string;
};

export const googleAuthOptionsFromEnv = (
  clientId: string | undefined,
  clientSecret: string | undefined,
): FoundCalcGoogleAuthOptions | null => {
  const normalizedClientId = clientId?.trim() ?? "";
  const normalizedClientSecret = clientSecret?.trim() ?? "";
  if (!normalizedClientId || !normalizedClientSecret) return null;
  return { clientId: normalizedClientId, clientSecret: normalizedClientSecret };
};

export const trustedOriginFromBaseURL = (baseURL: string | undefined): string | null => {
  if (!baseURL) return null;
  try {
    const url = new URL(baseURL);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
};