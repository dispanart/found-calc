export type ReferenceCalculatorId =
  | "reference.discount"
  | "reference.business-margin"
  | "reference.synthetic-rule";

export type ReferenceCalculatorSlug =
  | "discount"
  | "business-margin"
  | "synthetic-rule-reference";

export type QuickCalculatorId =
  | "quick.percentage"
  | "quick.date-difference"
  | "quick.length-conversion";

export type QuickCalculatorSlug =
  | "percentage"
  | "date-difference"
  | "length-conversion";

export type CalculatorId = ReferenceCalculatorId | QuickCalculatorId;
export type CalculatorSlug = ReferenceCalculatorSlug | QuickCalculatorSlug;
export type ReferenceCalculationClassification = "exact/deterministic" | "rule-based";
export type CalculatorPhase = "03" | "08A";
export type CalculatorCategory = "quick" | "business" | "reference";

export interface ReferenceCalculatorLocaleCopy {
  readonly title: string;
  readonly description: string;
  readonly categoryLabel: string;
  readonly trustTitle: string;
  readonly trustBody: string;
  readonly fields: Readonly<Record<string, string>>;
  readonly results: Readonly<Record<string, string>>;
  readonly ui: Readonly<Record<string, string>>;
}

export interface CalculatorCatalogEntry {
  readonly id: CalculatorId;
  readonly slug: CalculatorSlug;
  readonly classification: ReferenceCalculationClassification;
  readonly relatedCalculatorIds: readonly CalculatorId[];
  readonly syntheticWarning: boolean;
  readonly phase: CalculatorPhase;
  readonly category: CalculatorCategory;
  readonly widgetSafe: boolean;
  readonly copy: Readonly<{
    id: ReferenceCalculatorLocaleCopy;
    en: ReferenceCalculatorLocaleCopy;
  }>;
}

export interface ReferenceCatalogEntry extends CalculatorCatalogEntry {
  readonly id: ReferenceCalculatorId;
  readonly slug: ReferenceCalculatorSlug;
  readonly relatedCalculatorIds: readonly ReferenceCalculatorId[];
  readonly phase: "03";
}

export const referenceCatalog: readonly ReferenceCatalogEntry[] = [
  {
    id: "reference.discount",
    slug: "discount",
    classification: "exact/deterministic",
    relatedCalculatorIds: ["reference.business-margin", "reference.synthetic-rule"],
    syntheticWarning: false,
    phase: "03",
    category: "quick",
    widgetSafe: true,
    copy: {
      id: {
        title: "Kalkulator Diskon Bertingkat",
        description: "Hitung harga akhir setelah satu atau beberapa diskon berurutan, lengkap dengan total hemat dan diskon efektif.",
        categoryLabel: "Belanja dan harga",
        trustTitle: "Perhitungan deterministik",
        trustBody: "Hasil dihitung langsung dari urutan diskon yang Anda masukkan.",
        fields: { baseAmount: "Harga awal", discountPercentages: "Diskon" },
        results: {
          finalAmount: "Harga akhir",
          absoluteSaving: "Total hemat",
          effectiveDiscountPercent: "Diskon efektif",
          remainingAmountAfterDiscount: "Sisa setelah diskon",
        },
        ui: {
          calculate: "Hitung diskon",
          addDiscount: "Tambah diskon",
          removeDiscount: "Hapus diskon",
          stepLabel: "Diskon ke",
          sequentialHint: "Diskon bertingkat diterapkan satu per satu, bukan dijumlahkan.",
        },
      },
      en: {
        title: "Stacked Discount Calculator",
        description: "Calculate the final price after one or more sequential discounts, including total savings and effective discount.",
        categoryLabel: "Shopping and pricing",
        trustTitle: "Deterministic calculation",
        trustBody: "The result is calculated directly from the discount order you provide.",
        fields: { baseAmount: "Starting price", discountPercentages: "Discount" },
        results: {
          finalAmount: "Final price",
          absoluteSaving: "Total savings",
          effectiveDiscountPercent: "Effective discount",
          remainingAmountAfterDiscount: "Remaining after discount",
        },
        ui: {
          calculate: "Calculate discount",
          addDiscount: "Add discount",
          removeDiscount: "Remove discount",
          stepLabel: "Discount",
          sequentialHint: "Stacked discounts are applied one at a time, not added together.",
        },
      },
    },
  },
  {
    id: "reference.business-margin",
    slug: "business-margin",
    classification: "exact/deterministic",
    relatedCalculatorIds: ["reference.discount", "reference.synthetic-rule"],
    syntheticWarning: false,
    phase: "03",
    category: "business",
    widgetSafe: true,
    copy: {
      id: {
        title: "Kalkulator Margin Bisnis",
        description: "Lihat laba kotor lebih dulu, lalu tambahkan biaya variabel untuk memahami margin kontribusi dan skenario perubahan.",
        categoryLabel: "Bisnis",
        trustTitle: "Hasil bertahap, rumus tetap",
        trustBody: "Metrik tambahan memperkaya hasil tanpa mengubah perhitungan dasar yang sudah valid.",
        fields: {
          sellingPrice: "Harga jual",
          productCost: "Biaya produk",
          variableSellingCostPerOrder: "Biaya variabel per pesanan",
        },
        results: {
          grossProfit: "Laba kotor",
          grossMarginPercent: "Margin kotor",
          contributionProfit: "Laba kontribusi",
          contributionMarginPercent: "Margin kontribusi",
          contributionProfitImpact: "Dampak pada laba kontribusi",
        },
        ui: {
          calculate: "Hitung margin",
          contextualHint: "Opsional. Tambahkan biaya variabel untuk melihat margin kontribusi.",
          recommendationTitle: "Simulasi referensi",
          runScenario: "Lihat skenario",
          baseline: "Kondisi awal",
          scenario: "Skenario",
          impact: "Dampak",
          demoNote: "Ambang 10% pada simulasi ini hanya fixture kontrak, bukan panduan bisnis.",
        },
      },
      en: {
        title: "Business Margin Calculator",
        description: "See gross profit first, then add variable selling cost to understand contribution margin and a reproducible scenario.",
        categoryLabel: "Business",
        trustTitle: "Progressive result, stable formula",
        trustBody: "Additional context enriches the result without invalidating the earlier gross calculation.",
        fields: {
          sellingPrice: "Selling price",
          productCost: "Product cost",
          variableSellingCostPerOrder: "Variable selling cost per order",
        },
        results: {
          grossProfit: "Gross profit",
          grossMarginPercent: "Gross margin",
          contributionProfit: "Contribution profit",
          contributionMarginPercent: "Contribution margin",
          contributionProfitImpact: "Contribution profit impact",
        },
        ui: {
          calculate: "Calculate margin",
          contextualHint: "Optional. Add variable cost to reveal contribution margin.",
          recommendationTitle: "Reference simulation",
          runScenario: "View scenario",
          baseline: "Baseline",
          scenario: "Scenario",
          impact: "Impact",
          demoNote: "The 10% threshold in this simulation is a contract fixture, not business guidance.",
        },
      },
    },
  },
  {
    id: "reference.synthetic-rule",
    slug: "synthetic-rule-reference",
    classification: "rule-based",
    relatedCalculatorIds: ["reference.discount", "reference.business-margin"],
    syntheticWarning: true,
    phase: "03",
    category: "reference",
    widgetSafe: true,
    copy: {
      id: {
        title: "Referensi Aturan Versi",
        description: "Uji bagaimana tanggal efektif memilih versi aturan sintetis yang dapat ditelusuri sebelum engine menghitung hasil.",
        categoryLabel: "Referensi sistem",
        trustTitle: "Perhitungan berbasis aturan versi",
        trustBody: "Versi aturan diselesaikan lebih dulu, lalu dependency yang terpilih dikirim ke engine secara eksplisit.",
        fields: { baseAmount: "Nilai dasar", effectiveDate: "Tanggal efektif" },
        results: {
          calculatedAmount: "Nilai hasil",
          versionId: "Versi aturan",
          effectivePeriod: "Periode efektif",
          sourceId: "Sumber fixture",
        },
        ui: {
          calculate: "Hitung referensi",
          provenanceTitle: "Jejak aturan",
          warning: "Data 2025/2026 di halaman ini adalah fixture sintetis untuk pengujian. Bukan panduan pajak, finansial, hukum, marketplace, kesehatan, payroll, atau agama.",
        },
      },
      en: {
        title: "Versioned Rule Reference",
        description: "Test how an effective date selects a traceable synthetic rule version before the engine calculates the result.",
        categoryLabel: "System reference",
        trustTitle: "Versioned rule-based calculation",
        trustBody: "The rule version is resolved first, then the selected dependency is supplied explicitly to the engine.",
        fields: { baseAmount: "Base amount", effectiveDate: "Effective date" },
        results: {
          calculatedAmount: "Calculated amount",
          versionId: "Rule version",
          effectivePeriod: "Effective period",
          sourceId: "Fixture source",
        },
        ui: {
          calculate: "Calculate reference",
          provenanceTitle: "Rule provenance",
          warning: "The 2025/2026 data on this page is synthetic test fixture data. It is not tax, financial, legal, marketplace, health, payroll, or religious guidance.",
        },
      },
    },
  },
];

const percentageEntry: CalculatorCatalogEntry = {
  id: "quick.percentage",
  slug: "percentage",
  classification: "exact/deterministic",
  relatedCalculatorIds: ["reference.discount", "quick.length-conversion"],
  syntheticWarning: false,
  phase: "08A",
  category: "quick",
  widgetSafe: true,
  copy: {
    id: {
      title: "Kalkulator Persentase",
      description: "Cari nilai X% dari Y, lalu lihat nilai Y jika persentase yang sama ditambahkan atau dikurangkan.",
      categoryLabel: "Hitung cepat",
      trustTitle: "Satu rumus persentase yang jelas",
      trustBody: "Nilai dasar dikalikan persentase lalu dibagi 100. Hasil tambah dan kurang memakai nilai persentase yang sama.",
      fields: { percentage: "Persentase", baseValue: "Nilai dasar" },
      results: {
        percentageAmount: "Nilai persentase",
        increasedValue: "Setelah ditambah",
        decreasedValue: "Setelah dikurangi",
      },
      ui: {
        calculate: "Hitung persentase",
        sentenceJoiner: "dari",
        resultLead: "Hasil X% dari Y",
      },
    },
    en: {
      title: "Percentage Calculator",
      description: "Find X% of Y, then see Y after adding or subtracting that same percentage amount.",
      categoryLabel: "Quick math",
      trustTitle: "One explicit percentage formula",
      trustBody: "The base value is multiplied by the percentage and divided by 100. Add and subtract results reuse that exact percentage amount.",
      fields: { percentage: "Percentage", baseValue: "Base value" },
      results: {
        percentageAmount: "Percentage amount",
        increasedValue: "After adding",
        decreasedValue: "After subtracting",
      },
      ui: {
        calculate: "Calculate percentage",
        sentenceJoiner: "of",
        resultLead: "X% of Y",
      },
    },
  },
};

const dateDifferenceEntry: CalculatorCatalogEntry = {
  id: "quick.date-difference",
  slug: "date-difference",
  classification: "exact/deterministic",
  relatedCalculatorIds: ["quick.percentage", "quick.length-conversion"],
  syntheticWarning: false,
  phase: "08A",
  category: "quick",
  widgetSafe: true,
  copy: {
    id: {
      title: "Selisih Tanggal",
      description: "Hitung jarak hari kalender antara dua tanggal tanpa pengaruh zona waktu atau daylight saving.",
      categoryLabel: "Hitung cepat",
      trustTitle: "Jarak kalender, bukan durasi jam",
      trustBody: "Tanggal dihitung sebagai kalender Gregorian dari tengah malam ke tengah malam; zona waktu tidak ikut menentukan hasil.",
      fields: { startDate: "Tanggal mulai", endDate: "Tanggal akhir" },
      results: {
        totalDays: "Total hari",
        wholeWeeks: "Minggu penuh",
        remainingDays: "Sisa hari",
      },
      ui: {
        calculate: "Hitung selisih",
        orderError: "Tanggal akhir harus sama dengan atau setelah tanggal mulai.",
        decomposition: "Rincian minggu + hari",
      },
    },
    en: {
      title: "Date Difference",
      description: "Count calendar days between two dates without timezone or daylight-saving effects.",
      categoryLabel: "Quick math",
      trustTitle: "Calendar distance, not clock duration",
      trustBody: "Dates are compared on the Gregorian calendar from midnight to midnight; timezone offsets never participate in the result.",
      fields: { startDate: "Start date", endDate: "End date" },
      results: {
        totalDays: "Total days",
        wholeWeeks: "Whole weeks",
        remainingDays: "Remaining days",
      },
      ui: {
        calculate: "Calculate difference",
        orderError: "End date must be the same as or later than start date.",
        decomposition: "Weeks + days breakdown",
      },
    },
  },
};

const lengthConversionEntry: CalculatorCatalogEntry = {
  id: "quick.length-conversion",
  slug: "length-conversion",
  classification: "exact/deterministic",
  relatedCalculatorIds: ["quick.percentage", "reference.discount"],
  syntheticWarning: false,
  phase: "08A",
  category: "quick",
  widgetSafe: true,
  copy: {
    id: {
      title: "Konversi Panjang",
      description: "Konversi mm, cm, m, km, inci, kaki, yard, dan mil memakai faktor panjang eksak.",
      categoryLabel: "Hitung cepat",
      trustTitle: "Faktor konversi eksak",
      trustBody: "Semua unit ditautkan melalui nilai nanometer integer, lalu hasil dibulatkan ke delapan desimal dengan aturan engine yang sama.",
      fields: { value: "Nilai", fromUnit: "Dari unit", toUnit: "Ke unit" },
      results: { convertedValue: "Hasil konversi" },
      ui: {
        calculate: "Konversi",
        swap: "Tukar unit",
        exactBasis: "Berbasis faktor panjang eksak",
      },
    },
    en: {
      title: "Length Conversion",
      description: "Convert mm, cm, m, km, inches, feet, yards, and miles using exact length factors.",
      categoryLabel: "Quick math",
      trustTitle: "Exact conversion factors",
      trustBody: "Every unit is anchored to an integer nanometre value, then the engine rounds the output to eight decimal places consistently.",
      fields: { value: "Value", fromUnit: "From unit", toUnit: "To unit" },
      results: { convertedValue: "Converted value" },
      ui: {
        calculate: "Convert",
        swap: "Swap units",
        exactBasis: "Based on exact length factors",
      },
    },
  },
};

export const quickCatalog: readonly CalculatorCatalogEntry[] = [
  percentageEntry,
  referenceCatalog[0]!,
  dateDifferenceEntry,
  lengthConversionEntry,
];

export const calculatorCatalog: readonly CalculatorCatalogEntry[] = [
  ...quickCatalog,
  referenceCatalog[1]!,
  referenceCatalog[2]!,
];

export const getReferenceCalculatorBySlug = (slug: string): ReferenceCatalogEntry | undefined =>
  referenceCatalog.find((entry) => entry.slug === slug);

export const getReferenceCalculatorById = (id: string): ReferenceCatalogEntry | undefined =>
  referenceCatalog.find((entry) => entry.id === id);

export const getCalculatorBySlug = (slug: string): CalculatorCatalogEntry | undefined =>
  calculatorCatalog.find((entry) => entry.slug === slug);

export const getCalculatorById = (id: string): CalculatorCatalogEntry | undefined =>
  calculatorCatalog.find((entry) => entry.id === id);
