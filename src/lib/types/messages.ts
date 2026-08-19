/** Shared UI card model for KOMUNIKACIJA / inbound message boxes (not mock-only). */

export type OfficeMessageKind = "glasovno" | "tekst";

export type Message = {
  id: string;
  workerId: string;
  workerName: string;
  text: string;
  time: string;
  type: OfficeMessageKind;
  targetTask?: string;
  attachmentId?: string | null;
};
