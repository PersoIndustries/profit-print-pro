import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertTriangle, RefreshCw, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface GracePeriodUser {
  user_id: string;
  email: string;
  full_name: string | null;
  tier: string;
  previous_tier: string;
  downgrade_date: string;
  grace_period_end: string;
  is_read_only: boolean;
  days_remaining: number;
}

export default function AdminGracePeriodManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<GracePeriodUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<GracePeriodUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [extensionDays, setExtensionDays] = useState('30');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchGracePeriodUsers();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchGracePeriodUsers = async () => {
    try {
      setLoading(true);

      // Fetch users in grace period with their profile info
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, tier, previous_tier, downgrade_date, grace_period_end, is_read_only')
        .not('grace_period_end', 'is', null)
        .gt('grace_period_end', new Date().toISOString());

      if (subsError) throw subsError;

      if (!subscriptions || subscriptions.length === 0) {
        setUsers([]);
        return;
      }

      // Fetch profiles for these users
      const userIds = subscriptions.map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine data and calculate days remaining
      const usersData: GracePeriodUser[] = subscriptions.map(sub => {
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

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching grace period users:', error);
      toast.error('Failed to load grace period users');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendGracePeriod = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);

      const days = parseInt(extensionDays);
      if (isNaN(days) || days < 1) {
        toast.error('Please enter a valid number of days');
        return;
      }

      const currentEnd = new Date(selectedUser.grace_period_end);
      const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          grace_period_end: newEnd.toISOString()
        })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast.success(`Grace period extended by ${days} days`);
      setDialogOpen(false);
      fetchGracePeriodUsers();
    } catch (error) {
      console.error('Error extending grace period:', error);
      toast.error('Failed to extend grace period');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelGracePeriod = async (userId: string) => {
    try {
      setProcessing(true);

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
    } catch (error) {
      console.error('Error cancelling grace period:', error);
      toast.error('Failed to cancel grace period');
    } finally {
      setProcessing(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Grace Period Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users in grace period before image deletion
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchGracePeriodUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Back to Admin
          </Button>
        </div>
      </div>

      <Alert>
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
            Users in Grace Period ({users.length})
          </CardTitle>
          <CardDescription>
            Sorted by urgency (days remaining until deletion)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users currently in grace period
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {users.map((user) => (
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
                              setSelectedUser(user);
                              setDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Extend
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelGracePeriod(user.user_id)}
                            disabled={processing}
                          >
                            Cancel
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

      {/* Extend Grace Period Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Grace Period</DialogTitle>
            <DialogDescription>
              Extend the grace period for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Deletion Date</Label>
              <div className="text-sm text-muted-foreground">
                {selectedUser?.grace_period_end 
                  ? new Date(selectedUser.grace_period_end).toLocaleDateString()
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
                New deletion date: {selectedUser && new Date(
                  new Date(selectedUser.grace_period_end).getTime() + 
                  parseInt(extensionDays || '0') * 24 * 60 * 60 * 1000
                ).toLocaleDateString()}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendGracePeriod} disabled={processing}>
              {processing ? 'Extending...' : 'Extend Grace Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
