import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Search as SearchIcon, BookOpen, GraduationCap, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Result = { id: string; entity_type: string; entity_id: string; title: string; body: string | null; url: string; similarity: number };

const TYPE_ICON: Record<string, any> = {
  quiz: BookOpen, tutor: GraduationCap, library: FileText, curriculum: BookOpen, note: FileText,
};

export default function SmartSearch() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query: q, type: type === 'all' ? null : type, limit: 20 },
      });
      if (error) throw error;
      setResults((data as any)?.results ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Search failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Smart Search</h1>
        <p className="text-sm text-muted-foreground">Find quizzes, tutors and notes by meaning, not just keywords.</p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. derivatives revision past questions" autoFocus />
        <Button type="submit" disabled={loading || !q.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
        </Button>
      </form>

      <Tabs value={type} onValueChange={setType}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="quiz">Quizzes</TabsTrigger>
          <TabsTrigger value="tutor">Tutors</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="curriculum">Courses</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <Card className="p-3 text-sm text-destructive">{error}</Card>}
      {!loading && results.length === 0 && q && !error && (
        <p className="text-sm text-muted-foreground text-center py-8">No matches yet — content gets indexed in the background.</p>
      )}

      <div className="space-y-2">
        {results.map((r) => {
          const Icon = TYPE_ICON[r.entity_type] ?? FileText;
          return (
            <Card key={r.id} className="p-3 cursor-pointer hover:bg-accent/50 transition" onClick={() => nav(r.url)}>
              <div className="flex items-start gap-3">
                <Icon className="w-4 h-4 mt-1 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{r.title}</p>
                    <span className="text-[10px] uppercase text-muted-foreground shrink-0">{r.entity_type}</span>
                  </div>
                  {r.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{(r.similarity * 100).toFixed(0)}% match</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
