import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AffiliateRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  useEffect(() => { (async () => {
    if (!slug) return nav('/');
    const { data } = await supabase.from('affiliate_links').select('id, destination, clicks').eq('slug', slug).maybeSingle();
    if (!data) return nav('/');
    // best-effort click increment
    supabase.from('affiliate_links').update({ clicks: (data.clicks ?? 0) + 1 }).eq('id', data.id).then(() => {});
    sessionStorage.setItem('aff_ref', data.id);
    nav(data.destination ?? '/', { replace: true });
  })(); }, [slug, nav]);
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}
