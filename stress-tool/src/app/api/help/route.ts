import { interventions } from '@/lib/interventions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return Response.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate API key exists
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'GROQ_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    // Prepare the system message with interventions
    const systemPrompt = `You are a precise psychological router, not a therapist and not a content creator.

Your only job is to:
1. Read the user's messy free-text input
2. Infer the dominant psychological state using three signals: situation described, emotion language used, and what they have already tried
3. Decide which mechanism needs restoring RIGHT NOW
4. Select exactly ONE intervention from the provided library
5. Write a short, calm, non-clinical explanation

STRICT RULES:
- You must NEVER invent, rewrite, or create new interventions. Only select from the library given to you.
- Follow this sequencing rule without exception:
  Safety / Grounding first → Clarity / Emotion labeling second → then any other mechanism.
  If the language suggests panic, racing thoughts, high arousal, numbness, dissociation, or feeling completely flooded → always choose a Safety/Grounding intervention.
  If the person cannot name what they feel or is highly vague → choose a Clarity/Labeling intervention.
- Return ONLY valid JSON in this exact shape:
{
  "mechanism": "...",
  "interventionId": "...",
  "title": "...",
  "instructions": "...",
  "why": "...",
  "explanation": "one short sentence that makes the choice legible to the user, e.g. 'It sounds like your sense of control has taken a hit today — here's something that helps restore that.'"
}

Tone: calm, direct, slightly irreverent, never clinical, never diagnosing. Remember the product goal: make the person feel better in the moment so they can handle the actual problem themselves.`;

    // Prepare the message for the API call
    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Here is my library of interventions:\n\n${JSON.stringify(interventions, null, 2)}\n\nNow analyze this text: "${text}"` 
      }
    ];

    // Call the Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: `Groq API error: ${response.status} ${errorData.error?.message || ''}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return Response.json(
        { error: 'No response from AI model' },
        { status: 502 }
      );
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (e) {
      return Response.json(
        { error: 'Invalid JSON response from AI model' },
        { status: 502 }
      );
    }

    // Validate that the interventionId exists in our library
    const selectedIntervention = interventions.find(
      intervention => intervention.id === parsedResponse.interventionId
    );

    if (!selectedIntervention) {
      return Response.json(
        { error: 'AI model returned an invalid interventionId not found in the library' },
        { status: 502 }
      );
    }

    // Ensure the response has all required fields
    const requiredFields = ['mechanism', 'interventionId', 'title', 'instructions', 'why', 'explanation'];
    for (const field of requiredFields) {
      if (!(field in parsedResponse)) {
        return Response.json(
          { error: `Missing required field in AI response: ${field}` },
          { status: 502 }
        );
      }
    }

    // Return the validated response
    return Response.json(parsedResponse);

  } catch (error) {
    console.error('API route error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
