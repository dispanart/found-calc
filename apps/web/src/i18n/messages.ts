import type { Locale } from "./locales";

const messages = {
  id: {
    brand: "Found Calc",
    navHome: "Beranda",
    navCalculators: "Kalkulator",
    navWorkspace: "Ruang kerja",
    navAdmin: "Admin",
    localeSwitchLabel: "Ganti bahasa",
    heroEyebrow: "Kalkulator keputusan, bukan sekadar angka.",
    heroTitle: "Hitung keputusan dengan konteks yang jelas.",
    heroDescription:
      "Bandingkan skenario, pahami asumsi, dan lihat aturan yang dipakai sebelum Anda mengambil keputusan.",
    heroPrimary: "Lihat kalkulator",
    discoveryEyebrow: "Tiga referensi, satu pola kepercayaan",
    discoveryTitle: "Mulai dari kalkulator yang dapat ditelusuri.",
    discoveryDescription:
      "Setiap halaman menjaga angka canonical terpisah dari bahasa tampilan dan menunjukkan konteks yang menghasilkan jawaban.",
    discoveryAll: "Lihat semua kalkulator",
    calculatorsTitle: "Kalkulator referensi",
    calculatorsDescription:
      "Tiga alur referensi Phase 03 membuktikan diskon deterministik, margin progresif, dan aturan versi tanpa menyimpan input Anda.",
    calculatorBack: "Semua kalkulator",
    relatedTitle: "Kalkulator terkait",
    trustTitle: "Fondasi yang dapat ditelusuri",
    trustBody:
      "Setiap kalkulator Found Calc dirancang untuk memisahkan rumus, aturan, bahasa, mata uang tampilan, dan yurisdiksi.",
    publicShellLabel: "Fondasi publik",
    workspaceTitle: "Ruang kerja Found Calc",
    workspaceBody:
      "Shell ini mengunci batas rute workspace. Fitur proyek, skenario, dan penyimpanan akan hadir pada fase yang telah disetujui.",
    adminTitle: "Admin Found Calc",
    adminBody:
      "Shell ini mengunci batas rute admin. Operasi katalog dan rule management belum diimplementasikan pada Phase 01.",
    phaseLabel: "Phase 03 · Product UI Runtime & Discovery",
  },
  en: {
    brand: "Found Calc",
    navHome: "Home",
    navCalculators: "Calculators",
    navWorkspace: "Workspace",
    navAdmin: "Admin",
    localeSwitchLabel: "Change language",
    heroEyebrow: "Decision calculators, not just arithmetic.",
    heroTitle: "Make a decision with the context intact.",
    heroDescription:
      "Compare scenarios, understand assumptions, and see which rules are being used before you decide.",
    heroPrimary: "Explore calculators",
    discoveryEyebrow: "Three references, one trust pattern",
    discoveryTitle: "Start with calculators you can trace.",
    discoveryDescription:
      "Each page keeps canonical calculation values separate from display language and shows the context behind the answer.",
    discoveryAll: "View all calculators",
    calculatorsTitle: "Reference calculators",
    calculatorsDescription:
      "Three Phase 03 reference flows prove deterministic discounts, progressive margin, and versioned rules without storing your inputs.",
    calculatorBack: "All calculators",
    relatedTitle: "Related calculators",
    trustTitle: "A traceable foundation",
    trustBody:
      "Every Found Calc calculator is designed to keep formulas, rules, language, display currency, and jurisdiction as separate concerns.",
    publicShellLabel: "Public foundation",
    workspaceTitle: "Found Calc workspace",
    workspaceBody:
      "This shell locks the workspace route boundary. Projects, scenarios, and persistence arrive in their approved phases.",
    adminTitle: "Found Calc admin",
    adminBody:
      "This shell locks the admin route boundary. Catalog operations and rule management are not implemented in Phase 01.",
    phaseLabel: "Phase 03 · Product UI Runtime & Discovery",
  },
} as const;

export type FoundationMessages = (typeof messages)[Locale];

export function getMessages(locale: Locale): FoundationMessages {
  return messages[locale];
}
