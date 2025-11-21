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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useToast } from "../../hooks/use-toast";
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
  Loader2
} from "lucide-react";
import { Api } from "../../lib/api";
import SubscriptionNotice from "../ui/SubscriptionNotice";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  position: string;
  email?: string;
  phone?: string;
  jerseyNumber?: number;
  height?: number;
  weight?: number;
  preferredFoot?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

const PlayerManagement = ({ searchQuery = "" }: { searchQuery?: string }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [showSubscriptionNotice, setShowSubscriptionNotice] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string>("");

  // Fetch players on component mount
  useEffect(() => {
    fetchPlayers();
  }, []);

  // Fetch players from API
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      // Get current academy ID from auth session
      const session = JSON.parse(localStorage.getItem("ipims_auth_session") || "{}");
      const academyId = session?.schoolId || session?.academyId;
      const response = await Api.getPlayers(academyId);
      if (response.success && response.data && Array.isArray((response as any).data.players)) {
        // Server returns { data: { players: [...] } }
        setPlayers((response as any).data.players);
      } else if (response.success && Array.isArray((response as any).data)) {
        // Fallback: server returns a plain array
        setPlayers((response as any).data);
      } else {
        // If API fails or unexpected shape, start with empty array
        setPlayers([]);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      // If API fails, start with empty array instead of mock data
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Open add player dialog
  const openAddPlayerDialog = () => {
    setIsAddPlayerOpen(true);
  };

  // Add new player
  const addPlayer = async (playerData: any) => {
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem("ipims_auth_session") || "{}");
      const academyId = session?.schoolId || session?.academyId;

      if (!academyId) {
        toast({
          title: "Error",
          description: "Could not find academy information. Please try logging in again.",
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
        academyId
      } as any);

      if (response.success) {
        toast({
          title: "Success",
          description: "Player added successfully"
        });

        // Refresh the player list after a short delay
        setTimeout(() => {
          fetchPlayers();
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
        fetchPlayers();
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



  // Filter players based on search query
  const filteredPlayers = players.filter(player => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
    const position = player.position?.toLowerCase() || '';
    const email = player.email?.toLowerCase() || '';

    return fullName.includes(query) ||
      position.includes(query) ||
      email.includes(query);
  });

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

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Player Management</h2>
        <Button onClick={openAddPlayerDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Players</CardTitle>
          <CardDescription>Manage your academy players and their information</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && filteredPlayers.length === 0 && players.length > 0 && (
            <div className="text-center py-8 text-slate-500">
              No players found matching your search criteria.
            </div>
          )}

          {!loading && players.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No players found. Add your first player to get started.
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
                      <TableCell className="font-medium">{player.firstName} {player.lastName}</TableCell>
                      <TableCell>{calculateAge(player.dateOfBirth)}</TableCell>
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