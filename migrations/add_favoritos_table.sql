CREATE TABLE public.favoritos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES servicios_publicados(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX favoritos_unique
  ON public.favoritos(auth_user_id, servicio_id);

ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven sus propios favoritos"
  ON public.favoritos 
  FOR SELECT 
  USING (auth_user_id = auth.uid());

CREATE POLICY "usuarios pueden insertar sus favoritos"
  ON public.favoritos 
  FOR INSERT 
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "usuarios pueden eliminar sus favoritos"
  ON public.favoritos 
  FOR DELETE 
  USING (auth_user_id = auth.uid());
