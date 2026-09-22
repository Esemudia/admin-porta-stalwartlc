export type CaseStatus = "active" | "pending" | "closed" | "on_hold";
export type InvoiceStatus = "paid" | "pending" | "overdue";
export type StaffRole = "lawyer" | "front_desk" | "exec_secretary";
export type DocType = "pleading" | "court_order" | "brief" | "correspondence" | "evidence" | "contract";
export type MessageSender = "client" | "attorney";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  specialisation?: string;
  phone: string;
  joinedDate: string;
  casesHandled: number;
  active: boolean;
}

export interface CaseUpdate {
  date: string;
  title: string;
  description: string;
  author: string;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  name: string;
  type: DocType;
  uploadedBy: string;
  uploadedDate: string;
  sizeKb: number;
}

export interface Message {
  id: string;
  caseId: string;
  sender: MessageSender;
  senderName: string;
  timestamp: string;
  body: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attorney: string;
  caseId: string | null;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  joinedDate: string;
  activeCases: number;
  totalBilled: number;
  outstanding: number;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  type: string;
  status: CaseStatus;
  attorney: string;
  uploadedBy: string;
  filedDate: string;
  nextHearing: string | null;
  description: string;
  clientName: string;
  clientId: string;
  court?: string;
  claimValue?: number;
  opposingParty?: string;
  updates: CaseUpdate[];
}

export interface Invoice {
  id: string;
  caseId: string;
  clientId: string;
  description: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  issuedDate: string;
}

export const staffMembers: StaffMember[] = [
  {
    id: "s001",
    name: "Chukwuemeka Stalwart",
    email: "c.stalwart@stalwartlc.com",
    role: "lawyer",
    specialisation: "Energy & Natural Resources, Admiralty",
    phone: "+234 803 000 0001",
    joinedDate: "2004-01-15",
    casesHandled: 142,
    active: true,
  },
  {
    id: "s002",
    name: "Adaeze Nwosu",
    email: "a.nwosu@stalwartlc.com",
    role: "lawyer",
    specialisation: "Business & Corporate, M&A",
    phone: "+234 803 000 0002",
    joinedDate: "2012-06-01",
    casesHandled: 89,
    active: true,
  },
  {
    id: "s003",
    name: "Babatunde Eze",
    email: "b.eze@stalwartlc.com",
    role: "lawyer",
    specialisation: "Intellectual Property, Start-Ups",
    phone: "+234 803 000 0003",
    joinedDate: "2017-03-10",
    casesHandled: 54,
    active: true,
  },
  {
    id: "s004",
    name: "Ngozi Amadi",
    email: "n.amadi@stalwartlc.com",
    role: "exec_secretary",
    phone: "+234 803 000 0004",
    joinedDate: "2019-08-20",
    casesHandled: 0,
    active: true,
  },
  {
    id: "s005",
    name: "Emeka Obi",
    email: "e.obi@stalwartlc.com",
    role: "front_desk",
    phone: "+234 803 000 0005",
    joinedDate: "2021-02-14",
    casesHandled: 0,
    active: true,
  },
];

export const clients: Client[] = [
  {
    id: "cl001",
    name: "Emmanuel Okafor",
    email: "e.okafor@company.com",
    phone: "+234 805 111 2233",
    company: "Okafor Group Ltd",
    joinedDate: "2023-07-01",
    activeCases: 2,
    totalBilled: 13650000,
    outstanding: 4000000,
  },
  {
    id: "cl002",
    name: "Bright Futures Ltd",
    email: "admin@brightfutures.ng",
    phone: "+234 701 555 9988",
    company: "Bright Futures Ltd",
    joinedDate: "2025-01-10",
    activeCases: 1,
    totalBilled: 3750000,
    outstanding: 2800000,
  },
  {
    id: "cl003",
    name: "TechBridge Nigeria",
    email: "legal@techbridge.ng",
    phone: "+234 802 333 6677",
    company: "TechBridge Nigeria",
    joinedDate: "2023-07-22",
    activeCases: 0,
    totalBilled: 1800000,
    outstanding: 0,
  },
];

export const cases: Case[] = [
  {
    id: "c001",
    caseNumber: "SLC/2024/0142",
    title: "Okafor v. Delta Petroleum Ltd",
    type: "Energy & Natural Resources",
    status: "active",
    attorney: "Chukwuemeka Stalwart",
    uploadedBy: "Adaeze Nwosu",
    filedDate: "2024-03-15",
    nextHearing: "2026-09-18",
    clientName: "Emmanuel Okafor",
    clientId: "cl001",
    court: "Federal High Court, Lagos — Court 5 (Coker J)",
    claimValue: 4200000000,
    opposingParty: "Delta Petroleum Ltd",
    description:
      "Breach of joint venture agreement relating to upstream oil field operations in OML-77. Claim for NGN 4.2B in damages and specific performance of contract terms.",
    updates: [
      {
        date: "2026-08-14",
        title: "Pre-trial conference concluded",
        description:
          "Judge Adeleke set a firm trial date of 18 September 2026. Both parties have been ordered to exchange witness statements by 5 September.",
        author: "Chukwuemeka Stalwart",
      },
      {
        date: "2026-07-02",
        title: "Defendant's motion to strike dismissed",
        description:
          "The court rejected Delta Petroleum's application to strike out paragraphs 14–22 of the amended statement of claim. Our pleadings remain intact.",
        author: "Adaeze Nwosu",
      },
      {
        date: "2026-05-20",
        title: "Amended statement of claim filed",
        description:
          "We filed and served the amended statement of claim incorporating the new expert evidence on reservoir depletion rates.",
        author: "Chukwuemeka Stalwart",
      },
    ],
  },
  {
    id: "c002",
    caseNumber: "SLC/2025/0078",
    title: "Bright Futures Ltd — Corporate Restructuring",
    type: "Business & Corporate",
    status: "active",
    attorney: "Adaeze Nwosu",
    uploadedBy: "Ngozi Amadi",
    filedDate: "2025-01-10",
    nextHearing: null,
    clientName: "Emmanuel Okafor",
    clientId: "cl001",
    court: "N/A — Advisory Matter",
    claimValue: undefined,
    opposingParty: undefined,
    description:
      "Advisory and documentation for conversion of private limited company to a public company, preparation of share offer documents, and regulatory filings with the CAC and SEC.",
    updates: [
      {
        date: "2026-08-01",
        title: "SEC approval received",
        description:
          "The Securities and Exchange Commission granted approval for the proposed public offer. Share certificate templates submitted for review.",
        author: "Adaeze Nwosu",
      },
      {
        date: "2026-06-15",
        title: "CAC documentation complete",
        description:
          "Corporate Affairs Commission filings submitted. Awaiting registration certificate expected within 10 business days.",
        author: "Adaeze Nwosu",
      },
    ],
  },
  {
    id: "c003",
    caseNumber: "SLC/2023/0311",
    title: "TechBridge IP Portfolio Registration",
    type: "Intellectual Property",
    status: "closed",
    attorney: "Babatunde Eze",
    uploadedBy: "Emeka Obi",
    filedDate: "2023-07-22",
    nextHearing: null,
    clientName: "Emmanuel Okafor",
    clientId: "cl001",
    court: "N/A — Regulatory Filing",
    claimValue: undefined,
    opposingParty: undefined,
    description:
      "Registration of 6 software patents and 3 trademarks across Nigeria, Ghana, and Kenya. Coordination with WIPO for Madrid Protocol filings.",
    updates: [
      {
        date: "2024-11-30",
        title: "All registrations complete",
        description:
          "Final trademark certificate received from Kenya Intellectual Property Institute. All 9 IP assets are now registered and protected.",
        author: "Babatunde Eze",
      },
    ],
  },
  {
    id: "c004",
    caseNumber: "SLC/2026/0019",
    title: "Maritime Cargo Dispute — MV Calabar Star",
    type: "Admiralty / Maritime",
    status: "pending",
    attorney: "Chukwuemeka Stalwart",
    uploadedBy: "Chukwuemeka Stalwart",
    filedDate: "2026-02-03",
    nextHearing: "2026-10-05",
    clientName: "Emmanuel Okafor",
    clientId: "cl001",
    court: "Federal High Court, Port Harcourt — Admiralty Division",
    claimValue: 2100000 * 1550, // USD 2.1M × approx NGN rate
    opposingParty: "Nordic Shipping AS",
    description:
      "Cargo damage claim arising from vessel transit. 840 MT of refined petroleum products contaminated during voyage from Rotterdam. Claim value USD 2.1M.",
    updates: [
      {
        date: "2026-08-10",
        title: "Expert surveyor report received",
        description:
          "The independent marine surveyor report confirms contamination occurred during transit, not prior to loading.",
        author: "Chukwuemeka Stalwart",
      },
    ],
  },
];

export const caseDocuments: CaseDocument[] = [
  { id: "d001", caseId: "c001", name: "Amended Statement of Claim.pdf", type: "pleading", uploadedBy: "Chukwuemeka Stalwart", uploadedDate: "2026-05-20", sizeKb: 842 },
  { id: "d002", caseId: "c001", name: "Defendant's Motion to Strike.pdf", type: "pleading", uploadedBy: "Adaeze Nwosu", uploadedDate: "2026-06-10", sizeKb: 440 },
  { id: "d003", caseId: "c001", name: "Court Order — Motion Dismissed.pdf", type: "court_order", uploadedBy: "Chukwuemeka Stalwart", uploadedDate: "2026-07-02", sizeKb: 210 },
  { id: "d004", caseId: "c001", name: "Expert Witness Report — Reservoir Depletion.pdf", type: "evidence", uploadedBy: "Chukwuemeka Stalwart", uploadedDate: "2026-04-18", sizeKb: 3100 },
  { id: "d005", caseId: "c001", name: "Joint Venture Agreement (Redacted).pdf", type: "contract", uploadedBy: "Adaeze Nwosu", uploadedDate: "2024-03-15", sizeKb: 1250 },
  { id: "d006", caseId: "c002", name: "CAC Form CAC1 — Articles of Assoc.pdf", type: "contract", uploadedBy: "Adaeze Nwosu", uploadedDate: "2026-06-15", sizeKb: 380 },
  { id: "d007", caseId: "c002", name: "SEC Approval Letter.pdf", type: "correspondence", uploadedBy: "Adaeze Nwosu", uploadedDate: "2026-08-01", sizeKb: 175 },
  { id: "d008", caseId: "c003", name: "NIPC Patent Certificate — SWX-001.pdf", type: "evidence", uploadedBy: "Babatunde Eze", uploadedDate: "2024-11-30", sizeKb: 290 },
  { id: "d009", caseId: "c004", name: "Bill of Lading — MV Calabar Star.pdf", type: "evidence", uploadedBy: "Chukwuemeka Stalwart", uploadedDate: "2026-02-03", sizeKb: 520 },
  { id: "d010", caseId: "c004", name: "Independent Surveyor Report.pdf", type: "evidence", uploadedBy: "Chukwuemeka Stalwart", uploadedDate: "2026-08-10", sizeKb: 1870 },
];

export const messages: Message[] = [
  { id: "m001", caseId: "c001", sender: "attorney", senderName: "Chukwuemeka Stalwart", timestamp: "2026-08-14T10:32:00", body: "Good morning Emmanuel. I wanted to confirm that the pre-trial conference went well this morning. The trial is now fixed for 18 September. Please ensure you are available." },
  { id: "m002", caseId: "c001", sender: "client", senderName: "Emmanuel Okafor", timestamp: "2026-08-14T11:05:00", body: "Thank you Chief Stalwart. I will clear my schedule for that week. Is there anything I need to prepare on my end before then?" },
  { id: "m003", caseId: "c001", sender: "attorney", senderName: "Chukwuemeka Stalwart", timestamp: "2026-08-14T11:47:00", body: "Yes — we need to finalise your witness statement. Kindly come to the office on Thursday 21 August at 10am for a proofing session. Please bring the original copies of the JV agreement." },
  { id: "m004", caseId: "c001", sender: "client", senderName: "Emmanuel Okafor", timestamp: "2026-08-14T12:15:00", body: "Understood. I will be there Thursday morning with the documents. Thank you." },
  { id: "m005", caseId: "c002", sender: "attorney", senderName: "Adaeze Nwosu", timestamp: "2026-08-02T09:00:00", body: "The SEC approval letter has been received and filed. The next step is finalising the prospectus. I will send a draft by end of week." },
  { id: "m006", caseId: "c002", sender: "client", senderName: "Emmanuel Okafor", timestamp: "2026-08-02T14:30:00", body: "Excellent news! Please send the draft when ready. We are targeting a Q4 offer window." },
  { id: "m007", caseId: "c004", sender: "attorney", senderName: "Chukwuemeka Stalwart", timestamp: "2026-08-11T08:15:00", body: "The marine surveyor's report is in our favour. It definitively places liability with Nordic Shipping. We are in a strong position ahead of the October hearing." },
  { id: "m008", caseId: "c004", sender: "client", senderName: "Emmanuel Okafor", timestamp: "2026-08-11T09:45:00", body: "That is very encouraging. What is the settlement prospect at this stage?" },
  { id: "m009", caseId: "c004", sender: "attorney", senderName: "Chukwuemeka Stalwart", timestamp: "2026-08-11T10:30:00", body: "Given the strength of the report, I recommend we proceed to trial. A settlement approach now would undervalue our claim. I will advise further after the October hearing." },
];

export const appointments: Appointment[] = [
  { id: "a001", title: "Witness Statement Proofing — Okafor v. Delta Petroleum", date: "2026-08-21", time: "10:00 AM", location: "Stalwart LC Offices, 14 Bourdillon Road, Ikoyi", attorney: "Chukwuemeka Stalwart", caseId: "c001" },
  { id: "a002", title: "Prospectus Review — Bright Futures Restructuring", date: "2026-08-28", time: "02:00 PM", location: "Virtual — Microsoft Teams", attorney: "Adaeze Nwosu", caseId: "c002" },
  { id: "a003", title: "Trial Day 1 — Okafor v. Delta Petroleum", date: "2026-09-18", time: "09:00 AM", location: "Federal High Court, Lagos — Court 5", attorney: "Chukwuemeka Stalwart", caseId: "c001" },
  { id: "a004", title: "Maritime Hearing — MV Calabar Star Dispute", date: "2026-10-05", time: "09:30 AM", location: "Federal High Court, Port Harcourt", attorney: "Chukwuemeka Stalwart", caseId: "c004" },
];

export const invoices: Invoice[] = [
  {
    id: "inv001",
    caseId: "c001",
    clientId: "cl001",
    description: "Professional fees — Q2 2026 (Okafor v. Delta Petroleum)",
    amount: 4500000,
    status: "paid",
    issuedDate: "2026-07-01",
    dueDate: "2026-07-31",
  },
  {
    id: "inv002",
    caseId: "c002",
    clientId: "cl001",
    description: "Corporate restructuring advisory — Phase 2",
    amount: 2800000,
    status: "pending",
    issuedDate: "2026-08-01",
    dueDate: "2026-08-31",
  },
  {
    id: "inv003",
    caseId: "c004",
    clientId: "cl001",
    description: "Retainer — Maritime case initiation and survey coordination",
    amount: 1200000,
    status: "overdue",
    issuedDate: "2026-06-15",
    dueDate: "2026-07-15",
  },
  {
    id: "inv004",
    caseId: "c001",
    clientId: "cl001",
    description: "Professional fees — Q1 2026 (Okafor v. Delta Petroleum)",
    amount: 4200000,
    status: "paid",
    issuedDate: "2026-04-01",
    dueDate: "2026-04-30",
  },
  {
    id: "inv005",
    caseId: "c002",
    clientId: "cl001",
    description: "SEC filing coordination and documentation fees",
    amount: 950000,
    status: "paid",
    issuedDate: "2026-07-15",
    dueDate: "2026-08-14",
  },
];
