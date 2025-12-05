import { db } from "./db";
import { sha256Hex } from "./crypto";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "./utils";
import {
  AuthResponse,
  CreateStudentRequest,
  CreateStudentResponse,
  ListStudentsResponse,
  CreateTaskRequest,
  CreateTaskResponse,
  ListTasksResponse,
  LoginRequest,
  School,
  SchoolUser,
  AuthSession,
  Assignment,
  Subject,
  Class,
  Student,
  Grade,
} from "@shared/api";
import Dexie from "dexie";
import {
  NetworkError,
  AuthError,
  validateStudentData,
} from "./errors";

// Player types
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality?: string;
  position: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  medicalInfo?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  height?: number;
  weight?: number;
}

// Transfer types
export interface Transfer {
  id: string;
  academy_id: string;
  player_id?: string;
  player_name: string;
  from_club: string;
  to_club: string;
  transfer_amount?: number;
  currency: string;
  transfer_date: string;
  contract_start_date?: string;
  contract_end_date?: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  transfer_type: 'permanent' | 'loan' | 'free_transfer';
  priority: 'low' | 'medium' | 'high';
  agent_name?: string;
  agent_fee?: number;
  notes?: string;
  documents?: string[];
  fifa_clearance_status?: 'pending' | 'approved' | 'rejected';
  fifa_clearance_date?: string;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

// Subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  features: string[];
  player_limit: number;
  stripe_price_id: string;
}

export interface Subscription {
  id: string;
  academy_id: string;
  plan_id: string;
  stripe_subscription_id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  planName?: string;
  price?: number;
  daysRemaining?: number;
}

export interface SubscriptionData {
  subscription: Subscription | null;
  limits: {
    playerLimit: number;
  };
  usage: {
    playerCount: number;
    playerUsagePercentage: number;
  };
}

export interface SubscriptionHistory {
  id: string;
  action: string;
  reason?: string;
  previousPlan?: string;
  newPlan?: string;
  createdAt: string;
}

export interface UpgradeSubscriptionRequest {
  planId: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CARD';
  paymentReference?: string;
  notes?: string;
}


const API_BASE = (() => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  // Use same-origin relative base in dev to avoid cross-host CORS quirks
  if (import.meta.env.DEV) return "/api";
  return "/api";
})();
const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";

// Player API response types
export interface PlayerResponse {
  success: boolean;
  message: string;
  data: Player;
}

export interface PlayersListResponse {
  success: boolean;
  message: string;
  data: {
    players: Player[];
    total: number;
    page: number;
    limit: number;
  };
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const finalPath = path.startsWith('/') ? path.substring(1) : path;
    const res = await fetch(`${API_BASE}/${finalPath}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init,
    });

    if (!res.ok) {
      let rawText = "";
      try {
        rawText = await res.text();
      } catch (_) {
        // ignore
      }

      // Attempt to parse JSON error body
      let parsed: any = null;
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch (_) {
          parsed = null;
        }
      }

      const message = (parsed && (parsed.error || parsed.message || parsed.details))
        || rawText
        || `HTTP ${res.status}`;

      if (res.status === 401) {
        throw new AuthError(message || "Authentication failed");
      }

      const err: any = new Error(message);
      err.status = res.status;
      err.body = rawText;
      err.data = parsed;
      throw err;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError("Unable to connect to server");
    }
    throw error;
  }
}

export const Api = {
  // Generic HTTP methods
  async get<T>(path: string): Promise<T> {
    return http<T>(path);
  },

  async post<T>(path: string, data?: any): Promise<T> {
    return http<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async put<T>(path: string, data?: any): Promise<T> {
    return http<T>(path, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async delete<T>(path: string): Promise<T> {
    return http<T>(path, {
      method: "DELETE",
    });
  },

  // Players
  async getPlayers(academyId?: string, page = 1, limit = 10): Promise<PlayersListResponse> {
    const academyParam = academyId ? `&academyId=${academyId}` : '';
    return http<PlayersListResponse>(`/football-players?page=${page}&limit=${limit}${academyParam}`);
  },

  async getPlayer(playerId: string): Promise<PlayerResponse> {
    return http<PlayerResponse>(`/football-players/${playerId}`);
  },

  async searchPlayers(query: string, academyId?: string, limit = 10): Promise<{ success: boolean; data: any[] }> {
    const academyParam = academyId ? `&academyId=${academyId}` : '';
    return http<{ success: boolean; data: any[] }>(`/football-players/search?q=${encodeURIComponent(query)}&limit=${limit}${academyParam}`);
  },

  async createPlayer(playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & { academyId: string }): Promise<PlayerResponse> {
    return http<PlayerResponse>('/football-players', {
      method: 'POST',
      body: JSON.stringify(playerData),
    });
  },

  async updatePlayer(playerId: string, playerData: Partial<Player>): Promise<PlayerResponse> {
    return http<PlayerResponse>(`/football-players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(playerData),
    });
  },

  async updatePlayerDetails(playerId: string, playerData: Partial<Player>): Promise<PlayerResponse> {
    return http<PlayerResponse>(`/football-players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(playerData),
    });
  },

  async deletePlayer(playerId: string): Promise<PlayerResponse> {
    return http<PlayerResponse>(`/football-players/${playerId}`, {
      method: 'DELETE',
    });
  },

  // Transfers
  async getTransfers(academyId: string): Promise<{ success: boolean; data: Transfer[] }> {
    return http<{ success: boolean; data: Transfer[] }>(`/transfers?academyId=${academyId}`);
  },

  async createTransfer(transferData: Partial<Transfer>): Promise<{ success: boolean; data: Transfer; message?: string }> {
    return http<{ success: boolean; data: Transfer; message?: string }>('/transfers', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  },

  async updateTransfer(transferId: string, transferData: Partial<Transfer>): Promise<{ success: boolean; data: Transfer; message?: string }> {
    return http<{ success: boolean; data: Transfer; message?: string }>(`/transfers/${transferId}`, {
      method: 'PUT',
      body: JSON.stringify(transferData),
    });
  },

  async deleteTransfer(transferId: string): Promise<{ success: boolean; message?: string }> {
    return http<{ success: boolean; message?: string }>(`/transfers/${transferId}`, {
      method: 'DELETE',
    });
  },

  async login(payload: LoginRequest & { userType?: string }): Promise<AuthSession> {
    if (USE_MOCK) return mock.login(payload);
    return http<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async createTask(payload: CreateTaskRequest): Promise<CreateTaskResponse> {
    if (USE_MOCK) return mock.createTask(payload);
    return http<CreateTaskResponse>("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async listTasks(assigneeId?: string): Promise<ListTasksResponse> {
    if (USE_MOCK) return mock.listTasks(assigneeId);
    const url = assigneeId ? `/tasks?assigneeId=${assigneeId}` : '/tasks';
    return http<ListTasksResponse>(url);
  },
  async getSchoolById(schoolId: string): Promise<School> {
    return http<School>(`/schools/${schoolId}`);
  },

  async getClassStats(): Promise<{
    total: number;
    active: number;
    gradeLevels: number;
    subjects: number;
    averageEnrollment: number;
    totalEnrollment: number;
    averageCapacity: number;
    totalCapacity: number;
  }> {
    return http<any>('/classes/stats');
  },

  // Assignments
  async listAssignments(params?: {
    schoolId?: string;
    classId?: string;
    subjectId?: string;
    teacherId?: string;
    status?: Assignment["status"];
    category?: Assignment["category"];
    limit?: number;
  }): Promise<{ items: Assignment[] }> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.set("schoolId", params.schoolId);
    if (params?.classId) query.set("classId", params.classId);
    if (params?.subjectId) query.set("subjectId", params.subjectId);
    if (params?.teacherId) query.set("teacherId", params.teacherId);
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.limit) query.set("limit", String(params.limit));
    const url = `/assignments${query.toString() ? `?${query.toString()}` : ''}`;
    const items = await http<Assignment[]>(url);
    return { items };
  },
  async getAssignmentStats(params?: { schoolId?: string }): Promise<{ total: number; overdue: number; completed: number; pending: number }> {
    const url = params?.schoolId ? `/assignments/stats?schoolId=${params.schoolId}` : '/assignments/stats';
    return http(url);
  },
  async createAssignment(payload: Partial<Assignment> & { schoolId: string; teacherId?: string; instructions?: string }): Promise<Assignment> {
    return http<Assignment>("/assignments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async updateAssignment(id: string, payload: Partial<Assignment> & { instructions?: string }): Promise<Assignment> {
    return http<Assignment>(`/assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async deleteAssignment(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/assignments/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      let raw = '';
      try { raw = await res.text(); } catch (_) { }
      throw new Error(raw || `HTTP ${res.status}`);
    }
  },

  // Subjects
  async listSubjects(params?: { schoolId?: string; isActive?: boolean }): Promise<{ items: Subject[] }> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.set("schoolId", params.schoolId);
    if (typeof params?.isActive === 'boolean') query.set("isActive", String(params.isActive));
    const url = `/subjects${query.toString() ? `?${query.toString()}` : ''}`;
    const items = await http<Subject[]>(url);
    return { items };
  },

  // Classes
  async listClasses(params?: { schoolId?: string; gradeLevel?: string; subject?: string; teacherId?: string; academicYear?: string }): Promise<{ items: Class[] }> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.set("schoolId", params.schoolId);
    if (params?.gradeLevel) query.set("gradeLevel", params.gradeLevel);
    if (params?.subject) query.set("subject", params.subject);
    if (params?.teacherId) query.set("teacherId", params.teacherId);
    if (params?.academicYear) query.set("academicYear", params.academicYear);
    const url = `/classes${query.toString() ? `?${query.toString()}` : ''}`;
    const items = await http<Class[]>(url);
    return { items };
  },

  // Students
  async listStudents(params?: { schoolId?: string; campusId?: string; grade?: string; isActive?: boolean; limit?: number }): Promise<{ items: Student[] }> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.set("schoolId", params.schoolId);
    if (params?.campusId) query.set("campusId", params.campusId);
    if (params?.grade) query.set("grade", params.grade);
    if (typeof params?.isActive === 'boolean') query.set("isActive", String(params.isActive));
    if (params?.limit) query.set("limit", String(params.limit));
    const url = `/students${query.toString() ? `?${query.toString()}` : ''}`;
    const resp = await http<{ students: Student[] }>(url);
    return { items: resp.students };
  },

  // Grades (no backend available yet) — provide safe stubs
  async listGrades(): Promise<{ items: Grade[] }> {
    return { items: [] };
  },
  async createGrade(grade: Partial<Grade>): Promise<Grade> {
    const now = new Date().toISOString();
    const totalMarks = grade.totalMarks ?? 100;
    const percentage = grade.marks && totalMarks ? Math.round((grade.marks / totalMarks) * 100) : 0;
    return {
      id: uuidv4(),
      studentId: grade.studentId!,
      subjectId: grade.subjectId!,
      classId: grade.classId!,
      assignmentId: grade.assignmentId,
      examType: grade.examType ?? "assignment",
      marks: grade.marks ?? 0,
      totalMarks,
      percentage,
      grade: grade.grade,
      term: grade.term ?? "Term 1",
      academicYear: grade.academicYear ?? new Date().getFullYear().toString(),
      gradedById: grade.gradedById ?? "",
      createdAt: now,
      updatedAt: now,
    };
  },

  async registerPersonnel(
    payload: RegisterPersonnelRequest,
  ): Promise<RegisterPersonnelResponse> {
    // This function is deprecated - military personnel registration removed
    throw new Error("Military personnel registration is no longer supported");
  },

  async registerSchool(payload: {
    schoolName: string;
    schoolType: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: string;
  }): Promise<{ userId: string; schoolId: string }> {
    if (USE_MOCK) return mock.registerSchool(payload);
    return http<{ userId: string; schoolId: string }>("/auth/register-school", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// Lightweight in-browser mock for development and offline demo

const mock = {
  async login({ email, password, userType }: LoginRequest & { userType?: string }): Promise<AuthSession> {
    // Check for superadmin credentials first
    if (email === "admin@system.com" && password === "admin123") {
      return {
        userId: "superadmin-001",
        role: "superadmin",
        schoolId: null,
        tokens: { accessToken: uuidv4(), expiresInSec: 3600 },
      };
    }

    const user = await db.staffUsers.where({ email }).first();
    if (!user) throw new Error("Account not found. Please register.");
    const hash = await sha256Hex(password);
    if (user.passwordHash !== hash) throw new Error("Invalid credentials");

    // Determine role based on userType if provided
    const role = userType ? userType : user.role;

    return {
      userId: user.id,
      role: role,
      schoolId: user.schoolId,
      tokens: { accessToken: uuidv4(), expiresInSec: 3600 },
    };
  },
  async registerSchool(payload: {
    schoolName: string;
    schoolType: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: string;
  }): Promise<{ userId: string; schoolId: string }> {
    const existing = await db.schoolUsers
      .where({ email: payload.email })
      .first();
    if (existing) throw new Error("Email already registered");

    const now = new Date().toISOString();

    // Create school
    const schoolId = uuidv4();
    const school = {
      id: schoolId,
      name: payload.schoolName,
      type: payload.schoolType,
      code: slugify(payload.schoolName),
      address: "",
      phone: payload.phoneNumber,
      createdAt: now,
      updatedAt: now,
    };
    await db.schools.put(school);

    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      schoolId,
      email: payload.email,
      passwordHash: await sha256Hex(payload.password),
      role: payload.role || "admin",
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.staffUsers.put(user);

    return { userId, schoolId };
  },
  async createTask(req: CreateTaskRequest): Promise<CreateTaskResponse> {
    const now = new Date().toISOString();
    const taskRecord = {
      id: uuidv4(),
      assigneeId: req.assigneeId,
      schoolId: req.schoolId,
      taskNumber: `TASK-${Date.now()}`,
      title: req.title,
      description: req.description,
      category: req.category,
      priority: req.priority,
      status: "assigned" as const,
      createdAt: now,
      updatedAt: now,
    };
    await db.tasks.put(taskRecord);
    return { task: taskRecord };
  },
  async listTasks(assigneeId?: string): Promise<ListTasksResponse> {
    let query = db.tasks.orderBy('updatedAt').reverse();
    if (assigneeId) {
      query = db.tasks.where({ assigneeId }).reverse().sortBy('updatedAt');
    }
    const items = await query.toArray();
    return { items };
  },

  // FIFA Compliance
  async getFifaCompliance(academyId?: string): Promise<{ success: boolean; data: any[] }> {
    const academyParam = academyId ? `?academyId=${academyId}` : '';
    return http<{ success: boolean; data: any[] }>(`/fifa-compliance${academyParam}`);
  },

  async getFifaComplianceById(id: string): Promise<{ success: boolean; data: any }> {
    return http<{ success: boolean; data: any }>(`/fifa-compliance/${id}`);
  },

  async createFifaCompliance(data: any): Promise<{ success: boolean; data: any }> {
    return http<{ success: boolean; data: any }>('/fifa-compliance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFifaCompliance(id: string, data: any): Promise<{ success: boolean; data: any }> {
    return http<{ success: boolean; data: any }>(`/fifa-compliance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteFifaCompliance(id: string): Promise<{ success: boolean; message: string }> {
    return http<{ success: boolean; message: string }>(`/fifa-compliance/${id}`, {
      method: 'DELETE',
    });
  },

  // FIFA Compliance Documents
  async getFifaComplianceDocuments(complianceId?: string): Promise<{ success: boolean; data: any[] }> {
    const param = complianceId ? `?complianceId=${complianceId}` : '';
    return http<{ success: boolean; data: any[] }>(`/fifa-compliance/documents${param}`);
  },

  async createFifaComplianceDocument(data: any): Promise<{ success: boolean; data: any }> {
    return http<{ success: boolean; data: any }>('/fifa-compliance/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFifaComplianceDocument(id: string, data: any): Promise<{ success: boolean; data: any }> {
    return http<{ success: boolean; data: any }>(`/fifa-compliance/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteFifaComplianceDocument(id: string): Promise<{ success: boolean; message: string }> {
    return http<{ success: boolean; message: string }>(`/fifa-compliance/documents/${id}`, {
      method: 'DELETE',
    });
  },

  // FIFA Compliance Areas
  async getFifaComplianceAreas(): Promise<{ success: boolean; data: any[] }> {
    return http<{ success: boolean; data: any[] }>('/fifa-compliance/areas');
  },

  // FIFA Compliance Actions
  async getFifaComplianceActions(complianceId: string): Promise<{ success: boolean; data: any[] }> {
    return http<{ success: boolean; data: any[] }>(`/fifa-compliance/${complianceId}/actions`);
  },

  async createFifaComplianceAction(complianceId: string, data: any): Promise<{ success: boolean; data: any }> {
    return http<{ success: boolean; data: any }>(`/fifa-compliance/${complianceId}/actions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // FIFA Compliance Audits
  async getFifaComplianceAudits(complianceId: string): Promise<{ success: boolean; data: any[] }> {
    return http<{ success: boolean; data: any[] }>(`/fifa-compliance/${complianceId}/audits`);
  },

  async createFifaComplianceAudit(complianceId: string, data: any): Promise<{ success: boolean; data: any }> {
    return http<{ success: boolean; data: any }>(`/fifa-compliance/${complianceId}/audits`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // FIFA Compliance Comments
  async getFifaComplianceComments(complianceId: string): Promise<{ success: boolean; data: any[] }> {
    return http<{ success: boolean; data: any[] }>(`/fifa-compliance/${complianceId}/comments`);
  },

  async createFifaComplianceComment(complianceId: string, data: any): Promise<{ success: boolean; data: any }> {
    return http<{ success: boolean; data: any }>(`/fifa-compliance/${complianceId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // FIFA Compliance Dashboard
  async getFifaComplianceDashboard(academyId?: string): Promise<{ success: boolean; data: any }> {
    const academyParam = academyId ? `?academyId=${academyId}` : '';
    return http<{ success: boolean; data: any }>(`/fifa-compliance/dashboard${academyParam}`);
  },
};
export async function enqueueSync(op: Parameters<typeof db.syncQueue.add>[0]) {
  await db.syncQueue.add(op as any);
}

// Transfer API functions
const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

export async function getTransfers(academyId?: string, limit = 50, offset = 0, status?: string): Promise<{ success: boolean; data: Transfer[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (academyId) params.append('academyId', academyId);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (status) params.append('status', status);

    const response = await fetch(`${BASE_URL}/transfers?${params}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch transfers');
    }

    return result;
  } catch (error) {
    console.error('Error fetching transfers:', error);
    throw error;
  }
}

export async function getTransfer(transferId: string): Promise<{ success: boolean; data: Transfer }> {
  try {
    const response = await fetch(`${BASE_URL}/transfers/${transferId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch transfer');
    }

    return result;
  } catch (error) {
    console.error('Error fetching transfer:', error);
    throw error;
  }
}

export async function createTransfer(transferData: Partial<Transfer>): Promise<{ success: boolean; data: Transfer }> {
  try {
    // Transform the data to match the API expectations
    const apiData = {
      academy_id: transferData.academyId || transferData.academy_id,
      player_id: transferData.player_id,
      player_name: transferData.player_name,
      from_club: transferData.from_club,
      to_club: transferData.to_club,
      transfer_amount: transferData.transfer_amount,
      currency: transferData.currency,
      transfer_date: transferData.transfer_date,
      contract_start_date: transferData.contract_start_date,
      contract_end_date: transferData.contract_end_date,
      status: transferData.status,
      transfer_type: transferData.transfer_type,
      priority: transferData.priority,
      agent_name: transferData.agent_name,
      agent_fee: transferData.agent_fee,
      notes: transferData.notes,
      documents: transferData.documents,
      created_by: transferData.createdBy || transferData.created_by
    };

    console.log('API Data being sent to server:', apiData);

    const response = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create transfer');
    }

    return result;
  } catch (error) {
    console.error('Error creating transfer:', error);
    throw error;
  }
}

export async function updateTransfer(transferId: string, transferData: Partial<Transfer>): Promise<{ success: boolean; data: Transfer }> {
  try {
    // Transform the data to match the API expectations
    const apiData = {
      academy_id: transferData.academyId || transferData.academy_id,
      player_id: transferData.player_id,
      player_name: transferData.player_name,
      from_club: transferData.from_club,
      to_club: transferData.to_club,
      transfer_amount: transferData.transfer_amount,
      currency: transferData.currency,
      transfer_date: transferData.transfer_date,
      contract_start_date: transferData.contract_start_date,
      contract_end_date: transferData.contract_end_date,
      status: transferData.status,
      transfer_type: transferData.transfer_type,
      priority: transferData.priority,
      agent_name: transferData.agent_name,
      agent_fee: transferData.agent_fee,
      notes: transferData.notes,
      documents: transferData.documents,
      created_by: transferData.createdBy || transferData.created_by
    };

    const response = await fetch(`${BASE_URL}/transfers/${transferId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update transfer');
    }

    return result;
  } catch (error) {
    console.error('Error updating transfer:', error);
    throw error;
  }
}

export async function deleteTransfer(transferId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${BASE_URL}/transfers/${transferId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete transfer');
    }

    return result;
  } catch (error) {
    console.error('Error deleting transfer:', error);
    throw error;
  }
}

export async function getTransferStats(academyId?: string): Promise<{ success: boolean; data: any }> {
  try {
    const params = new URLSearchParams();
    if (academyId) params.append('academyId', academyId);

    const response = await fetch(`${BASE_URL}/transfers/stats?${params}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch transfer stats');
    }

    return result;
  } catch (error) {
    console.error('Error fetching transfer stats:', error);
    throw error;
  }
}

export async function getAcademyDashboardStats(academyId: string): Promise<{
  success: boolean;
  data: {
    totalPlayers: number;
    activeTransfers: number;
    monthlyRevenue: number;
    recentTransfers: {
      id: string;
      player: string;
      from: string;
      to: string;
      amount: string;
      date: string;
      status: 'pending' | 'approved' | 'completed' | 'rejected';
    }[];
    monthlyFinancialPerformance: {
      month: string;
      revenue: number;
      expenses: number;
      profit: number;
    }[];
  }
}> {
  try {
    const params = new URLSearchParams();
    params.append('academyId', academyId);

    const response = await fetch(`${BASE_URL}/dashboard/academy-stats?${params}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch academy dashboard stats');
    }

    return result;
  } catch (error) {
    console.error('Error fetching academy dashboard stats:', error);
    throw error;
  }
}

// Financial Transactions API

export interface FinancialTransaction {
  id?: number;
  academy_id: string; // Changed from number to string for UUID support
  transaction_type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  amount: number;
  description: string;
  transaction_date: string;
  payment_method?: string;
  reference_number?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  created_by?: string; // Also changed to string for UUID support
  created_at?: string;
  updated_at?: string;
}

export interface BudgetCategory {
  id?: number;
  academy_id: string; // Changed from number to string for UUID support
  category_name: string;
  category_type: 'revenue' | 'expense';
  budgeted_amount: number;
  spent_amount?: number;
  remaining_amount?: number;
  percentage_used?: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  fiscal_year: number;
  is_active: boolean;
  transaction_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: string;
  totalTransactions: number;
}

export interface FinancialTransactionsResponse {
  success: boolean;
  data: {
    transactions: FinancialTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export async function getFinancialTransactions(
  academyId: string,
  options: {
    page?: number;
    limit?: number;
    type?: 'income' | 'expense';
    category?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  } = {}
): Promise<FinancialTransactionsResponse> {
  try {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.type) params.append('type', options.type);
    if (options.category) params.append('category', options.category);
    if (options.status) params.append('status', options.status);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);
    if (options.search) params.append('search', options.search);

    const response = await fetch(`${BASE_URL}/financial-transactions/${academyId}?${params}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch financial transactions');
    }

    return result;
  } catch (error) {
    console.error('Error fetching financial transactions:', error);
    throw error;
  }
}

export async function createFinancialTransaction(transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data: FinancialTransaction }> {
  try {
    const response = await fetch(`${BASE_URL}/financial-transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create financial transaction');
    }

    return result;
  } catch (error) {
    console.error('Error creating financial transaction:', error);
    throw error;
  }
}

export async function updateFinancialTransaction(id: number, transaction: Partial<FinancialTransaction>): Promise<{ success: boolean; data: FinancialTransaction }> {
  try {
    const response = await fetch(`${BASE_URL}/financial-transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update financial transaction');
    }

    return result;
  } catch (error) {
    console.error('Error updating financial transaction:', error);
    throw error;
  }
}

export async function deleteFinancialTransaction(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${BASE_URL}/financial-transactions/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete financial transaction');
    }

    return result;
  } catch (error) {
    console.error('Error deleting financial transaction:', error);
    throw error;
  }
}

export async function getFinancialSummary(academyId: string, options: { period?: string; year?: number } = {}): Promise<{
  success: boolean;
  data: {
    summary: FinancialSummary;
    categoryBreakdown: Array<{
      transaction_type: string;
      category: string;
      total_amount: string;
      transaction_count: string;
    }>;
    monthlyBreakdown: Array<{
      month: number;
      transaction_type: string;
      total_amount: string;
    }>;
  };
}> {
  try {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.year) params.append('year', options.year.toString());

    const response = await fetch(`${BASE_URL}/financial-transactions/${academyId}/summary?${params}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch financial summary');
    }

    return result;
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    throw error;
  }
}

export async function getBudgetCategories(academyId: string, year?: number): Promise<{ success: boolean; data: BudgetCategory[] }> {
  try {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());

    const response = await fetch(`${BASE_URL}/financial-transactions/${academyId}/budget-categories?${params}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch budget categories');
    }

    return result;
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    throw error;
  }
}

export async function createBudgetCategory(academyId: string, category: Omit<BudgetCategory, 'id' | 'academy_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data: BudgetCategory }> {
  try {
    const response = await fetch(`${BASE_URL}/financial-transactions/${academyId}/budget-categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create budget category');
    }

    return result;
  } catch (error) {
    console.error('Error creating budget category:', error);
    throw error;
  }
}

export async function updateBudgetCategory(id: number, category: Partial<BudgetCategory>): Promise<{ success: boolean; data: BudgetCategory }> {
  try {
    const response = await fetch(`${BASE_URL}/financial-transactions/budget-categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update budget category');
    }

    return result;
  } catch (error) {
    console.error('Error updating budget category:', error);
    throw error;
  }
}

export async function deleteBudgetCategory(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${BASE_URL}/financial-transactions/budget-categories/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete budget category');
    }

    return result;
  } catch (error) {
    console.error('Error deleting budget category:', error);
    throw error;
  }
}

// ===== SUBSCRIPTION MANAGEMENT API =====

// Subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  playerLimit: number;
  features: string[];
  isActive: boolean;
  isFree: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  daysRemaining: number;
}

export interface SubscriptionUsage {
  playerCount: number;
  playerUsagePercentage: number;
}

export interface SubscriptionLimits {
  playerLimit: number;
}

export interface SubscriptionData {
  subscription: Subscription;
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
}

export interface SubscriptionHistory {
  id: string;
  action: string;
  reason: string;
  previousPlan?: string;
  newPlan?: string;
  createdAt: string;
}

export interface UpgradeSubscriptionRequest {
  planId: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CARD';
  paymentReference?: string;
  notes?: string;
}

// Get current academy subscription
export async function getCurrentSubscription(academyId?: string): Promise<SubscriptionData | null> {
  try {
    const url = academyId
      ? `${BASE_URL}/subscriptions/current?academyId=${academyId}`
      : `${BASE_URL}/subscriptions/current`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    const result = await response.json();

    // Handle 404 - No active subscription found
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get subscription details');
    }

    return result.data;
  } catch (error) {
    console.error('Error getting current subscription:', error);
    throw error;
  }
}



// Get available subscription plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const response = await fetch(`${BASE_URL}/subscriptions/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get subscription plans');
    }

    return result.data.plans;
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    throw error;
  }
}

// Upgrade subscription plan
export async function upgradeSubscription(upgradeData: UpgradeSubscriptionRequest): Promise<{
  subscription: Subscription;
  paymentId: string;
  paymentStatus: string;
}> {
  try {
    const response = await fetch(`${BASE_URL}/subscriptions/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(upgradeData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to upgrade subscription');
    }

    return result.data;
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    throw error;
  }
}

// Get subscription history
export async function getSubscriptionHistory(academyId?: string): Promise<SubscriptionHistory[]> {
  try {
    const url = academyId
      ? `${BASE_URL}/subscriptions/history?academyId=${academyId}`
      : `${BASE_URL}/subscriptions/history`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get subscription history');
    }

    return result.data.history;
  } catch (error) {
    console.error('Error getting subscription history:', error);
    throw error;
  }
}

// Process cash payment (Admin only)
export async function processCashPayment(paymentData: {
  paymentId: string;
  status: 'COMPLETED' | 'FAILED';
  processedBy: string;
  notes?: string;
}): Promise<{
  payment: {
    id: string;
    status: string;
    amount: number;
    paymentDate: string;
  };
}> {
  try {
    const response = await fetch(`${BASE_URL}/subscriptions/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to process payment');
    }

    return result.data;
  } catch (error) {
    console.error('Error processing cash payment:', error);
    throw error;
  }
}

// Cancel subscription
export async function cancelSubscription(reason?: string): Promise<{
  subscription: {
    id: string;
    status: string;
    autoRenew: boolean;
    endDate: string;
  };
}> {
  try {
    const response = await fetch(`${BASE_URL}/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ reason }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to cancel subscription');
    }

    return result.data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// Helper function to get auth token
function getAuthToken(): string {
  const sessionData = localStorage.getItem('ipims_auth_session');
  if (!sessionData) return '';

  try {
    const session = JSON.parse(sessionData);
    return session.tokens?.accessToken || '';
  } catch {
    return '';
  }
}
