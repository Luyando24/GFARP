import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building, 
  UserCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  ExternalLink, 
  Shield, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Info,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export interface AdminPlayerItem {
  id: string;
  playerCardId?: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName?: string | null;
  email: string;
  phone: string;
  position: string;
  jerseyNumber?: number | null;
  dateOfBirth?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  preferredFoot?: string | null;
  photoUrl?: string | null;
  slug?: string | null;
  currentClub?: string | null;
  nationality?: string | null;
  gender?: string | null;
  academyId?: string | null;
  academyName: string;
  isSelfRegistered: boolean;
  createdAt: string;
}

export default function AllPlayersManagement() {
  const { toast } = useToast();
  const [players, setPlayers] = useState<AdminPlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [registrationType, setRegistrationType] = useState('all');
  const [selectedAcademyFilter, setSelectedAcademyFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  
  // Selected player for details modal
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayerItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchAllPlayers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('ipims_auth_session') 
        ? JSON.parse(localStorage.getItem('ipims_auth_session')!).tokens?.accessToken 
        : localStorage.getItem('football-auth-token');

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/football-players/all-admin', { headers });
      const data = await res.json();

      if (data.success && data.data?.players) {
        setPlayers(data.data.players);
      } else {
        toast({
          title: "Error loading players",
          description: data.message || "Could not fetch players list",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Failed to fetch all admin players:', err);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPlayers();
  }, []);

  // Unique academies for filter dropdown
  const academyOptions = Array.from(
    new Map(
      players
        .filter(p => p.academyId && p.academyName)
        .map(p => [p.academyId, p.academyName])
    ).entries()
  );

  // Filtering
  const filteredPlayers = players.filter(player => {
    // Search query
    const searchLower = search.toLowerCase().trim();
    const matchesSearch = !searchLower || (
      player.fullName.toLowerCase().includes(searchLower) ||
      player.email.toLowerCase().includes(searchLower) ||
      player.phone.toLowerCase().includes(searchLower) ||
      player.position.toLowerCase().includes(searchLower) ||
      player.academyName.toLowerCase().includes(searchLower) ||
      (player.currentClub && player.currentClub.toLowerCase().includes(searchLower)) ||
      (player.playerCardId && player.playerCardId.toLowerCase().includes(searchLower)) ||
      (player.nationality && player.nationality.toLowerCase().includes(searchLower))
    );

    // Registration Type filter
    const matchesType = 
      registrationType === 'all' ? true :
      registrationType === 'academy' ? !player.isSelfRegistered :
      registrationType === 'individual' ? player.isSelfRegistered : true;

    // Academy Filter
    const matchesAcademy = 
      selectedAcademyFilter === 'all' ? true :
      selectedAcademyFilter === 'none' ? !player.academyId :
      player.academyId === selectedAcademyFilter;

    // Position Filter
    const matchesPosition = 
      positionFilter === 'all' ? true :
      player.position.toLowerCase().includes(positionFilter.toLowerCase());

    return matchesSearch && matchesType && matchesAcademy && matchesPosition;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredPlayers.length / pageSize) || 1;
  const paginatedPlayers = filteredPlayers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation
  const totalCount = players.length;
  const academyCount = players.filter(p => !p.isSelfRegistered).length;
  const individualCount = players.filter(p => p.isSelfRegistered).length;

  const handleOpenDetails = (player: AdminPlayerItem) => {
    setSelectedPlayer(player);
    setIsDetailsOpen(true);
  };

  const getInitials = (name: string) => {
    return (name || 'P')
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            All Players Directory
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive list of all registered players and their affiliated academies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllPlayers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Players</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalCount}</p>
                <p className="text-xs text-slate-500 mt-1">Across system database</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-full">
                <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Academy Managed</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{academyCount}</p>
                <p className="text-xs text-green-600 font-medium mt-1">Enrolled in academies</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/40 rounded-full">
                <Building className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Self-Registered / Direct</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{individualCount}</p>
                <p className="text-xs text-indigo-600 font-medium mt-1">Individual player accounts</p>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-full">
                <UserCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-500" />
            Search & Filter Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Search Query</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Name, email, position, club..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Registration Type Filter */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Registration Type</label>
              <Select value={registrationType} onValueChange={(val) => { setRegistrationType(val); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Registration Types</SelectItem>
                  <SelectItem value="academy">Academy Enrolled Only</SelectItem>
                  <SelectItem value="individual">Self-Registered Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Academy Filter */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Filter by Academy</label>
              <Select value={selectedAcademyFilter} onValueChange={(val) => { setSelectedAcademyFilter(val); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Academies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Academies</SelectItem>
                  <SelectItem value="none">Independent (No Academy)</SelectItem>
                  {academyOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id!}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position Filter */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Position</label>
              <Select value={positionFilter} onValueChange={(val) => { setPositionFilter(val); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="forward">Forward / Striker</SelectItem>
                  <SelectItem value="midfield">Midfielder</SelectItem>
                  <SelectItem value="defender">Defender</SelectItem>
                  <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                  <SelectItem value="winger">Winger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Players Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Players ({filteredPlayers.length})</CardTitle>
            <CardDescription>Showing {paginatedPlayers.length} of {filteredPlayers.length} matching players</CardDescription>
          </div>
          {(search || registrationType !== 'all' || selectedAcademyFilter !== 'all' || positionFilter !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-blue-600 hover:text-blue-800"
              onClick={() => {
                setSearch('');
                setRegistrationType('all');
                setSelectedAcademyFilter('all');
                setPositionFilter('all');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-blue-600" />
              <p className="font-medium">Loading all players from system database...</p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <User className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-semibold">No players found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search query or filter options</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                    <TableHead className="font-semibold">Player</TableHead>
                    <TableHead className="font-semibold">Affiliated Academy</TableHead>
                    <TableHead className="font-semibold">Position & Foot</TableHead>
                    <TableHead className="font-semibold">Age / DOB</TableHead>
                    <TableHead className="font-semibold">Registration</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPlayers.map((player) => (
                    <TableRow key={player.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Player Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-slate-200 shadow-sm">
                            <AvatarImage src={player.photoUrl || undefined} alt={player.fullName} />
                            <AvatarFallback className="bg-slate-200 text-slate-700 font-bold">
                              {getInitials(player.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                              {player.fullName}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              {player.email && <span>{player.email}</span>}
                              {player.phone && <span>• {player.phone}</span>}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* CLEAR ACADEMY BELONGING DISPLAY */}
                      <TableCell>
                        {player.academyId ? (
                          <div className="flex items-center gap-1.5">
                            <Building className="h-4 w-4 text-blue-600 shrink-0" />
                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 font-medium dark:bg-blue-900/30 dark:text-blue-300">
                              {player.academyName}
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                              Independent Player
                            </Badge>
                          </div>
                        )}
                      </TableCell>

                      {/* Position & Foot */}
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="font-medium text-xs">
                            {player.position}
                          </Badge>
                          {player.preferredFoot && (
                            <span className="text-[11px] text-slate-500 block">
                              Foot: {player.preferredFoot}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Age / DOB */}
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {player.age !== null && player.age !== undefined ? `${player.age} yrs` : 'N/A'}
                          </p>
                          {player.dateOfBirth && (
                            <p className="text-xs text-slate-500">{player.dateOfBirth}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Registration Type */}
                      <TableCell>
                        {player.isSelfRegistered ? (
                          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-normal text-xs dark:bg-indigo-900/30 dark:text-indigo-300">
                            Direct Signup
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200 font-normal text-xs dark:bg-green-900/30 dark:text-green-300">
                            Academy Roster
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Player Profile"
                            onClick={() => handleOpenDetails(player)}
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>

                          {player.slug && (
                            <a 
                              href={`/${player.slug}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              title="View Public Profile Page"
                            >
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4 text-slate-500" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredPlayers.length > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages} ({filteredPlayers.length} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Player Profile Details
            </DialogTitle>
            <DialogDescription>Full record details for {selectedPlayer?.fullName}</DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-6">
              {/* Header profile block */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                  <AvatarImage src={selectedPlayer.photoUrl || undefined} alt={selectedPlayer.fullName} />
                  <AvatarFallback className="bg-blue-600 text-white font-bold text-xl">
                    {getInitials(selectedPlayer.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedPlayer.fullName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge className="bg-blue-600 text-white">{selectedPlayer.position}</Badge>
                    <Badge variant="outline" className="bg-white dark:bg-slate-900">
                      🏫 {selectedPlayer.academyName}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Belonging Academy</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPlayer.academyName}
                  </span>
                </div>

                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Registration Mode</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPlayer.isSelfRegistered ? 'Individual Signup' : 'Academy Roster'}
                  </span>
                </div>

                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Age / DOB</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPlayer.age ? `${selectedPlayer.age} yrs` : 'N/A'} {selectedPlayer.dateOfBirth ? `(${selectedPlayer.dateOfBirth})` : ''}
                  </span>
                </div>

                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Email Address</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">
                    {selectedPlayer.email || 'N/A'}
                  </span>
                </div>

                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Phone</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPlayer.phone || 'N/A'}
                  </span>
                </div>

                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Preferred Foot</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPlayer.preferredFoot || 'N/A'}
                  </span>
                </div>

                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Height / Weight</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPlayer.height ? `${selectedPlayer.height} cm` : 'N/A'} / {selectedPlayer.weight ? `${selectedPlayer.weight} kg` : 'N/A'}
                  </span>
                </div>

                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Current Club</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPlayer.currentClub || 'N/A'}
                  </span>
                </div>

                <div className="p-3 border rounded-md">
                  <span className="text-xs text-slate-500 block">Nationality</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPlayer.nationality || 'N/A'}
                  </span>
                </div>
              </div>

              {selectedPlayer.slug && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Public Profile Link:</span>
                  <a 
                    href={`/${selectedPlayer.slug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    /{selectedPlayer.slug} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
