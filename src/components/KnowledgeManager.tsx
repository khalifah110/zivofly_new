import React, { useState, useRef } from 'react';
import { Agent, KnowledgeDocument } from '../types';
import { apiFetch } from '../lib/api';
import {
  Database,
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Layers,
  FileUp,
  FileCheck,
  HardDrive,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { extractTextFromFile, ExtractedDocumentResult } from '../lib/fileTextExtractor';

interface KnowledgeManagerProps {
  agent: Agent;
  onUpdateAgent: (updated: Agent) => void;
}

export const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({
  agent,
  onUpdateAgent,
}) => {
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docType, setDocType] = useState<'pdf' | 'text' | 'faq'>('pdf');
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [testQueryResult, setTestQueryResult] = useState<string[] | null>(null);

  // Personal device upload state
  const [ingestMode, setIngestMode] = useState<'upload' | 'manual'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedResult, setExtractedResult] = useState<ExtractedDocumentResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !docContent.trim()) return;

    setIsUploading(true);
    try {
      const res = await apiFetch(`/api/agents/${agent.id}/knowledge/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: docName.endsWith('.pdf') || docName.endsWith('.txt') ? docName : `${docName}.${docType}`,
          content: docContent,
          type: docType,
        }),
      });
      const data = await res.json();
      if (data.agent) {
        onUpdateAgent(data.agent);
        setDocName('');
        setDocContent('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeviceFileSelect = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsExtracting(true);
    setShowEditor(false);

    try {
      const result = await extractTextFromFile(file);
      setExtractedResult(result);
      setDocName(file.name);
      setDocContent(result.content);
      setDocType(result.type);
      toast.success(`Loaded "${file.name}" from personal device`);
    } catch (err) {
      console.error(err);
      toast.error('Could not extract text from document');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUploadDeviceDoc = async () => {
    if (!selectedFile && !docContent.trim()) {
      toast.error('Please select a document from your device');
      return;
    }

    const finalName = docName.trim() || selectedFile?.name || 'Document.pdf';
    const finalContent = docContent.trim() || extractedResult?.content || '';

    if (!finalContent) {
      toast.error('The document does not have readable content');
      return;
    }

    setIsUploading(true);
    try {
      const res = await apiFetch(`/api/agents/${agent.id}/knowledge/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          content: finalContent,
          type: docType,
        }),
      });
      const data = await res.json();
      if (data.agent) {
        onUpdateAgent(data.agent);
        setSelectedFile(null);
        setExtractedResult(null);
        setDocName('');
        setDocContent('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        toast.success(`"${finalName}" indexed to vector database`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to vectorize document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDeviceDoc = () => {
    setSelectedFile(null);
    setExtractedResult(null);
    setDocName('');
    setDocContent('');
    setShowEditor(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await apiFetch(`/api/agents/${agent.id}/knowledge/${docId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.agent) {
        onUpdateAgent(data.agent);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSampleDoc = (template: { name: string; content: string; type: 'pdf' | 'faq' }) => {
    setDocName(template.name);
    setDocContent(template.content);
    setDocType(template.type);
  };

  const handleTestSearch = () => {
    if (!searchQuery.trim()) {
      setTestQueryResult(null);
      return;
    }
    const query = searchQuery.toLowerCase();
    const matches: string[] = [];
    (agent.knowledgeDocs || []).forEach((doc) => {
      const paras = doc.content.split(/\n\n+/);
      paras.forEach((p) => {
        if (p.toLowerCase().includes(query) || query.split(' ').some((w) => w.length > 3 && p.toLowerCase().includes(w))) {
          matches.push(p);
        }
      });
    });
    setTestQueryResult(matches.slice(0, 3));
  };

  const totalChunks = (agent.knowledgeDocs || []).reduce((acc, d) => acc + (d.chunkCount || 1), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header & Stats */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              RAG Vector Database
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Synced & Ready
            </span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">
            External Business Knowledge Base
          </h2>
          <p className="text-xs text-neutral-500 max-w-xl leading-relaxed">
            Upload PDF catalogs, price guides, and manuals. The agent retrieves relevant facts in real-time when answering customer inquiries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-center min-w-[110px]">
            <span className="text-xl font-bold text-neutral-900 block leading-tight">
              {agent.knowledgeDocs?.length || 0}
            </span>
            <span className="text-[11px] text-neutral-500">Documents</span>
          </div>
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-center min-w-[110px]">
            <span className="text-xl font-bold text-neutral-900 block leading-tight">
              {totalChunks}
            </span>
            <span className="text-[11px] text-neutral-500">Vector Chunks</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Ingestion Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <FileUp className="w-4 h-4 text-neutral-800" />
                Upload & Vectorize Document
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Ground your agent with policies, price lists, and catalogs.
              </p>
            </div>

            {/* Ingestion Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIngestMode('upload')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  ingestMode === 'upload'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>From Device</span>
              </button>
              <button
                type="button"
                onClick={() => setIngestMode('manual')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  ingestMode === 'manual'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Manual / Presets</span>
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,.doc,.docx,.json,.rtf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleDeviceFileSelect(file);
            }}
          />

          {/* MODE 1: Upload from Personal Device */}
          {ingestMode === 'upload' && (
            <div className="space-y-4">
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleDeviceFileSelect(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-100'
                      : 'border-neutral-200 hover:border-neutral-400 bg-neutral-50/60 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900">
                        Select a file from your personal device
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Drag & drop or click to browse files from your computer or phone
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[10px] text-neutral-500">
                      <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-medium">PDF</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-medium">TXT</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-medium">DOCX</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-medium">CSV</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-medium">Markdown</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-1 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Browse Files from Device</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-4 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                        {isExtracting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <FileCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 truncate block">
                            {selectedFile.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                            {extractedResult?.fileSize || `${Math.round(selectedFile.size / 1024)} KB`}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Ready to index into vector database</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDeviceDoc}
                        className="p-1 text-neutral-400 hover:text-red-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-700">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="e.g. Services_Pricing_Catalog.pdf"
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-neutral-600">
                        Extracted Content ({docContent.length} chars)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEditor(!showEditor)}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{showEditor ? 'Collapse editor' : 'Review & Edit extracted text'}</span>
                        {showEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {showEditor ? (
                      <textarea
                        rows={6}
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none bg-white font-sans leading-relaxed"
                      />
                    ) : (
                      <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs text-neutral-600 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                        {docContent || 'No text extracted'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResetDeviceDoc}
                      className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadDeviceDoc}
                      disabled={isUploading || isExtracting || !docContent.trim()}
                      className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Vectorizing...' : 'Index Document to Vector Store'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: Manual Text / Presets */}
          {ingestMode === 'manual' && (
            <div className="space-y-4">
              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-neutral-500 font-medium">Quick Preset Templates:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSampleDoc({
                        name: 'Shipping & Return Policies.pdf',
                        type: 'pdf',
                        content: `Shipping & Delivery Guidelines:
- Standard shipping takes 3-5 business days and is complimentary on all orders over $75.
- Express overnight shipping is $19.95.
Returns & Exchanges:
- Unopened retail skincare products may be returned within 30 days of purchase for a 100% full refund to original payment method.
- Opened or gently used products can be exchanged for spa store credit within 14 days.`,
                      })
                    }
                    className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                  >
                    + Shipping & Return Policy
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSampleDoc({
                        name: 'VIP Loyalty Program.pdf',
                        type: 'pdf',
                        content: `VIP Club Loyalty Program:
- Monthly membership tier: $89/month.
- Benefits: 1 free 45-minute treatment every month, 20% discount on all retail items, and complimentary priority weekend booking.
- Rollover: Unused monthly credits roll over for up to 90 days.
- Cancellation: Cancel anytime with 48 hours notice before the monthly billing cycle.`,
                      })
                    }
                    className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                  >
                    + VIP Loyalty Program
                  </button>
                </div>
              </div>

              <form onSubmit={handleUploadDoc} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="e.g. Services_Pricing_Catalog.pdf"
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Format Type
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                    >
                      <option value="pdf">PDF Document (.pdf)</option>
                      <option value="text">Text Knowledge (.txt)</option>
                      <option value="faq">FAQ Knowledge Base</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Document Text Content
                  </label>
                  <textarea
                    rows={6}
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Paste the detailed contents of your document, policies, product catalogs, service menus, or FAQs here..."
                    className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none font-sans leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-400">
                    Chunked automatically into ~300 character vector units.
                  </span>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Vectorizing...' : 'Index Document to Vector Store'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Vector Retrieval Tester */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Semantic Retrieval Test
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Simulate customer queries to verify which facts your agent pulls.
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                placeholder="e.g. Do you have free parking?"
                className="w-full px-3 py-2 pr-9 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={handleTestSearch}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-800"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleTestSearch}
              className="w-full py-1.5 text-[11px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Test RAG Retrieval
            </button>
          </div>

          {testQueryResult && (
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <span className="text-[11px] font-semibold text-neutral-700">Retrieved Facts:</span>
              {testQueryResult.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No direct vector matches found for this query.</p>
              ) : (
                testQueryResult.map((snippet, idx) => (
                  <div key={idx} className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                    <span className="font-bold mr-1">Match #{idx + 1}:</span> {snippet.slice(0, 160)}...
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Indexed Document List */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-neutral-800" />
          Active Vector Index Documents ({agent.knowledgeDocs?.length || 0})
        </h3>

        {(!agent.knowledgeDocs || agent.knowledgeDocs.length === 0) ? (
          <div className="py-12 text-center text-neutral-400 text-xs">
            No external documents added yet. Add documents above or connect Meta OAuth to auto-train on your Bio!
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {agent.knowledgeDocs.map((doc) => (
              <div
                key={doc.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 truncate">
                      {doc.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {doc.chunkCount} Vector Chunks · {doc.fileSize || '32 KB'} · Added {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate max-w-lg mt-0.5">
                      {doc.content.slice(0, 120)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active in RAG
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc.id)}
                    title="Remove document from index"
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
