import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the student's academic scope used to filter content
 * across My Courses, Library, Audio Learning, and Course Hub.
 */
export function useStudentScope() {
  const { profile } = useAuth();
  const level = (profile as any)?.level as string | null | undefined;
  const department = (profile as any)?.department as string | null | undefined;
  return {
    level: level || null,
    department: department || null,
    hasScope: !!level,
    label: level ? `${level}${department ? ` · ${department}` : ""}` : null,
  };
}