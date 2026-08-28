export type ReferenceCalculatorId =
  | "reference.discount"
  | "reference.business-margin"
  | "reference.synthetic-rule";

export type ReferenceCalculatorSlug =
  | "discount"
  | "business-margin"
  | "synthetic-rule-reference";

export type ReferenceCalculationClassification = "exact/deterministic" | "rule-based";

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

export interface ReferenceCatalogEntry {
  readonly id: ReferenceCalculatorId;
  readonly slug: ReferenceCalculatorSlug;
  readonly classification: ReferenceCalculationClassification;
  readonly relatedCalculatorIds: readonly ReferenceCalculatorId[];
  readonly syntheticWarning: boolean;
  readonly copy: Readonly<{
    id: ReferenceCalculatorLocaleCopy;
    en: ReferenceCalculatorLocaleCopy;
  }>;
}

export const referenceCatalog: readonly ReferenceCatalogEntry[] = [
  {
    id: "reference.discount",
    slug: "discount",
    classification: "exact/deterministic",
    relatedCalculatorIds: ["reference.business-margin", "reference.synthetic-rule"],
    syntheticWarning: false,
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
          remainingAmountAfterDiscount: "Sisa setelah diskon"
        },
        ui: {
          calculate: "Hitung diskon",
          addDiscount: "Tambah diskon",
          removeDiscount: "Hapus diskon",
          stepLabel: "Diskon ke",
          sequentialHint: "Diskon bertingkat diterapkan satu per satu, bukan dijumlahkan."
        }
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
          remainingAmountAfterDiscount: "Remaining after discount"
        },
        ui: {
          calculate: "Calculate discount",
          addDiscount: "Add discount",
          removeDiscount: "Remove discount",
          stepLabel: "Discount",
          sequentialHint: "Stacked discounts are applied one at a time, not added together."
        }
      }
    }
  },
  {
    id: "reference.business-margin",
    slug: "business-margin",
    classification: "exact/deterministic",
    relatedCalculatorIds: ["reference.discount", "reference.synthetic-rule"],
    syntheticWarning: false,
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
          variableSellingCostPerOrder: "Biaya variabel per pesanan"
        },
        results: {
          grossProfit: "Laba kotor",
          grossMarginPercent: "Margin kotor",
          contributionProfit: "Laba kontribusi",
          contributionMarginPercent: "Margin kontribusi",
          contributionProfitImpact: "Dampak pada laba kontribusi"
        },
        ui: {
          calculate: "Hitung margin",
          contextualHint: "Opsional. Tambahkan biaya variabel untuk melihat margin kontribusi.",
          recommendationTitle: "Simulasi referensi",
          runScenario: "Lihat skenario",
          baseline: "Kondisi awal",
          scenario: "Skenario",
          impact: "Dampak",
          demoNote: "Ambang 10% pada simulasi ini hanya fixture kontrak, bukan panduan bisnis."
        }
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
          variableSellingCostPerOrder: "Variable selling cost per order"
        },
        results: {
          grossProfit: "Gross profit",
          grossMarginPercent: "Gross margin",
          contributionProfit: "Contribution profit",
          contributionMarginPercent: "Contribution margin",
          contributionProfitImpact: "Contribution profit impact"
        },
        ui: {
          calculate: "Calculate margin",
          contextualHint: "Optional. Add variable cost to reveal contribution margin.",
          recommendationTitle: "Reference simulation",
          runScenario: "View scenario",
          baseline: "Baseline",
          scenario: "Scenario",
          impact: "Impact",
          demoNote: "The 10% threshold in this simulation is a contract fixture, not business guidance."
        }
      }
    }
  },
  {
    id: "reference.synthetic-rule",
    slug: "synthetic-rule-reference",
    classification: "rule-based",
    relatedCalculatorIds: ["reference.discount", "reference.business-margin"],
    syntheticWarning: true,
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
          sourceId: "Sumber fixture"
        },
        ui: {
          calculate: "Hitung referensi",
          provenanceTitle: "Jejak aturan",
          warning: "Data 2025/2026 di halaman ini adalah fixture sintetis untuk pengujian. Bukan panduan pajak, finansial, hukum, marketplace, kesehatan, payroll, atau agama."
        }
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
          sourceId: "Fixture source"
        },
        ui: {
          calculate: "Calculate reference",
          provenanceTitle: "Rule provenance",
          warning: "The 2025/2026 data on this page is synthetic test fixture data. It is not tax, financial, legal, marketplace, health, payroll, or religious guidance."
        }
      }
    }
  }
];

export const getReferenceCalculatorBySlug = (slug: string): ReferenceCatalogEntry | undefined =>
  referenceCatalog.find((entry) => entry.slug === slug);

export const getReferenceCalculatorById = (id: string): ReferenceCatalogEntry | undefined =>
  referenceCatalog.find((entry) => entry.id === id);
