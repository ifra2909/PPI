import { NextResponse } from 'next/server';
import { interventions } from '@/lib/interventions';

const SYSTEM_PROMPT = `You are a precise psychological router, not a therapist and not a content creator.

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

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input. Please provide a "text" field with your message.' },
        { status: 400 }
      );
    }

    // Build the intervention library context for the prompt
    const interventionLibrary = interventions.map((i) => 
      `ID: ${i.id}\nTitle: ${i.title}\nMechanism: ${i.mechanism}\nInstructions: ${i.instructions}\nWhy: ${i.why}`
    ).join('\n\n---\n\n');

    const userPrompt = `Here is the intervention library you MUST choose from:\n\n${interventionLibrary}\n\n---\n\nUser input: "${text}"\n\nSelect the ONE best intervention and return ONLY the JSON object.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to process request. Please try again later.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Empty response from Groq');
      return NextResponse.json(
        { error: 'Unable to generate intervention. Please try again.' },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Groq response as JSON:', content);
      return NextResponse.json(
        { error: 'Received invalid response format. Please try again.' },
        { status: 500 }
      );
    }

    // Validate that the returned interventionId exists in our library
    const validIntervention = interventions.find((i) => i.id === parsed.interventionId);
    if (!validIntervention) {
      console.error('Groq returned invalid interventionId:', parsed.interventionId);
      return NextResponse.json(
        { error: 'Invalid intervention selected. Please try again.' },
        { status: 500 }
      );
    }

    // Return the validated response with clean data from our library
    return NextResponse.json({
      mechanism: parsed.mechanism,
      interventionId: validIntervention.id,
      title: validIntervention.title,
      instructions: validIntervention.instructions,
      why: validIntervention.why,
      explanation: parsed.explanation,
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
