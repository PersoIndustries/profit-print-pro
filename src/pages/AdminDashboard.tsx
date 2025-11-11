import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Package, FolderOpen, ShoppingCart, Edit, DollarSign } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface UserStats {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  tier: string;
  role: string;
  subscription_status: string;
  materials_count: number;
  projects_count: number;
  orders_count: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states for user management
  const [newTier, setNewTier] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [actionType, setActionType] = useState<'changeTier' | 'cancel' | 'refund'>('changeTier');

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
      return;
    }
    if (isAdmin) {
      fetchAdminData();
    }
  }, [user, isAdmin, adminLoading, navigate]);

  const fetchAdminData = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at");

      if (profilesError) throw profilesError;

      const userStatsPromises = profiles.map(async (profile) => {
        const [subRes, roleRes, materialsRes, projectsRes, ordersRes] = await Promise.all([
          supabase.from('user_subscriptions').select('tier, status').eq('user_id', profile.id).single(),
          supabase.from('user_roles').select('role').eq('user_id', profile.id).single(),
          supabase.from('materials').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profile.id)
        ]);

        return {
          ...profile,
          tier: subRes.data?.tier || 'free',
          subscription_status: subRes.data?.status || 'active',
          role: roleRes.data?.role || 'user',
          materials_count: materialsRes.count || 0,
          projects_count: projectsRes.count || 0,
          orders_count: ordersRes.count || 0
        };
      });

      const userStats = await Promise.all(userStatsPromises);
      setUsers(userStats);
      setTotalUsers(userStats.length);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Error loading admin data");
    } finally {
      setLoading(false);
    }
  };

  const openUserDialog = (userStat: UserStats, action: 'changeTier' | 'cancel' | 'refund') => {
    setSelectedUser(userStat);
    setActionType(action);
    setNewTier(userStat.tier);
    setRefundAmount('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleChangeTier = async () => {
    if (!selectedUser || !newTier) return;

    try {
      // Update subscription tier
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .update({ tier: newTier as 'free' | 'tier_1' | 'tier_2' })
        .eq('user_id', selectedUser.id);

      if (subError) throw subError;

      // Log the change
      const { error: logError } = await supabase
        .from('subscription_changes')
        .insert([{
          user_id: selectedUser.id,
          admin_id: user?.id || null,
          previous_tier: selectedUser.tier as 'free' | 'tier_1' | 'tier_2',
          new_tier: newTier as 'free' | 'tier_1' | 'tier_2',
          change_type: newTier === 'free' ? 'downgrade' : 'upgrade',
          notes: notes
        }]);

      if (logError) throw logError;

      toast.success('Subscription tier updated successfully');
      setDialogOpen(false);
      fetchAdminData();
    } catch (error: any) {
      console.error('Error updating tier:', error);
      toast.error(error.message || 'Error updating subscription');
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedUser) return;

    if (!confirm(`Are you sure you want to cancel the subscription for ${selectedUser.email}?`)) {
      return;
    }

    try {
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled', tier: 'free' })
        .eq('user_id', selectedUser.id);

      if (subError) throw subError;

      const { error: logError } = await supabase
        .from('subscription_changes')
        .insert([{
          user_id: selectedUser.id,
          admin_id: user?.id || null,
          previous_tier: selectedUser.tier as 'free' | 'tier_1' | 'tier_2',
          new_tier: 'free' as 'free' | 'tier_1' | 'tier_2',
          change_type: 'cancel',
          reason: 'Admin cancelled subscription',
          notes: notes
        }]);

      if (logError) throw logError;

      toast.success('Subscription cancelled successfully');
      setDialogOpen(false);
      fetchAdminData();
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.message || 'Error cancelling subscription');
    }
  };

  const handleRefund = async () => {
    if (!selectedUser || !refundAmount) {
      toast.error('Please enter refund amount');
      return;
    }

    try {
      // Create a refund invoice record
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          user_id: selectedUser.id,
          invoice_number: `REF-${Date.now()}`,
          amount: -parseFloat(refundAmount),
          status: 'refunded',
          tier: selectedUser.tier,
          notes: notes
        }]);

      if (invoiceError) throw invoiceError;

      // Log the refund
      const { error: logError } = await supabase
        .from('subscription_changes')
        .insert([{
          user_id: selectedUser.id,
          admin_id: user?.id || null,
          previous_tier: selectedUser.tier as 'free' | 'tier_1' | 'tier_2',
          new_tier: selectedUser.tier as 'free' | 'tier_1' | 'tier_2',
          change_type: 'refund',
          reason: `Refund of ${refundAmount}€`,
          notes: notes
        }]);

      if (logError) throw logError;

      toast.success(`Refund of ${refundAmount}€ processed successfully`);
      setDialogOpen(false);
      fetchAdminData();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast.error(error.message || 'Error processing refund');
    }
  };

  const handleSubmit = () => {
    switch (actionType) {
      case 'changeTier':
        handleChangeTier();
        break;
      case 'cancel':
        handleCancelSubscription();
        break;
      case 'refund':
        handleRefund();
        break;
    }
  };

  if (loading || adminLoading) {
    return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const activeUsers = users.filter(u => {
    const createdDate = new Date(u.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate > thirtyDaysAgo;
  }).length;

  return (
    <>
      <h2 className="text-3xl font-bold mb-6">{t('admin.title')}</h2>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.activeUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.userList')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.email')}</TableHead>
                  <TableHead>{t('admin.tier')}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <Package className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead className="text-center">
                    <FolderOpen className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead className="text-center">
                    <ShoppingCart className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead>{t('admin.joined')}</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userStat) => (
                  <TableRow key={userStat.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{userStat.email}</p>
                        {userStat.full_name && (
                          <p className="text-sm text-muted-foreground">{userStat.full_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        userStat.tier === 'tier_2' ? 'bg-primary text-primary-foreground' :
                        userStat.tier === 'tier_1' ? 'bg-secondary text-secondary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {userStat.tier === 'tier_2' ? 'Business' : 
                         userStat.tier === 'tier_1' ? 'Professional' : 'Free'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        userStat.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                        userStat.subscription_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {userStat.subscription_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{userStat.materials_count}</TableCell>
                    <TableCell className="text-center">{userStat.projects_count}</TableCell>
                    <TableCell className="text-center">{userStat.orders_count}</TableCell>
                    <TableCell>{new Date(userStat.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={dialogOpen && selectedUser?.id === userStat.id} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openUserDialog(userStat, 'changeTier')}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage User: {selectedUser?.email}</DialogTitle>
                              <DialogDescription>
                                {actionType === 'changeTier' && 'Change the subscription tier for this user'}
                                {actionType === 'cancel' && 'Cancel the subscription for this user'}
                                {actionType === 'refund' && 'Process a refund for this user'}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              {actionType === 'changeTier' && (
                                <div>
                                  <Label htmlFor="tier">New Subscription Tier</Label>
                                  <Select value={newTier} onValueChange={setNewTier}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="free">Free</SelectItem>
                                      <SelectItem value="tier_1">Professional</SelectItem>
                                      <SelectItem value="tier_2">Business</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {actionType === 'refund' && (
                                <div>
                                  <Label htmlFor="refundAmount">Refund Amount (€)</Label>
                                  <Input
                                    id="refundAmount"
                                    type="number"
                                    step="0.01"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                              )}
                              <div>
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="Add notes about this action..."
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleSubmit}>Confirm</Button>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => openUserDialog(userStat, 'cancel')}
                          disabled={userStat.tier === 'free'}
                        >
                          Cancel Plan
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openUserDialog(userStat, 'refund')}
                        >
                          <DollarSign className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
  );
};

export default AdminDashboard;
