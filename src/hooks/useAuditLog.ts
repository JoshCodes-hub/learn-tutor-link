import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AuditAction = 
  | "view" 
  | "approve" 
  | "reject" 
  | "update" 
  | "delete";

interface LogAuditParams {
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async ({ action, tableName, recordId, oldData, newData }: LogAuditParams) => {
    if (!user?.id) {
      console.error("Cannot log audit action: No user logged in");
      return;
    }

    try {
      const { error } = await supabase.rpc("log_admin_action", {
        p_admin_id: user.id,
        p_action: action,
        p_table_name: tableName,
        p_record_id: recordId,
        p_old_data: oldData ? JSON.stringify(oldData) : null,
        p_new_data: newData ? JSON.stringify(newData) : null,
      });

      if (error) {
        console.error("Error logging audit action:", error);
      } else {
        console.log(`Audit logged: ${action} on ${tableName}/${recordId}`);
      }
    } catch (err) {
      console.error("Failed to log audit action:", err);
    }
  };

  return { logAction };
};
