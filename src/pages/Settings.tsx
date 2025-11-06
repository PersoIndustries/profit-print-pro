import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Settings as SettingsIcon, CreditCard, Receipt, User } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface Profile {
  full_name: string;
  email: string;
  billing_address: string;
  billing_city: string;
  billing_postal_code: string;
  billing_country: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string;
  tier: string;
  billing_period: string;
}

interface SubscriptionInfo {
  tier: string;
  billing_period: string;
  status: string;
  next_billing_date: string;
  price_paid: number;
}

const Settings = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    email: '',
    billing_address: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country: ''
  });
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [profileRes, subRes, invoicesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user?.id).single(),
        supabase.from("user_subscriptions").select("*").eq("user_id", user?.id).single(),
        supabase.from("invoices").select("*").eq("user_id", user?.id).order("issued_date", { ascending: false })
      ]);

      if (profileRes.data) {
        setProfile({
          full_name: profileRes.data.full_name || '',
          email: profileRes.data.email || '',
          billing_address: profileRes.data.billing_address || '',
          billing_city: profileRes.data.billing_city || '',
          billing_postal_code: profileRes.data.billing_postal_code || '',
          billing_country: profileRes.data.billing_country || ''
        });
      }

      if (subRes.data) {
        setSubscriptionInfo(subRes.data);
      }

      if (invoicesRes.data) {
        setInvoices(invoicesRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          billing_address: profile.billing_address,
          billing_city: profile.billing_city,
          billing_postal_code: profile.billing_postal_code,
          billing_country: profile.billing_country
        })
        .eq("id", user?.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Error updating profile");
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will lose access to premium features.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ status: 'cancelled' })
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success("Subscription cancelled");
      fetchData();
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error(error.message || "Error cancelling subscription");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;
  }

  const getTierName = (tier: string) => {
    switch(tier) {
      case 'tier_1': return 'Professional';
      case 'tier_2': return 'Business';
      default: return 'Free';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Print3D Manager</h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              {t('nav.dashboard')}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Settings</h2>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal and billing information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email (Read-only)</Label>
                      <Input id="email" value={profile.email} disabled />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="billing_address">Address</Label>
                        <Input
                          id="billing_address"
                          value={profile.billing_address}
                          onChange={(e) => setProfile({ ...profile, billing_address: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_city">City</Label>
                        <Input
                          id="billing_city"
                          value={profile.billing_city}
                          onChange={(e) => setProfile({ ...profile, billing_city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_postal_code">Postal Code</Label>
                        <Input
                          id="billing_postal_code"
                          value={profile.billing_postal_code}
                          onChange={(e) => setProfile({ ...profile, billing_postal_code: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="billing_country">Country</Label>
                        <Input
                          id="billing_country"
                          value={profile.billing_country}
                          onChange={(e) => setProfile({ ...profile, billing_country: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit">{t('common.save')}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>Manage your subscription plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscriptionInfo && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Current Plan</Label>
                        <p className="text-2xl font-bold">{getTierName(subscriptionInfo.tier)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Billing Period</Label>
                        <p className="text-2xl font-bold capitalize">{subscriptionInfo.billing_period}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <p className={`text-xl font-semibold ${
                          subscriptionInfo.status === 'active' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {subscriptionInfo.status.toUpperCase()}
                        </p>
                      </div>
                      {subscriptionInfo.next_billing_date && (
                        <div>
                          <Label className="text-muted-foreground">Next Billing Date</Label>
                          <p className="text-xl">
                            {new Date(subscriptionInfo.next_billing_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Current Limits</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Materials: {subscription?.usage.materials} / {subscription?.limits.materials}</li>
                          <li>• Projects: {subscription?.usage.projects} / {subscription?.limits.projects}</li>
                          <li>• Monthly Orders: {subscription?.usage.monthlyOrders} / {subscription?.limits.monthlyOrders}</li>
                        </ul>
                      </div>

                      <div className="flex gap-4">
                        <Button variant="outline" onClick={() => navigate('/pricing')}>
                          Change Plan
                        </Button>
                        {subscriptionInfo.status === 'active' && subscriptionInfo.tier !== 'free' && (
                          <Button variant="destructive" onClick={handleCancelSubscription}>
                            Cancel Subscription
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>View and download your invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No invoices yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{new Date(invoice.issued_date).toLocaleDateString()}</TableCell>
                          <TableCell>{getTierName(invoice.tier)}</TableCell>
                          <TableCell className="capitalize">{invoice.billing_period}</TableCell>
                          <TableCell>{invoice.amount.toFixed(2)}€</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'refunded' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status.toUpperCase()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
