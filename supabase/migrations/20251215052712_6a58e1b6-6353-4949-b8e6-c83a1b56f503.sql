-- Create platform settings table for commission management
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can read settings (for displaying commission info)
CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings
  FOR SELECT
  USING (true);

-- Insert default commission rate
INSERT INTO public.platform_settings (key, value, description)
VALUES ('tutor_commission_rate', '80', 'Percentage of token revenue that goes to tutors (e.g., 80 means tutor gets 80%, platform gets 20%)');

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();