import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireUser } from "../_shared/auth.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MILESTONES = [3, 7, 14, 30, 60, 100];

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

function getMilestoneEmoji(days: number): string {
  if (days >= 100) return "👑";
  if (days >= 60) return "🏆";
  if (days >= 30) return "🌟";
  if (days >= 14) return "💪";
  if (days >= 7) return "🎯";
  return "🔥";
}

function getMilestoneTitle(days: number): string {
  if (days >= 100) return "LEGENDARY";
  if (days >= 60) return "Champion";
  if (days >= 30) return "Month Master";
  if (days >= 14) return "Two Week Warrior";
  if (days >= 7) return "Week Champion";
  return "Streak Starter";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const guard = await requireUser(req, corsHeaders);
    if (guard instanceof Response) return guard;
    const user_id = guard.userId;
    const { streak_days } = await req.json();

    if (!streak_days) {
      return new Response(
        JSON.stringify({ error: "streak_days required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is a milestone
    if (!MILESTONES.includes(streak_days)) {
      return new Response(
        JSON.stringify({ message: "Not a milestone day", milestone: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user actually has the claimed streak.
    const { data: streakRow } = await supabase
      .from("study_streaks")
      .select("current_streak")
      .eq("user_id", user_id)
      .maybeSingle();
    if (!streakRow || streakRow.current_streak < streak_days) {
      return new Response(
        JSON.stringify({ error: "Streak not verified" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = profile.full_name || "Student";
    const emoji = getMilestoneEmoji(streak_days);
    const title = getMilestoneTitle(streak_days);

    // Send celebration email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 30px 0; background: linear-gradient(135deg, #0d9488, #14b8a6); border-radius: 12px 12px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .badge { display: inline-block; background: white; color: #0d9488; padding: 20px 40px; border-radius: 50px; font-size: 32px; font-weight: bold; margin-top: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .content { background: white; border-radius: 0 0 12px 12px; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .achievement { background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
          .achievement-icon { font-size: 48px; margin-bottom: 10px; }
          .achievement-title { font-size: 20px; font-weight: bold; color: #92400e; }
          .cta { display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} MILESTONE ACHIEVED!</h1>
            <div class="badge">${streak_days} DAYS</div>
          </div>
          
          <div class="content">
            <p>Congratulations, ${name}! 🎉</p>
            
            <div class="achievement">
              <div class="achievement-icon">${emoji}</div>
              <div class="achievement-title">${title}</div>
              <p style="margin: 10px 0 0; color: #78350f;">You've maintained a ${streak_days}-day study streak!</p>
            </div>
            
            <p>This is an incredible achievement! Your dedication to learning is truly inspiring.</p>
            
            <p><strong>Fun fact:</strong> Only a small percentage of students reach this milestone. You're among the top performers!</p>
            
            <p>Keep up the amazing work and push towards the next milestone!</p>
            
            <center>
              <a href="https://overraprep.com/student/dashboard" class="cta">Continue Your Journey →</a>
            </center>
          </div>
          
          <div class="footer">
            <p>You're doing amazing! 🌟</p>
            <p>— The OverraPrep AI Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      profile.email,
      `${emoji} ${streak_days}-Day Streak Achievement Unlocked!`,
      emailHtml
    );

    // Create in-app notification
    await supabase.from("notifications").insert({
      user_id,
      title: `${emoji} ${title} Achievement!`,
      message: `Incredible! You've reached a ${streak_days}-day study streak! Keep pushing towards your goals!`,
      type: "streak_milestone",
      link: "/student/dashboard"
    });

    // Award achievement badge if applicable
    const achievementMap: Record<number, string> = {
      3: "Streak Starter",
      7: "Week Warrior",
      30: "Month Master"
    };

    if (achievementMap[streak_days]) {
      const { data: achievement } = await supabase
        .from("achievements")
        .select("id")
        .eq("name", achievementMap[streak_days])
        .single();

      if (achievement) {
        await supabase.from("user_achievements").upsert({
          user_id,
          achievement_id: achievement.id
        }, { onConflict: "user_id,achievement_id" });
      }
    }

    console.log(`Sent milestone celebration for ${streak_days} days to ${profile.email}`);

    return new Response(
      JSON.stringify({ message: "Milestone celebration sent", milestone: streak_days }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in streak-milestone:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
