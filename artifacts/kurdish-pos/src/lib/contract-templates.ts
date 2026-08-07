import type { TFunction } from "i18next";
import i18n from "@/i18n";

export interface ContractFormFields {
  firstPartyName: string;
  secondPartyName: string;
  idOrPhone: string;
  amountOrTerms: string;
  customTerms: string;
  type: string;
  startDate: string;
  endDate: string;
}

const LANGS = ["ku", "ar", "en"] as const;

export function isAdminRtl(lang: string): boolean {
  return lang === "ku" || lang === "ar";
}

export function contractTypeKey(type: string): string {
  return `contracts.types.${type}`;
}

export function buildContractContentForLang(
  fields: ContractFormFields,
  t: TFunction,
): string {
  const typeLabel = t(contractTypeKey(fields.type), { defaultValue: fields.type });
  const lines: string[] = [
    t("contracts.template.preamble"),
    "",
    t("contracts.template.header", { type: typeLabel }),
    "",
    t("contracts.template.firstParty", { name: fields.firstPartyName }),
    t("contracts.template.secondParty", { name: fields.secondPartyName }),
  ];

  if (fields.idOrPhone) {
    lines.push(t("contracts.template.idOrPhone", { value: fields.idOrPhone }));
  }
  if (fields.amountOrTerms) {
    lines.push(t("contracts.template.amountTerms", { value: fields.amountOrTerms }));
  }

  lines.push(
    "",
    t("contracts.template.scopeTitle"),
    fields.customTerms || t("contracts.template.empty"),
    "",
    t("contracts.template.term", { start: fields.startDate, end: fields.endDate }),
  );

  return lines.join("\n");
}

/** Build professional contract body in all three languages using admin namespace templates */
export function buildContractContent(fields: ContractFormFields): {
  ku: string;
  ar: string;
  en: string;
} {
  const result = { ku: "", ar: "", en: "" };

  for (const lng of LANGS) {
    const t = i18n.getFixedT(lng, "admin");
    result[lng] = buildContractContentForLang(fields, t);
  }

  return result;
}

export function getContractTypeLabel(type: string, lang?: string): string {
  const lng = lang ?? i18n.language;
  const t = i18n.getFixedT(lng, "admin");
  return t(contractTypeKey(type), { defaultValue: type });
}

export interface ContractParties {
  firstParty: string;
  secondParty: string;
  idOrPhone?: string;
  amountOrTerms?: string;
  customTerms?: string;
}

export interface StructuredContractClause {
  title: string;
  body: string;
}

export interface StructuredContractDocument {
  meta: {
    contractId: string;
    typeLabel: string;
    issuedAt: string;
    languageLabel: string;
    statusLabel: string;
    signatureLabel: string;
  };
  parties: ContractParties;
  preamble: string;
  clauses: StructuredContractClause[];
  supplementalTitle: string;
  signatures: {
    firstLabel: string;
    secondLabel: string;
    dateLabel: string;
  };
  letterhead: {
    platform: string;
    subtitle: string;
    docTitle: string;
  };
  metaLabels: {
    contractId: string;
    issuedAt: string;
    language: string;
    status: string;
    signature: string;
    firstParty: string;
    secondParty: string;
    idOrPhone: string;
  };
}

export function getContractParties(
  contract: {
    firstPartyName?: string;
    secondPartyName?: string;
    userName: string;
    idOrPhone?: string;
    amountOrTerms?: string;
    customTerms?: string;
  },
  lang?: string,
): ContractParties {
  const t = i18n.getFixedT(lang ?? i18n.language, "admin");
  return {
    firstParty: contract.firstPartyName?.trim() || t("common.defaultFirstParty"),
    secondParty: contract.secondPartyName?.trim() || contract.userName,
    idOrPhone: contract.idOrPhone?.trim(),
    amountOrTerms: contract.amountOrTerms?.trim(),
    customTerms: contract.customTerms?.trim(),
  };
}

export function buildStructuredContractDocument(
  contract: {
    id: string;
    type: string;
    status: string;
    signatureStatus: string;
    startDate: string;
    endDate: string;
    userName: string;
    firstPartyName?: string;
    secondPartyName?: string;
    idOrPhone?: string;
    amountOrTerms?: string;
    customTerms?: string;
  },
  lang: "ku" | "ar" | "en",
): StructuredContractDocument {
  const t = i18n.getFixedT(lang, "admin");
  const parties = getContractParties(contract, lang);
  const amount = parties.amountOrTerms || t("contracts.template.empty");
  const custom = parties.customTerms || t("contracts.template.empty");

  return {
    meta: {
      contractId: contract.id,
      typeLabel: getContractTypeLabel(contract.type, lang),
      issuedAt: new Date().toISOString().slice(0, 10),
      languageLabel: t(`lang.${lang}`),
      statusLabel: t(`contracts.status.${contract.status}`, { defaultValue: contract.status }),
      signatureLabel: t(`contracts.signature.${contract.signatureStatus}`, {
        defaultValue: contract.signatureStatus,
      }),
    },
    parties,
    preamble: t("contracts.template.preamble"),
    clauses: [
      {
        title: t("contracts.print.article1Title"),
        body: t("contracts.print.article1Body", {
          start: contract.startDate,
          end: contract.endDate,
          amount,
        }),
      },
      {
        title: t("contracts.print.article2Title"),
        body: t("contracts.print.article2Body"),
      },
      {
        title: t("contracts.print.article3Title"),
        body: t("contracts.print.article3Body", { amount, custom }),
      },
    ],
    supplementalTitle: t("contracts.template.scopeTitle"),
    signatures: {
      firstLabel: t("contracts.print.sigFirst"),
      secondLabel: t("contracts.print.sigSecond"),
      dateLabel: t("contracts.print.sigDate"),
    },
    letterhead: {
      platform: t("contracts.print.platformName"),
      subtitle: t("contracts.print.platformSubtitle"),
      docTitle: t("contracts.print.documentTitle"),
    },
    metaLabels: {
      contractId: t("contracts.print.metaContractId"),
      issuedAt: t("contracts.print.metaIssuedAt"),
      language: t("contracts.print.metaLanguage"),
      status: t("contracts.print.metaStatus"),
      signature: t("contracts.print.metaSignature"),
      firstParty: t("contracts.print.metaFirstParty"),
      secondParty: t("contracts.print.metaSecondParty"),
      idOrPhone: t("contracts.print.metaIdOrPhone"),
    },
  };
}
