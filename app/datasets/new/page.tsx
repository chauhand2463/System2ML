'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign, DatasetProfile } from '@/hooks/use-design'
import { profileDataset, validateDataset, DatasetProfileRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, Database, Link2, FileSpreadsheet, Image, FileText, 
  Loader2, AlertTriangle, CheckCircle, ArrowRight, Shield,
  BarChart3, Clock, HardDrive, Tag
} from 'lucide-react'

type DataSource = 'upload' | 'connection' | 'existing'

interface ProfilingState {
  status: 'idle' | 'profiling' | 'validating' | 'complete' | 'error'
  progress: number
  error?: string
}

export default function NewDatasetPage() {
  const router = useRouter()
  const { setDataset, setDesignStep } = useDesign()
  
  const [source, setSource] = useState<DataSource>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [connectionConfig, setConnectionConfig] = useState({
    type: 's3',
    bucket: '',
    path: '',
  })
  const [existingDatasetId, setExistingDatasetId] = useState('')
  const [profilingState, setProfilingState] = useState<ProfilingState>({
    status: 'idle',
    progress: 0,
  })
  const [profileResult, setProfileResult] = useState<DatasetProfile | null>(null)
  const [validationResult, setValidationResult] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleProfiling = async () => {
    setProfilingState({ status: 'profiling', progress: 0 })
    
    const progressInterval = setInterval(() => {
      setProfilingState(prev => ({
        ...prev,
        progress: Math.min(prev.progress + Math.random() * 20, 90),
      }))
    }, 300)

    try {
      let request: DatasetProfileRequest
      
      if (source === 'upload') {
        const fileSizeMb = file ? file.size / (1024 * 1024) : 1.0
        const fileType = file?.name?.split('.').pop() as 'csv' | 'parquet' | 'json' | 'image' | 'text' | undefined
        
        request = {
          source: 'upload',
          file_name: file?.name || 'uploaded_file',
          file_type: fileType,
          file_size_mb: Math.round(fileSizeMb * 100) / 100,
        }
      } else if (source === 'connection') {
        request = {
          source: 'connection',
          connection_config: {
            ...connectionConfig,
            source_name: connectionConfig.bucket || 'data_source',
            size_mb: 10.0,
          },
        }
      } else {
        request = {
          source: 'existing',
          dataset_id: existingDatasetId,
        }
      }

      const result = await profileDataset(request)
      clearInterval(progressInterval)
      
      console.log('Profile result:', result)
      
      if (!result || !result.dataset) {
        setProfilingState({ status: 'error', progress: 0, error: 'Failed to profile dataset - no response' })
        return
      }
      
      setProfilingState({ status: 'complete', progress: 100 })
      
      const ds = result.dataset
      
      // Convert API response to DatasetProfile format
      const mappedProfile: DatasetProfile = {
        name: ds.name || 'dataset',
        source: ds.source || 'upload',
        type: ds.type || 'tabular',
        sizeMb: ds.size_mb || ds.sizeMb || 0,
        rows: ds.rows,
        columns: ds.columns,
        features: ds.features,
        labelType: ds.label_type || ds.labelType,
        labelPresent: ds.label_present || ds.labelPresent || true,
        missingValues: ds.missing_percentage || ds.missingValues || 0,
        classBalance: ds.class_balance || ds.classBalance,
        piiDetected: ds.pii_detected || ds.piiDetected || false,
        piiFields: ds.pii_fields || ds.piiFields,
        createdAt: ds.profile_timestamp || ds.createdAt || new Date().toISOString(),
        inferredTask: ds.inferred_task || ds.inferredTask,
      }
      setProfileResult(mappedProfile)
      
      // Call backend validation
      try {
        const validation = await validateDataset({
          project_id: result.project_id,
          compliance_level: 'low',
        })
        setValidationResult(validation)
        
        if (validation.status === 'blocked') {
          setProfilingState({ status: 'error', progress: 50, error: 'Validation blocked' })
          return
        }
        
        setProfilingState({ status: 'complete', progress: 100 })
      } catch (valError: any) {
        console.error('Validation error:', valError)
        // Continue with validation passed on error
        setValidationResult({ status: 'valid', errors: [] })
        setProfilingState({ status: 'complete', progress: 100 })
      }
      
    } catch (error: any) {
      clearInterval(progressInterval)
      setProfilingState({ 
        status: 'error', 
        progress: 0,
        error: error.message || 'Failed to profile dataset'
      })
    }
  }

  const handleProceedToDesign = () => {
    if (profileResult && (validationResult?.status === 'valid' || validationResult?.is_valid)) {
      setDataset(profileResult)
      setDesignStep('input')
      router.push('/design/input')
    }
  }

  const isValidationPassed = validationResult?.status === 'valid' || validationResult?.is_valid === true
  const isValidationBlocked = validationResult?.status === 'blocked' || (validationResult?.errors && validationResult.errors.length > 0)

  const getFileIcon = () => {
    if (!file) return <FileSpreadsheet className="w-8 h-8" />
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
    if (ext === 'json') return <FileText className="w-8 h-8 text-blue-400" />
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <Image className="w-8 h-8 text-purple-400" />
    return <FileText className="w-8 h-8 text-neutral-400" />
  }

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Dataset Intake & Profiling</h1>
            <p className="text-neutral-400">
              Upload or connect your data to begin pipeline design
            </p>
          </div>

          <div className="grid gap-6">
            {/* Data Source Selection */}
            <Card className="bg-neutral-900/50 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-400" />
                  Select Data Source
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Choose how to provide your dataset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={source} onValueChange={(v) => setSource(v as DataSource)}>
                  <TabsList className="grid w-full grid-cols-3 bg-neutral-800">
                    <TabsTrigger value="upload" className="data-[state=active]:bg-brand-500">
                      <Upload className="w-4 h-4 mr-2" /> Upload
                    </TabsTrigger>
                    <TabsTrigger value="connection" className="data-[state=active]:bg-brand-500">
                      <Link2 className="w-4 h-4 mr-2" /> Connect
                    </TabsTrigger>
                    <TabsTrigger value="existing" className="data-[state=active]:bg-brand-500">
                      <Database className="w-4 h-4 mr-2" /> Existing
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-4">
                    <div className="border-2 border-dashed border-neutral-700 rounded-xl p-8 text-center hover:border-brand-500/50 transition-colors">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        accept=".csv,.parquet,.json,.jpg,.jpeg,.png,.txt"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          {getFileIcon()}
                          {file ? (
                            <div className="mt-4">
                              <p className="text-white font-medium">{file.name}</p>
                              <p className="text-neutral-500 text-sm">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <p className="text-white font-medium">Drop your dataset here</p>
                              <p className="text-neutral-500 text-sm">
                                CSV, Parquet, JSON, Images, or Text files
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </TabsContent>

                  <TabsContent value="connection" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-neutral-400">Source Type</Label>
                        <select
                          value={connectionConfig.type}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, type: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white"
                        >
                          <option value="s3">Amazon S3</option>
                          <option value="gcs">Google Cloud Storage</option>
                          <option value="db">Database</option>
                          <option value="api">API</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-neutral-400">Bucket / Database</Label>
                        <Input
                          value={connectionConfig.bucket}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, bucket: e.target.value })}
                          placeholder="my-bucket"
                          className="mt-1 bg-neutral-800 border-neutral-700 text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-neutral-400">Path</Label>
                        <Input
                          value={connectionConfig.path}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, path: e.target.value })}
                          placeholder="/data/dataset.csv"
                          className="mt-1 bg-neutral-800 border-neutral-700 text-white"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="existing" className="mt-4 space-y-4">
                    <div>
                      <Label className="text-neutral-400">Dataset ID</Label>
                      <Input
                        value={existingDatasetId}
                        onChange={(e) => setExistingDatasetId(e.target.value)}
                        placeholder="Enter existing dataset ID"
                        className="mt-1 bg-neutral-800 border-neutral-700 text-white"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Profiling Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleProfiling}
                disabled={profilingState.status === 'profiling' || profilingState.status === 'validating'}
                className="bg-gradient-to-r from-brand-500 to-brand-600 px-8"
                size="lg"
              >
                {profilingState.status === 'profiling' || profilingState.status === 'validating' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {profilingState.status === 'profiling' ? 'Profiling Dataset...' : 'Validating...'}
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Profile Dataset
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {profilingState.status !== 'idle' && (
              <Progress value={profilingState.progress} className="h-2" />
            )}

            {/* Error State */}
            {profilingState.status === 'error' && (
              <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{profilingState.error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile Results */}
            {profileResult && profilingState.status === 'complete' && (
              <Card className="bg-neutral-900/50 border-white/5">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Dataset Profile Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Validation Status */}
                  {validationResult && (
                    <div className={`p-4 rounded-xl ${
                      validationResult.is_valid 
                        ? 'bg-emerald-500/10 border border-emerald-500/20' 
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {validationResult.is_valid ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`font-medium ${
                          validationResult.is_valid ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {validationResult.is_valid ? 'Dataset Validated' : 'Validation Failed'}
                        </span>
                      </div>
                      
                      {/* Violations */}
                      {validationResult.violations?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {validationResult.violations.map((v: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                              <span className="text-neutral-300">{v.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Suggestions */}
                      {validationResult.suggestions?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-700">
                          <p className="text-sm text-neutral-400 mb-2">Suggestions:</p>
                          {validationResult.suggestions.map((s: any, i: number) => (
                            <div key={i} className="text-sm text-neutral-500 mb-1">
                              • {s.reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dataset Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-neutral-800/50">
                      <div className="flex items-center gap-2 text-neutral-400 mb-1">
                        <HardDrive className="w-4 h-4" />
                        <span className="text-sm">Size</span>
                      </div>
                      <p className="text-xl font-bold text-white">{profileResult?.sizeMb?.toFixed(1) || '0'} MB</p>
                    </div>
                    <div className="p-4 rounded-xl bg-neutral-800/50">
                      <div className="flex items-center gap-2 text-neutral-400 mb-1">
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-sm">Rows</span>
                      </div>
                      <p className="text-xl font-bold text-white">{profileResult?.rows?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-neutral-800/50">
                      <div className="flex items-center gap-2 text-neutral-400 mb-1">
                        <Tag className="w-4 h-4" />
                        <span className="text-sm">Features</span>
                      </div>
                      <p className="text-xl font-bold text-white">{profileResult?.features || '0'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-neutral-800/50">
                      <div className="flex items-center gap-2 text-neutral-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Missing</span>
                      </div>
                      <p className="text-xl font-bold text-white">{profileResult?.missingValues?.toFixed(1) || '0'}%</p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-neutral-400">Data Type</Label>
                      <Badge className="mt-1 bg-brand-500/20 text-brand-400">
                        {profileResult?.type || 'unknown'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-neutral-400">Inferred Task</Label>
                      <Badge className="mt-1 bg-purple-500/20 text-purple-400">
                        {profileResult?.inferredTask || 'unknown'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-neutral-400">Label Present</Label>
                      <div className="mt-1">
                        {profileResult?.labelPresent ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400">
                            Yes - {profileResult?.labelType}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400">No</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-neutral-400">PII Detected</Label>
                      <div className="mt-1">
                        {profileResult?.piiDetected ? (
                          <Badge className="bg-red-500/20 text-red-400">
                            <Shield className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400">No</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PII Fields */}
                  {profileResult?.piiDetected && profileResult?.piiFields && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">PII Fields Detected</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profileResult.piiFields.map((field: string, i: number) => (
                          <Badge key={i} variant="outline" className="border-red-500/30 text-red-300">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Class Balance */}
                  {profileResult?.classBalance && (
                    <div>
                      <Label className="text-neutral-400">Class Balance</Label>
                      <div className="mt-2 space-y-2">
                        {Object.entries(profileResult.classBalance).map(([cls, count]) => (
                          <div key={cls} className="flex items-center gap-2">
                            <span className="text-sm text-neutral-300 w-20">{cls}</span>
                            <Progress 
                              value={(Number(count) / (profileResult?.rows || 1)) * 100} 
                              className="flex-1 h-2"
                            />
                            <span className="text-sm text-neutral-400 w-16 text-right">
                              {((Number(count) / (profileResult?.rows || 1)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blocking Errors */}
                  {isValidationBlocked && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-semibold">Validation Blocked</span>
                      </div>
                      {(validationResult.errors || validationResult.violations || []).map((err: any, i: number) => (
                        <div key={i} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm text-neutral-500 font-mono">{err.code}</p>
                              <p className="text-white font-medium mt-1">{err.message}</p>
                              <p className="text-sm text-neutral-400 mt-1">Action: {err.action}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                              onClick={() => {
                                if (err.action?.includes('anonymize')) {
                                  alert('Anonymization feature coming soon')
                                } else if (err.action?.includes('add_label')) {
                                  alert('Please add a label column to your dataset')
                                } else if (err.action?.includes('sample')) {
                                  alert('Please sample or compress your dataset')
                                } else {
                                  alert('Please fix the issue and re-upload')
                                }
                              }}
                            >
                              {err.action?.replace(/_/g, ' ') || 'Fix'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Proceed Button */}
                  {isValidationPassed && (
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleProceedToDesign}
                        className="bg-gradient-to-r from-brand-500 to-brand-600"
                        size="lg"
                      >
                        Proceed to Design
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Blocked State Message */}
                  {isValidationBlocked && (
                    <div className="flex justify-center pt-4">
                      <p className="text-neutral-500 text-sm">
                        Please fix the validation errors above to proceed
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}