import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Package, FolderOpen, ShoppingCart, Edit, DollarSign, Settings, Save, History, Clock, BarChart3 } from "lucide-react";
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
  const { user, loading: authLoading } = useAuth();
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
  const [trialDays, setTrialDays] = useState<string>('15');
  const [notes, setNotes] = useState<string>('');
  const [actionType, setActionType] = useState<'changeTier' | 'cancel' | 'refund' | 'addTrial'>('changeTier');
  
  // Subscription limits management
  const [limitsTab, setLimitsTab] = useState(false);
  const [limits, setLimits] = useState<{
    free: { materials: number; projects: number; monthlyOrders: number; metricsHistory: number; shoppingLists: number };
    tier_1: { materials: number; projects: number; monthlyOrders: number; metricsHistory: number; shoppingLists: number };
    tier_2: { materials: number; projects: number; monthlyOrders: number; metricsHistory: number; shoppingLists: number };
  } | null>(null);
  const [editingLimits, setEditingLimits] = useState<typeof limits>(null);
  const [savingLimits, setSavingLimits] = useState(false);
  
  // Limits history
  const [limitsHistory, setLimitsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Ref para evitar múltiples redirecciones
  const hasRedirected = useRef(false);

  const fetchSubscriptionLimits = async () => {
    try {
      const { data: limitsData, error: limitsError } = await (supabase
        .from('subscription_limits' as any)
        .select('tier, materials, projects, monthly_orders, metrics_history, shopping_lists')
        .in('tier', ['free', 'tier_1', 'tier_2'])
        .order('tier') as any);

      if (limitsError) throw limitsError;

      if (limitsData && limitsData.length > 0) {
        const limitsMap = limitsData.reduce((acc: any, limit: any) => {
          acc[limit.tier] = {
            materials: limit.materials,
            projects: limit.projects,
            monthlyOrders: limit.monthly_orders,
            metricsHistory: limit.metrics_history,
            shoppingLists: limit.shopping_lists
          };
          return acc;
        }, {});

        setLimits({
          free: limitsMap.free || { materials: 10, projects: 15, monthlyOrders: 15, metricsHistory: 0, shoppingLists: 5 },
          tier_1: limitsMap.tier_1 || { materials: 50, projects: 100, monthlyOrders: 50, metricsHistory: 60, shoppingLists: 5 },
          tier_2: limitsMap.tier_2 || { materials: 999999, projects: 999999, monthlyOrders: 999999, metricsHistory: 730, shoppingLists: 5 }
        });
        setEditingLimits({
          free: limitsMap.free || { materials: 10, projects: 15, monthlyOrders: 15, metricsHistory: 0, shoppingLists: 5 },
          tier_1: limitsMap.tier_1 || { materials: 50, projects: 100, monthlyOrders: 50, metricsHistory: 60, shoppingLists: 5 },
          tier_2: limitsMap.tier_2 || { materials: 999999, projects: 999999, monthlyOrders: 999999, metricsHistory: 730, shoppingLists: 5 }
        });
      }
    } catch (error) {
      console.error('Error fetching subscription limits:', error);
      toast.error('Error loading subscription limits');
    }
  };

  const handleSaveLimits = async () => {
    if (!editingLimits) return;

    setSavingLimits(true);
    try {
      const updates = [
        { tier: 'free', ...editingLimits.free },
        { tier: 'tier_1', ...editingLimits.tier_1 },
        { tier: 'tier_2', ...editingLimits.tier_2 }
      ];

      for (const update of updates) {
        const { error } = await (supabase
          .from('subscription_limits' as any)
          .update({
            materials: update.materials,
            projects: update.projects,
            monthly_orders: update.monthlyOrders,
            metrics_history: update.metricsHistory,
            shopping_lists: update.shoppingLists
          })
          .eq('tier', update.tier) as any);

        if (error) throw error;
      }

      setLimits(editingLimits);
      toast.success('Subscription limits updated successfully');
      // Refresh history after saving
      fetchLimitsHistory();
    } catch (error: any) {
      console.error('Error saving subscription limits:', error);
      toast.error(error.message || 'Error saving subscription limits');
    } finally {
      setSavingLimits(false);
    }
  };

  const fetchLimitsHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: historyData, error: historyError } = await (supabase
        .from('subscription_limits_history' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100) as any);

      // Fetch user info for changed_by
      if (historyData && historyData.length > 0) {
        const userIds = [...new Set(historyData.map((h: any) => h.changed_by).filter(Boolean))] as string[];
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          
          const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
          
          historyData.forEach((entry: any) => {
            if (entry.changed_by && usersMap.has(entry.changed_by)) {
              entry.changed_by_user = usersMap.get(entry.changed_by);
            }
          });
        }
      }

      if (historyError) throw historyError;
      setLimitsHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching limits history:', error);
      toast.error('Error loading limits history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    // Reset redirect flag cuando cambia el usuario
    if (user) {
      hasRedirected.current = false;
    }
    
    // Esperar a que termine de cargar la autenticación
    if (authLoading) {
      console.log('[AdminDashboard] Auth still loading, waiting...');
      return;
    }
    
    // Si no hay usuario después de cargar, redirigir a auth
    if (!user) {
      console.log('[AdminDashboard] No user after loading, redirecting to /auth');
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        navigate("/auth");
      }
      return;
    }
    
    console.log('[AdminDashboard] User:', user.id, 'Auth loading:', authLoading, 'Admin loading:', adminLoading, 'Is admin:', isAdmin);
    
    // Esperar a que termine de cargar el estado de admin
    if (adminLoading) {
      console.log('[AdminDashboard] Still loading admin status, waiting...');
      return;
    }
    
    // IMPORTANTE: Solo actuar cuando TODO haya terminado de cargar
    // Si no es admin DESPUÉS de que todo cargó, entonces redirigir
    if (!isAdmin && !adminLoading && !authLoading) {
      console.log('[AdminDashboard] User is not admin after all checks');
      console.log('[AdminDashboard] Final state - isAdmin:', isAdmin, 'adminLoading:', adminLoading, 'authLoading:', authLoading);
      
      // Solo redirigir una vez
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        console.log('[AdminDashboard] Redirecting to /dashboard');
        // Usar un pequeño delay para dar tiempo a que el estado se actualice
        const timeoutId = setTimeout(() => {
          toast.error('No tienes permisos de administrador');
          navigate("/dashboard");
        }, 300);
        
        return () => clearTimeout(timeoutId);
      }
      return;
    }
    
    // Si es admin, cargar datos (solo cuando todo esté listo)
    if (isAdmin && !adminLoading && !authLoading) {
      console.log('[AdminDashboard] ✅ User is admin, loading data');
      fetchAdminData();
      fetchSubscriptionLimits();
      if (limitsTab) {
        fetchLimitsHistory();
      }
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate, limitsTab]);

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

  const openUserDialog = (userStat: UserStats, action: 'changeTier' | 'cancel' | 'refund' | 'addTrial') => {
    setSelectedUser(userStat);
    setActionType(action);
    setNewTier(userStat.tier);
    setRefundAmount('');
    setTrialDays('15');
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

  const handleAddTrial = async () => {
    if (!selectedUser || !trialDays) return;

    const days = parseInt(trialDays);
    if (isNaN(days) || days < 1) {
      toast.error('Please enter a valid number of days');
      return;
    }

    try {
      // Get current subscription
      const { data: currentSub, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('tier, expires_at')
        .eq('user_id', selectedUser.id)
        .single();

      if (fetchError) throw fetchError;

      const currentTier = currentSub?.tier || selectedUser.tier;
      const currentExpiresAt = currentSub?.expires_at 
        ? new Date(currentSub.expires_at)
        : new Date();
      
      // Calculate new expiration date
      const newExpiresAt = new Date(currentExpiresAt);
      newExpiresAt.setDate(newExpiresAt.getDate() + days);

      // Update subscription to trial
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'trial',
          expires_at: newExpiresAt.toISOString(),
          tier: currentTier === 'free' ? 'tier_1' : currentTier, // Upgrade to tier_1 if free
        })
        .eq('user_id', selectedUser.id);

      if (updateError) throw updateError;

      toast.success(`Trial period of ${days} days added successfully`);
      setDialogOpen(false);
      fetchAdminData();
    } catch (error: any) {
      console.error('Error adding trial:', error);
      toast.error(error.message || 'Error adding trial period');
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
      case 'addTrial':
        handleAddTrial();
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

  // Mostrar loading mientras se verifica el auth o el admin
  if (authLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {authLoading ? 'Verificando autenticación...' : 'Verificando permisos de administrador...'}
          </p>
        </div>
      </div>
    );
  }

  // Si no hay usuario después de cargar, mostrar nada (el useEffect redirige)
  if (!user) {
    return null;
  }

  // Si no es admin DESPUÉS de que todo cargó, mostrar nada (el useEffect redirige)
  if (!isAdmin && !adminLoading && !authLoading) {
    return null; // El useEffect ya redirigió o está por redirigir
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">{t('admin.title')}</h2>
        <div className="flex gap-2">
          <Button
            variant={!limitsTab ? "default" : "outline"}
            onClick={() => setLimitsTab(false)}
          >
            <Users className="h-4 w-4 mr-2" />
            Users
          </Button>
          <Button
            variant={limitsTab ? "default" : "outline"}
            onClick={() => {
              setLimitsTab(true);
              fetchLimitsHistory();
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Subscription Limits
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/grace-period')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Grace Period
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/metrics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Metrics
          </Button>
        </div>
      </div>

      {!limitsTab ? (
        <>

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
                                {actionType === 'addTrial' && 'Add a trial period for this user'}
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
                              {actionType === 'addTrial' && (
                                <div>
                                  <Label htmlFor="trialDays">Trial Days</Label>
                                  <Input
                                    id="trialDays"
                                    type="number"
                                    min="1"
                                    value={trialDays}
                                    onChange={(e) => setTrialDays(e.target.value)}
                                    placeholder="15"
                                  />
                                  <p className="text-sm text-muted-foreground mt-1">
                                    The user will get {trialDays} days of trial access. 
                                    {selectedUser?.tier === 'free' && ' They will be upgraded to Professional tier during the trial.'}
                                  </p>
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
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openUserDialog(userStat, 'addTrial')}
                          title="Add Trial Period"
                        >
                          <Clock className="h-3 w-3" />
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
      ) : (
        <>
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription Limits</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure the limits for each subscription tier. Changes will apply immediately to all users.
            </p>
          </CardHeader>
          <CardContent>
            {editingLimits ? (
              <div className="space-y-6">
                {(['free', 'tier_1', 'tier_2'] as const).map((tier) => {
                  const tierName = tier === 'free' ? 'Free' : tier === 'tier_1' ? 'Professional' : 'Business';
                  const tierLimits = editingLimits[tier];
                  
                  return (
                    <div key={tier} className="border rounded-lg p-4 space-y-4">
                      <h3 className="text-lg font-semibold mb-4">{tierName} Tier</h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                          <Label htmlFor={`${tier}-materials`}>Materials</Label>
                          <Input
                            id={`${tier}-materials`}
                            type="number"
                            min="0"
                            value={tierLimits.materials}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, materials: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${tier}-projects`}>Projects</Label>
                          <Input
                            id={`${tier}-projects`}
                            type="number"
                            min="0"
                            value={tierLimits.projects}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, projects: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${tier}-orders`}>Monthly Orders</Label>
                          <Input
                            id={`${tier}-orders`}
                            type="number"
                            min="0"
                            value={tierLimits.monthlyOrders}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, monthlyOrders: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${tier}-history`}>Metrics History (days)</Label>
                          <Input
                            id={`${tier}-history`}
                            type="number"
                            min="0"
                            value={tierLimits.metricsHistory}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, metricsHistory: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${tier}-lists`}>Shopping Lists</Label>
                          <Input
                            id={`${tier}-lists`}
                            type="number"
                            min="0"
                            value={tierLimits.shoppingLists}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, shoppingLists: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingLimits(limits);
                      toast.info('Changes discarded');
                    }}
                    disabled={savingLimits}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveLimits}
                    disabled={savingLimits}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingLimits ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Loading subscription limits...
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Limits History */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Limits Change History
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  View all changes made to subscription limits for audit purposes
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLimitsHistory}
                disabled={loadingHistory}
              >
                <Clock className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading history...
              </div>
            ) : limitsHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No changes recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Changed By</TableHead>
                      <TableHead>Change Type</TableHead>
                      <TableHead>Materials</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Monthly Orders</TableHead>
                      <TableHead>Metrics History</TableHead>
                      <TableHead>Shopping Lists</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {limitsHistory.map((entry) => {
                      const tierName = entry.tier === 'free' ? 'Free' : entry.tier === 'tier_1' ? 'Professional' : 'Business';
                      const changedBy = entry.changed_by_user?.email || entry.changed_by_user?.full_name || 'System';
                      const changeTypeColor = entry.change_type === 'created' ? 'bg-green-100 text-green-800' :
                                             entry.change_type === 'updated' ? 'bg-blue-100 text-blue-800' :
                                             'bg-red-100 text-red-800';
                      
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{tierName}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{changedBy}</TableCell>
                          <TableCell>
                            <Badge className={changeTypeColor}>
                              {entry.change_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.old_materials !== null && entry.new_materials !== null ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground line-through">{entry.old_materials}</span>
                                <span>→</span>
                                <span className="font-semibold">{entry.new_materials}</span>
                              </div>
                            ) : entry.new_materials !== null ? (
                              <span className="font-semibold text-green-600">{entry.new_materials}</span>
                            ) : (
                              <span className="text-muted-foreground line-through">{entry.old_materials}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.old_projects !== null && entry.new_projects !== null ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground line-through">{entry.old_projects}</span>
                                <span>→</span>
                                <span className="font-semibold">{entry.new_projects}</span>
                              </div>
                            ) : entry.new_projects !== null ? (
                              <span className="font-semibold text-green-600">{entry.new_projects}</span>
                            ) : (
                              <span className="text-muted-foreground line-through">{entry.old_projects}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.old_monthly_orders !== null && entry.new_monthly_orders !== null ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground line-through">{entry.old_monthly_orders}</span>
                                <span>→</span>
                                <span className="font-semibold">{entry.new_monthly_orders}</span>
                              </div>
                            ) : entry.new_monthly_orders !== null ? (
                              <span className="font-semibold text-green-600">{entry.new_monthly_orders}</span>
                            ) : (
                              <span className="text-muted-foreground line-through">{entry.old_monthly_orders}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.old_metrics_history !== null && entry.new_metrics_history !== null ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground line-through">{entry.old_metrics_history}</span>
                                <span>→</span>
                                <span className="font-semibold">{entry.new_metrics_history}</span>
                              </div>
                            ) : entry.new_metrics_history !== null ? (
                              <span className="font-semibold text-green-600">{entry.new_metrics_history}</span>
                            ) : (
                              <span className="text-muted-foreground line-through">{entry.old_metrics_history}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.old_shopping_lists !== null && entry.new_shopping_lists !== null ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground line-through">{entry.old_shopping_lists}</span>
                                <span>→</span>
                                <span className="font-semibold">{entry.new_shopping_lists}</span>
                              </div>
                            ) : entry.new_shopping_lists !== null ? (
                              <span className="font-semibold text-green-600">{entry.new_shopping_lists}</span>
                            ) : (
                              <span className="text-muted-foreground line-through">{entry.old_shopping_lists}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}
    </>
  );
};

export default AdminDashboard;
