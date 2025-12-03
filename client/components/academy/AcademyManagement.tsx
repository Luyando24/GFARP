import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Building,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  Filter,
  Clock
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface Academy {
  id: string;
  name: string;
  email: string;
  contactPerson: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  licenseNumber?: string;
  foundedYear?: number;
  website?: string;
  description?: string;
  isActive: boolean;
  isVerified: boolean;
  storageUsed: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    players: number;
    subscriptions: number;
  };
}

interface AcademyFormData {
  name: string;
  email: string;
  password?: string;
  contactPerson: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  licenseNumber: string;
  foundedYear: string;
  website: string;
  description: string;
}

interface AcademyStats {
  totalAcademies: number;
  activeAcademies: number;
  verifiedAcademies: number;
  totalPlayers: number;
  recentRegistrations: number;
  inactiveAcademies: number;
  unverifiedAcademies: number;
}

export default function AcademyManagement() {
  const navigate = useNavigate();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [stats, setStats] = useState<AcademyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Bulk selection state
  const [selectedAcademies, setSelectedAcademies] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Admin state
  const [adminEmail, setAdminEmail] = useState('admin@system.com'); // Default admin email

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);

  // Form state
  const [formData, setFormData] = useState<AcademyFormData>({
    name: '',
    email: '',
    password: '',
    contactPerson: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    licenseNumber: '',
    foundedYear: '',
    website: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<AcademyFormData>>({});

  const { toast } = useToast();

  // Fetch academies
  const fetchAcademies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(countryFilter !== 'all' && { country: countryFilter })
      });

      const response = await fetch(`/api/academies?${params}`);
      const data = await response.json();

      if (data.success) {
        setAcademies(data.data.academies);
        setTotalPages(data.data.pagination.pages);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching academies:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch academies',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch academy statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/academies/stats/overview');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchAcademies();
    fetchStats();
  }, [currentPage, searchTerm, statusFilter, countryFilter]);

  // Form validation
  const validateForm = (data: AcademyFormData): Partial<AcademyFormData> => {
    const errors: Partial<AcademyFormData> = {};

    if (!data.name.trim()) errors.name = 'Academy name is required';
    if (!data.email.trim()) errors.email = 'Email is required';
    if (!data.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!data.phone.trim()) errors.phone = 'Phone number is required';
    if (!data.address.trim()) errors.address = 'Address is required';
    if (!data.city.trim()) errors.city = 'City is required';
    if (!data.country.trim()) errors.country = 'Country is required';

    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email format';
    }

    // Website validation
    if (data.website && !/^https?:\/\/.+/.test(data.website)) {
      errors.website = 'Website must start with http:// or https://';
    }

    // Founded year validation
    if (data.foundedYear) {
      const year = parseInt(data.foundedYear);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        errors.foundedYear = `Founded year must be between 1800 and ${currentYear}`;
      }
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (isEdit = false) => {
    const errors = validateForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const url = isEdit ? `/api/academies/${selectedAcademy?.id}` : '/api/academies';
      const method = isEdit ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined
      };

      // Remove password from edit requests if empty
      if (isEdit && !formData.password) {
        delete submitData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message
        });

        setIsCreateOpen(false);
        setIsEditOpen(false);
        resetForm();
        fetchAcademies();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save academy',
        variant: 'destructive'
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedAcademy) return;

    try {
      const response = await fetch(`/api/academies/${selectedAcademy.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message
        });

        setIsDeleteOpen(false);
        setSelectedAcademy(null);
        fetchAcademies();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error deleting academy:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete academy',
        variant: 'destructive'
      });
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (academy: Academy, isActive: boolean) => {
    const reason = prompt(`Please provide a reason for ${isActive ? 'activating' : 'deactivating'} ${academy.name}:`);

    if (reason === null) {
      // User cancelled the prompt
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for this action',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`/api/academies/${academy.id}/activate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive,
          reason: reason.trim(),
          adminEmail
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message
        });

        fetchAcademies();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update academy status',
        variant: 'destructive'
      });
    }
  };

  // Handle verification toggle
  const handleVerificationToggle = async (academy: Academy, isVerified: boolean) => {
    const reason = prompt(`Please provide a reason for ${isVerified ? 'verifying' : 'unverifying'} ${academy.name}:`);

    if (reason === null) {
      // User cancelled the prompt
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for this action',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`/api/academies/${academy.id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isVerified,
          reason: reason.trim(),
          adminEmail
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message
        });

        fetchAcademies();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to update academy verification',
        variant: 'destructive'
      });
    }
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAcademies([]);
      setSelectAll(false);
    } else {
      setSelectedAcademies(academies.map(academy => academy.id));
      setSelectAll(true);
    }
  };

  const handleSelectAcademy = (academyId: string) => {
    if (selectedAcademies.includes(academyId)) {
      setSelectedAcademies(selectedAcademies.filter(id => id !== academyId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedAcademies, academyId];
      setSelectedAcademies(newSelected);
      setSelectAll(newSelected.length === academies.length);
    }
  };

  // Bulk activation/deactivation
  const handleBulkActivation = async (activate: boolean) => {
    if (selectedAcademies.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select academies to perform bulk action',
        variant: 'destructive'
      });
      return;
    }

    try {
      const promises = selectedAcademies.map(academyId =>
        fetch(`/api/academies/${academyId}/activate`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isActive: activate })
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast({
          title: 'Bulk Action Completed',
          description: `${successful} academies ${activate ? 'activated' : 'deactivated'} successfully${failed > 0 ? `, ${failed} failed` : ''}`,
        });

        fetchAcademies();
        fetchStats();
        setSelectedAcademies([]);
        setSelectAll(false);
      }
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform bulk action',
        variant: 'destructive'
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      contactPerson: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      licenseNumber: '',
      foundedYear: '',
      website: '',
      description: ''
    });
    setFormErrors({});
    setSelectedAcademy(null);
  };

  // Open edit dialog
  const openEditDialog = (academy: Academy) => {
    setSelectedAcademy(academy);
    setFormData({
      name: academy.name,
      email: academy.email,
      password: '',
      contactPerson: academy.contactPerson,
      phone: academy.phone,
      address: academy.address,
      city: academy.city,
      country: academy.country,
      licenseNumber: academy.licenseNumber || '',
      foundedYear: academy.foundedYear?.toString() || '',
      website: academy.website || '',
      description: academy.description || ''
    });
    setIsEditOpen(true);
  };


  // Open delete dialog
  const openDeleteDialog = (academy: Academy) => {
    setSelectedAcademy(academy);
    setIsDeleteOpen(true);
  };

  // Get status badge
  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  // Get verification badge
  const getVerificationBadge = (isVerified: boolean) => {
    return (
      <Badge variant={isVerified ? 'default' : 'outline'}>
        {isVerified ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3 mr-1" />
            Unverified
          </>
        )}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Academies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAcademies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Academies</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeAcademies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Academies</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactiveAcademies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Academies</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.verifiedAcademies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Players</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Removed Pending Account Activations section */}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Academy Management</CardTitle>
              <CardDescription>
                Manage football academies, their registration, and verification status
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Academy
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters and Bulk Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search academies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="Zambia">Zambia</SelectItem>
                <SelectItem value="South Africa">South Africa</SelectItem>
                <SelectItem value="Kenya">Kenya</SelectItem>
                <SelectItem value="Nigeria">Nigeria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedAcademies.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    {selectedAcademies.length} selected
                  </Badge>
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Bulk actions available
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkActivation(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Activate Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkActivation(false)}
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Deactivate Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedAcademies([]);
                      setSelectAll(false);
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Academy Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </TableHead>
                  <TableHead>Academy</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription Plan</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading academies...
                    </TableCell>
                  </TableRow>
                ) : academies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No academies found
                    </TableCell>
                  </TableRow>
                ) : (
                  academies.map((academy) => (
                    <TableRow key={academy.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedAcademies.includes(academy.id)}
                          onChange={() => handleSelectAcademy(academy.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{academy.name}</p>
                          <p className="text-sm text-muted-foreground">{academy.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{academy.player_count || 0}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(academy, !academy.isActive)}
                        >
                          {getStatusBadge(academy.isActive)}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {academy.subscriptionPlan || "Free Plan"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {/* Activate/Deactivate Button */}
                          {academy.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusToggle(academy, false)}
                              className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusToggle(academy, true)}
                              className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Activate
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/admin/academy/${academy.id}`;
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(academy)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(academy)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Academy Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditOpen ? 'Edit Academy' : 'Create New Academy'}
            </DialogTitle>
            <DialogDescription>
              {isEditOpen
                ? 'Update academy information'
                : 'Add a new academy to the platform'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Academy Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter academy name"
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="academy@example.com"
                />
                {formErrors.email && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Director or manager name"
                />
                {formErrors.contactPerson && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.contactPerson}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+260 XXX XXX XXX"
                />
                {formErrors.phone && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City name"
                />
                {formErrors.city && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.city}</p>
                )}
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zambia">Zambia</SelectItem>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="Ghana">Ghana</SelectItem>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.country && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.country}</p>
                )}
              </div>

              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="Official license number"
                />
                {formErrors.licenseNumber && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.licenseNumber}</p>
                )}
              </div>

              <div>
                <Label htmlFor="foundedYear">Founded Year</Label>
                <Input
                  id="foundedYear"
                  type="number"
                  value={formData.foundedYear}
                  onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                  placeholder="YYYY"
                  min="1800"
                  max={new Date().getFullYear()}
                />
                {formErrors.foundedYear && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.foundedYear}</p>
                )}
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://academy-website.com"
                />
                {formErrors.website && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.website}</p>
                )}
              </div>

              {!isEditOpen && (
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Academy login password"
                  />
                  {formErrors.password && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Complete academy address"
                rows={2}
              />
              {formErrors.address && (
                <p className="text-sm text-red-500 mt-1">{formErrors.address}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the academy"
                rows={3}
              />
              {formErrors.description && (
                <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSubmit(isEditOpen)}>
                {isEditOpen ? 'Update Academy' : 'Create Academy'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Delete Academy Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Academy</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {selectedAcademy?.name}? This action will set the academy status to inactive.
            </DialogDescription>
          </DialogHeader>

          {selectedAcademy && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedAcademy.name}</p>
                <p className="text-sm text-muted-foreground">{selectedAcademy.email}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAcademy._count?.players || 0} players registered
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Deactivating this academy will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Set academy status to inactive</li>
                  <li>Prevent new player registrations</li>
                  <li>Maintain all existing data</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Deactivate Academy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}