import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { dataset_profile, constraints, infra_context } = body

  try {
    const response = await fetch(`${API_BASE}/api/groq/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_profile,
        constraints,
        infra_context
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (e: any) {
    console.error('Groq design error:', e.message)
    return NextResponse.json(
      { error: `Failed to connect to backend: ${e.message}` },
      { status: 502 }
    )
  }
}
