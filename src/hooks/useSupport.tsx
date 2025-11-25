import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupportTicket {
  id: string;
  user_id: string;
  ticket_type: 'refund_request' | 'general_support' | 'technical_issue' | 'billing_question' | 'feature_request';
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  title: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'waiting_user' | 'waiting_admin' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_admin_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  profiles?: {
    id: string;
    email: string;
    full_name?: string | null;
  };
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  read: boolean;
  read_at?: string | null;
  created_at: string;
  profiles?: {
    id: string;
    email: string;
    full_name?: string | null;
  };
}

export const useSupport = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<Map<string, SupportMessage[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch user's tickets
  const fetchTickets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .select(`
          *,
          profiles!support_tickets_user_id_fkey(id, email, full_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast.error('Error loading tickets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific ticket
  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages' as any)
        .select(`
          *,
          profiles!support_messages_sender_id_fkey(id, email, full_name)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(ticketId, (data as any) || []);
        return newMap;
      });

      // Mark messages as read
      if (user) {
        await supabase.rpc('mark_support_messages_as_read' as any, {
          p_ticket_id: ticketId,
          p_user_id: user.id
        });
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Error loading messages');
    }
  };

  // Send a message
  const sendMessage = async (ticketId: string, message: string) => {
    if (!user || !message.trim()) return;

    try {
      const { error } = await supabase
        .from('support_messages' as any)
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: 'user',
          message: message.trim(),
        });

      if (error) throw error;

      // Refresh messages
      await fetchMessages(ticketId);
      
      // Create notification for admin
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        await supabase
          .from('notifications' as any)
          .insert({
            user_id: ticket.assigned_admin_id || ticket.user_id, // Notify assigned admin or ticket owner
            title: 'Nuevo mensaje en ticket de soporte',
            message: `Nuevo mensaje en: ${ticket.title}`,
            type: 'info',
            category: 'general',
            action_url: `/admin?section=support&ticket=${ticketId}`,
          });
      }

      toast.success('Mensaje enviado');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
    }
  };

  // Create a new ticket
  const createTicket = async (
    ticketType: SupportTicket['ticket_type'],
    title: string,
    description?: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
    priority: SupportTicket['priority'] = 'medium'
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .insert({
          user_id: user.id,
          ticket_type: ticketType,
          title,
          description,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
          priority,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTickets();
      toast.success('Ticket creado exitosamente');
      return data as any;
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast.error('Error al crear ticket');
      return null;
    }
  };

  // Get unread count
  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_unread_support_messages_count' as any, {
        p_user_id: user.id
      });

      if (error) throw error;
      setUnreadCount(typeof data === 'number' ? data : 0);
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    fetchTickets();
    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('support_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        async (payload) => {
          const newMessage = payload.new as SupportMessage;
          // Check if this message is for one of user's tickets
          const ticket = tickets.find(t => t.id === newMessage.ticket_id);
          if (ticket && newMessage.sender_id !== user.id) {
            await fetchMessages(newMessage.ticket_id);
            await fetchUnreadCount();
            toast.info('Nuevo mensaje en tu ticket de soporte');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    tickets,
    messages,
    loading,
    unreadCount,
    fetchTickets,
    fetchMessages,
    sendMessage,
    createTicket,
    fetchUnreadCount,
  };
};

