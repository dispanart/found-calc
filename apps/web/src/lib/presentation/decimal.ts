export type PresentationLocale = "id" | "en";

export type LocaleDecimalParseResult =
  | { readonly ok: true; readonly value: string }
  | {
      readonly ok: false;
      readonly code: "empty" | "malformed" | "ambiguous" | "scale-exceeded";
    };

export interface CanonicalFormatOptions {
  readonly style?: "decimal" | "percent";
}

const DIGITS = /^\d+$/;

const normalizeInteger = (value: string): string => {
  const normalized = value.replace(/^0+(?=\d)/, "");
  return normalized.length === 0 ? "0" : normalized;
};

const validGroupedInteger = (value: string, separator: string): boolean => {
  const escaped = separator === "." ? "\\." : separator;
  return new RegExp(`^\\d{1,3}(?:${escaped}\\d{3})+$`).test(value);
};

export function parseLocaleDecimal(
  rawInput: string,
  locale: PresentationLocale,
  scale: number,
): LocaleDecimalParseResult {
  const input = rawInput.trim();
  if (input.length === 0) {
    return { ok: false, code: "empty" };
  }
  if (!Number.isInteger(scale) || scale < 0 || /[eE\s]/.test(input)) {
    return { ok: false, code: "malformed" };
  }

  const negative = input.startsWith("-");
  const unsigned = negative ? input.slice(1) : input;
  if (unsigned.length === 0 || unsigned.startsWith("+") || unsigned.includes("-")) {
    return { ok: false, code: "malformed" };
  }

  const decimalSeparator = locale === "id" ? "," : ".";
  const groupingSeparator = locale === "id" ? "." : ",";
  const decimalCount = unsigned.split(decimalSeparator).length - 1;
  const groupingCount = unsigned.split(groupingSeparator).length - 1;

  if (decimalCount > 1) {
    return { ok: false, code: "malformed" };
  }

  let integerPart = unsigned;
  let fractionPart = "";

  if (decimalCount === 1) {
    const [integerWithGrouping = "", fraction = ""] = unsigned.split(decimalSeparator);
    if (integerWithGrouping.length === 0 || fraction.length === 0 || !DIGITS.test(fraction)) {
      return { ok: false, code: "malformed" };
    }

    if (integerWithGrouping.includes(groupingSeparator)) {
      if (!validGroupedInteger(integerWithGrouping, groupingSeparator)) {
        return { ok: false, code: "malformed" };
      }
      integerPart = integerWithGrouping.split(groupingSeparator).join("");
    } else {
      if (!DIGITS.test(integerWithGrouping)) {
        return { ok: false, code: "malformed" };
      }
      integerPart = integerWithGrouping;
    }
    fractionPart = fraction;
  } else if (groupingCount > 0) {
    if (!validGroupedInteger(unsigned, groupingSeparator)) {
      return { ok: false, code: "malformed" };
    }
    if (groupingCount === 1) {
      return { ok: false, code: "ambiguous" };
    }
    integerPart = unsigned.split(groupingSeparator).join("");
  } else if (!DIGITS.test(unsigned)) {
    return { ok: false, code: "malformed" };
  }

  if (fractionPart.length > scale) {
    const excess = fractionPart.slice(scale);
    if (!/^0*$/.test(excess)) {
      return { ok: false, code: "scale-exceeded" };
    }
    fractionPart = fractionPart.slice(0, scale);
  }

  const normalizedInteger = normalizeInteger(integerPart);
  const normalizedFraction = fractionPart.padEnd(scale, "0");
  const isZero = normalizedInteger === "0" && /^0*$/.test(normalizedFraction);
  const sign = negative && !isZero ? "-" : "";

  return {
    ok: true,
    value: scale === 0 ? `${sign}${normalizedInteger}` : `${sign}${normalizedInteger}.${normalizedFraction}`,
  };
}

export function formatCanonicalDecimal(
  value: string,
  locale: PresentationLocale,
  options: CanonicalFormatOptions = {},
): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) {
    return value;
  }

  const sign = match[1] ?? "";
  const integer = match[2] ?? "";
  const fraction = match[3];
  const groupingSeparator = locale === "id" ? "." : ",";
  const decimalSeparator = locale === "id" ? "," : ".";
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupingSeparator);
  const decimal = fraction === undefined ? "" : `${decimalSeparator}${fraction}`;
  const suffix = options.style === "percent" ? "%" : "";
  return `${sign}${groupedInteger}${decimal}${suffix}`;
}
