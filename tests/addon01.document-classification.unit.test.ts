import { describe, it, expect } from "vitest";
import { classifyDocument } from "@/lib/documents/classify";
import { buildDocumentPreview, enrichDocumentFromOcr } from "@/lib/documents/preview";
import { DOCUMENT_PREVIEW_MAX_CHARS } from "@/config/constants";
import { describeTimelineEvent } from "@/lib/timeline/describe";
import { translations, type TranslationKey } from "@/lib/translations";

const tSl = (key: TranslationKey) => translations.sl[key];
const tEn = (key: TranslationKey) => translations.en[key];

describe("Add-on 1 — document classification", () => {
  it("classifies invoices from English and Slovenian OCR text", () => {
    expect(
      classifyDocument("INVOICE\nInvoice No: 2025-018\nAmount due: 120 EUR\nVAT 22%")
    ).toBe("invoice");
    expect(classifyDocument("Račun št. 88\nZnesek: 50 €\nDDV vključeno")).toBe("invoice");
  });

  it("classifies launch document types across supported languages", () => {
    expect(classifyDocument("Delivery Note\nItems delivered: 18")).toBe("delivery_note");
    expect(classifyDocument("Lieferschein\nTransportauftrag 77")).toBe("delivery_note");
    expect(classifyDocument("Contract agreement between parties\nDuration: 24 months")).toBe(
      "contract"
    );
    expect(classifyDocument("Vertrag\nAppendice\nStranka: ACME")).toBe("contract");
    expect(classifyDocument("Service Report\nPerformed work: Boiler maintenance")).toBe("service_report");
    expect(classifyDocument("Radni nalog\nIzvještaj pregleda")).toBe("service_report");
    expect(classifyDocument("Quotation / ponudba\nValid until 01.08.2026")).toBe("offer");
    expect(classifyDocument("Preventivo\nOfferte\nTotale 120 EUR")).toBe("offer");
    expect(classifyDocument("Cash receipt\nThank you for your purchase\nPaid: 9.90")).toBe("invoice");
    expect(classifyDocument("Ricevuta\nFattura 12\nTotale 9,90 €")).toBe("invoice");
  });

  it("falls back to other when confidence is low", () => {
    expect(classifyDocument("random site photo notes")).toBe("other");
    expect(classifyDocument("")).toBe("other");
  });

  it("does not treat co-financing contracts as invoices (bank-account račun)", () => {
    const ocr = [
      "EGPURE/JP/2013",
      "Obrazec 2: Vzorec pogodbe o sofinanciranju",
      "Elektro Gorenjska Prodaja d.o.o.",
      "transakcijski račun: ________",
      "ID št. za DDV: SI37692186",
      "POGODBO o sofinanciranju ukrepov",
    ].join("\n");
    expect(classifyDocument(ocr)).toBe("contract");
  });
});

describe("Add-on 1 — document preview (Mark pack 2)", () => {
  it("invoice: Slovenian type + number, party, date, amount (Mark order)", () => {
    const preview = buildDocumentPreview(
      "invoice",
      [
        "Invoice",
        "Zadeva: Montaža klimatske naprave",
        "Supplier: ABC d.o.o.",
        "Kupac: Novak d.o.o.",
        "Invoice No: 2025-018",
        "Date: 12.06.2025",
        "Znesek: 684,20 €",
      ].join("\n"),
      "Invoice_2025_018.pdf"
    );
    expect(preview).toBe(
      ["Račun 2025-018", "Novak d.o.o.", "12.06.2025", "684,20 €"].join("\n")
    );
    expect(preview).not.toContain("Zadeva:");
    expect(preview).not.toContain("Datum:");
    expect(preview).not.toContain("Za:");
    expect(preview).not.toContain("Supplier:");
    expect(preview).not.toContain("Invoice");
    expect(preview.length).toBeLessThanOrEqual(DOCUMENT_PREVIEW_MAX_CHARS);
  });

  it("invoice party synonyms: naročnik / stranka / kupec / customer / client / kupac", () => {
    for (const label of ["Naročnik", "Stranka", "Kupec", "Customer", "Client", "Kupac"]) {
      const preview = buildDocumentPreview(
        "invoice",
        [`${label}: Acme d.o.o.`, "Invoice No: 1", "Date: 01.01.2026", "Znesek: 10 €"].join(
          "\n"
        ),
        "a.pdf"
      );
      expect(preview).toContain("Acme d.o.o.");
      const lines = preview.split("\n");
      expect(lines[0]).toBe("Račun 1");
      expect(lines[1]).toBe("Acme d.o.o.");
      expect(lines[2]).toBe("01.01.2026");
    }
  });

  it("classifies predračun as offer (Ponudba), not invoice", () => {
    expect(
      classifyDocument("Predračun št. 10\nNaročnik: Test d.o.o.\nZnesek: 50 €")
    ).toBe("offer");
  });

  it("other docs use Dokument · filename and never generic OCR lines", () => {
    const preview = buildDocumentPreview("other", "line one\nline two\nline three", "scan.pdf");
    expect(preview).toBe("Dokument · scan.pdf");
    expect(preview).not.toContain("line one");
  });

  it("other docs may include only a markdown title and date", () => {
    const preview = buildDocumentPreview(
      "other",
      ["# RAČUN", "generic OCR line", "Datum: 12.06.2025"].join("\n"),
      "sken_12.pdf"
    );
    expect(preview).toBe(["Dokument · sken_12.pdf", "RAČUN", "12.06.2025"].join("\n"));
    expect(preview).not.toContain("generic OCR line");
  });

  it("never exceeds the stored preview budget", () => {
    const huge = "x".repeat(2000);
    const preview = buildDocumentPreview("other", huge, "big.pdf");
    expect(preview.length).toBeLessThanOrEqual(DOCUMENT_PREVIEW_MAX_CHARS);
  });

  it("truncate does not split Slovene characters", () => {
    const long = `${"č".repeat(DOCUMENT_PREVIEW_MAX_CHARS + 10)}šž`;
    const preview = buildDocumentPreview("other", "noise", long);
    expect(preview.includes("�")).toBe(false);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("all typed docs use the same type, customer, date, amount preview shape", () => {
    const contract = buildDocumentPreview(
      "contract",
      "Contract No: C-24\nDuration: 24 months\nNaročnik: Hiša d.o.o.\nDate: 12.06.2025\nAmount: 500,00 €",
      "c.pdf"
    );
    expect(contract).toBe(["Pogodba C-24", "Hiša d.o.o.", "12.06.2025", "500,00 €"].join("\n"));
    expect(contract).not.toContain("24 months");

    const service = buildDocumentPreview(
      "service_report",
      "Service Report\nPerformed work: Boiler maintenance\nStranka: Marko\nDate: 13.06.2025",
      "s.pdf"
    );
    expect(service).toBe(["Servis", "Marko", "13.06.2025"].join("\n"));
    expect(service).not.toContain("Boiler maintenance");
  });

  it("type-only previews fall back to Slovenian type and filename", () => {
    expect(buildDocumentPreview("invoice", "Invoice", "invoice.pdf")).toBe("Račun · invoice.pdf");
    expect(buildDocumentPreview("offer", "Ponudba", "offer.pdf")).toBe("Ponudba · offer.pdf");
  });

  it("other image enrichment discards OCR text", () => {
    const result = enrichDocumentFromOcr("roof photo noise", "roof.jpg", { attachmentType: "image" });
    expect(result.document_type).toBe("other");
    expect(result.document_preview).toBe("Dokument · roof.jpg");
    expect(result.should_store_ocr_text).toBe(false);
  });

  it("enrichDocumentFromOcr classifies and previews in one pass", () => {
    const result = enrichDocumentFromOcr(
      "Zadeva: Servis kotla\nKupac: ACME d.o.o.\nDate: 01.02.2026\nInvoice No: 9\nZnesek: 10 €\nVAT included",
      "inv.pdf"
    );
    expect(result.document_type).toBe("invoice");
    expect(result.document_preview.startsWith("Račun 9")).toBe(true);
    expect(result.document_preview).toContain("ACME d.o.o.");
    expect(result.document_preview).not.toContain("Zadeva:");
  });

  it("parses Croatian/IKEA-style OCR without Stranica as invoice no", () => {
    const ocr = [
      "![img-0.jpeg](img-0.jpeg)",
      "",
      "# Račun",
      "",
      "Stranica 1 od 2",
      "",
      "## Kupac:",
      "",
      "Manuela Glavinic",
      "",
      "## Prodavatelj:",
      "",
      "IKEA Hrvatska d.o.o. za trgovinu",
      "Ulica Alfreda Nobela 2",
      "",
      "## Podaci o računu:",
      "",
      "Datum narudžbe: 1. 9. 2023.",
      "Broj narudžbe: 1379135794",
      "Datum računa: 1. 9. 2023. 23:11:17",
      "Broj računa: 185678/533/1",
      "",
      "**Ukupan iznos EUR: 1.160,34 €**",
    ].join("\n");

    const result = enrichDocumentFromOcr(ocr, "image (18).png");
    expect(result.document_type).toBe("invoice");
    expect(result.document_preview.split("\n")).toEqual([
      "Račun 185678/533/1",
      "Manuela Glavinic",
      "01.09.2023",
      "1.160,34 €",
    ]);
    expect(result.document_preview).not.toContain("Zadeva:");
    expect(result.document_preview).not.toContain("Supplier:");
  });

  it("does not treat long content lines with heading keywords as section headings", () => {
    const preview = buildDocumentPreview(
      "invoice",
      ["## Kupac:", "Naročnik Gradnje d.o.o.", "Datum računa: 12.06.2025", "Invoice No: 1"].join(
        "\n"
      ),
      "inv.pdf"
    );
    expect(preview).toContain("Naročnik Gradnje d.o.o.");
    expect(preview.startsWith("Račun 1")).toBe(true);
  });
});

describe("Add-on 1 — timeline display", () => {
  it("shows document type and filename on ocr_completed", () => {
    const line = describeTimelineEvent(
      {
        event_type: "ocr_completed",
        metadata: {
          document_type: "invoice",
          file_name: "Invoice_2025_018.pdf",
          job_seq: 3,
        },
      },
      tSl
    );
    expect(line).toBe("📄 Račun · Invoice_2025_018.pdf");
  });

  it("uses English labels", () => {
    const line = describeTimelineEvent(
      {
        event_type: "ocr_completed",
        metadata: { document_type: "delivery_note", file_name: "dn.pdf" },
      },
      tEn
    );
    expect(line).toBe("📄 Delivery Note · dn.pdf");
  });
});
