import Dexie from "dexie";

// Minimal record types used across the client for local storage and mock flows
export interface SyncQueueItem {
  id: string;
  op: {
    entity: string;
    type: string;
    id?: string;
    payload?: any;
  };
  retryCount: number;
  lastError?: string;
  createdAt: string; // ISO timestamp
}

export interface TestRecord {
  id: string;
  updatedAt?: string; // ISO timestamp
}

export interface TaskRecord {
  id: string;
  assigneeId: string;
  schoolId: string;
  taskNumber: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface StaffUserRecord {
  id: string;
  schoolId?: string | null;
  email: string;
  passwordHash: string;
  role: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface SchoolUserRecord {
  id: string;
  schoolId: string;
  email: string;
  passwordHash: string;
  role: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface SchoolRecord {
  id: string;
  name: string;
  type?: string;
  code: string;
  address?: string;
  phone?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

class AppDB extends Dexie {
  syncQueue!: Dexie.Table<SyncQueueItem, string>;
  tests!: Dexie.Table<TestRecord, string>;
  tasks!: Dexie.Table<TaskRecord, string>;
  staffUsers!: Dexie.Table<StaffUserRecord, string>;
  schoolUsers!: Dexie.Table<SchoolUserRecord, string>;
  schools!: Dexie.Table<SchoolRecord, string>;

  constructor() {
    super("sofwan-db");
    this.version(1).stores({
      // Primary key first, followed by secondary indexes for common queries
      syncQueue: "id, createdAt",
      tests: "id, updatedAt",
      tasks: "id, assigneeId, updatedAt",
      staffUsers: "id, email, schoolId",
      schoolUsers: "id, email, schoolId",
      schools: "id, code, name",
    });
  }
}

export const db = new AppDB();
