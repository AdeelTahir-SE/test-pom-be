declare module "mammoth" {
  interface ExtractResult {
    value: string;
    messages?: unknown[];
  }

  export function extractRawText(input: {
    buffer: Buffer;
  }): Promise<ExtractResult>;

  const mammoth: {
    extractRawText: typeof extractRawText;
  };
  export default mammoth;
}

declare module "xlsx" {
  export interface WorkSheet {
    [cell: string]: unknown;
  }

  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }

  export const utils: {
    sheet_to_csv(
      sheet: WorkSheet,
      opts?: { blankrows?: boolean }
    ): string;
    book_new(): WorkBook;
    aoa_to_sheet(data: unknown[][]): WorkSheet;
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name: string): void;
  };

  export function read(
    data: Buffer,
    opts?: { type?: string; cellDates?: boolean }
  ): WorkBook;

  export function write(
    workbook: WorkBook,
    opts?: { type?: string; bookType?: string }
  ): Buffer | string | Uint8Array;
}
