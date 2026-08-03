import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { Api } from '@/lib/api';

export default function BillingSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<{ secret_key_set: boolean; webhook_secret_set: boolean; mode: string | null }>({ secret_key_set: false, webhook_secret_set: false, mode: null });
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [planUpdates, setPlanUpdates] = useState<Record<string, { amount: string; currency: string; interval: string }>>({});

  useEffect(() => {
    (async () => {
      try {
        const data = await Api.get<typeof settings>('/stripe/admin/settings');
        setSettings(data);
        const plansData = await Api.get<{ plans: any[] }>('/stripe/admin/plans');
        setPlans(plansData.plans);
      } catch (e) {
        console.error('Failed to load billing data', e);
      }
    })();
  }, []);

  const saveKeys = async () => {
    setLoading(true);
    try {
      await Api.put('/stripe/admin/settings', { secretKey: secretKey || undefined, webhookSecret: webhookSecret || undefined });
      setSettings(await Api.get<typeof settings>('/stripe/admin/settings'));
      setSecretKey('');
      setWebhookSecret('');
    } finally {
      setLoading(false);
    }
  };

  const updatePlanField = (id: string, field: 'amount'|'currency'|'interval', value: string) => {
    setPlanUpdates(prev => ({
      ...prev,
      [id]: {
        amount: prev[id]?.amount ?? '',
        currency: prev[id]?.currency ?? 'USD',
        interval: prev[id]?.interval ?? '',
        [field]: value
      }
    }));
  };

  const createStripePrice = async (id: string) => {
    const u = planUpdates[id];
    if (!u || !u.amount) return;
    setLoading(true);
    try {
      await Api.post(`/stripe/admin/plans/${id}/price`, { amount: Number(u.amount), currency: u.currency || 'USD', interval: u.interval || undefined });
      const p = await Api.get<{ plans: any[] }>('/stripe/admin/plans');
      setPlans(p.plans);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <h1 className="text-2xl font-semibold">Billing & Stripe Settings</h1>
        <ThemeToggle />
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList>
          <TabsTrigger value="keys">Stripe Keys</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stripe API Keys</CardTitle>
              <CardDescription>Manage secret key and webhook secret.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input id="secretKey" type="password" placeholder="sk_test_... or sk_live_..." value={secretKey} onChange={(e) => setSecretKey(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="webhookSecret">Webhook Secret</Label>
                  <Input id="webhookSecret" type="password" placeholder="whsec_..." value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Button onClick={saveKeys} disabled={loading}>Save</Button>
                <span className="text-sm text-muted-foreground">Current mode: {settings.mode ?? 'unset'}; Secret set: {settings.secret_key_set ? 'yes' : 'no'}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>View and set Stripe Product/Price IDs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Price ID</TableHead>
                    <TableHead>New Amount</TableHead>
                    <TableHead>New Currency</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.price}</TableCell>
                      <TableCell>{p.currency}</TableCell>
                      <TableCell>{p.billing_cycle}</TableCell>
                      <TableCell className="font-mono text-xs">{p.stripe_product_id ?? '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{p.stripe_price_id ?? '-'}</TableCell>
                      <TableCell>
                        <Input placeholder="e.g. 59.99" value={planUpdates[p.id]?.amount ?? ''} onChange={(e) => updatePlanField(p.id, 'amount', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input placeholder="USD" value={planUpdates[p.id]?.currency ?? 'USD'} onChange={(e) => updatePlanField(p.id, 'currency', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input placeholder="month/year (or blank for one-time)" value={planUpdates[p.id]?.interval ?? ''} onChange={(e) => updatePlanField(p.id, 'interval', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => createStripePrice(p.id)} disabled={loading || !(planUpdates[p.id]?.amount)}>Create Price</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
