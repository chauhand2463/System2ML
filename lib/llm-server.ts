const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

function getGroqKey(): string | undefined { return process.env.GROQ_API_KEY }
function getOpenRouterKey(): string | undefined { return process.env.OPENROUTER_API_KEY }

interface LLMOptions {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    responseFormat?: { type: 'json_object' };
}

export async function callLLM(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMOptions
) {
    const { temperature = 0.1, maxTokens = 4096, responseFormat = { type: 'json_object' } } = options || {}
    const groqKey = getGroqKey()
    const orKey = getOpenRouterKey()

    let lastError: any = null

    // 1. Attempt Groq (Primary)
    if (groqKey) {
        try {
            const response = await fetch(GROQ_ENDPOINT, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${groqKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature,
                    max_tokens: maxTokens,
                    response_format: responseFormat,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                const content = data?.choices?.[0]?.message?.content
                if (content) return { data: JSON.parse(content), provider: 'groq' }
            } else {
                const err = await response.json().catch(() => ({}))
                lastError = { provider: 'groq', status: response.status, message: err?.error?.message || response.statusText }
            }
        } catch (e: any) {
            lastError = { provider: 'groq', message: e.message }
        }
    }

    // 2. Attempt OpenRouter (Fallback)
    if (orKey) {
        try {
            const response = await fetch(OPENROUTER_ENDPOINT, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${orKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://system2ml.ai',
                    'X-Title': 'System2ML Architect',
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.3-70b-instruct',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature,
                    max_tokens: maxTokens,
                    response_format: responseFormat,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                const content = data?.choices?.[0]?.message?.content
                if (content) return { data: JSON.parse(content), provider: 'openrouter' }
            } else {
                const err = await response.json().catch(() => ({}))
                lastError = { provider: 'openrouter', status: response.status, message: err?.error?.message || response.statusText }
            }
        } catch (e: any) {
            lastError = { provider: 'openrouter', message: e.message }
        }
    }

    throw new Error(
        lastError
            ? `AI synthesis failed. Last error (${lastError.provider}): ${lastError.message}`
            : 'No AI providers (Groq/OpenRouter) are configured.'
    )
}
