import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Users, Package, FolderOpen, ShoppingCart, Edit, DollarSign, Settings, Save, History, Clock, BarChart3, Search, X, Tag, RefreshCw, Trash2, AlertTriangle, FileText } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { FinancialDashboard } from "@/components/FinancialDashboard";

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
  const [filteredUsers, setFilteredUsers] = useState<UserStats[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20;
  
  // Form states for user management
  const [newTier, setNewTier] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [trialDays, setTrialDays] = useState<string>('15');
  const [notes, setNotes] = useState<string>('');
  const [actionType, setActionType] = useState<'changeTier' | 'cancel' | 'refund' | 'addTrial'>('changeTier');
  
  // Navigation - using section state instead of multiple tabs
  const [activeSection, setActiveSection] = useState<string>('users');
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
  
  // Promo codes management
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loadingPromoCodes, setLoadingPromoCodes] = useState(false);
  const [promoCodeDialogOpen, setPromoCodeDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<any | null>(null);
  const [promoCodeForm, setPromoCodeForm] = useState({
    code: '',
    tier: 'tier_1',
    description: '',
    expires_at: '',
    max_uses: '',
    is_active: true,
  });

  // Creator codes management
  const [creatorCodes, setCreatorCodes] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingCreatorCodes, setLoadingCreatorCodes] = useState(false);
  const [creatorCodeDialogOpen, setCreatorCodeDialogOpen] = useState(false);
  const [editingCreatorCode, setEditingCreatorCode] = useState<any | null>(null);
  const [creatorCodeForm, setCreatorCodeForm] = useState({
    code: '',
    creator_user_id: '',
    trial_days: '30',
    tier_granted: 'tier_2',
    discount_percentage: '0',
    creator_commission_percentage: '10',
    description: '',
    expires_at: '',
    max_uses: '',
    is_active: true,
  });

  // Refund requests management
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [loadingRefundRequests, setLoadingRefundRequests] = useState(false);
  const [refundRequestDialogOpen, setRefundRequestDialogOpen] = useState(false);
  const [selectedRefundRequest, setSelectedRefundRequest] = useState<any | null>(null);
  const [refundAdminNotes, setRefundAdminNotes] = useState<string>('');
  const [refundAction, setRefundAction] = useState<'approve' | 'reject'>('approve');
  const [userAnalysisData, setUserAnalysisData] = useState<any>(null);
  const [loadingUserAnalysis, setLoadingUserAnalysis] = useState(false);
  
  // Delete user management
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [deleteUserConfirmDialogOpen, setDeleteUserConfirmDialogOpen] = useState(false);
  const [deleteUserReason, setDeleteUserReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Fetch pending refund requests count for alert
  const [pendingRefundCount, setPendingRefundCount] = useState(0);
  
  // Grace Period management
  const [gracePeriodUsers, setGracePeriodUsers] = useState<any[]>([]);
  const [loadingGracePeriod, setLoadingGracePeriod] = useState(false);
  const [gracePeriodDialogOpen, setGracePeriodDialogOpen] = useState(false);
  const [selectedGracePeriodUser, setSelectedGracePeriodUser] = useState<any | null>(null);
  const [extensionDays, setExtensionDays] = useState('30');
  const [processingGracePeriod, setProcessingGracePeriod] = useState(false);
  
  // Metrics
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  
  // Invoices management
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceFilters, setInvoiceFilters] = useState({
    userId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  
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

  const fetchPromoCodes = async () => {
    try {
      setLoadingPromoCodes(true);
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*, user_promo_codes(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error: any) {
      console.error('Error fetching promo codes:', error);
      toast.error('Error loading promo codes');
    } finally {
      setLoadingPromoCodes(false);
    }
  };

  const handleSavePromoCode = async () => {
    try {
      if (!promoCodeForm.code.trim()) {
        toast.error('Code is required');
        return;
      }

      const promoCodeData: any = {
        code: promoCodeForm.code.trim().toUpperCase(),
        tier: promoCodeForm.tier,
        description: promoCodeForm.description || null,
        expires_at: promoCodeForm.expires_at || null,
        max_uses: promoCodeForm.max_uses ? parseInt(promoCodeForm.max_uses) : null,
        is_active: promoCodeForm.is_active,
        created_by: user?.id,
      };

      if (editingPromoCode) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoCodeData)
          .eq('id', editingPromoCode.id);

        if (error) throw error;
        toast.success('Promo code updated successfully');
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([promoCodeData]);

        if (error) throw error;
        toast.success('Promo code created successfully');
      }

      setPromoCodeDialogOpen(false);
      setEditingPromoCode(null);
      setPromoCodeForm({
        code: '',
        tier: 'tier_1',
        description: '',
        expires_at: '',
        max_uses: '',
        is_active: true,
      });
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      toast.error(error.message || 'Error saving promo code');
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Promo code deleted successfully');
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      toast.error(error.message || 'Error deleting promo code');
    }
  };

  const openPromoCodeDialog = (promoCode?: any) => {
    if (promoCode) {
      setEditingPromoCode(promoCode);
      setPromoCodeForm({
        code: promoCode.code,
        tier: promoCode.tier,
        description: promoCode.description || '',
        expires_at: promoCode.expires_at ? new Date(promoCode.expires_at).toISOString().split('T')[0] : '',
        max_uses: promoCode.max_uses?.toString() || '',
        is_active: promoCode.is_active,
      });
    } else {
      setEditingPromoCode(null);
      setPromoCodeForm({
        code: '',
        tier: 'tier_1',
        description: '',
        expires_at: '',
        max_uses: '',
        is_active: true,
      });
    }
    setPromoCodeDialogOpen(true);
  };

  const fetchCreatorCodes = async () => {
    try {
      setLoadingCreatorCodes(true);
      
      const { data, error } = await supabase
        .from('creator_codes' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enriquecer manualmente con datos de usuarios y counts
      const enrichedData = await Promise.all((data || []).map(async (code: any) => {
        let creatorUser = null;
        let usesCount = code.current_uses || 0;
        
        try {
          const userRes = await supabase.from('profiles').select('id, email, full_name').eq('id', code.creator_user_id).single();
          if (!userRes.error) creatorUser = userRes.data;
        } catch (e) {
          console.warn('Error fetching creator user:', e);
        }
        
        try {
          const usesRes = await supabase.from('creator_code_uses' as any).select('*', { count: 'exact', head: true }).eq('creator_code_id', code.id);
          if (!usesRes.error) usesCount = usesRes.count || 0;
        } catch (e) {
          console.warn('Error fetching uses count:', e);
        }
        
        return {
          ...code,
          creator_user: creatorUser,
          current_uses: usesCount
        };
      }));

      setCreatorCodes(enrichedData);
    } catch (error: any) {
      console.error('Error fetching creator codes:', error);
      toast.error(`Error loading creator codes: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingCreatorCodes(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRefundRequests = async () => {
    try {
      setLoadingRefundRequests(true);
      const { data, error } = await supabase
        .from('refund_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Refund requests error details:', error);
        throw error;
      }
      
      // Enriquecer manualmente con datos de usuarios e invoices
      const enrichedData = await Promise.all((data || []).map(async (request: any) => {
        let user = null;
        let invoice = null;
        
        try {
          const userRes = await supabase.from('profiles').select('id, email, full_name').eq('id', request.user_id).single();
          if (!userRes.error) user = userRes.data;
        } catch (e) {
          console.warn('Error fetching user for refund request:', e);
        }
        
        if (request.invoice_id) {
          try {
            const invoiceRes = await supabase.from('invoices').select('id, invoice_number, amount').eq('id', request.invoice_id).single();
            if (!invoiceRes.error) invoice = invoiceRes.data;
          } catch (e) {
            console.warn('Error fetching invoice for refund request:', e);
          }
        }
        
        return {
          ...request,
          user: user,
          invoice: invoice
        };
      }));
      
      setRefundRequests(enrichedData);
    } catch (error: any) {
      console.error('Error fetching refund requests:', error);
      toast.error(`Error loading refund requests: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingRefundRequests(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      
      // Build query
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (invoiceFilters.userId) {
        query = query.eq('user_id', invoiceFilters.userId);
      }
      if (invoiceFilters.status) {
        query = query.eq('status', invoiceFilters.status);
      }
      if (invoiceFilters.dateFrom) {
        query = query.gte('issued_date', invoiceFilters.dateFrom);
      }
      if (invoiceFilters.dateTo) {
        query = query.lte('issued_date', invoiceFilters.dateTo);
      }
      if (invoiceSearchQuery) {
        query = query.or(`invoice_number.ilike.%${invoiceSearchQuery}%,notes.ilike.%${invoiceSearchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Enrich with user data
      const enrichedData = await Promise.all((data || []).map(async (invoice: any) => {
        let user = null;
        try {
          const userRes = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', invoice.user_id)
            .single();
          if (!userRes.error) user = userRes.data;
        } catch (e) {
          console.warn('Error fetching user for invoice:', e);
        }
        return {
          ...invoice,
          user: user,
        };
      }));

      setInvoices(enrichedData);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast.error(`Error loading invoices: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchGracePeriodUsers = async () => {
    try {
      setLoadingGracePeriod(true);
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, tier, previous_tier, downgrade_date, grace_period_end, is_read_only')
        .not('grace_period_end', 'is', null)
        .gt('grace_period_end', new Date().toISOString());

      if (subsError) throw subsError;

      if (!subscriptions || subscriptions.length === 0) {
        setGracePeriodUsers([]);
        return;
      }

      const userIds = subscriptions.map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const usersData = subscriptions.map(sub => {
        const profile = profiles?.find(p => p.id === sub.user_id);
        const gracePeriodEnd = new Date(sub.grace_period_end);
        const now = new Date();
        const daysRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          user_id: sub.user_id,
          email: profile?.email || 'Unknown',
          full_name: profile?.full_name || null,
          tier: sub.tier,
          previous_tier: sub.previous_tier,
          downgrade_date: sub.downgrade_date,
          grace_period_end: sub.grace_period_end,
          is_read_only: sub.is_read_only || false,
          days_remaining: daysRemaining
        };
      }).sort((a, b) => a.days_remaining - b.days_remaining);

      setGracePeriodUsers(usersData);
    } catch (error: any) {
      console.error('Error fetching grace period users:', error);
      toast.error('Error loading grace period users');
    } finally {
      setLoadingGracePeriod(false);
    }
  };

  const handleExtendGracePeriod = async () => {
    if (!selectedGracePeriodUser) return;

    try {
      setProcessingGracePeriod(true);
      const days = parseInt(extensionDays);
      if (isNaN(days) || days < 1) {
        toast.error('Please enter a valid number of days');
        return;
      }

      const currentEnd = new Date(selectedGracePeriodUser.grace_period_end);
      const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ grace_period_end: newEnd.toISOString() })
        .eq('user_id', selectedGracePeriodUser.user_id);

      if (error) throw error;

      toast.success(`Grace period extended by ${days} days`);
      setGracePeriodDialogOpen(false);
      fetchGracePeriodUsers();
    } catch (error: any) {
      console.error('Error extending grace period:', error);
      toast.error('Failed to extend grace period');
    } finally {
      setProcessingGracePeriod(false);
    }
  };

  const handleCancelGracePeriod = async (userId: string) => {
    try {
      setProcessingGracePeriod(true);
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          grace_period_end: null,
          previous_tier: null,
          downgrade_date: null,
          is_read_only: false
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Grace period cancelled successfully');
      fetchGracePeriodUsers();
    } catch (error: any) {
      console.error('Error cancelling grace period:', error);
      toast.error('Failed to cancel grace period');
    } finally {
      setProcessingGracePeriod(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      
      const monthStart = new Date(now);
      monthStart.setDate(monthStart.getDate() - 30);
      monthStart.setHours(0, 0, 0, 0);

      const [profilesRes, subscriptionsRes, materialsRes, projectsRes, ordersRes, printsRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at'),
        supabase.from('user_subscriptions').select('user_id, tier, status, created_at, previous_tier, downgrade_date, expires_at, grace_period_end'),
        supabase.from('materials').select('id, user_id, created_at'),
        supabase.from('projects').select('id, user_id, created_at'),
        supabase.from('orders').select('id, user_id, created_at, total_amount'),
        supabase.from('prints').select('id, user_id, created_at')
      ]);

      const allProfiles = profilesRes.data || [];
      const allSubscriptions = subscriptionsRes.data || [];
      const allMaterials = materialsRes.data || [];
      const allProjects = projectsRes.data || [];
      const allOrders = ordersRes.data || [];
      const allPrints = printsRes.data || [];

      const totalUsers = allProfiles.length;
      const newUsersToday = allProfiles.filter(p => new Date(p.created_at) >= todayStart).length;
      const newUsersThisWeek = allProfiles.filter(p => new Date(p.created_at) >= weekStart).length;
      const newUsersThisMonth = allProfiles.filter(p => new Date(p.created_at) >= monthStart).length;

      const activeUserIds = new Set<string>();
      [...allMaterials, ...allProjects, ...allOrders].forEach(item => {
        if (item.created_at && new Date(item.created_at) >= monthStart) {
          activeUserIds.add(item.user_id);
        }
      });
      const activeUsers = activeUserIds.size;

      const activeSubscriptionsByTier = {
        free: allSubscriptions.filter(s => s.tier === 'free' && s.status === 'active').length,
        tier_1: allSubscriptions.filter(s => s.tier === 'tier_1' && s.status === 'active').length,
        tier_2: allSubscriptions.filter(s => s.tier === 'tier_2' && s.status === 'active').length,
      };

      const newUsersThisMonthList = allProfiles.filter(p => new Date(p.created_at) >= monthStart);
      const newUsersByTier = { free: 0, tier_1: 0, tier_2: 0 };
      newUsersThisMonthList.forEach(profile => {
        const sub = allSubscriptions.find(s => s.user_id === profile.id);
        const tier = sub?.tier || 'free';
        newUsersByTier[tier as keyof typeof newUsersByTier]++;
      });

      const activeUsersByTier = { free: 0, tier_1: 0, tier_2: 0 };
      activeUserIds.forEach(userId => {
        const sub = allSubscriptions.find(s => s.user_id === userId);
        const tier = sub?.tier || 'free';
        activeUsersByTier[tier as keyof typeof activeUsersByTier]++;
      });

      const cancellations = allSubscriptions.filter(s => 
        s.previous_tier === 'tier_1' && s.tier === 'free' && s.downgrade_date
      );
      const downgrades = allSubscriptions.filter(s => 
        s.previous_tier === 'tier_2' && s.tier === 'tier_1' && s.downgrade_date
      );

      const metricsData = {
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        activeUsers,
        activeUsersByTier,
        newUsersByTier,
        activeSubscriptionsByTier,
        totalCancellations: cancellations.length,
        totalDowngrades: downgrades.length,
        cancellationsToday: cancellations.filter(c => c.downgrade_date && new Date(c.downgrade_date) >= todayStart).length,
        downgradesToday: downgrades.filter(d => d.downgrade_date && new Date(d.downgrade_date) >= todayStart).length,
        totalMaterials: allMaterials.length,
        materialsToday: allMaterials.filter(m => new Date(m.created_at) >= todayStart).length,
        totalProjects: allProjects.length,
        projectsToday: allProjects.filter(p => new Date(p.created_at) >= todayStart).length,
        totalOrders: allOrders.length,
        ordersToday: allOrders.filter(o => new Date(o.created_at) >= todayStart).length,
        totalPrints: allPrints.length,
        printsToday: allPrints.filter(p => new Date(p.created_at) >= todayStart).length,
        totalRevenue: allOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount?.toString() || '0') || 0), 0),
        revenueThisMonth: allOrders.filter(o => new Date(o.created_at) >= monthStart).reduce((sum, o) => sum + (parseFloat(o.total_amount?.toString() || '0') || 0), 0),
        usersInGracePeriod: allSubscriptions.filter(s => s.grace_period_end && new Date(s.grace_period_end) > new Date()).length,
        usersInTrial: allSubscriptions.filter(s => s.status === 'trial' && s.expires_at && new Date(s.expires_at) > new Date()).length,
        usersInTrialByTier: {
          free: allSubscriptions.filter(s => s.status === 'trial' && s.tier === 'free' && s.expires_at && new Date(s.expires_at) > new Date()).length,
          tier_1: allSubscriptions.filter(s => s.status === 'trial' && s.tier === 'tier_1' && s.expires_at && new Date(s.expires_at) > new Date()).length,
          tier_2: allSubscriptions.filter(s => s.status === 'trial' && s.tier === 'tier_2' && s.expires_at && new Date(s.expires_at) > new Date()).length,
        },
      };

      setMetrics(metricsData);
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      toast.error('Error loading metrics');
    } finally {
      setLoadingMetrics(false);
    }
  };

  const openRefundRequestDialog = (request: any, action: 'approve' | 'reject') => {
    setSelectedRefundRequest(request);
    setRefundAction(action);
    setRefundAdminNotes('');
    setRefundRequestDialogOpen(true);
  };

  const handleProcessRefundRequest = async () => {
    if (!selectedRefundRequest || !user) return;

    try {
      const updateData: any = {
        status: refundAction === 'approve' ? 'approved' : 'rejected',
        admin_id: user.id,
        admin_notes: refundAdminNotes || null,
        processed_at: new Date().toISOString()
      };

      if (refundAction === 'approve') {
        // Create refund invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            user_id: selectedRefundRequest.user_id,
            invoice_number: `REF-${Date.now()}`,
            amount: -Math.abs(selectedRefundRequest.amount),
            status: 'refunded',
            tier: selectedRefundRequest.user?.tier || 'free',
            notes: `Refund for request: ${selectedRefundRequest.reason}`
          }]);

        if (invoiceError) throw invoiceError;
        updateData.status = 'processed';
      }

      const { error: updateError } = await supabase
        .from('refund_requests' as any)
        .update(updateData)
        .eq('id', selectedRefundRequest.id);

      if (updateError) throw updateError;

      toast.success(`Refund request ${refundAction === 'approve' ? 'approved and processed' : 'rejected'} successfully`);
      setRefundRequestDialogOpen(false);
      setSelectedRefundRequest(null);
      setRefundAdminNotes('');
      fetchRefundRequests();
    } catch (error: any) {
      console.error('Error processing refund request:', error);
      toast.error(error.message || `Error ${refundAction === 'approve' ? 'approving' : 'rejecting'} refund request`);
    }
  };

  const openDeleteUserDialog = (userStat: UserStats) => {
    setSelectedUser(userStat);
    setDeleteUserReason('');
    setDeleteConfirmText('');
    setDeleteUserDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !deleteUserReason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      // Soft delete: update deleted_at instead of actually deleting
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User deleted successfully');
      setDeleteUserConfirmDialogOpen(false);
      setDeleteUserDialogOpen(false);
      setSelectedUser(null);
      setDeleteUserReason('');
      setDeleteConfirmText('');
      fetchAdminData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Error deleting user');
    }
  };

  const handleSaveCreatorCode = async () => {
    try {
      if (!creatorCodeForm.code.trim()) {
        toast.error('Code is required');
        return;
      }
      if (!creatorCodeForm.creator_user_id) {
        toast.error('Creator user is required');
        return;
      }

      const creatorCodeData: any = {
        code: creatorCodeForm.code.trim().toUpperCase(),
        creator_user_id: creatorCodeForm.creator_user_id,
        trial_days: parseInt(creatorCodeForm.trial_days) || 0,
        tier_granted: creatorCodeForm.tier_granted,
        discount_percentage: parseFloat(creatorCodeForm.discount_percentage) || 0,
        creator_commission_percentage: parseFloat(creatorCodeForm.creator_commission_percentage) || 0,
        description: creatorCodeForm.description || null,
        expires_at: creatorCodeForm.expires_at || null,
        max_uses: creatorCodeForm.max_uses ? parseInt(creatorCodeForm.max_uses) : null,
        is_active: creatorCodeForm.is_active,
        created_by: user?.id,
      };

      if (editingCreatorCode) {
        const { error } = await supabase
          .from('creator_codes' as any)
          .update(creatorCodeData)
          .eq('id', editingCreatorCode.id);

        if (error) throw error;
        toast.success('Creator code updated successfully');
      } else {
        const { error } = await supabase
          .from('creator_codes' as any)
          .insert([creatorCodeData]);

        if (error) throw error;
        toast.success('Creator code created successfully');
      }

      setCreatorCodeDialogOpen(false);
      setEditingCreatorCode(null);
      setCreatorCodeForm({
        code: '',
        creator_user_id: '',
        trial_days: '30',
        tier_granted: 'tier_2',
        discount_percentage: '0',
        creator_commission_percentage: '10',
        description: '',
        expires_at: '',
        max_uses: '',
        is_active: true,
      });
      fetchCreatorCodes();
    } catch (error: any) {
      console.error('Error saving creator code:', error);
      toast.error(error.message || 'Error saving creator code');
    }
  };

  const handleDeleteCreatorCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this creator code?')) return;

    try {
      const { error } = await supabase
        .from('creator_codes' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Creator code deleted successfully');
      fetchCreatorCodes();
    } catch (error: any) {
      console.error('Error deleting creator code:', error);
      toast.error(error.message || 'Error deleting creator code');
    }
  };

  const openCreatorCodeDialog = (creatorCode?: any) => {
    if (creatorCode) {
      setEditingCreatorCode(creatorCode);
      setCreatorCodeForm({
        code: creatorCode.code,
        creator_user_id: creatorCode.creator_user_id,
        trial_days: creatorCode.trial_days?.toString() || '30',
        tier_granted: creatorCode.tier_granted,
        discount_percentage: creatorCode.discount_percentage?.toString() || '0',
        creator_commission_percentage: creatorCode.creator_commission_percentage?.toString() || '10',
        description: creatorCode.description || '',
        expires_at: creatorCode.expires_at ? new Date(creatorCode.expires_at).toISOString().split('T')[0] : '',
        max_uses: creatorCode.max_uses?.toString() || '',
        is_active: creatorCode.is_active,
      });
    } else {
      setEditingCreatorCode(null);
      setCreatorCodeForm({
        code: '',
        creator_user_id: '',
        trial_days: '30',
        tier_granted: 'tier_2',
        discount_percentage: '0',
        creator_commission_percentage: '10',
        description: '',
        expires_at: '',
        max_uses: '',
        is_active: true,
      });
    }
    setCreatorCodeDialogOpen(true);
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
      fetchAllUsers();
      if (activeSection === 'limits') {
        fetchLimitsHistory();
      }
      if (activeSection === 'promo-codes') {
        fetchPromoCodes();
      }
      if (activeSection === 'creator-codes') {
        fetchCreatorCodes();
      }
      if (activeSection === 'refunds') {
        fetchRefundRequests();
      }
      if (activeSection === 'invoices') {
        fetchInvoices();
      }
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate, activeSection]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(query) ||
      (user.full_name && user.full_name.toLowerCase().includes(query)) ||
      user.tier.toLowerCase().includes(query) ||
      user.subscription_status.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchQuery, users]);

  // Fetch pending refund requests count for alert
  useEffect(() => {
    if (isAdmin && !adminLoading) {
      const fetchPendingRefunds = async () => {
        const { count } = await supabase
          .from('refund_requests' as any)
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingRefundCount(count || 0);
      };
      fetchPendingRefunds();
      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingRefunds, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, adminLoading]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const fetchAdminData = async () => {
    try {
      // Fetch all non-deleted profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .is('deleted_at', null);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setTotalUsers(0);
        setFilteredUsers([]);
        setLoading(false);
        return;
      }

      const userStatsPromises = profiles.map(async (profile) => {
        const [subRes, roleRes, materialsRes, projectsRes, ordersRes] = await Promise.all([
          supabase.from('user_subscriptions').select('tier, status').eq('user_id', profile.id).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', profile.id).maybeSingle(),
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
      setFilteredUsers(userStats);
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
          tier: (currentTier === 'free' ? 'tier_1' : currentTier) as 'tier_1' | 'tier_2' | 'free', // Upgrade to tier_1 if free
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

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    
    // Cargar datos según la sección
    if (section === 'limits') {
      fetchLimitsHistory();
    } else if (section === 'promo-codes') {
      fetchPromoCodes();
    } else if (section === 'creator-codes') {
      fetchCreatorCodes();
    } else if (section === 'refunds') {
      fetchRefundRequests();
    } else if (section === 'invoices') {
      fetchInvoices();
    } else if (section === 'grace-period') {
      fetchGracePeriodUsers();
    } else if (section === 'metrics') {
      fetchMetrics();
    }
  };

  return (
    <SidebarProvider>
      <AdminSidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        pendingRefundCount={pendingRefundCount}
      />
      <SidebarInset>
        <div className="flex items-center gap-2 p-4 border-b">
          <SidebarTrigger />
          <div className="flex-1" />
          <LanguageSwitcher />
        </div>
        
        <div className="p-6">
          {/* Alert for Pending Refund Requests */}
          {pendingRefundCount > 0 && activeSection !== 'refunds' && (
            <Card className="border-orange-500/50 bg-orange-500/10 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-semibold text-orange-600">
                        {pendingRefundCount} solicitud{pendingRefundCount > 1 ? 'es' : ''} de refund pendiente{pendingRefundCount > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Hay solicitudes de refund esperando revisión
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => {
                      handleSectionChange('refunds');
                    }}
                  >
                    Ver Solicitudes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

      {activeSection === 'financial-dashboard' ? (
        <FinancialDashboard />
      ) : activeSection === 'invoices' ? (
        <>
          <div className="mb-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label>Buscar</Label>
                <Input
                  placeholder="Buscar por número de factura o notas..."
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="min-w-[150px]">
                <Label>Usuario</Label>
                <Select
                  value={invoiceFilters.userId}
                  onValueChange={(value) => setInvoiceFilters({ ...invoiceFilters, userId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los usuarios</SelectItem>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]">
                <Label>Estado</Label>
                <Select
                  value={invoiceFilters.status}
                  onValueChange={(value) => setInvoiceFilters({ ...invoiceFilters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los estados</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={invoiceFilters.dateFrom}
                  onChange={(e) => setInvoiceFilters({ ...invoiceFilters, dateFrom: e.target.value })}
                />
              </div>
              <div className="min-w-[150px]">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={invoiceFilters.dateTo}
                  onChange={(e) => setInvoiceFilters({ ...invoiceFilters, dateTo: e.target.value })}
                />
              </div>
              <Button variant="outline" onClick={fetchInvoices} disabled={loadingInvoices}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingInvoices ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setInvoiceFilters({ userId: '', status: '', dateFrom: '', dateTo: '' });
                  setInvoiceSearchQuery('');
                  fetchInvoices();
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Facturas ({invoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="text-center py-8">Cargando facturas...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron facturas
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Fecha Emisión</TableHead>
                        <TableHead>Fecha Pago</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.user?.email || 'Unknown'}</div>
                              {invoice.user?.full_name && (
                                <div className="text-sm text-muted-foreground">{invoice.user.full_name}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {invoice.issued_date ? new Date(invoice.issued_date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {invoice.tier === 'tier_1' ? 'Pro' : invoice.tier === 'tier_2' ? 'Enterprise' : 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{invoice.billing_period || 'N/A'}</TableCell>
                          <TableCell className={`font-semibold ${invoice.amount < 0 ? 'text-destructive' : ''}`}>
                            {invoice.amount.toFixed(2)} {invoice.currency || 'EUR'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                invoice.status === 'paid' ? 'default' :
                                invoice.status === 'refunded' ? 'destructive' :
                                invoice.status === 'failed' ? 'destructive' : 'secondary'
                              }
                            >
                              {invoice.status === 'paid' ? 'Pagado' :
                               invoice.status === 'refunded' ? 'Reembolsado' :
                               invoice.status === 'failed' ? 'Fallido' : 'Pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={invoice.notes || ''}>
                            {invoice.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : activeSection === 'refunds' ? (
        <>
          {/* Action Menu - Two Rows */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={fetchRefundRequests} disabled={loadingRefundRequests}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingRefundRequests ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => {
                const pendingOnly = refundRequests.filter(r => r.status === 'pending');
                setRefundRequests(pendingOnly.length === refundRequests.length ? refundRequests : pendingOnly);
              }}>
                <Search className="h-4 w-4 mr-2" />
                Filter Pending
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Refund Requests Management</CardTitle>
            </CardHeader>
          <CardContent>
            {loadingRefundRequests ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No refund requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    refundRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.user?.email || 'Unknown'}</p>
                            {request.user?.full_name && (
                              <p className="text-sm text-muted-foreground">{request.user.full_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.invoice?.invoice_number || 'N/A'}
                        </TableCell>
                        <TableCell className="font-semibold">€{request.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.refund_type === 'monthly_payment' ? 'Monthly' :
                             request.refund_type === 'annual_payment_error' ? 'Annual Error' :
                             request.refund_type === 'application_issue' ? 'App Issue' : 'Other'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              request.status === 'approved' || request.status === 'processed' ? 'default' :
                              request.status === 'rejected' ? 'destructive' : 'secondary'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="default" 
                                onClick={() => openRefundRequestDialog(request, 'approve')}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => openRefundRequestDialog(request, 'reject')}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {request.status !== 'pending' && request.admin_notes && (
                            <p className="text-xs text-muted-foreground max-w-xs truncate" title={request.admin_notes}>
                              {request.admin_notes}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </>
      ) : activeSection === 'creator-codes' ? (
        <>
          {/* Action Menu - Two Rows */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openCreatorCodeDialog()}>
                <Tag className="h-4 w-4 mr-2" />
                Create Creator Code
              </Button>
              <Button variant="outline" onClick={fetchCreatorCodes} disabled={loadingCreatorCodes}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingCreatorCodes ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Creator Codes Management</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCreatorCodes ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Trial Days</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Discount %</TableHead>
                      <TableHead>Commission %</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Max Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatorCodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No creator codes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      creatorCodes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-mono font-semibold">{code.code}</TableCell>
                          <TableCell>
                            {code.creator_user?.full_name || code.creator_user?.email || 'Unknown'}
                          </TableCell>
                          <TableCell>{code.trial_days || 0}</TableCell>
                          <TableCell>
                            <Badge variant={code.tier_granted === 'tier_2' ? 'default' : code.tier_granted === 'tier_1' ? 'secondary' : 'outline'}>
                              {code.tier_granted === 'tier_2' ? 'Business' : code.tier_granted === 'tier_1' ? 'Professional' : 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell>{code.discount_percentage || 0}%</TableCell>
                          <TableCell>{code.creator_commission_percentage || 0}%</TableCell>
                          <TableCell>{code.current_uses || 0}</TableCell>
                          <TableCell>{code.max_uses || '∞'}</TableCell>
                          <TableCell>
                            {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={code.is_active ? 'default' : 'secondary'}>
                              {code.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openCreatorCodeDialog(code)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteCreatorCode(code.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : activeSection === 'promo-codes' ? (
        <>
          {/* Action Menu - Two Rows */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openPromoCodeDialog()}>
                <Tag className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
              <Button variant="outline" onClick={fetchPromoCodes} disabled={loadingPromoCodes}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingPromoCodes ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Promo Codes Management</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPromoCodes ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Max Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No promo codes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      promoCodes.map((promo) => (
                        <TableRow key={promo.id}>
                          <TableCell className="font-mono font-semibold">{promo.code}</TableCell>
                          <TableCell>
                            <Badge variant={promo.tier === 'tier_2' ? 'default' : promo.tier === 'tier_1' ? 'secondary' : 'outline'}>
                              {promo.tier === 'tier_2' ? 'Business' : promo.tier === 'tier_1' ? 'Professional' : 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell>{promo.description || '-'}</TableCell>
                          <TableCell>{promo.current_uses || 0}</TableCell>
                          <TableCell>{promo.max_uses || '∞'}</TableCell>
                          <TableCell>
                            {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                              {promo.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openPromoCodeDialog(promo)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeletePromoCode(promo.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
        </>
      ) : activeSection === 'limits' ? (
        <>
          {/* Action Menu - Two Rows */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={fetchSubscriptionLimits}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Limits
              </Button>
              <Button variant="outline" onClick={fetchLimitsHistory}>
                <History className="h-4 w-4 mr-2" />
                View History
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Manage Subscription Limits</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure the limits for each subscription tier. Changes will apply immediately to all users.
              </p>
            </CardHeader>
          <CardContent>
            {loadingPromoCodes ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Max Uses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No promo codes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    promoCodes.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-mono font-semibold">{promo.code}</TableCell>
                        <TableCell>
                          <Badge variant={promo.tier === 'tier_2' ? 'default' : promo.tier === 'tier_1' ? 'secondary' : 'outline'}>
                            {promo.tier === 'tier_2' ? 'Business' : promo.tier === 'tier_1' ? 'Professional' : 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell>{promo.description || '-'}</TableCell>
                        <TableCell>{promo.current_uses || 0}</TableCell>
                        <TableCell>{promo.max_uses || '∞'}</TableCell>
                        <TableCell>
                          {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                            {promo.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openPromoCodeDialog(promo)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeletePromoCode(promo.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </>
      ) : activeSection === 'users' || activeSection === 'user-analysis' ? (
        <>
          {/* Action Menu - Two Rows */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={fetchAdminData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Users
              </Button>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </div>

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
            <div className="flex justify-between items-center">
              <CardTitle>{t('admin.userList')} ({filteredUsers.length})</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email, nombre, tier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-64"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
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
                {paginatedUsers.map((userStat) => (
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
                                  <Select value={newTier || ''} onValueChange={setNewTier}>
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
                  value={refundAmount || ''}
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
                  value={trialDays || ''}
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
                  value={notes || ''}
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
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteUserDialog(userStat)}
                          title="Delete User"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 10) {
                        pageNum = i + 1;
                      } else if (currentPage <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 4) {
                        pageNum = totalPages - 9 + i;
                      } else {
                        pageNum = currentPage - 5 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      ) : activeSection === 'limits' ? (
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
                  const tierLimits = editingLimits?.[tier] || { materials: 0, projects: 0, monthlyOrders: 0, metricsHistory: 0, shoppingLists: 0 };
                  
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
                            value={tierLimits?.materials?.toString() || '0'}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, materials: parseInt(e.target.value) || 0 }
                            } as typeof editingLimits)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${tier}-projects`}>Projects</Label>
                          <Input
                            id={`${tier}-projects`}
                            type="number"
                            min="0"
                            value={tierLimits?.projects?.toString() || '0'}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, projects: parseInt(e.target.value) || 0 }
                            } as typeof editingLimits)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${tier}-orders`}>Monthly Orders</Label>
                          <Input
                            id={`${tier}-orders`}
                            type="number"
                            min="0"
                            value={tierLimits?.monthlyOrders?.toString() || '0'}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, monthlyOrders: parseInt(e.target.value) || 0 }
                            } as typeof editingLimits)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${tier}-history`}>Metrics History (days)</Label>
                          <Input
                            id={`${tier}-history`}
                            type="number"
                            min="0"
                            value={tierLimits?.metricsHistory?.toString() || '0'}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, metricsHistory: parseInt(e.target.value) || 0 }
                            } as typeof editingLimits)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${tier}-lists`}>Shopping Lists</Label>
                          <Input
                            id={`${tier}-lists`}
                            type="number"
                            min="0"
                            value={tierLimits?.shoppingLists?.toString() || '0'}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              [tier]: { ...tierLimits, shoppingLists: parseInt(e.target.value) || 0 }
                            } as typeof editingLimits)}
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
      ) : activeSection === 'grace-period' ? (
        <>
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={fetchGracePeriodUsers} disabled={loadingGracePeriod}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingGracePeriod ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Users in grace period have read-only access. Their images will be deleted when the grace period ends.
              You can extend or cancel grace periods manually here.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Users in Grace Period ({gracePeriodUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGracePeriod ? (
                <div className="text-center py-8">Loading...</div>
              ) : gracePeriodUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users currently in grace period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Current Tier</TableHead>
                      <TableHead>Previous Tier</TableHead>
                      <TableHead>Downgrade Date</TableHead>
                      <TableHead>Deletion Date</TableHead>
                      <TableHead>Days Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gracePeriodUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.full_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.tier === 'free' ? 'Free' : user.tier === 'tier_1' ? 'Pro' : 'Enterprise'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>
                            {user.previous_tier === 'tier_1' ? 'Pro' : 'Enterprise'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.downgrade_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          {new Date(user.grace_period_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.days_remaining <= 7 ? 'destructive' : user.days_remaining <= 30 ? 'default' : 'secondary'}
                          >
                            {user.days_remaining} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_read_only && (
                            <Badge variant="outline">Read-Only</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedGracePeriodUser(user);
                                setGracePeriodDialogOpen(true);
                              }}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Extend
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelGracePeriod(user.user_id)}
                              disabled={processingGracePeriod}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : activeSection === 'metrics' ? (
        <>
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchMetrics} disabled={loadingMetrics}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingMetrics ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {loadingMetrics ? (
            <div className="text-center py-8">Loading metrics...</div>
          ) : metrics ? (
            <div className="space-y-6">
              {/* Users Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">New Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.newUsersToday}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">New This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.newUsersThisWeek}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.newUsersThisMonth}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalMaterials}</div>
                    <p className="text-xs text-muted-foreground mt-1">+{metrics.materialsToday} today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalProjects}</div>
                    <p className="text-xs text-muted-foreground mt-1">+{metrics.projectsToday} today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalOrders}</div>
                    <p className="text-xs text-muted-foreground mt-1">+{metrics.ordersToday} today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Prints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalPrints}</div>
                    <p className="text-xs text-muted-foreground mt-1">+{metrics.printsToday} today</p>
                  </CardContent>
                </Card>
              </div>

              {/* Grace Period & Trials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Grace Period & Trials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Usuarios en Grace Period</span>
                      <Badge variant="outline">{metrics.usersInGracePeriod}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Usuarios en Trial</span>
                      <Badge variant="default">{metrics.usersInTrial}</Badge>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-sm font-medium">Trials por Plan:</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Free</span>
                        <Badge variant="outline">{metrics.usersInTrialByTier.free}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Professional</span>
                        <Badge variant="default">{metrics.usersInTrialByTier.tier_1}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Business</span>
                        <Badge className="bg-purple-500">{metrics.usersInTrialByTier.tier_2}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Subscriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Active Free</span>
                      <Badge variant="outline">{metrics.activeSubscriptionsByTier.free}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Professional</span>
                      <Badge variant="default">{metrics.activeSubscriptionsByTier.tier_1}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Business</span>
                      <Badge className="bg-purple-500">{metrics.activeSubscriptionsByTier.tier_2}</Badge>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Cancellations</span>
                        <Badge variant="destructive">{metrics.totalCancellations}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Downgrades</span>
                        <Badge variant="secondary">{metrics.totalDowngrades}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No metrics available
            </div>
          )}
        </>
      ) : null}
        </div>

      {/* Extend Grace Period Dialog */}
      <Dialog open={gracePeriodDialogOpen} onOpenChange={setGracePeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Grace Period</DialogTitle>
            <DialogDescription>
              Extend the grace period for {selectedGracePeriodUser?.full_name || selectedGracePeriodUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Deletion Date</Label>
              <div className="text-sm text-muted-foreground">
                {selectedGracePeriodUser?.grace_period_end 
                  ? new Date(selectedGracePeriodUser.grace_period_end).toLocaleDateString()
                  : '-'}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-days">Extension Days</Label>
              <Input
                id="extension-days"
                type="number"
                min="1"
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
                placeholder="30"
              />
              <p className="text-sm text-muted-foreground">
                New deletion date: {selectedGracePeriodUser && new Date(
                  new Date(selectedGracePeriodUser.grace_period_end).getTime() + 
                  parseInt(extensionDays || '0') * 24 * 60 * 60 * 1000
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGracePeriodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendGracePeriod} disabled={processingGracePeriod}>
              {processingGracePeriod ? 'Extending...' : 'Extend Grace Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promo Code Dialog */}
      <Dialog open={promoCodeDialogOpen} onOpenChange={setPromoCodeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPromoCode ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
            <DialogDescription>
              {editingPromoCode ? 'Update the promo code details' : 'Create a new promo code for subscriptions'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="promo-code">Code *</Label>
              <Input
                id="promo-code"
                value={promoCodeForm.code || ''}
                onChange={(e) => setPromoCodeForm({ ...promoCodeForm, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="promo-tier">Tier *</Label>
              <Select value={promoCodeForm.tier || 'tier_1'} onValueChange={(value) => setPromoCodeForm({ ...promoCodeForm, tier: value })}>
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
            <div>
              <Label htmlFor="promo-description">Description</Label>
              <Textarea
                id="promo-description"
                value={promoCodeForm.description || ''}
                onChange={(e) => setPromoCodeForm({ ...promoCodeForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promo-expires">Expires At</Label>
                <Input
                  id="promo-expires"
                  type="date"
                  value={promoCodeForm.expires_at || ''}
                  onChange={(e) => setPromoCodeForm({ ...promoCodeForm, expires_at: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="promo-max-uses">Max Uses</Label>
                <Input
                  id="promo-max-uses"
                  type="number"
                  min="1"
                  value={promoCodeForm.max_uses || ''}
                  onChange={(e) => setPromoCodeForm({ ...promoCodeForm, max_uses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="promo-active"
                checked={promoCodeForm.is_active}
                onChange={(e) => setPromoCodeForm({ ...promoCodeForm, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="promo-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoCodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePromoCode}>
              <Save className="h-4 w-4 mr-2" />
              {editingPromoCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creator Code Dialog */}
      <Dialog open={creatorCodeDialogOpen} onOpenChange={setCreatorCodeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCreatorCode ? 'Edit Creator Code' : 'Create Creator Code'}</DialogTitle>
            <DialogDescription>
              {editingCreatorCode ? 'Update the creator code details' : 'Create a new creator code for affiliates/influencers'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="creator-code">Code *</Label>
              <Input
                id="creator-code"
                value={creatorCodeForm.code || ''}
                onChange={(e) => setCreatorCodeForm({ ...creatorCodeForm, code: e.target.value.toUpperCase() })}
                placeholder="CREATOR2024"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="creator-user">Creator User *</Label>
              <Select 
                value={creatorCodeForm.creator_user_id || ''} 
                onValueChange={(value) => setCreatorCodeForm({ ...creatorCodeForm, creator_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select creator user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creator-trial-days">Trial Days</Label>
                <Input
                  id="creator-trial-days"
                  type="number"
                  min="0"
                  value={creatorCodeForm.trial_days || ''}
                  onChange={(e) => setCreatorCodeForm({ ...creatorCodeForm, trial_days: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="creator-tier">Tier Granted</Label>
                <Select 
                  value={creatorCodeForm.tier_granted || 'tier_2'} 
                  onValueChange={(value) => setCreatorCodeForm({ ...creatorCodeForm, tier_granted: value })}
                >
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creator-discount">Discount Percentage</Label>
                <Input
                  id="creator-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={creatorCodeForm.discount_percentage || ''}
                  onChange={(e) => setCreatorCodeForm({ ...creatorCodeForm, discount_percentage: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="creator-commission">Creator Commission %</Label>
                <Input
                  id="creator-commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={creatorCodeForm.creator_commission_percentage || ''}
                  onChange={(e) => setCreatorCodeForm({ ...creatorCodeForm, creator_commission_percentage: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="creator-description">Description</Label>
              <Textarea
                id="creator-description"
                value={creatorCodeForm.description || ''}
                onChange={(e) => setCreatorCodeForm({ ...creatorCodeForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creator-expires">Expires At</Label>
                <Input
                  id="creator-expires"
                  type="date"
                  value={creatorCodeForm.expires_at || ''}
                  onChange={(e) => setCreatorCodeForm({ ...creatorCodeForm, expires_at: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="creator-max-uses">Max Uses</Label>
                <Input
                  id="creator-max-uses"
                  type="number"
                  min="1"
                  value={creatorCodeForm.max_uses || ''}
                  onChange={(e) => setCreatorCodeForm({ ...creatorCodeForm, max_uses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="creator-active"
                checked={creatorCodeForm.is_active}
                onChange={(e) => setCreatorCodeForm({ ...creatorCodeForm, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="creator-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatorCodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCreatorCode}>
              <Save className="h-4 w-4 mr-2" />
              {editingCreatorCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Request Processing Dialog */}
      <Dialog open={refundRequestDialogOpen} onOpenChange={setRefundRequestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {refundAction === 'approve' ? 'Approve' : 'Reject'} Refund Request
            </DialogTitle>
            <DialogDescription>
              {refundAction === 'approve' 
                ? 'Are you sure you want to approve this refund request? A refund invoice will be created.'
                : 'Are you sure you want to reject this refund request?'}
            </DialogDescription>
          </DialogHeader>
          {selectedRefundRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p><strong>User:</strong> {selectedRefundRequest.user?.email}</p>
                <p><strong>Amount:</strong> €{selectedRefundRequest.amount.toFixed(2)}</p>
                <p><strong>Type:</strong> {selectedRefundRequest.refund_type}</p>
                <p><strong>Reason:</strong> {selectedRefundRequest.reason}</p>
                {selectedRefundRequest.description && (
                  <p><strong>Description:</strong> {selectedRefundRequest.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <p>Within time limit: {selectedRefundRequest.is_within_time_limit ? '✓' : '✗'}</p>
                  <p>Not exceeded limits: {selectedRefundRequest.has_not_exceeded_limits ? '✓' : '✗'}</p>
                  <p>Current month: {selectedRefundRequest.is_current_month ? '✓' : '✗'}</p>
                  <p>Demonstrable issue: {selectedRefundRequest.has_demonstrable_issue ? '✓' : '✗'}</p>
                </div>
              </div>
              <div>
                <Label htmlFor="refund-admin-notes">Admin Notes</Label>
                <Textarea
                  id="refund-admin-notes"
                  value={refundAdminNotes || ''}
                  onChange={(e) => setRefundAdminNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={refundAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleProcessRefundRequest}
            >
              {refundAction === 'approve' ? 'Approve & Process Refund' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog - First Confirmation */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              You are about to schedule the deletion of user: <strong>{selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-destructive mb-2">⚠️ Important Information:</p>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                <li>The user will lose access immediately</li>
                <li>The account will be permanently deleted in 15 days</li>
                <li>The user can be restored within the 15-day period</li>
                <li>If the user registers again with the same email, the account will be restored</li>
              </ul>
            </div>
            <div>
              <Label htmlFor="delete-reason">Reason for Deletion *</Label>
              <Textarea
                id="delete-reason"
                value={deleteUserReason || ''}
                onChange={(e) => setDeleteUserReason(e.target.value)}
                placeholder="Provide a reason for deleting this user..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteUserDialogOpen(false);
              setDeleteUserReason('');
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteUserReason.trim()) {
                  setDeleteUserDialogOpen(false);
                  setDeleteUserConfirmDialogOpen(true);
                } else {
                  toast.error('Please provide a reason for deletion');
                }
              }}
              disabled={!deleteUserReason.trim()}
            >
              Continue to Final Confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog - Final Confirmation */}
      <Dialog open={deleteUserConfirmDialogOpen} onOpenChange={setDeleteUserConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation Required
            </DialogTitle>
            <DialogDescription>
              This is your last chance to cancel. Are you absolutely sure you want to delete this user?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold mb-2">User to be deleted:</p>
              <p className="text-sm font-mono">{selectedUser?.email}</p>
              <p className="text-sm mt-2 font-semibold mb-2">Reason:</p>
              <p className="text-sm">{deleteUserReason}</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-yellow-600">
                Type <strong>DELETE</strong> to confirm
              </p>
            </div>
            <Input
              placeholder="Type DELETE to confirm"
              className="mt-2 font-mono"
              value={deleteConfirmText || ''}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                if (e.target.value === 'DELETE') {
                  handleDeleteUser();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteUserConfirmDialogOpen(false);
              setDeleteUserReason('');
              setDeleteConfirmText('');
              setSelectedUser(null);
            }}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog - First Confirmation */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              You are about to schedule the deletion of user: <strong>{selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-destructive mb-2">⚠️ Important Information:</p>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                <li>The user will lose access immediately</li>
                <li>The account will be permanently deleted in 15 days</li>
                <li>The user can be restored within the 15-day period</li>
                <li>If the user registers again with the same email, the account will be restored</li>
              </ul>
            </div>
            <div>
              <Label htmlFor="delete-reason">Reason for Deletion *</Label>
              <Textarea
                id="delete-reason"
                value={deleteUserReason || ''}
                onChange={(e) => setDeleteUserReason(e.target.value)}
                placeholder="Provide a reason for deleting this user..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteUserDialogOpen(false);
              setDeleteUserReason('');
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteUserReason.trim()) {
                  setDeleteUserDialogOpen(false);
                  setDeleteUserConfirmDialogOpen(true);
                } else {
                  toast.error('Please provide a reason for deletion');
                }
              }}
              disabled={!deleteUserReason.trim()}
            >
              Continue to Final Confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog - Final Confirmation */}
      <Dialog open={deleteUserConfirmDialogOpen} onOpenChange={setDeleteUserConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation Required
            </DialogTitle>
            <DialogDescription>
              This is your last chance to cancel. Are you absolutely sure you want to delete this user?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold mb-2">User to be deleted:</p>
              <p className="text-sm font-mono">{selectedUser?.email}</p>
              <p className="text-sm mt-2 font-semibold mb-2">Reason:</p>
              <p className="text-sm">{deleteUserReason}</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-yellow-600">
                Type <strong>DELETE</strong> to confirm
              </p>
            </div>
            <Input
              placeholder="Type DELETE to confirm"
              className="mt-2 font-mono"
              value={deleteConfirmText || ''}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                if (e.target.value === 'DELETE') {
                  handleDeleteUser();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteUserConfirmDialogOpen(false);
              setDeleteUserReason('');
              setDeleteConfirmText('');
              setSelectedUser(null);
            }}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminDashboard;
