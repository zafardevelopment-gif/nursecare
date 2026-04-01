export type VerifyResult =
  | { found: true;  effectiveStatus: string; nurseName: string; nurseSpec: string | null; nurseCity: string | null; photoUrl: string | null; uniqueIdCode: string; issueDate: string; expiryDate: string }
  | { found: false; effectiveStatus: string }
