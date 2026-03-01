import { NextRequest, NextResponse } from 'next/server'
import { callLLM } from '@/lib/llm-server'

const EXPLAINER_SYSTEM_PROMPT = `You are an ML Decision Explainer for enterprise users.
Output must be structured JSON only. No markdown. No commentary.
Turn technical pipeline plans into:
- executive summaries (field: "summary")
- key tradeoffs (field: "key_tradeoffs": [{"choice": string, "reason": string, "impact": string}])
- risk warnings (field: "risk_warnings": [{"risk": string, "impact": string, "mitigation": string}])
- deployment readiness (field: "deployment_readiness": {"status": string, "blockers": string[], "next_steps": string[]})
- ui blocks (field: "ui_blocks": {"pipeline_graph": boolean, "cost_meter": boolean, "carbon_meter": boolean, "risk_panel": boolean, "approval_panel: boolean})`

export async function POST(request: NextRequest) {
    let body: any
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { pipeline_dsl, audience = 'product_manager', explain_level = 'executive' } = body

    try {
        const result = await callLLM(
            EXPLAINER_SYSTEM_PROMPT,
            JSON.stringify({ pipeline_decision: pipeline_dsl, audience, explain_level }),
            { temperature: 0.3, maxTokens: 2048 }
        )

        return NextResponse.json({
            ...result.data,
            provider: result.provider
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Explain request failed' },
            { status: 500 }
        )
    }
}
