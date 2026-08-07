import type { StructuredContractDocument } from "@/lib/contract-templates";
import { isAdminRtl } from "@/lib/contract-templates";
import "./contract-print.css";

export function ContractPrintDocument({
  doc,
  lang,
  id = "printable-contract",
}: {
  doc: StructuredContractDocument;
  lang: "ku" | "ar" | "en";
  id?: string;
}) {
  const rtl = isAdminRtl(lang);
  const { meta, parties, preamble, clauses, supplementalTitle, signatures, letterhead, metaLabels } = doc;

  return (
    <div
      id={id}
      className="contract-print-sheet"
      dir={rtl ? "rtl" : "ltr"}
      lang={rtl ? (lang === "ar" ? "ar" : "ku") : "en"}
    >
      <header className="contract-print-letterhead">
        <div className="flex items-center gap-3" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="contract-print-logo">LQ</div>
          <div className="contract-print-brand">
            <h1>{letterhead.platform}</h1>
            <p>{letterhead.subtitle}</p>
          </div>
        </div>
        <div className="contract-print-doc-type">{letterhead.docTitle}</div>
      </header>

      <p style={{ fontSize: "11pt", fontWeight: 700, margin: "0 0 10px", color: "#0369a1" }}>
        {meta.typeLabel}
      </p>

      <div className="contract-print-meta">
        <div>
          <span>{metaLabels.contractId}: </span>
          <strong>{meta.contractId}</strong>
        </div>
        <div>
          <span>{metaLabels.issuedAt}: </span>
          <strong>{meta.issuedAt}</strong>
        </div>
        <div>
          <span>{metaLabels.language}: </span>
          <strong>{meta.languageLabel}</strong>
        </div>
        <div>
          <span>{metaLabels.status}: </span>
          <strong>{meta.statusLabel}</strong>
        </div>
        <div>
          <span>{metaLabels.signature}: </span>
          <strong>{meta.signatureLabel}</strong>
        </div>
      </div>

      <div className="contract-print-parties">
        <div className="contract-print-party">
          <label>{metaLabels.firstParty}</label>
          <p>{parties.firstParty}</p>
        </div>
        <div className="contract-print-party">
          <label>{metaLabels.secondParty}</label>
          <p>{parties.secondParty}</p>
          {parties.idOrPhone && (
            <small>{metaLabels.idOrPhone}: {parties.idOrPhone}</small>
          )}
        </div>
      </div>

      <p className="contract-print-preamble">{preamble}</p>

      {clauses.map((clause, i) => (
        <section key={i} className="contract-print-clause">
          <h3>{clause.title}</h3>
          <p>{clause.body}</p>
        </section>
      ))}

      {parties.customTerms && (
        <section className="contract-print-supplemental">
          <h3>{supplementalTitle}</h3>
          <p>{parties.customTerms}</p>
        </section>
      )}

      <div className="contract-print-signatures">
        <div className="contract-print-sig-block">
          <label>{signatures.firstLabel}</label>
          <div className="contract-print-sig-line" />
          <div className="contract-print-sig-date">{signatures.dateLabel}</div>
        </div>
        <div className="contract-print-sig-block">
          <label>{signatures.secondLabel}</label>
          <div className="contract-print-sig-line" />
          <div className="contract-print-sig-date">{signatures.dateLabel}</div>
        </div>
      </div>

      <footer className="contract-print-footer">
        {letterhead.platform} · {meta.contractId} · {meta.issuedAt}
      </footer>
    </div>
  );
}
