import AppScreen from "@/components/app-shell/AppScreen";

export default function SchoolStub({ title, note }: { title: string; note?: string }) {
  return (
    <AppScreen title={title} back>
      <div className="max-w-md mx-auto text-center py-16">
        <h2 className="font-display text-xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm">{note ?? "This area is being prepared — full functionality lands in the next update."}</p>
      </div>
    </AppScreen>
  );
}
