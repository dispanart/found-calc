export interface Decimal {
  readonly units: bigint;
  readonly scale: number;
}

export type DecimalParseResult =
  | { readonly ok: true; readonly value: Decimal }
  | { readonly ok: false; readonly code: "malformed-number" | "scale-exceeded" };

const CANONICAL_DECIMAL = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?$/;

const assertScale = (scale: number): void => {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new Error("decimal scale must be a non-negative integer");
  }
};

const powerOfTen = (scale: number): bigint => {
  assertScale(scale);
  return 10n ** BigInt(scale);
};

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

const divideAndRoundHalfUp = (numerator: bigint, denominator: bigint): bigint => {
  if (denominator === 0n) {
    throw new Error("division by zero");
  }

  const negative = (numerator < 0n) !== (denominator < 0n);
  const absoluteNumerator = absBigInt(numerator);
  const absoluteDenominator = absBigInt(denominator);
  let quotient = absoluteNumerator / absoluteDenominator;
  const remainder = absoluteNumerator % absoluteDenominator;

  if (remainder * 2n >= absoluteDenominator) {
    quotient += 1n;
  }

  return negative ? -quotient : quotient;
};

const alignToScale = (value: Decimal, targetScale: number): bigint => {
  assertScale(value.scale);
  assertScale(targetScale);
  if (targetScale < value.scale) {
    throw new Error("target scale cannot be smaller when aligning decimals");
  }
  return value.units * powerOfTen(targetScale - value.scale);
};

export const decimalFromUnits = (units: bigint, scale: number): Decimal => {
  assertScale(scale);
  return { units, scale };
};

export const parseDecimal = (value: string, scale: number): DecimalParseResult => {
  assertScale(scale);
  const match = CANONICAL_DECIMAL.exec(value);
  if (!match) {
    return { ok: false, code: "malformed-number" };
  }

  const sign = match[1] ?? "";
  const integerPart = match[2]!;
  const fractionalPart = match[3] ?? "";
  if (fractionalPart.length > scale) {
    return { ok: false, code: "scale-exceeded" };
  }

  const paddedFraction = fractionalPart.padEnd(scale, "0");
  const absoluteUnits = BigInt(integerPart) * powerOfTen(scale) + BigInt(paddedFraction || "0");
  const units = sign === "-" ? -absoluteUnits : absoluteUnits;

  return { ok: true, value: { units, scale } };
};

export const formatDecimal = (value: Decimal): string => {
  assertScale(value.scale);
  const negative = value.units < 0n;
  const absoluteUnits = absBigInt(value.units);
  const factor = powerOfTen(value.scale);
  const integerPart = absoluteUnits / factor;

  if (value.scale === 0) {
    return `${negative ? "-" : ""}${integerPart}`;
  }

  const fractionalPart = (absoluteUnits % factor).toString().padStart(value.scale, "0");
  return `${negative ? "-" : ""}${integerPart}.${fractionalPart}`;
};

export const addDecimal = (left: Decimal, right: Decimal): Decimal => {
  const scale = Math.max(left.scale, right.scale);
  return {
    units: alignToScale(left, scale) + alignToScale(right, scale),
    scale,
  };
};

export const subtractDecimal = (left: Decimal, right: Decimal): Decimal => {
  const scale = Math.max(left.scale, right.scale);
  return {
    units: alignToScale(left, scale) - alignToScale(right, scale),
    scale,
  };
};

export const compareDecimal = (left: Decimal, right: Decimal): -1 | 0 | 1 => {
  const scale = Math.max(left.scale, right.scale);
  const leftUnits = alignToScale(left, scale);
  const rightUnits = alignToScale(right, scale);
  return leftUnits < rightUnits ? -1 : leftUnits > rightUnits ? 1 : 0;
};

export const rescaleHalfUp = (value: Decimal, targetScale: number): Decimal => {
  assertScale(value.scale);
  assertScale(targetScale);

  if (targetScale === value.scale) {
    return value;
  }

  if (targetScale > value.scale) {
    return {
      units: value.units * powerOfTen(targetScale - value.scale),
      scale: targetScale,
    };
  }

  return {
    units: divideAndRoundHalfUp(value.units, powerOfTen(value.scale - targetScale)),
    scale: targetScale,
  };
};

export const multiplyDecimal = (left: Decimal, right: Decimal, targetScale: number): Decimal => {
  assertScale(targetScale);
  return rescaleHalfUp(
    {
      units: left.units * right.units,
      scale: left.scale + right.scale,
    },
    targetScale,
  );
};

export const divideDecimal = (numerator: Decimal, denominator: Decimal, targetScale: number): Decimal => {
  assertScale(targetScale);
  if (denominator.units === 0n) {
    throw new Error("division by zero");
  }

  const scaledNumerator = numerator.units * powerOfTen(denominator.scale + targetScale);
  const scaledDenominator = denominator.units * powerOfTen(numerator.scale);
  return {
    units: divideAndRoundHalfUp(scaledNumerator, scaledDenominator),
    scale: targetScale,
  };
};
