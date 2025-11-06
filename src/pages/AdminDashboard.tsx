import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Package, FolderOpen, ShoppingCart } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface UserStats {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  tier: string;
  role: string;
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
      // Fetch all profiles with their subscription and role info
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          created_at
        `);

      if (profilesError) throw profilesError;

      // For each user, get their subscription, role, and counts
      const userStatsPromises = profiles.map(async (profile) => {
        const [subRes, roleRes, materialsRes, projectsRes, ordersRes] = await Promise.all([
          supabase.from('user_subscriptions').select('tier').eq('user_id', profile.id).single(),
          supabase.from('user_roles').select('role').eq('user_id', profile.id).single(),
          supabase.from('materials').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profile.id)
        ]);

        return {
          ...profile,
          tier: subRes.data?.tier || 'free',
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
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Print3D Manager - Admin</h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              {t('nav.dashboard')}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
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
                  <TableHead>{t('admin.role')}</TableHead>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.email}</p>
                        {user.full_name && (
                          <p className="text-sm text-muted-foreground">{user.full_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.tier === 'tier_2' ? 'bg-primary text-primary-foreground' :
                        user.tier === 'tier_1' ? 'bg-secondary text-secondary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {user.tier === 'tier_2' ? 'Business' : 
                         user.tier === 'tier_1' ? 'Professional' : 'Free'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' ? 'bg-destructive text-destructive-foreground' : ''
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{user.materials_count}</TableCell>
                    <TableCell className="text-center">{user.projects_count}</TableCell>
                    <TableCell className="text-center">{user.orders_count}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
