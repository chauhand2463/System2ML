import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

const jobs = new Map<string, any>()

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')
    
    if (!jobId) {
        return NextResponse.json({ error: 'Missing job_id parameter' }, { status: 400 })
    }
    
    const job = jobs.get(jobId)
    
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    const notebookContent = job.notebook_content
    
    return new NextResponse(notebookContent, {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="system2ml-training-${jobId}.ipynb"`,
        },
    })
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { dataset_profile, training_target, constraints } = body
        
        const response = await fetch(`${API_BASE}/api/training/colab/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dataset_profile,
                training_target,
                constraints
            })
        })

        if (!response.ok) {
            const error = await response.json()
            return NextResponse.json(error, { status: response.status })
        }

        const result = await response.json()
        
        const jobId = result.job_id || Math.random().toString(36).substring(2, 15)
        
        const job = {
            job_id: jobId,
            status: result.status || 'created',
            config: result.config || {
                model_name: training_target?.base_model || 'microsoft/phi-2',
                method: training_target?.method || 'lora',
            },
            notebook_content: result.notebook_json || '{}',
            created_at: new Date().toISOString()
        }
        
        jobs.set(jobId, job)
        
        return NextResponse.json({
            job_id: jobId,
            status: job.status,
            config: job.config,
            notebook_json: job.notebook_content,
            download_url: `/api/training/colab/download?job_id=${jobId}`,
            colab_url: result.colab_link || 'https://colab.research.google.com/#new',
            instructions: result.instructions || [
                '📥 Download the notebook using the button below',
                '📂 Go to https://colab.research.google.com',
                '📤 Click "Upload notebook" and select the downloaded file',
                '▶️ Run the cells in order to train your model',
                '💾 Download your fine-tuned model when complete'
            ]
        })
        
    } catch (error: any) {
        console.error('Colab create error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create Colab training' },
            { status: 500 }
        )
    }
}
