'use client';

import { useState } from 'react';

interface InterventionResponse {
  mechanism: string;
  interventionId: string;
  title: string;
  instructions: string;
  why: string;
  explanation: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<InterventionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setResponse(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-3xl font-light tracking-tight text-stone-900 sm:text-4xl">
            It's not that serious.
          </h1>
          <p className="mt-4 text-lg font-light leading-relaxed text-stone-600">
            Your monkey brain is designed for survival, not modern life. 
            Let's turn vague distress into something you can actually work with.
          </p>
        </header>

        {/* Input Form */}
        {!response && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="stress-input" className="sr-only">
                How are you feeling?
              </label>
              <textarea
                id="stress-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What's on your mind? Write whatever comes up..."
                rows={6}
                className="w-full resize-none rounded-none border border-stone-200 bg-white px-5 py-4 text-base leading-relaxed text-stone-900 placeholder-stone-400 outline-none transition-all duration-200 focus:border-stone-400 focus:ring-0"
                disabled={loading}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-none bg-stone-900 px-8 py-4 text-base font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Finding the right tool...
                </span>
              ) : (
                'Help me'
              )}
            </button>

            {error && (
              <div className="rounded-sm bg-red-50 px-5 py-4 text-sm leading-relaxed text-red-700">
                {error}
              </div>
            )}
          </form>
        )}

        {/* Response Display */}
        {response && (
          <div className="animate-in fade-in duration-500">
            {/* Explanation */}
            <div className="mb-10 border-l-2 border-stone-900 pl-6">
              <p className="text-lg font-medium leading-relaxed text-stone-900">
                {response.explanation}
              </p>
            </div>

            {/* Intervention Card */}
            <div className="mb-10 bg-white p-8 sm:p-10">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                {response.mechanism}
              </div>
              <h2 className="mb-6 text-2xl font-light text-stone-900">
                {response.title}
              </h2>

              <div className="mb-8 space-y-3">
                {response.instructions.split('\n').map((step, index) => (
                  <p key={index} className="text-base leading-relaxed text-stone-700">
                    {step}
                  </p>
                ))}
              </div>

              <div className="border-t border-stone-100 pt-6">
                <p className="text-sm leading-relaxed text-stone-600">
                  <span className="font-medium text-stone-900">Why this helps:</span>{' '}
                  {response.why}
                </p>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full rounded-none border border-stone-300 bg-transparent px-8 py-4 text-base font-medium text-stone-700 transition-all duration-200 hover:border-stone-400 hover:bg-stone-100"
            >
              Start over
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 border-t border-stone-200 pt-8 text-center">
          <p className="text-sm font-light text-stone-500">
            Evidence-based micro-interventions for everyday stress.
          </p>
        </footer>
      </div>
    </div>
  );
}
