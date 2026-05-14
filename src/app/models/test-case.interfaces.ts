export interface TestCaseIndexEntry {
  id: string;
  name: string;
  warbandId?: number;
}

export interface TestCase {
  id: string;
  name: string;
  warbandId?: number;
  /** Parsed warband export object (same shape as WarbandExport). */
  exportJson: unknown;
  /** Raw HTML string from the Trench Companion print view, used as reference. */
  trenchCompanionHtml: string;
}
