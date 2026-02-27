'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign } from '@/hooks/use-design'
import { useWorkflow } from '@/hooks/use-workflow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, AlertCircle,
  Shield, Trash2, ArrowRight, Loader2, FileText, BarChart3
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DatasetProfile {
  name: string
  source: string
  type: string
  sizeMb: number
  rows: number
  columns: number
  features: number
  labelPresent: boolean
  labelColumn?: string
  labelType?: string
  inferredTask: string
}

export default function NewDatasetPage() {
  const router = useRouter()
  const { setDataset, setDesignStep } = useDesign()
  const { projectId, transitionState } = useWorkflow()
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [localProfile, setLocalProfile] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setLocalProfile(null)
      setError(null)
      setSuccess(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)
    setLocalProfile(null)

    try {
      // Step 1: Upload file
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`${API_BASE}/api/datasets/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file')
      }

      const uploadData = await uploadRes.json()
      console.log('Upload result:', uploadData)

      // Step 2: Profile the dataset
      const profileRes = await fetch(`${API_BASE}/api/datasets/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          source: 'upload',
          file_name: file.name,
          file_type: file.name.split('.').pop() || 'csv',
        }),
      })

      const profileData = await profileRes.json()
      console.log('Profile result:', profileData)

      if (profileData.status === 'failed') {
        const errMsg = profileData.errors?.map((e: any) => e.message).join(', ') || 'Failed to profile'
        throw new Error(errMsg)
      }

      const ds = profileData.dataset || profileData.profile

      // Step 3: Check validation - simple check
      if (!ds || ds.features === 0) {
        throw new Error('Invalid dataset: 0 features. Please check your CSV file.')
      }

      if (ds.columns < 2) {
        throw new Error('Dataset needs at least 2 columns (features + label)')
      }

      if (ds.inferred_task === 'unknown') {
        throw new Error('Could not determine task. Add a label column with numeric or text values.')
      }

      // Build profile for hook - map field names correctly (snake_case to camelCase)
      const hookProfile = {
        name: ds.name || file.name,
        source: 'upload' as const,
        type: (ds.type || 'tabular') as any,
        sizeMb: ds.size_mb || 0,
        rows: ds.rows || 0,
        columns: ds.columns || 0,
        features: ds.features || 0,
        labelType: ds.label_type,
        labelPresent: ds.label_present || false,
        missingValues: ds.missing_percentage || 0,
        piiDetected: ds.pii_detected || false,
        piiFields: ds.pii_fields || [],
        createdAt: new Date().toISOString(),
        inferredTask: ds.inferred_task || 'classification',
      }

      setLocalProfile(hookProfile)
      setDataset(hookProfile)
      setSuccess('Dataset validated successfully!')

      // Step 4: Transition backend state
      if (projectId) {
        await transitionState('DATASET_PROFILED', hookProfile)
        // Also transition to VALIDATED since we did local validation above
        await transitionState('DATASET_VALIDATED', { status: 'approved' })
      }

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProceed = () => {
    if (!localProfile) return
    setDesignStep('input')
    router.push('/design/input')
  }

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Dataset Upload</h1>
          <p className="text-neutral-400 mb-8">
            Upload a CSV file to create your ML pipeline
          </p>

          <Card className="bg-neutral-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-400" />
                Upload CSV Dataset
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Your CSV should have: header row, at least 2 columns, and a label/target column
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Input */}
              <div className="border-2 border-dashed border-neutral-700 rounded-xl p-8 text-center hover:border-brand-500/50 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div>
                      <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto" />
                      <p className="text-white font-medium mt-3">{file.name}</p>
                      <p className="text-neutral-500 text-sm">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-neutral-500 mx-auto" />
                      <p className="text-white font-medium mt-3">Click to upload CSV</p>
                      <p className="text-neutral-500 text-sm">or drag and drop</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!file || isLoading}
                className="w-full bg-brand-600 hover:bg-brand-700"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Upload & Validate
                  </>
                )}
              </Button>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Error</span>
                  </div>
                  <p className="text-white mt-2">{error}</p>
                </div>
              )}

              {/* PII Warning */}
              {localProfile?.piiDetected && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Shield className="w-5 h-5" />
                    <span className="font-semibold">PII Detected</span>
                  </div>
                  <p className="text-white text-sm mt-2">
                    Sensitive fields found: {localProfile.piiFields?.join(', ')}.
                    Proceed with caution or anonymize later.
                  </p>
                </div>
              )}

              {/* Success */}
              {success && localProfile && !localProfile.piiDetected && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">{success}</span>
                  </div>
                </div>
              )}

              {/* Profile Results */}
              {localProfile && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-4 rounded-lg bg-neutral-800">
                      <p className="text-neutral-400 text-sm">Rows</p>
                      <p className="text-2xl font-bold text-white">{localProfile.rows}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-neutral-800">
                      <p className="text-neutral-400 text-sm">Features</p>
                      <p className="text-2xl font-bold text-white">{localProfile.features}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-neutral-800">
                      <p className="text-neutral-400 text-sm">Columns</p>
                      <p className="text-2xl font-bold text-white">{localProfile.columns}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-neutral-800">
                      <p className="text-neutral-400 text-sm">Size</p>
                      <p className="text-2xl font-bold text-white">
                        {localProfile.sizeMb > 1 ? `${localProfile.sizeMb.toFixed(1)} MB` : `${(localProfile.sizeMb * 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-neutral-800 col-span-2">
                      <p className="text-neutral-400 text-sm">Inferred Task</p>
                      <p className="text-2xl font-bold text-brand-400">{localProfile.inferredTask}</p>
                    </div>
                    {localProfile.labelColumn && (
                      <div className="p-4 rounded-lg bg-neutral-800 col-span-2">
                        <p className="text-neutral-400 text-sm">Label Column</p>
                        <p className="text-xl font-bold text-white">{localProfile.labelColumn}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleProceed}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    Proceed to Design
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
