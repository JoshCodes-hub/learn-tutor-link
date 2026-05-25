import { useAuth } from "@/hooks/useAuth";

/** Read the current user's university scope. Defaults to FUTA when missing. */
export function useUniversityScope() {
  const { profile } = useAuth();
  const university = ((profile as any)?.university || "FUTA") as "FUTA" | "OAU";
  const faculty = (profile as any)?.faculty as string | null | undefined;
  const department = (profile as any)?.department as string | null | undefined;
  const level = (profile as any)?.level as string | null | undefined;
  return { university, faculty, department, level };
}