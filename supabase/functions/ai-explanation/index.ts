import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, options, correctOption, userAnswer, topic } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating AI explanation for question:", question.substring(0, 50) + "...");

    const systemPrompt = `You are an expert tutor helping Nigerian university students understand exam questions. 
Your explanations should be:
- Clear and easy to understand
- Step-by-step when needed
- Include relevant formulas or concepts
- Encouraging and supportive
Keep explanations concise but thorough (max 200 words).`;

    const userPrompt = `Question: ${question}

Options:
A. ${options.A}
B. ${options.B}
C. ${options.C}
D. ${options.D}

Correct Answer: ${correctOption}
${userAnswer ? `Student's Answer: ${userAnswer}` : ""}
${topic ? `Topic: ${topic}` : ""}

Please explain why option ${correctOption} is correct${userAnswer && userAnswer !== correctOption ? ` and why option ${userAnswer} is incorrect` : ""}. Include any relevant concepts, formulas, or reasoning steps.`;

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
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
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

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || "Unable to generate explanation.";

    console.log("AI explanation generated successfully");

    return new Response(
      JSON.stringify({ explanation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in ai-explanation function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate explanation";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
