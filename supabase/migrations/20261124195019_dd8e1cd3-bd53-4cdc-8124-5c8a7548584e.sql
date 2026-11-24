DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users or admins can create notifications" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products" ON public.products FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));