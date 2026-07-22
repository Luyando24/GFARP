import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FinancialTransactionsManager from "./FinancialTransactionsManager";

const apiMocks = vi.hoisted(() => ({
  getFinancialTransactions: vi.fn(),
  getFinancialSummary: vi.fn(),
  getBudgetCategories: vi.fn(),
  getAcademyFinancialSettings: vi.fn(),
  getPlayerFeeSubscriptions: vi.fn(),
  getPlayers: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: apiMocks.toast }),
}));

vi.mock("@/lib/api", () => ({
  Api: { getPlayers: apiMocks.getPlayers },
  getFinancialTransactions: apiMocks.getFinancialTransactions,
  createFinancialTransaction: vi.fn(),
  updateFinancialTransaction: vi.fn(),
  deleteFinancialTransaction: vi.fn(),
  getFinancialSummary: apiMocks.getFinancialSummary,
  getBudgetCategories: apiMocks.getBudgetCategories,
  createBudgetCategory: vi.fn(),
  updateBudgetCategory: vi.fn(),
  deleteBudgetCategory: vi.fn(),
  getAcademyFinancialSettings: apiMocks.getAcademyFinancialSettings,
  updateAcademyFinancialSettings: vi.fn(),
  getPlayerFeeSubscriptions: apiMocks.getPlayerFeeSubscriptions,
  updatePlayerFeeSubscription: vi.fn(),
  processPlayerFeeReminders: vi.fn(),
}));

describe("FinancialTransactionsManager tab navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getFinancialTransactions.mockImplementation(() => new Promise(() => {}));
    apiMocks.getFinancialSummary.mockResolvedValue({
      data: {
        summary: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: "0",
          totalTransactions: 0,
        },
      },
    });
    apiMocks.getBudgetCategories.mockResolvedValue({ data: [] });
    apiMocks.getAcademyFinancialSettings.mockResolvedValue({
      default_currency: "USD",
      renewal_reminders_enabled: true,
      default_reminder_days: 7,
    });
    apiMocks.getPlayerFeeSubscriptions.mockResolvedValue([]);
    apiMocks.getPlayers.mockResolvedValue({
      success: true,
      data: {
        players: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
      },
    });
  });

  it("renders the selected tab immediately and refreshes its live data without a blocking loader", async () => {
    const { container } = render(
      <FinancialTransactionsManager academyId="academy-1" academyDetails={{ name: "Academy" }} />,
    );

    expect(screen.getByRole("button", { name: /^Player Fees$/ })).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeNull();

    await waitFor(() => expect(apiMocks.getPlayerFeeSubscriptions).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /^Recurring Fees$/ }));

    expect(screen.getByText("Recurring player fees")).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeNull();
    await waitFor(() => expect(apiMocks.getPlayerFeeSubscriptions).toHaveBeenCalledTimes(2));
  });

  it("shows action errors as auto-dismissible popup notifications", () => {
    apiMocks.getAcademyFinancialSettings.mockImplementation(() => new Promise(() => {}));
    apiMocks.getPlayerFeeSubscriptions.mockImplementation(() => new Promise(() => {}));

    render(
      <FinancialTransactionsManager academyId="academy-1" academyDetails={{ name: "Academy" }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Record Player Fee" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    expect(apiMocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Action failed",
      description: "Please fill in all required fields",
      variant: "destructive",
      duration: 6000,
    }));
  });
});
