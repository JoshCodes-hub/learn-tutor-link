import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "OverraPrep AI <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return res.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`Running streak reminders for ${todayStr}`);

    // Get users with active streaks who haven't studied today
    const { data: streaks, error: streakError } = await supabase
      .from("study_streaks")
      .select("user_id, current_streak, last_activity_date")
      .gt("current_streak", 0)
      .eq("last_activity_date", yesterdayStr);

    if (streakError) {
      console.error("Error fetching streaks:", streakError);
      throw streakError;
    }

    if (!streaks || streaks.length === 0) {
      console.log("No users need streak reminders today");
      return new Response(JSON.stringify({ message: "No reminders needed", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${streaks.length} users who need reminders`);

    // Get user profiles and emails
    const userIds = streaks.map(s => s.user_id);
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, any>);

    // Send reminders
    let sentCount = 0;
    const errors: string[] = [];

    for (const streak of streaks) {
      const profile = profileMap[streak.user_id];
      if (!profile?.email) continue;

      const name = profile.full_name || "Student";
      const streakDays = streak.current_streak;

      try {
        // Send email reminder
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; }
              .streak-badge { display: inline-block; background: linear-gradient(135deg, #f97316, #ef4444); color: white; padding: 15px 30px; border-radius: 50px; font-size: 24px; font-weight: bold; }
              .content { background: #f9fafb; border-radius: 12px; padding: 30px; margin: 20px 0; }
              .cta { display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
              .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔥 Your Streak is at Risk!</h1>
                <div class="streak-badge">${streakDays} Days</div>
              </div>
              
              <div class="content">
                <p>Hey ${name}! 👋</p>
                
                <p>You've been crushing it with a <strong>${streakDays}-day study streak</strong>! That's amazing dedication to your exam preparation.</p>
                
                <p>But we noticed you haven't studied yet today. Don't let all that hard work go to waste!</p>
                
                <p><strong>Quick tip:</strong> Even completing just one quiz keeps your streak alive. It only takes 5-10 minutes!</p>
                
                <center>
                  <a href="https://overraprep.com/student/dashboard" class="cta">Continue Your Streak →</a>
                </center>
              </div>
              
              <div class="footer">
                <p>Keep up the great work! 💪</p>
                <p>— The OverraPrep AI Team</p>
                <p style="font-size: 12px; color: #9ca3af;">You're receiving this because you have an active study streak on OverraPrep AI.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail(
          profile.email,
          `🔥 Don't lose your ${streakDays}-day streak!`,
          emailHtml
        );

        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: streak.user_id,
          title: "🔥 Don't lose your streak!",
          message: `You have a ${streakDays}-day streak at risk! Complete a quiz today to keep it going.`,
          type: "streak_reminder",
          link: "/student/dashboard"
        });

        sentCount++;
        console.log(`Sent reminder to ${profile.email}`);
      } catch (err) {
        console.error(`Failed to send to ${profile.email}:`, err);
        errors.push(profile.email);
      }
    }

    console.log(`Sent ${sentCount} reminders, ${errors.length} failures`);

    return new Response(
      JSON.stringify({ 
        message: "Streak reminders sent", 
        sent: sentCount, 
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in streak-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
