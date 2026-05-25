import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const guard = await requireUser(req, corsHeaders);
    if (guard instanceof Response) return guard;
    const userId = guard.userId;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Fetching performance data for user:", userId);

    // Fetch user's quiz attempts with answers
    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select(`
        id,
        score,
        correct_answers,
        total_questions,
        completed_at,
        quizzes (
          id,
          title,
          course_id,
          courses (code, name)
        )
      `)
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(20);

    if (attemptsError) {
      console.error("Error fetching attempts:", attemptsError);
      throw attemptsError;
    }

    // Fetch quiz answers with topics
    const attemptIds = attempts?.map((a: any) => a.id) || [];
    let topicPerformance: Record<string, { correct: number; total: number; name: string; course: string }> = {};

    if (attemptIds.length > 0) {
      const { data: answers, error: answersError } = await supabase
        .from("quiz_answers")
        .select(`
          is_correct,
          questions (
            topic_id,
            topics (name, course_id, courses (code, name))
          )
        `)
        .in("attempt_id", attemptIds);

      if (!answersError && answers) {
        for (const answer of answers as any[]) {
          const question = answer.questions;
          const topic = question?.topics;
          if (topic) {
            const topicId = question.topic_id;
            if (!topicPerformance[topicId]) {
              topicPerformance[topicId] = {
                correct: 0,
                total: 0,
                name: topic.name,
                course: topic.courses?.code || "Unknown"
              };
            }
            topicPerformance[topicId].total++;
            if (answer.is_correct) {
              topicPerformance[topicId].correct++;
            }
          }
        }
      }
    }

    // Calculate weak areas
    const weakAreas = Object.entries(topicPerformance)
      .map(([id, data]) => ({
        topicId: id,
        topicName: data.name,
        course: data.course,
        accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        questionsAttempted: data.total
      }))
      .filter(area => area.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    // Calculate course performance
    const coursePerformance: Record<string, { correct: number; total: number }> = {};
    for (const attempt of (attempts || []) as any[]) {
      const courseCode = attempt.quizzes?.courses?.code;
      if (courseCode) {
        if (!coursePerformance[courseCode]) {
          coursePerformance[courseCode] = { correct: 0, total: 0 };
        }
        coursePerformance[courseCode].correct += attempt.correct_answers;
        coursePerformance[courseCode].total += attempt.total_questions;
      }
    }

    const courseStats = Object.entries(coursePerformance).map(([code, data]) => ({
      course: code,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      questionsAttempted: data.total
    }));

    // Fetch available quizzes for recommendations
    const { data: availableQuizzes } = await supabase
      .from("quizzes")
      .select(`
        id,
        title,
        description,
        token_cost,
        is_premium,
        question_count,
        courses (code, name)
      `)
      .eq("is_active", true)
      .limit(20);

    // Check which quizzes user already owns
    const { data: purchasedQuizzes } = await supabase
      .from("student_quiz_purchases")
      .select("quiz_id")
      .eq("student_id", userId);
    
    const purchasedIds = new Set(purchasedQuizzes?.map(p => p.quiz_id) || []);
    const unpurchasedQuizzes = availableQuizzes?.filter(q => !purchasedIds.has(q.id)) || [];

    // Build context for AI
    const performanceContext = {
      overallAttempts: attempts?.length || 0,
      averageScore: attempts?.length ? Math.round((attempts as any[]).reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0,
      weakAreas,
      courseStats,
      availableQuizzes: (unpurchasedQuizzes as any[]).map(q => ({
        id: q.id,
        title: q.title,
        course: q.courses?.code,
        isPremium: q.is_premium,
        tokenCost: q.token_cost
      }))
    };

    console.log("Performance context:", JSON.stringify(performanceContext, null, 2));

    // Generate AI recommendations
    const systemPrompt = `You are an intelligent quiz recommendation system for Nigerian university students preparing for exams.
Your task is to analyze student performance data and recommend quizzes that will help them improve.

Guidelines:
- Prioritize quizzes that target the student's weak areas
- Consider the student's overall performance level
- Provide personalized, encouraging recommendations
- Be specific about why each quiz is recommended
- Keep responses concise and actionable`;

    const userPrompt = `Analyze this student's performance and recommend quizzes:

Performance Summary:
- Total quizzes completed: ${performanceContext.overallAttempts}
- Average score: ${performanceContext.averageScore}%

${weakAreas.length > 0 ? `Weak Areas (topics with <70% accuracy):
${weakAreas.map(w => `- ${w.topicName} (${w.course}): ${w.accuracy}% accuracy`).join('\n')}` : 'No weak areas identified yet.'}

${courseStats.length > 0 ? `Course Performance:
${courseStats.map(c => `- ${c.course}: ${c.accuracy}% accuracy (${c.questionsAttempted} questions)`).join('\n')}` : ''}

Available Quizzes:
${(unpurchasedQuizzes as any[]).slice(0, 10).map(q => `- "${q.title}" (${q.courses?.code}) ${q.is_premium ? `[Premium: ${q.token_cost} tokens]` : '[Free]'}`).join('\n')}

Based on this data, provide:
1. A brief analysis of the student's strengths and areas for improvement (2-3 sentences)
2. 3 specific quiz recommendations with reasons why each would help
3. A motivational tip for the student

Format your response as JSON with this structure:
{
  "analysis": "string",
  "recommendations": [
    { "quizTitle": "string", "course": "string", "reason": "string", "priority": "high|medium|low" }
  ],
  "motivationalTip": "string"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", aiContent);

    // Parse AI response
    let recommendations;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback recommendations
      recommendations = {
        analysis: "Keep practicing to improve your exam readiness!",
        recommendations: weakAreas.slice(0, 3).map(w => ({
          quizTitle: `Practice ${w.topicName}`,
          course: w.course,
          reason: `Your accuracy in ${w.topicName} is ${w.accuracy}%. More practice will help!`,
          priority: w.accuracy < 50 ? "high" : "medium"
        })),
        motivationalTip: "Every quiz you take brings you closer to exam success!"
      };
    }

    // Enrich recommendations with quiz IDs
    const enrichedRecommendations = recommendations.recommendations?.map((rec: any) => {
      const matchingQuiz = (unpurchasedQuizzes as any[]).find(
        q => q.title.toLowerCase().includes(rec.quizTitle?.toLowerCase()) ||
             rec.quizTitle?.toLowerCase().includes(q.title.toLowerCase()) ||
             q.courses?.code === rec.course
      );
      return {
        ...rec,
        quizId: matchingQuiz?.id,
        isPremium: matchingQuiz?.is_premium,
        tokenCost: matchingQuiz?.token_cost
      };
    }) || [];

    return new Response(
      JSON.stringify({
        analysis: recommendations.analysis,
        recommendations: enrichedRecommendations,
        motivationalTip: recommendations.motivationalTip,
        weakAreas,
        performanceSummary: {
          totalAttempts: performanceContext.overallAttempts,
          averageScore: performanceContext.averageScore,
          courseStats
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in quiz-recommendations function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate recommendations";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
