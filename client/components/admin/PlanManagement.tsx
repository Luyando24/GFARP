import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Settings2, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SubscriptionPlan, StripeSettings } from '@shared/api';
import { cn } from '@/lib/utils';
import { Api } from '@/lib/api';

export default function PlanManagement() {
  const [loading, setLoading] = useState(false);
  const [stripeSettings, setStripeSettings] = useState<StripeSettings>({ 
    secret_key_set: false, 
    webhook_secret_set: false, 
    mode: null 
  });
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  
  const [academyPlans, setAcademyPlans] = useState<SubscriptionPlan[]>([]);
  const [playerPlans, setPlayerPlans] = useState<SubscriptionPlan[]>([]);
  const [agencyPlans, setAgencyPlans] = useState<SubscriptionPlan[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);

  const fetchPlans = async () => {
    try {
      // Fetch Academy Plans
      const academyData = await Api.get<{ success: boolean; data: SubscriptionPlan[] }>('/subscriptions/plans?targetType=ACADEMY&includeInactive=true');
      if (academyData.success) setAcademyPlans(academyData.data);

      // Fetch Player Plans
      const playerData = await Api.get<{ success: boolean; data: SubscriptionPlan[] }>('/subscriptions/plans?targetType=INDIVIDUAL&includeInactive=true');
      if (playerData.success) setPlayerPlans(playerData.data);

      // Fetch Agency Plans
      const agencyData = await Api.get<{ success: boolean; data: SubscriptionPlan[] }>('/subscriptions/plans?targetType=AGENCY&includeInactive=true');
      if (agencyData.success) setAgencyPlans(agencyData.data);
    } catch (error) {
      toast.error('Failed to load plans');
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await Api.get<StripeSettings>('/stripe/admin/settings');
      setStripeSettings(data);
    } catch (error) {
      toast.error('Failed to load Stripe settings');
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchSettings();
  }, []);

  const saveKeys = async () => {
    setLoading(true);
    try {
      await Api.put('/stripe/admin/settings', { 
        secretKey: secretKey || undefined, 
        webhookSecret: webhookSecret || undefined 
      });
      toast.success('Stripe settings updated');
      fetchSettings();
      setSecretKey('');
      setWebhookSecret('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save Stripe settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setLoading(true);
    try {
      const isNew = !editingPlan.id;
      const url = isNew ? '/subscriptions/plans' : `/subscriptions/plans/${editingPlan.id}`;
      
      if (isNew) {
        await Api.post(url, editingPlan);
      } else {
        await Api.put(url, editingPlan);
      }

      toast.success(`Plan ${isNew ? 'created' : 'updated'} successfully`);
      setIsDialogOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan? If it is in use, it will be deactivated instead.')) return;

    try {
      const data = await Api.delete<{ message: string }>(`/subscriptions/plans/${id}`);
      toast.success(data.message);
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete plan');
    }
  };

  const createStripePrice = async (plan: SubscriptionPlan) => {
    setLoading(true);
    try {
      await Api.post(`/stripe/admin/plans/${plan.id}/price`, { 
        amount: plan.price, 
        currency: plan.currency, 
        interval: plan.billing_cycle === 'MONTHLY' ? 'month' : plan.billing_cycle === 'YEARLY' ? 'year' : undefined 
      });
      toast.success('Stripe Price created and linked');
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create Stripe Price');
    } finally {
      setLoading(false);
    }
  };

  const renderPlanTable = (plans: SubscriptionPlan[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Billing</TableHead>
            <TableHead>Limits</TableHead>
            <TableHead>Stripe Sync</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No plans found. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  {plan.is_active ? (
                    <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    {plan.name}
                    {plan.is_free && <Badge variant="outline" className="ml-2 text-[10px] uppercase">Free</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal line-clamp-1">{plan.description}</div>
                </TableCell>
                <TableCell>
                  {plan.price > 0 ? `${plan.currency} ${plan.price}` : 'Free'}
                </TableCell>
                <TableCell>
                  <span className="text-xs capitalize">{plan.billing_cycle?.toLowerCase() || 'N/A'}</span>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    <div>
                      {plan.target_type === 'ACADEMY' ? `${plan.player_limit} Players` : 
                       plan.target_type === 'AGENCY' ? `${plan.player_limit} Player Profiles` : 
                       'Full Profile Access'}
                    </div>
                    <div className="text-muted-foreground">{Math.round(plan.storage_limit / (1024*1024*1024))}GB Storage</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[10px]">
                      {plan.stripe_product_id ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-rose-500" />
                      )}
                      <span>Product</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      {plan.stripe_price_id ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-rose-500" />
                      )}
                      <span>Price</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!plan.stripe_price_id && plan.price > 0 && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        title="Sync to Stripe"
                        onClick={() => createStripePrice(plan)}
                        disabled={loading}
                      >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingPlan(plan);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Price Plans & Billing</h2>
          <p className="text-muted-foreground">Manage your subscription tiers and Stripe integration.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlan({
              name: '',
              description: '',
              price: 0,
              currency: 'USD',
              billing_cycle: 'MONTHLY',
              player_limit: 50,
              storage_limit: 5368709120, // 5GB
              features: [],
              is_active: true,
              is_free: false,
              sort_order: 0,
              target_type: 'ACADEMY'
            })}>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSavePlan}>
              <DialogHeader>
                <DialogTitle>{editingPlan?.id ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                <DialogDescription>
                  Configure the details for this subscription tier.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input 
                    id="name" 
                    value={editingPlan?.name} 
                    onChange={e => setEditingPlan(prev => ({ ...prev!, name: e.target.value }))}
                    required 
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    value={editingPlan?.description || ''} 
                    onChange={e => setEditingPlan(prev => ({ ...prev!, description: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    step="0.01"
                    value={editingPlan?.price} 
                    onChange={e => setEditingPlan(prev => ({ ...prev!, price: parseFloat(e.target.value) }))}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={editingPlan?.currency} 
                    onValueChange={v => setEditingPlan(prev => ({ ...prev!, currency: v }))}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="ZMW">ZMW (ZK)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="target_type">Target Audience</Label>
                  <Select 
                    value={editingPlan?.target_type} 
                    onValueChange={v => setEditingPlan(prev => ({ ...prev!, target_type: v as any }))}
                  >
                    <SelectTrigger id="target_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACADEMY">Academies</SelectItem>
                      <SelectItem value="AGENCY">Agencies</SelectItem>
                      <SelectItem value="INDIVIDUAL">Individual Players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billing_cycle">Billing Cycle</Label>
                  <Select 
                    value={editingPlan?.billing_cycle} 
                    onValueChange={v => setEditingPlan(prev => ({ ...prev!, billing_cycle: v as any }))}
                  >
                    <SelectTrigger id="billing_cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                      <SelectItem value="LIFETIME">One-time / Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="player_limit">Player Limit</Label>
                  <Input 
                    id="player_limit" 
                    type="number" 
                    value={editingPlan?.player_limit} 
                    onChange={e => setEditingPlan(prev => ({ ...prev!, player_limit: parseInt(e.target.value) }))}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order">Display Order</Label>
                  <Input 
                    id="sort_order" 
                    type="number" 
                    value={editingPlan?.sort_order} 
                    onChange={e => setEditingPlan(prev => ({ ...prev!, sort_order: parseInt(e.target.value) }))}
                    required 
                  />
                </div>
                
                <div className="flex items-center space-x-2 py-4">
                  <Switch 
                    id="is_free" 
                    checked={editingPlan?.is_free} 
                    onCheckedChange={v => setEditingPlan(prev => ({ ...prev!, is_free: v }))}
                  />
                  <Label htmlFor="is_free">Free Plan</Label>
                </div>
                
                <div className="flex items-center space-x-2 py-4">
                  <Switch 
                    id="is_active" 
                    checked={editingPlan?.is_active} 
                    onCheckedChange={v => setEditingPlan(prev => ({ ...prev!, is_active: v }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Plan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="academy" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="academy">Academies</TabsTrigger>
          <TabsTrigger value="agency">Agencies</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="settings">Stripe Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="academy" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Academy Subscription Plans</CardTitle>
                <CardDescription>Plans available for football academies.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {renderPlanTable(academyPlans)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agency" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Agency Subscription Plans</CardTitle>
                <CardDescription>Plans available for talent agencies.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {renderPlanTable(agencyPlans)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Individual Player Plans</CardTitle>
                <CardDescription>One-time or recurring plans for standalone players.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {renderPlanTable(playerPlans)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Configuration</CardTitle>
              <CardDescription>Connect your Stripe account to process payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                <div className={cn(
                  "p-2 rounded-full",
                  stripeSettings.secret_key_set ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {stripeSettings.secret_key_set ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                </div>
                <div>
                  <div className="font-semibold">Stripe Connection Status</div>
                  <div className="text-sm text-muted-foreground">
                    {stripeSettings.secret_key_set 
                      ? (stripeSettings.is_env_config 
                          ? `Connected via system configuration (${stripeSettings.mode} mode)`
                          : `Connected in ${stripeSettings.mode} mode`)
                      : 'Not connected. Please provide your API keys.'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="stripeSecretKey">Secret Key</Label>
                  <Input 
                    id="stripeSecretKey" 
                    type="password" 
                    placeholder="sk_test_..." 
                    value={secretKey}
                    onChange={e => setSecretKey(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Keep this key secure. It allows processing payments.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
                  <Input 
                    id="stripeWebhookSecret" 
                    type="password" 
                    placeholder="whsec_..." 
                    value={webhookSecret}
                    onChange={e => setWebhookSecret(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Required to handle asynchronous events like successful payments.</p>
                </div>
              </div>
              
              <Button onClick={saveKeys} disabled={loading || (!secretKey && !webhookSecret)}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Stripe Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
