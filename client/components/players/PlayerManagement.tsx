import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Progress } from "../ui/progress";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useToast } from "@/components/ui/use-toast";
import { getSession } from "@/lib/auth";
import { Api, getPlayerFeeSubscriptions, type PlayerFeeSubscription } from "@/lib/api";
import {
  filterPlayersByRecurringFees,
  type PlayerFeeFilter,
} from "@/lib/player-fee-filters";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  TrendingUp,
  Award,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  Activity,
  Star,
  Clock,
  Target,
  BarChart3,
  Loader2,
  Share2
} from "lucide-react";
import SubscriptionNotice from "../ui/SubscriptionNotice";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  position: string;
  email?: string;
  phone?: string;
  jerseyNumber?: number | string;
  height?: number;
  weight?: number;
  preferredFoot?: string;
  isActive?: boolean;
  isSelfRegistered?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

import AddPlayerStepForm from './AddPlayerStepForm';

// Player positions for dropdown
const playerPositions = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
  "Winger",
  "Striker",
  "Center Back",
  "Full Back",
  "Defensive Midfielder",
  "Attacking Midfielder"
];

import { uploadPlayerDocument } from "../../lib/document-upload";

const PlayerManagement = ({ searchQuery = "" }: { searchQuery?: string }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [showSubscriptionNotice, setShowSubscriptionNotice] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [feeFilter, setFeeFilter] = useState<PlayerFeeFilter>("all");
  const [feeRoster, setFeeRoster] = useState<Player[] | null>(null);
  const [feeSubscriptions, setFeeSubscriptions] = useState<PlayerFeeSubscription[]>([]);

  const academyData = JSON.parse(localStorage.getItem("academy_data") || "{}");
  const code = academyData?.code;
  const authSession = getSession() as any;
  const supportsAcademyFeeFilters = Boolean(authSession?.schoolId || authSession?.academyId);

  const handleCopyInviteLink = () => {
    if (!code) return;
    const inviteUrl = `${window.location.origin}/player/register?academyCode=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Invite link copied to clipboard!",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch the selected server page whenever regular pagination changes.
  useEffect(() => {
    if (feeFilter === "all") fetchPlayers();
  }, [currentPage, pageSize, feeFilter]);

  // Fee filters need the complete roster so players on later server pages are included.
  useEffect(() => {
    if (feeFilter !== "all" && feeRoster === null) {
      fetchRecurringFeeRoster();
    }
  }, [feeFilter, feeRoster]);

  // Fetch players from API
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      // Get current academy ID from auth session
      const session = JSON.parse(localStorage.getItem("ipims_auth_session") || "{}");
      const academyId = session?.schoolId || session?.academyId;
      const agencyId = session?.agencyId;
      const response = await Api.getPlayers(academyId, agencyId, currentPage, pageSize);
      if (response.success && response.data && Array.isArray(response.data.players)) {
        setPlayers(response.data.players as Player[]);
        setTotalPlayers(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);

        // A deletion can leave the current page beyond the new last page.
        if (response.data.pagination.totalPages > 0 && currentPage > response.data.pagination.totalPages) {
          setCurrentPage(response.data.pagination.totalPages);
        }
      } else {
        setPlayers([]);
        setTotalPlayers(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      // If API fails, start with empty array instead of mock data
      setPlayers([]);
      setTotalPlayers(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecurringFeeRoster = async () => {
    try {
      setLoading(true);
      const session = JSON.parse(localStorage.getItem("ipims_auth_session") || "{}");
      const academyId = session?.schoolId || session?.academyId;

      if (!academyId) {
        setFeeRoster([]);
        setFeeSubscriptions([]);
        return;
      }

      const [firstPage, subscriptions] = await Promise.all([
        Api.getPlayers(academyId, undefined, 1, 100),
        getPlayerFeeSubscriptions(academyId),
      ]);

      if (!firstPage.success || !Array.isArray(firstPage.data?.players)) {
        throw new Error(firstPage.message || "Failed to fetch academy players");
      }

      const remainingPages = Array.from(
        { length: Math.max(0, firstPage.data.pagination.totalPages - 1) },
        (_, index) => index + 2,
      );
      const remainingResponses = await Promise.all(
        remainingPages.map((page) => Api.getPlayers(academyId, undefined, page, 100)),
      );
      const completeRoster = [
        ...(firstPage.data.players as Player[]),
        ...remainingResponses.flatMap((response) =>
          response.success && Array.isArray(response.data?.players)
            ? response.data.players as Player[]
            : [],
        ),
      ];

      setFeeRoster(completeRoster);
      setFeeSubscriptions(subscriptions);
    } catch (error) {
      console.error("Error fetching recurring player fees:", error);
      setFeeRoster([]);
      setFeeSubscriptions([]);
      toast({
        title: "Unable to filter player fees",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    if (!dateOfBirth || Number.isNaN(birthDate.getTime())) return null;
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Open add player dialog
  const openAddPlayerDialog = async () => {
    // Check subscription limit before opening dialog
    try {
      const session = getSession() as any;
      const academyId = session?.schoolId || session?.academyId || session?.agencyId;

      if (!academyId) {
        toast({
          title: "Error",
          description: "Could not find organization information. Please try logging in again.",
          variant: "destructive"
        });
        return;
      }

      // Check current subscription and player count
      const result = await Api.get<any>('/subscriptions/current');

      if (result.success && result.data) {
        if (!result.data.subscription) {
          setSubscriptionError(
            'No active subscription was found for this academy. Choose a plan before adding players.'
          );
          setShowSubscriptionNotice(true);
          return;
        }

        const playerCount = result.data.usage?.playerCount || 0;
        const playerLimit = result.data.limits?.playerLimit;

        // Check if limit is reached
        if (typeof playerLimit === 'number' && playerLimit !== -1 && playerCount >= playerLimit) {
          setSubscriptionError(
            `Player limit reached. Your current plan allows ${playerLimit} player${playerLimit !== 1 ? 's' : ''}. Please upgrade your subscription to add more players.`
          );
          setShowSubscriptionNotice(true);
          return; // Don't open the dialog
        }
      }

      // If we're within limits, open the dialog
      setIsAddPlayerOpen(true);
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      // If check fails, still allow opening the dialog
      // The backend will validate again on submission
      setIsAddPlayerOpen(true);
    }
  };

  // Add new player
  const addPlayer = async (playerData: any) => {
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem("ipims_auth_session") || "{}");
      const academyId = session?.schoolId || session?.academyId;
      const agencyId = session?.agencyId;

      if (!academyId && !agencyId) {
        toast({
          title: "Error",
          description: "Could not find organization information. Please try logging in again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const localPhone = playerData.phone || '';
      const phoneDigits = localPhone.replace(/\D/g, '');
      const phoneCode = playerData.phoneCountryCode || '';
      const combinedPhone = phoneDigits ? `${phoneCode}${phoneDigits}` : null;

      const response = await Api.createPlayer({
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        dateOfBirth: playerData.dateOfBirth,
        position: playerData.position,
        email: playerData.email || null,
        phone: combinedPhone,
        jerseyNumber: playerData.jerseyNumber ? parseInt(playerData.jerseyNumber) : null,
        academyId,
        agencyId,
        // Additional fields to persist
        nationality: playerData.nationality,
        height: playerData.height,
        weight: playerData.weight,
        currentClub: playerData.currentClub,
        trainingStartDate: playerData.trainingStartDate,
        trainingEndDate: playerData.trainingEndDate,
        internalNotes: playerData.internalNotes
      } as any);

      if (response.success) {
        // Handle document uploads if any exist
        if (playerData.uploadedDocuments) {
          const playerId = (response.data as any).player?.id || (response.data as any).id;

          if (playerId) {
            const documentTypes = Object.keys(playerData.uploadedDocuments) as Array<keyof typeof playerData.uploadedDocuments>;

            // Upload documents in parallel
            await Promise.all(documentTypes.map(async (docType) => {
              const file = playerData.uploadedDocuments![docType];
              if (file) {
                // Map camelCase to snake_case for the API
                const mappedType = {
                  passportId: 'passport_id',
                  playerPhoto: 'player_photo',
                  proofOfTraining: 'proof_of_training',
                  birthCertificate: 'birth_certificate'
                }[docType] as any;

                if (mappedType) {
                  try {
                    await uploadPlayerDocument(playerId, file, mappedType);
                  } catch (error) {
                    console.error(`Failed to upload ${String(docType)}:`, error);
                  }
                }
              }
            }));
          }
        }

        toast({
          title: "Success",
          description: "Player added successfully"
        });

        // Refresh the player list after a short delay
        setTimeout(() => {
          if (feeFilter === "all") fetchPlayers();
          else setFeeRoster(null);
        }, 500); // 500ms delay
        setIsAddPlayerOpen(false);
      } else {
        throw new Error(response.message || 'Failed to create player');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";

      if (errorMessage.includes('Player limit reached') || errorMessage.includes('subscription') || errorMessage.includes('No active subscription')) {
        setSubscriptionError(errorMessage);
        setShowSubscriptionNotice(true);
        setIsAddPlayerOpen(false);
      } else {
        console.error('Error creating player:', error);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
      throw error; // Re-throw error so the form component knows submission failed
    } finally {
      setLoading(false);
    }
  };

  // Delete player
  const deletePlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to delete this player?")) return;

    setLoading(true);
    try {
      const response = await Api.deletePlayer(playerId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Player deleted successfully"
        });
        if (feeFilter === "all") fetchPlayers();
        else setFeeRoster(null);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to delete player",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting player:", error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  const recurringFeePlayers = feeFilter === "all"
    ? []
    : filterPlayersByRecurringFees(
        feeRoster || [],
        feeSubscriptions,
        feeFilter,
      );
  const displayedTotalPlayers = feeFilter === "all" ? totalPlayers : recurringFeePlayers.length;
  const displayedTotalPages = feeFilter === "all"
    ? totalPages
    : Math.ceil(displayedTotalPlayers / pageSize);
  const displayedPlayers = feeFilter === "all"
    ? players
    : recurringFeePlayers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filter the currently displayed page based on the dashboard search query.
  const filteredPlayers = displayedPlayers.filter(player => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
    const position = player.position?.toLowerCase() || '';
    const email = player.email?.toLowerCase() || '';

    return fullName.includes(query) ||
      position.includes(query) ||
      email.includes(query);
  });

  const feeFilterDescription = feeFilter === "active"
    ? `${displayedTotalPlayers} player${displayedTotalPlayers === 1 ? "" : "s"} with active recurring academy fees`
    : feeFilter === "expiring"
      ? `${displayedTotalPlayers} player${displayedTotalPlayers === 1 ? "" : "s"} with recurring fees due within their reminder window`
      : `Manage all ${displayedTotalPlayers} academy player${displayedTotalPlayers === 1 ? "" : "s"} and their information`;

  const handleFeeFilterChange = (value: string) => {
    const nextFilter = value as PlayerFeeFilter;
    if (feeFilter === "all" && nextFilter !== "all") setFeeRoster(null);
    setFeeFilter(nextFilter);
    setCurrentPage(1);
  };

  return (
    <>
      {/* Subscription Notice */}
      {showSubscriptionNotice && (
        <div className="mb-6">
          <SubscriptionNotice
            title="Subscription Required"
            message={subscriptionError || "You've reached your current plan's limit. Upgrade to continue adding players and unlock more features."}
            onUpgradeClick={() => {
              // Navigate to academy dashboard subscription tab
              navigate('/academy-dashboard?tab=subscription');
            }}
            onDismiss={() => setShowSubscriptionNotice(false)}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Player Management</h2>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {code && (
            <Button variant="outline" onClick={handleCopyInviteLink} className="border-green-600 text-green-600 hover:bg-green-50 dark:border-green-500 dark:text-green-500 dark:hover:bg-slate-800">
              <Share2 className="h-4 w-4 mr-2" />
              {copied ? "Copied!" : "Copy Invite Link"}
            </Button>
          )}
          <Button onClick={openAddPlayerDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Players</CardTitle>
          <CardDescription>
            {feeFilterDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supportsAcademyFeeFilters && (
            <Tabs value={feeFilter} onValueChange={handleFeeFilterChange} className="mb-6 min-w-0">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1 sm:max-w-2xl">
                  <TabsTrigger value="all" className="shrink-0 py-2.5">All players</TabsTrigger>
                  <TabsTrigger value="active" className="shrink-0 py-2.5">Active academy fees</TabsTrigger>
                  <TabsTrigger value="expiring" className="shrink-0 py-2.5">Fees expiring soon</TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          )}

          {loading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && filteredPlayers.length === 0 && displayedPlayers.length > 0 && (
            <div className="text-center py-8 text-slate-500">
              No players found matching your search criteria.
            </div>
          )}

          {!loading && displayedPlayers.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              {feeFilter === "active"
                ? "No players have active recurring academy fees."
                : feeFilter === "expiring"
                  ? "No recurring academy fees are expiring soon."
                  : "No players found. Add your first player to get started."}
            </div>
          )}

          {!loading && filteredPlayers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Position</TableHead>

                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => {
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        {player.firstName} {player.lastName}
                        {player.isSelfRegistered && (
                          <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-slate-800 dark:text-blue-400">
                            Self-Registered
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{calculateAge(player.dateOfBirth) ?? "—"}</TableCell>
                      <TableCell>{player.position}</TableCell>
                      <TableCell>
                        <Badge variant={player.isActive ? 'default' : 'destructive'}>
                          {player.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/academy-dashboard/player-details/${player.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/academy-dashboard/player-details/${player.id}?edit=true`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deletePlayer(player.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!loading && displayedTotalPlayers > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[72px]" aria-label="Rows per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>
                  {displayedTotalPlayers === 0
                    ? "0 players"
                    : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, displayedTotalPlayers)} of ${displayedTotalPlayers}`}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span className="min-w-[84px] text-center text-sm text-slate-600 dark:text-slate-400">
                  Page {currentPage} of {Math.max(displayedTotalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(displayedTotalPages, page + 1))}
                  disabled={currentPage >= displayedTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Player Step Form */}
      <AddPlayerStepForm
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
        onSubmit={addPlayer}
        loading={loading}
      />
    </>
  );
};

export default PlayerManagement;
