'use client'

import { useState } from 'react'
import { Upload, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function QuickDatasetUpload() {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    setUploadStatus('idle')
    
    try {
      const profileRes = await fetch('http://127.0.0.1:8000/api/datasets/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'upload',
          file_name: file.name,
          file_type: file.name.split('.').pop() || 'csv',
        }),
      })
      
      const data = await profileRes.json()
      
      if (data.status === 'profiled') {
        const ds = data.dataset || data.profile
        if (ds && ds.rows > 0) {
          localStorage.setItem('system2ml_dataset', JSON.stringify({
            name: ds.name,
            source: 'upload',
            type: ds.type,
            sizeMb: ds.size_mb,
            rows: ds.rows,
            columns: ds.columns,
            features: ds.features,
            labelPresent: ds.label_present,
            labelColumn: ds.label_column,
            labelType: ds.label_type,
            inferredTask: ds.inferred_task,
          }))
          setUploadStatus('success')
          setTimeout(() => window.location.href = '/design/input', 1000)
          return
        }
      }
      setUploadStatus('error')
    } catch {
      setUploadStatus('error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Upload className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Quick Dataset Upload</h3>
            <p className="text-sm text-neutral-400">Upload a CSV to start designing your ML pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {uploadStatus === 'success' && (
            <span className="text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Ready! Redirecting...
            </span>
          )}
          {uploadStatus === 'error' && (
            <span className="text-red-400 text-sm">Upload failed. Try again.</span>
          )}
          <label className="cursor-pointer">
            <input type="file" accept=".csv" onChange={handleQuickUpload} className="hidden" disabled={uploading} />
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? 'Processing...' : 'Upload CSV'}
            </Button>
          </label>
        </div>
      </div>
    </div>
  )
}
