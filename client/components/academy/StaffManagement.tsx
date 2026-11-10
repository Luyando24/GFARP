import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Edit,
  Loader2,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  ACADEMY_STAFF_ROLES,
  STAFF_PERMISSION_KEYS,
  STAFF_PERMISSIONS,
  type AcademyStaffRole,
  type StaffPermission,
} from '@shared/permissions';

interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AcademyStaffRole;
  permissions: StaffPermission[];
  isActive: boolean;
  lastLogin?: string | null;
  createdAt?: string | null;
}

interface StaffFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: AcademyStaffRole;
  permissions: StaffPermission[];
}

const EMPTY_FORM: StaffFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'academy_admin',
  permissions: [...STAFF_PERMISSION_KEYS],
};

const roleLabel = (role: string) =>
  ACADEMY_STAFF_ROLES.find((entry) => entry.value === role)?.label ?? role;

const permissionLabel = (key: StaffPermission) =>
  STAFF_PERMISSIONS.find((entry) => entry.key === key)?.label ?? key;

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function StaffManagement() {
  const { session } = useAuth();
  const { toast } = useToast();
  const isOwner = session?.role === 'academy' || session?.role === 'admin' || session?.role === 'superadmin';

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StaffMember | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response: any = await Api.get('academy-staff');
      setStaff(Array.isArray(response?.data?.staff) ? response.data.staff : []);
    } catch (error: any) {
      setLoadError(error?.message || 'Unable to load the team');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) void loadStaff();
  }, [isOwner, loadStaff]);

  const openAddDialog = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, permissions: [...STAFF_PERMISSION_KEYS] });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (member: StaffMember) => {
    setEditing(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      password: '',
      role: member.role,
      permissions: [...member.permissions],
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const togglePermission = (key: StaffPermission, checked: boolean) => {
    setForm((current) => ({
      ...current,
      permissions: checked
        ? STAFF_PERMISSION_KEYS.filter((entry) => entry === key || current.permissions.includes(entry))
        : current.permissions.filter((entry) => entry !== key),
    }));
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    if (!editing && form.password.length < 8) {
      setFormError('Set a temporary password of at least 8 characters.');
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          role: form.role,
          permissions: form.permissions,
        };
        if (form.password) payload.password = form.password;
        const response: any = await Api.put(`academy-staff/${editing.id}`, payload);
        toast({
          title: 'Team member updated',
          description: response?.data?.reauthRequired
            ? 'They will need to sign in again for the new access to apply.'
            : 'The changes are saved.',
        });
      } else {
        await Api.post('academy-staff', {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          permissions: form.permissions,
        });
        toast({
          title: 'Team member added',
          description: 'Share the email and temporary password with them so they can sign in.',
        });
      }
      setDialogOpen(false);
      await loadStaff();
    } catch (error: any) {
      setFormError(error?.message || 'Unable to save this team member');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    setBusyId(member.id);
    try {
      await Api.put(`academy-staff/${member.id}`, { isActive: !member.isActive });
      toast({
        title: member.isActive ? 'Access paused' : 'Access restored',
        description: `${member.firstName} ${member.lastName} ${member.isActive ? 'can no longer sign in.' : 'can sign in again.'}`,
      });
      await loadStaff();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const member = pendingDelete;
    setBusyId(member.id);
    try {
      await Api.delete(`academy-staff/${member.id}`);
      toast({ title: 'Team member removed', description: `${member.firstName} ${member.lastName} was removed from the team.` });
      setPendingDelete(null);
      await loadStaff();
    } catch (error: any) {
      toast({ title: 'Remove failed', description: error?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = useMemo(() => staff.filter((member) => member.isActive).length, [staff]);

  if (!isOwner) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Owners only</AlertTitle>
        <AlertDescription>
          Only the academy owner can manage team accounts and access. Ask the owner if you need a different level of access.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Team & access
            </CardTitle>
            <CardDescription>
              Add administrators and staff, then choose exactly which parts of the academy they can use.
              {staff.length > 0 && ` ${activeCount} of ${staff.length} accounts are active.`}
            </CardDescription>
          </div>
          <Button onClick={openAddDialog} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add team member
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Your own access is never limited</AlertTitle>
            <AlertDescription>
              As the academy owner you always keep full access, including finances and subscription settings.
              Team members only see the modules you tick below.
            </AlertDescription>
          </Alert>

          {loadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not load the team</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>{loadError}</span>
                <Button variant="outline" size="sm" onClick={() => void loadStaff()}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading team…
            </div>
          ) : staff.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
              <UserCog className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-900 dark:text-white">No team members yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add an administrator with access to players but not finances, or a coach who only takes attendance.
              </p>
              <Button className="mt-4" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first team member
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Last sign-in</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{member.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {member.permissions.length === 0 ? (
                            <span className="text-xs text-slate-500">No modules</span>
                          ) : (
                            member.permissions.map((key) => (
                              <Badge key={key} variant="outline" className="text-[11px]">
                                {permissionLabel(key)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={member.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}
                        >
                          {member.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(member.lastLogin)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit access for ${member.firstName} ${member.lastName}`}
                            onClick={() => openEditDialog(member)}
                            disabled={busyId === member.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={member.isActive
                              ? `Pause access for ${member.firstName} ${member.lastName}`
                              : `Restore access for ${member.firstName} ${member.lastName}`}
                            onClick={() => void toggleActive(member)}
                            disabled={busyId === member.id}
                          >
                            <Power className={`h-4 w-4 ${member.isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${member.firstName} ${member.lastName}`}
                            onClick={() => setPendingDelete(member)}
                            disabled={busyId === member.id}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submitForm} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit team member' : 'Add team member'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Update their role and the modules they can open. Saving signs them out so the new access applies.'
                  : 'Create an account, then choose what they can do. They sign in with this email and password.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staff-first-name">First name</Label>
                <Input
                  id="staff-first-name"
                  value={form.firstName}
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-last-name">Last name</Label>
                <Input
                  id="staff-last-name"
                  value={form.lastName}
                  onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                disabled={Boolean(editing)}
                autoComplete="off"
                required
              />
              {editing && (
                <p className="text-xs text-slate-500">The sign-in email cannot be changed. Remove and re-add the account instead.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-password">{editing ? 'Reset password (optional)' : 'Temporary password'}</Label>
              <Input
                id="staff-password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editing ? 'Leave blank to keep the current password' : 'At least 8 characters'}
                autoComplete="new-password"
                required={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm((current) => ({ ...current, role: value as AcademyStaffRole }))}
              >
                <SelectTrigger aria-label="Team member role">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMY_STAFF_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                The role is a label for your team. Access is controlled only by the modules below.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Module access</Label>
              <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                {STAFF_PERMISSIONS.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <Checkbox
                      checked={form.permissions.includes(permission.key)}
                      onCheckedChange={(checked) => togglePermission(permission.key, checked === true)}
                      aria-label={`Allow ${permission.label}`}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-900 dark:text-white">
                        {permission.label}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Leave finances unticked to let someone add players without seeing money.
              </p>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? 'Save changes' : 'Add team member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.firstName} ${pendingDelete.lastName} will lose access immediately. If they are linked to academy records, pause the account instead.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={Boolean(busyId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {busyId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
