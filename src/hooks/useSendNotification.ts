import { supabase } from "@/integrations/supabase/client";

type NotificationType = 
  | "purchase_confirmation" 
  | "application_approved" 
  | "application_rejected" 
  | "withdrawal_approved" 
  | "withdrawal_rejected"
  | "quiz_purchased"
  | "welcome";

interface NotificationData {
  type: NotificationType;
  to: string;
  data: Record<string, any>;
}

export const sendNotification = async ({ type, to, data }: NotificationData) => {
  try {
    console.log(`Sending ${type} notification to ${to}`);
    
    const { data: response, error } = await supabase.functions.invoke("send-notification", {
      body: { type, to, data },
    });

    if (error) {
      console.error("Error sending notification:", error);
      return { success: false, error };
    }

    console.log("Notification sent successfully:", response);
    return { success: true, data: response };
  } catch (error) {
    console.error("Error invoking send-notification:", error);
    return { success: false, error };
  }
};

export const useSendNotification = () => {
  return { sendNotification };
};
