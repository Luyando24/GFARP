import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'superadmin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NewAdminData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'admin' | 'superadmin';
}

const SuperAdmins: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newAdminData, setNewAdminData] = useState<NewAdminData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'admin'
  });

  // Redirect if not superadmin
  useEffect(() => {
    if (session && session.role !== 'superadmin') {
      navigate('/admin');
    }
  }, [session, navigate]);

  // Fetch admin users
  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      
      // Check if we're in mock mode
      const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";
      
      if (USE_MOCK) {
        // Use mock admin data
        const mockAdmins: AdminUser[] = [
          {
            id: "super-admin-001",
            first_name: "System",
            last_name: "Administrator",
            email: "admin@system.com",
            role: "superadmin",
            is_active: true,
            created_at: "2025-10-21T19:31:34.563Z",
            updated_at: "2025-10-21T19:31:34.563Z"
          },
          {
            id: "admin-001",
            first_name: "Admin",
            last_name: "User",
            email: "admin@gfarp.com",
            role: "admin",
            is_active: true,
            created_at: "2025-10-21T19:31:34.563Z",
            updated_at: "2025-10-21T19:31:34.563Z"
          }
        ];
        setAdminUsers(mockAdmins);
      } else {
        // Use production API
        const response = await fetch('/api/admin/list-admins');
        if (response.ok) {
          const data = await response.json();
          setAdminUsers(data);
        } else {
          console.error('Failed to fetch admin users');
        }
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  // Filter admin users based on search term
  const filteredAdmins = adminUsers.filter(admin =>
    (admin.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (admin.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (admin.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Handle add admin
  const handleAddAdmin = async () => {
    try {
      if (!newAdminData.first_name || !newAdminData.last_name || !newAdminData.email || !newAdminData.password) {
        alert('Please fill in all required fields');
        return;
      }

      const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";
      
      if (USE_MOCK) {
        // In mock mode, just simulate adding the admin
        alert('Mock Mode: Admin creation simulated successfully! In production, this would create a real admin user.');
        setIsAddModalOpen(false);
        setNewAdminData({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          role: 'admin'
        });
        // Optionally refresh the mock data
        fetchAdminUsers();
      } else {
        // Use production API
        const response = await fetch('/api/admin/create-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newAdminData),
        });

        if (response.ok) {
          alert('Admin user created successfully!');
          setIsAddModalOpen(false);
          setNewAdminData({
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            role: 'admin'
          });
          fetchAdminUsers();
        } else {
          const data = await response.json();
          alert(`Failed to create admin: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Network error: Unable to create admin user.');
    }
  };

  // Handle edit admin
  const handleEditAdmin = (admin: AdminUser) => {
    setEditingUser(admin);
    setNewAdminData({
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      password: '',
      role: admin.role
    });
    setIsEditModalOpen(true);
  };

  // Handle update admin
  const handleUpdateAdmin = async () => {
    if (!editingUser) return;

    try {
      const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";
      
      if (USE_MOCK) {
        // In mock mode, just simulate updating the admin
        alert('Mock Mode: Admin update simulated successfully! In production, this would update the real admin user.');
        setIsEditModalOpen(false);
        setEditingUser(null);
        setNewAdminData({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          role: 'admin'
        });
        fetchAdminUsers();
      } else {
        // Use production API
        const updateData = {
          first_name: newAdminData.first_name,
          last_name: newAdminData.last_name,
          email: newAdminData.email,
          role: newAdminData.role,
          ...(newAdminData.password && { password: newAdminData.password })
        };

        const response = await fetch(`/api/admin/update-admin/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          alert('Admin user updated successfully!');
          setIsEditModalOpen(false);
          setEditingUser(null);
          setNewAdminData({
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            role: 'admin'
          });
          fetchAdminUsers();
        } else {
          const data = await response.json();
          alert(`Failed to update admin: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert('Network error: Unable to update admin user.');
    }
  };

  // Handle delete admin
  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin user? This action cannot be undone.')) {
      return;
    }

    try {
      const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";
      
      if (USE_MOCK) {
        // In mock mode, just simulate deleting the admin
        alert('Mock Mode: Admin deletion simulated successfully! In production, this would delete the real admin user.');
        fetchAdminUsers();
      } else {
        // Use production API
        const response = await fetch(`/api/admin/delete-admin/${adminId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          alert('Admin user deleted successfully!');
          fetchAdminUsers();
        } else {
          const data = await response.json();
          alert(`Failed to delete admin: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Network error: Unable to delete admin user.');
    }
  };

  // Handle toggle admin status
  const handleToggleStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";
      
      if (USE_MOCK) {
        // In mock mode, just simulate toggling the status
        alert(`Mock Mode: Admin user ${!currentStatus ? 'activation' : 'deactivation'} simulated successfully! In production, this would update the real admin status.`);
        fetchAdminUsers();
      } else {
        // Use production API
        const response = await fetch(`/api/admin/toggle-status/${adminId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        });

        if (response.ok) {
          alert(`Admin user ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
          fetchAdminUsers();
        } else {
          const data = await response.json();
          alert(`Failed to update status: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Network error: Unable to update admin status.');
    }
  };

  if (!session || session.role !== 'superadmin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </div>
        
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Super Admins
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage system administrators and their permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAdminUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Admins</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {adminUsers.length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Super Admins</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {adminUsers.filter(admin => admin.role === 'superadmin').length}
                  </p>
                </div>
                <ShieldCheck className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active Admins</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {adminUsers.filter(admin => admin.is_active).length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search admins by name or email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-slate-600 dark:text-slate-400">Loading admin users...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.length > 0 ? (
                    filteredAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                                {(admin.first_name?.[0] || '').toUpperCase()}{(admin.last_name?.[0] || '').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {admin.first_name} {admin.last_name}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {admin.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={admin.role === 'superadmin' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={admin.is_active ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {admin.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {new Date(admin.created_at).toLocaleDateString()}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditAdmin(admin)}
                              title="Edit Admin"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => handleToggleStatus(admin.id, admin.is_active)}
                              title={admin.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteAdmin(admin.id)}
                              title="Delete Admin"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-slate-600 dark:text-slate-400">
                          {searchTerm ? 'No admins found matching your search.' : 'No admin users found.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Admin Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Add New Admin
            </DialogTitle>
            <DialogDescription>
              Create a new administrator account for the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input 
                  id="first-name" 
                  placeholder="Enter first name"
                  value={newAdminData.first_name}
                  onChange={(e) => setNewAdminData({...newAdminData, first_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input 
                  id="last-name" 
                  placeholder="Enter last name"
                  value={newAdminData.last_name}
                  onChange={(e) => setNewAdminData({...newAdminData, last_name: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter email address"
                value={newAdminData.email}
                onChange={(e) => setNewAdminData({...newAdminData, email: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Enter password"
                value={newAdminData.password}
                onChange={(e) => setNewAdminData({...newAdminData, password: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={newAdminData.role} 
                onValueChange={(value: 'admin' | 'superadmin') => setNewAdminData({...newAdminData, role: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAdmin}>
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Admin
            </DialogTitle>
            <DialogDescription>
              Update administrator account information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input 
                  id="edit-first-name" 
                  placeholder="Enter first name"
                  value={newAdminData.first_name}
                  onChange={(e) => setNewAdminData({...newAdminData, first_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input 
                  id="edit-last-name" 
                  placeholder="Enter last name"
                  value={newAdminData.last_name}
                  onChange={(e) => setNewAdminData({...newAdminData, last_name: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email" 
                type="email" 
                placeholder="Enter email address"
                value={newAdminData.email}
                onChange={(e) => setNewAdminData({...newAdminData, email: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
              <Input 
                id="edit-password" 
                type="password" 
                placeholder="Enter new password"
                value={newAdminData.password}
                onChange={(e) => setNewAdminData({...newAdminData, password: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select 
                value={newAdminData.role} 
                onValueChange={(value: 'admin' | 'superadmin') => {
                  setNewAdminData({...newAdminData, role: value})
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAdmin}>
              Update Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default SuperAdmins;