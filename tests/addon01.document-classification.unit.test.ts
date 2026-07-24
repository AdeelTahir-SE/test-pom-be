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

  it("classifies delivery notes, contracts, service reports, offers, receipts", () => {
    expect(classifyDocument("Delivery Note\nItems delivered: 18")).toBe("delivery_note");
    expect(classifyDocument("Dobavnica\nDostavljeno 12.06.2025")).toBe("delivery_note");
    expect(classifyDocument("Contract agreement between parties\nDuration: 24 months")).toBe(
      "contract"
    );
    expect(classifyDocument("Service Report\nPerformed work: Boiler maintenance\nTechnician: Marko")).toBe(
      "service_report"
    );
    expect(classifyDocument("Quotation / ponudba\nValid until 01.08.2026")).toBe("offer");
    expect(classifyDocument("Cash receipt\nThank you for your purchase\nPaid: 9.90")).toBe(
      "receipt"
    );
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

describe("Add-on 1 — document preview", () => {
  it("builds a structured invoice preview with filename secondary", () => {
    const preview = buildDocumentPreview(
      "invoice",
      [
        "Invoice",
        "Supplier: ABC d.o.o.",
        "Invoice No: 2025-018",
        "Date: 12.06.2025",
        "Amount: 684,20 €",
      ].join("\n"),
      "Invoice_2025_018.pdf"
    );
    expect(preview).toContain("Invoice");
    expect(preview).toContain("Supplier: ABC d.o.o.");
    expect(preview).toContain("Invoice No: 2025-018");
    expect(preview).toContain("Invoice_2025_018.pdf");
    expect(preview.length).toBeLessThanOrEqual(DOCUMENT_PREVIEW_MAX_CHARS);
  });

  it("falls back to filename + first OCR lines when unstructured", () => {
    const preview = buildDocumentPreview("other", "line one\nline two\nline three", "scan.pdf");
    expect(preview.startsWith("scan.pdf")).toBe(true);
    expect(preview).toContain("line one");
  });

  it("never exceeds the stored preview budget", () => {
    const huge = "x".repeat(2000);
    const preview = buildDocumentPreview("other", huge, "big.pdf");
    expect(preview.length).toBeLessThanOrEqual(DOCUMENT_PREVIEW_MAX_CHARS);
  });

  it("enrichDocumentFromOcr classifies and previews in one pass", () => {
    const result = enrichDocumentFromOcr(
      "Invoice No: 9\nSupplier: ACME\nAmount: 10 €\nVAT included",
      "inv.pdf"
    );
    expect(result.document_type).toBe("invoice");
    expect(result.document_preview).toContain("Invoice");
    expect(result.document_preview).toContain("inv.pdf");
  });

  it("parses Croatian/IKEA-style OCR without treating 'Stranica' as invoice no", () => {
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
    expect(result.document_preview).toContain("Supplier: IKEA Hrvatska d.o.o. za trgovinu");
    expect(result.document_preview).toContain("Invoice No: 185678/533/1");
    expect(result.document_preview).toContain("Date: 1. 9. 2023.");
    expect(result.document_preview).toMatch(/Amount:.*1\.160,34/);
    expect(result.document_preview).not.toMatch(/Invoice No:\s*Stranica/i);
    expect(result.document_preview).toContain("image (18).png");
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
    expect(line).toBe("📄 Račun: #003 · Invoice_2025_018.pdf");
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
