export interface Decimal {
  readonly units: bigint;
  readonly scale: number;
}

export type DecimalParseResult =
  | { readonly ok: true; readonly value: Decimal }
  | { readonly ok: false; readonly code: "malformed-number" | "scale-exceeded" };

export const decimalFromUnits = (units: bigint, scale: number): Decimal => ({ units, scale });

export const parseDecimal = (_value: string, _scale: number): DecimalParseResult => ({
  ok: false,
  code: "malformed-number",
});

export const formatDecimal = (_value: Decimal): string => "0";

export const addDecimal = (left: Decimal, _right: Decimal): Decimal => left;

export const subtractDecimal = (left: Decimal, _right: Decimal): Decimal => left;

export const compareDecimal = (_left: Decimal, _right: Decimal): -1 | 0 | 1 => 0;

export const rescaleHalfUp = (value: Decimal, _targetScale: number): Decimal => value;

export const multiplyDecimal = (left: Decimal, _right: Decimal, _targetScale: number): Decimal => left;

export const divideDecimal = (numerator: Decimal, denominator: Decimal, _targetScale: number): Decimal => {
  if (denominator.units === 0n) {
    throw new Error("division by zero");
  }
  return numerator;
};
