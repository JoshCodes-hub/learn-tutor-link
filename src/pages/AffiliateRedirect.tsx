import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AffiliateRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  useEffect(() => { (async () => {
    if (!slug) return nav('/');
    const sb = supabase as any;
    // resolve_affiliate_slug bumps the click count server-side and returns
    // only id + destination — anon visitors cannot enumerate the table.
    const { data } = await sb.rpc('resolve_affiliate_slug', { _slug: slug });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return nav('/');
    sessionStorage.setItem('aff_ref', row.id);
    nav(row.destination ?? '/', { replace: true });
  })(); }, [slug, nav]);
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}
