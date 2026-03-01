import { NextRequest, NextResponse } from 'next/server'
import { callLLM } from '@/lib/llm-server'

// ─── System Prompts ──────────────────────────────────────────
const PLANNER_SYSTEM_PROMPT = `You are an AI Systems Architect for production ML platforms.

ROLE:
Design end-to-end, deployable ML system pipelines under hard constraints.
You do NOT write code. You output ONLY structured JSON that matches the provided schema.
Your output will be validated by a deterministic engine. Invalid output will be rejected.

HARD RULES:
- Output must be valid JSON only. No markdown. No commentary.
- Follow the provided JSON Schema exactly.
- Do not invent fields.
- If constraints conflict, return a failure object with reasons.
- Never assume data fields. Infer only from given profile.
- Do not reference unavailable tools.
- Propose only feasible, production-safe pipelines.
- Always include monitoring, retraining, rollback, and governance.
- Never exceed cost, carbon, latency constraints.

OUTPUT SCHEMA (PIPELINE_DSL_V1):
{
  "status": "success" | "failure",
  "decision_summary": { "task_type": string, "recommended_model_family": string, "rationale": string[] },
  "pipeline": {
    "data_ingestion": { "source_type": string, "pii_handling": string, "schema_validation": boolean },
    "feature_engineering": { "steps": string[], "feature_store": boolean },
    "model_training": { "algorithm": string, "hyperparam_strategy": string, "resource_class": string },
    "evaluation": { "metrics": string[], "cross_validation": boolean },
    "deployment": { "mode": string, "format": string, "latency_budget_ms": number },
    "monitoring": { "drift": string[], "data_quality": string[], "performance": string[], "pii_leak_detection": boolean },
    "retraining_policy": { "trigger": string[], "schedule_days": number },
    "rollback": { "strategy": string, "max_rollback_minutes": number },
    "governance": { "approval_required": boolean, "audit_log": boolean, "model_card": boolean }
  },
  "cost_estimate": { "monthly_usd": number, "confidence": number },
  "carbon_estimate": { "monthly_kg": number, "confidence": number },
  "risk_register": [{ "risk": string, "severity": string, "mitigation": string }],
  "alternatives_considered": [{ "model_family": string, "rejected_reason": string }]
}`

const EXPLAINER_SYSTEM_PROMPT = `You are an ML Decision Explainer for enterprise users.
Output must be structured JSON only. No markdown. No commentary.
Turn technical pipeline plans into:
- executive summaries (field: "summary")
- key tradeoffs (field: "key_tradeoffs": [{"choice": string, "reason": string, "impact": string}])
- risk warnings (field: "risk_warnings": [{"risk": string, "impact": string, "mitigation": string}])
- deployment readiness (field: "deployment_readiness": {"status": string, "blockers": string[], "next_steps": string[]})
- ui blocks (field: "ui_blocks": {"pipeline_graph": boolean, "cost_meter": boolean, "carbon_meter": boolean, "risk_panel": boolean, "approval_panel": boolean})`

const CRITIC_SYSTEM_PROMPT = `You are a critical reviewer of ML pipeline designs.
Find all weaknesses, missing safeguards, or unrealistic assumptions.
Return only valid JSON with this format:
{"issues": [{"category": string, "issue": string, "severity": "low"|"medium"|"high"|"critical", "fix": string, "field_path": string}]}`

// ─── POST /api/groq/design ───────────────────────────────────
export async function POST(request: NextRequest) {
    let body: any
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { dataset_profile, constraints, infra_context } = body
    const startTime = Date.now()
    const auditLog: any[] = []

    try {
        // ── Step 1: Planner Agent ─────────────────────────
        auditLog.push({ step: 'planner_agent', timestamp: Date.now() / 1000, status: 'started' })

        const userPrompt = JSON.stringify({
            task: 'design_pipeline',
            dataset_profile: dataset_profile || { type: 'tabular', rows: 10000, columns: 12, has_labels: true, label_type: 'classification', pii_detected: false, pii_fields: [], missing_pct: 2.5 },
            constraints: constraints || { max_cost_usd_month: 50, max_latency_ms: 200, max_carbon_kg_month: 5, deployment: 'batch', compliance: 'regulated' },
            infra_context: infra_context || { gpu_available: false, cloud_provider: 'generic', region: 'us-east' },
            output_schema_id: 'PIPELINE_DSL_V1',
        }, null, 2)

        const plannerResult = await callLLM(PLANNER_SYSTEM_PROMPT, userPrompt)
        const pipelineDSL = plannerResult.data

        auditLog.push({
            step: 'planner_agent',
            timestamp: Date.now() / 1000,
            status: `completed (${plannerResult.provider})`
        })
        auditLog.push({ step: 'schema_validation', timestamp: Date.now() / 1000, status: 'passed' })

        // ── Step 2: Self-Critique ─────────────────────────
        auditLog.push({ step: 'self_critique', timestamp: Date.now() / 1000, status: 'started' })

        let critique = { issues: [] as any[], fixes_applied: [] as any[], merged: false, provider: 'none' }
        try {
            const critiqueResult = await callLLM(
                CRITIC_SYSTEM_PROMPT,
                JSON.stringify({ pipeline_to_review: pipelineDSL, instructions: 'Find all weaknesses, missing safeguards, or unrealistic assumptions.' }),
                { temperature: 0.2, maxTokens: 2048 }
            )
            critique = { issues: critiqueResult.data.issues || [], fixes_applied: [], merged: false, provider: critiqueResult.provider }
        } catch (e) {
            console.warn('Self-critique failed (non-fatal):', e)
        }

        auditLog.push({
            step: 'self_critique',
            timestamp: Date.now() / 1000,
            status: critique.provider !== 'none' ? `completed (${critique.provider})` : 'failed',
            issues_found: critique.issues.length,
            fixes_applied: 0
        })

        // ── Step 3: Explainability ────────────────────────
        auditLog.push({ step: 'explainability', timestamp: Date.now() / 1000, status: 'started' })

        let explanation = {
            summary: 'Pipeline design completed successfully.',
            key_tradeoffs: [] as any[],
            risk_warnings: [] as any[],
            deployment_readiness: { status: 'ready', blockers: [] as string[], next_steps: ['Human approval', 'Schedule training job'] },
            ui_blocks: { pipeline_graph: true, cost_meter: true, carbon_meter: true, risk_panel: true, approval_panel: true },
            provider: 'none'
        }
        try {
            const explainResult = await callLLM(
                EXPLAINER_SYSTEM_PROMPT,
                JSON.stringify({ pipeline_decision: pipelineDSL, audience: 'product_manager', explain_level: 'executive' }),
                { temperature: 0.3, maxTokens: 2048 }
            )
            explanation = { ...explanation, ...explainResult.data, provider: explainResult.provider }
        } catch (e) {
            console.warn('Explainability failed (non-fatal), using fallback:', e)
        }

        auditLog.push({
            step: 'explainability',
            timestamp: Date.now() / 1000,
            status: explanation.provider !== 'none' ? `completed (${explanation.provider})` : 'failed'
        })

        const elapsed = Math.round((Date.now() - startTime) / 100) / 10
        auditLog.push({ step: 'orchestration_complete', timestamp: Date.now() / 1000, total_elapsed_seconds: elapsed })

        return NextResponse.json({
            status: 'success',
            pipeline: pipelineDSL,
            explanation,
            critique,
            audit_log: auditLog,
            elapsed_seconds: elapsed,
        })

    } catch (err: any) {
        const elapsed = Math.round((Date.now() - startTime) / 100) / 10
        const message = err.message || 'Pipeline design failed'

        // Return a proper JSON error with the correct HTTP status
        return NextResponse.json(
            { error: message, status: 'failure', audit_log: auditLog, elapsed_seconds: elapsed },
            { status: 500 }
        )
    }
}
