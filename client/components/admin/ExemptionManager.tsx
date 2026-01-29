import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Mail, ShieldCheck } from 'lucide-react';
import { Api } from '@/lib/api';

interface Exemption {
  id: string;
  email: string;
  module: string;
  reason: string;
  created_at: string;
}

export default function ExemptionManager() {
  const { toast } = useToast();
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newExemption, setNewExemption] = useState({
    email: '',
    module: 'individual_player_profile',
    reason: '',
  });

  const fetchExemptions = async () => {
    try {
      setIsLoading(true);
      const response = await Api.get<{ success: boolean; data: Exemption[] }>('/admin/exemptions');
      if (response.success) {
        setExemptions(response.data);
      }
    } catch (error) {
      console.error('Error fetching exemptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exemptions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExemptions();
  }, []);

  const handleAddExemption = async () => {
    if (!newExemption.email) {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAdding(true);
      const response = await Api.post<{ success: boolean; message: string }>('/admin/exemptions', newExemption);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Exemption added successfully',
        });
        setNewExemption({
          email: '',
          module: 'individual_player_profile',
          reason: '',
        });
        fetchExemptions();
      }
    } catch (error) {
      console.error('Error adding exemption:', error);
      toast({
        title: 'Error',
        description: 'Failed to add exemption',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteExemption = async (id: string) => {
    if (!confirm('Are you sure you want to remove this exemption?')) return;

    try {
      const response = await Api.delete<{ success: boolean; message: string }>(`/admin/exemptions/${id}`);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Exemption removed successfully',
        });
        fetchExemptions();
      }
    } catch (error) {
      console.error('Error deleting exemption:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove exemption',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Exemptions</h2>
          <p className="text-muted-foreground">
            Manage users who are exempted from paying for specific modules.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Exemption
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Exemption</DialogTitle>
              <DialogDescription>
                Exempt a user by email from paying for a specific module.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">User Email</Label>
                <Input
                  id="email"
                  placeholder="user@example.com"
                  value={newExemption.email}
                  onChange={(e) => setNewExemption({ ...newExemption, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="module">Module</Label>
                <Input
                  id="module"
                  value="Individual Player Profile"
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  placeholder="e.g., VIP User, Partner Academy"
                  value={newExemption.reason}
                  onChange={(e) => setNewExemption({ ...newExemption, reason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExemption} disabled={isAdding}>
                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Exemption
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exempted Users</CardTitle>
          <CardDescription>
            A list of all users currently exempted from subscription payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : exemptions.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <Mail className="mb-2 h-8 w-8 opacity-20" />
              <p>No exemptions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exemptions.map((exemption) => (
                  <TableRow key={exemption.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {exemption.email}
                        <ShieldCheck className="ml-2 h-4 w-4 text-green-500" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {exemption.module === 'individual_player_profile' ? 'Individual Player Profile' : exemption.module}
                    </TableCell>
                    <TableCell>{exemption.reason || '-'}</TableCell>
                    <TableCell>
                      {new Date(exemption.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExemption(exemption.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
