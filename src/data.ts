export type CaseStatus = "active" | "pending" | "closed" | "on_hold" | "archived";
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

export const staffMembers: StaffMember[] = [];

export const clients: Client[] = [];

export const cases: Case[] = [];

export const caseDocuments: CaseDocument[] = [];

export const messages: Message[] = [];

export const appointments: Appointment[] = [];

export const invoices: Invoice[] = [];

