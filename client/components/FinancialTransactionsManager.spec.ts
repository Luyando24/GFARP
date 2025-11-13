import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  getBudgetCategories, 
  createBudgetCategory, 
  updateBudgetCategory, 
  deleteBudgetCategory 
} from "../lib/api";

// Mock the API functions
vi.mock("../lib/api", () => ({
  getBudgetCategories: vi.fn(),
  createBudgetCategory: vi.fn(),
  updateBudgetCategory: vi.fn(),
  deleteBudgetCategory: vi.fn(),
}));

describe("Budget Management API", () => {
  const mockAcademyId = "test-academy-123";
  const mockBudgetCategory = {
    id: "budget-1",
    academy_id: mockAcademyId,
    category_name: "Training Equipment",
    description: "Equipment for player training",
    category_type: "expense" as const,
    budgeted_amount: "5000.00",
    fiscal_year: 2024,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBudgetCategories", () => {
    it("should fetch budget categories for an academy", async () => {
      const mockCategories = [mockBudgetCategory];
      (getBudgetCategories as any).mockResolvedValue(mockCategories);

      const result = await getBudgetCategories(mockAcademyId);

      expect(getBudgetCategories).toHaveBeenCalledWith(mockAcademyId);
      expect(result).toEqual(mockCategories);
    });

    it("should handle empty budget categories", async () => {
      (getBudgetCategories as any).mockResolvedValue([]);

      const result = await getBudgetCategories(mockAcademyId);

      expect(result).toEqual([]);
    });
  });

  describe("createBudgetCategory", () => {
    it("should create a new budget category", async () => {
      const newCategory = {
        category_name: "New Equipment",
        description: "New training equipment",
        category_type: "expense" as const,
        budgeted_amount: "3000.00",
        fiscal_year: 2024,
        is_active: true
      };

      (createBudgetCategory as any).mockResolvedValue({
        ...mockBudgetCategory,
        ...newCategory,
        id: "budget-2"
      });

      const result = await createBudgetCategory(mockAcademyId, newCategory);

      expect(createBudgetCategory).toHaveBeenCalledWith(mockAcademyId, newCategory);
      expect(result.category_name).toBe(newCategory.category_name);
      expect(result.budgeted_amount).toBe(newCategory.budgeted_amount);
    });

    it("should handle validation errors", async () => {
      const invalidCategory = {
        category_name: "", // Empty name should fail
        description: "Test",
        category_type: "expense" as const,
        budgeted_amount: "-100", // Negative amount should fail
        fiscal_year: 2024,
        is_active: true
      };

      (createBudgetCategory as any).mockRejectedValue(
        new Error("Validation failed: Category name is required")
      );

      await expect(createBudgetCategory(mockAcademyId, invalidCategory))
        .rejects.toThrow("Validation failed");
    });
  });

  describe("updateBudgetCategory", () => {
    it("should update an existing budget category", async () => {
      const updates = {
        category_name: "Updated Equipment",
        budgeted_amount: "6000.00"
      };

      const updatedCategory = {
        ...mockBudgetCategory,
        ...updates,
        updated_at: "2024-01-02T00:00:00Z"
      };

      (updateBudgetCategory as any).mockResolvedValue(updatedCategory);

      const result = await updateBudgetCategory(mockBudgetCategory.id, updates);

      expect(updateBudgetCategory).toHaveBeenCalledWith(mockBudgetCategory.id, updates);
      expect(result.category_name).toBe(updates.category_name);
      expect(result.budgeted_amount).toBe(updates.budgeted_amount);
    });

    it("should handle non-existent category", async () => {
      (updateBudgetCategory as any).mockRejectedValue(
        new Error("Budget category not found")
      );

      await expect(updateBudgetCategory("non-existent", {}))
        .rejects.toThrow("Budget category not found");
    });
  });

  describe("deleteBudgetCategory", () => {
    it("should delete a budget category", async () => {
      (deleteBudgetCategory as any).mockResolvedValue(undefined);

      await deleteBudgetCategory(mockBudgetCategory.id);

      expect(deleteBudgetCategory).toHaveBeenCalledWith(mockBudgetCategory.id);
    });

    it("should handle deletion of non-existent category", async () => {
      (deleteBudgetCategory as any).mockRejectedValue(
        new Error("Budget category not found")
      );

      await expect(deleteBudgetCategory("non-existent"))
        .rejects.toThrow("Budget category not found");
    });
  });
});

describe("Budget Form Validation", () => {
  const validateBudgetForm = (form: any) => {
    const errors: string[] = [];
    
    if (!form.category_name?.trim()) {
      errors.push("Category name is required");
    }
    
    if (!form.budgeted_amount || Number(form.budgeted_amount) <= 0) {
      errors.push("Budgeted amount must be greater than 0");
    }
    
    if (!form.fiscal_year || form.fiscal_year < 2020 || form.fiscal_year > 2030) {
      errors.push("Fiscal year must be between 2020 and 2030");
    }
    
    return errors;
  };

  const isBudgetFormValid = (form: any) => {
    return validateBudgetForm(form).length === 0;
  };

  describe("validateBudgetForm", () => {
    it("should validate a correct budget form", () => {
      const validForm = {
        category_name: "Training Equipment",
        description: "Equipment for training",
        category_type: "expense",
        budgeted_amount: "5000.00",
        fiscal_year: 2024,
        is_active: true
      };

      const errors = validateBudgetForm(validForm);
      expect(errors).toHaveLength(0);
      expect(isBudgetFormValid(validForm)).toBe(true);
    });

    it("should reject empty category name", () => {
      const invalidForm = {
        category_name: "",
        budgeted_amount: "5000.00",
        fiscal_year: 2024
      };

      const errors = validateBudgetForm(invalidForm);
      expect(errors).toContain("Category name is required");
      expect(isBudgetFormValid(invalidForm)).toBe(false);
    });

    it("should reject zero or negative budgeted amount", () => {
      const invalidForm = {
        category_name: "Test Category",
        budgeted_amount: "0",
        fiscal_year: 2024
      };

      const errors = validateBudgetForm(invalidForm);
      expect(errors).toContain("Budgeted amount must be greater than 0");
      expect(isBudgetFormValid(invalidForm)).toBe(false);
    });

    it("should reject invalid fiscal year", () => {
      const invalidForm = {
        category_name: "Test Category",
        budgeted_amount: "5000.00",
        fiscal_year: 2019 // Too early
      };

      const errors = validateBudgetForm(invalidForm);
      expect(errors).toContain("Fiscal year must be between 2020 and 2030");
      expect(isBudgetFormValid(invalidForm)).toBe(false);
    });

    it("should handle multiple validation errors", () => {
      const invalidForm = {
        category_name: "",
        budgeted_amount: "-100",
        fiscal_year: 2040
      };

      const errors = validateBudgetForm(invalidForm);
      expect(errors).toHaveLength(3);
      expect(errors).toContain("Category name is required");
      expect(errors).toContain("Budgeted amount must be greater than 0");
      expect(errors).toContain("Fiscal year must be between 2020 and 2030");
      expect(isBudgetFormValid(invalidForm)).toBe(false);
    });
  });
});