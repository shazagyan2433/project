export type CityId =
  | "all"
  | "sulaymaniyah"
  | "erbil"
  | "duhok"
  | "halabja"
  | "kirkuk"
  | "baghdad"
  | "basra"
  | "najaf"
  | "karbala"
  | "nineveh"
  | "anbar"
  | "babylon"
  | "diyala"
  | "wasit"
  | "qadisiyah"
  | "dhiqar"
  | "maysan"
  | "muthanna"
  | "salahadin";

export interface TrackedDriver {
  id: string;
  name: string;
  phone: string;
  city: Exclude<CityId, "all">;
  lat: number;
  lng: number;
  location_approved: boolean;
  online: boolean;
  vehicle: string;
  lastSeen: string;
}

export interface VerificationDocument {
  id: string;
  label: string;
  type: "image" | "pdf";
  url: string;
  uploaded: boolean;
}

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "more_docs_needed";

export interface VerificationRecord {
  id: number;
  businessName: string;
  role: "owner" | "buyer" | "supplier";
  sectorKey: string;
  sectorGroup: string;
  email?: string;
  mobile: string;
  governorate?: string;
  city?: string;
  address?: string;
  lat: number;
  lng: number;
  status: VerificationStatus;
  rejectionReason?: string;
  submittedAt: string;
  documents: VerificationDocument[];
}

export type ContractStatus = "active" | "expiring" | "expired";
export type SignatureStatus = "signed" | "pending" | "unsigned";

export interface AdminContract {
  id: string;
  userId?: number | null;
  userName: string;
  type: string;
  status: ContractStatus;
  signatureStatus: SignatureStatus;
  startDate: string;
  endDate: string;
  content: { ku: string; ar: string; en: string };
  firstPartyName?: string;
  secondPartyName?: string;
  idOrPhone?: string;
  amountOrTerms?: string;
  customTerms?: string;
}

export interface AdminSectorRow {
  key: string;
  nameKu: string;
  nameAr: string;
  nameEn: string;
  group: string;
  color: string;
  categories: string[];
}

export interface AdminCategoryRow {
  key: string;
  nameKu: string;
  nameAr: string;
  nameEn: string;
}
