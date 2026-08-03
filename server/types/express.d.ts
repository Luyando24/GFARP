declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        role: string;
        academyId?: string;
        schoolId?: string;
      };
    }
  }
}

export {};
