import { useState, useRef } from"react";
import { useQuery, useQueryClient } from"@tanstack/react-query";
import {
 Upload,
 File,
 FileText,
 Image,
 Trash2,
 Download,
 FolderOpen,
 Plus,
 X,
 Edit2,
 Check,
} from"lucide-react";
import { PageHeader, Card, Spinner, Badge } from"../components/ui";
import { apiRequest } from"../lib/api";

interface BusinessFile {
 id: string;
 originalName: string;
 fileName: string;
 fileType: string;
 fileSize: number;
 fileUrl: string;
 description: string;
 category: string;
 createdAt: string;
}

const CATEGORIES = [
 { value:"general", label:"General"},
 { value:"contracts", label:"Contracts"},
 { value:"proposals", label:"Proposals"},
 { value:"checklists", label:"Checklists"},
 { value:"invoices", label:"Invoices"},
 { value:"branding", label:"Branding"},
 { value:"training", label:"Training"},
 { value:"templates", label:"Templates"},
];

function formatBytes(bytes: number): string {
 if (bytes === 0) return"0 B";
 const k = 1024;
 const sizes = ["B","KB","MB","GB"];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) +""+ sizes[i];
}

function getFileIcon(fileType: string) {
 if (fileType.startsWith("image/")) return Image;
 if (fileType ==="application/pdf"|| fileType.includes("document") || fileType.includes("word"))
 return FileText;
 return File;
}

function getCategoryColor(category: string): string {
 const map: Record<string, string> = {
 contracts:"bg-blue-100 text-blue-700",
 proposals:"bg-purple-100 text-purple-700",
 checklists:"bg-green-100 text-green-700",
 invoices:"bg-yellow-100 text-yellow-700",
 branding:"bg-pink-100 text-pink-700",
 training:"bg-orange-100 text-orange-700",
 templates:"bg-indigo-100 text-indigo-700",
 general:"bg-slate-100 text-slate-600",
 };
 return map[category] || map.general;
}

export default function FileLibraryPage() {
 const queryClient = useQueryClient();
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [uploading, setUploading] = useState(false);
 const [uploadError, setUploadError] = useState("");
 const [selectedCategory, setSelectedCategory] = useState("all");
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editDescription, setEditDescription] = useState("");
 const [editCategory, setEditCategory] = useState("general");
 const [showUploadModal, setShowUploadModal] = useState(false);
 const [uploadForm, setUploadForm] = useState({ description:"", category:"general"});
 const [pendingFiles, setPendingFiles] = useState<File[]>([]);
 const [deletingId, setDeletingId] = useState<string | null>(null);

 const { data: files = [], isLoading } = useQuery<BusinessFile[]>({
 queryKey: ["/api/files"],
 });

 const filtered = selectedCategory ==="all"
 ? files
 : files.filter(f => f.category === selectedCategory);

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const selected = Array.from(e.target.files || []);
 if (selected.length === 0) return;
 setPendingFiles(selected);
 setShowUploadModal(true);
 if (fileInputRef.current) fileInputRef.current.value ="";
 };

 const readFileAsBase64 = (file: File): Promise<string> =>
 new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });

 const handleUpload = async () => {
 if (pendingFiles.length === 0) return;
 setUploading(true);
 setUploadError("");
 try {
 for (const file of pendingFiles) {
 const fileData = await readFileAsBase64(file);
 await apiRequest("POST","/api/files/upload", {
 fileData,
 originalName: file.name,
 fileType: file.type,
 fileSize: file.size,
 description: uploadForm.description,
 category: uploadForm.category,
 });
 }
 await queryClient.invalidateQueries({ queryKey: ["/api/files"] });
 setShowUploadModal(false);
 setPendingFiles([]);
 setUploadForm({ description:"", category:"general"});
 } catch (err: any) {
 setUploadError(err.message ||"Upload failed");
 } finally {
 setUploading(false);
 }
 };

 const handleDelete = async (id: string) => {
 setDeletingId(id);
 try {
 await apiRequest("DELETE", `/api/files/${id}`);
 await queryClient.invalidateQueries({ queryKey: ["/api/files"] });
 } finally {
 setDeletingId(null);
 }
 };

 const handleEdit = (file: BusinessFile) => {
 setEditingId(file.id);
 setEditDescription(file.description);
 setEditCategory(file.category);
 };

 const handleSaveEdit = async (id: string) => {
 await apiRequest("PATCH", `/api/files/${id}`, {
 description: editDescription,
 category: editCategory,
 });
 await queryClient.invalidateQueries({ queryKey: ["/api/files"] });
 setEditingId(null);
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 const dropped = Array.from(e.dataTransfer.files);
 if (dropped.length > 0) {
 setPendingFiles(dropped);
 setShowUploadModal(true);
 }
 };

 return (
 <div className="p-6 max-w-6xl mx-auto space-y-6">
 <PageHeader
 title="File Library"
 subtitle="Store and organize documents to share with customers — contracts, checklists, proposals, and more."
 actions={
 <button
 onClick={() => fileInputRef.current?.click()}
 className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm transition-colors"
 >
 <Plus size={16} />
 Upload File
 </button>
 }
 />

 <input
 ref={fileInputRef}
 type="file"
 multiple
 className="hidden"
 onChange={handleFileSelect}
 accept="*/*"
 />

 {/* Upload drop zone */}
 <div
 onDrop={handleDrop}
 onDragOver={e => e.preventDefault()}
 onClick={() => fileInputRef.current?.click()}
 className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all group"
 >
 <Upload className="mx-auto mb-3 text-slate-400 group-hover:text-primary-500 transition-colors"size={32} />
 <p className="text-slate-600 font-medium">Drop files here or click to browse</p>
 <p className="text-sm text-slate-400 mt-1">PDF, Word, Excel, images, and more</p>
 </div>

 {/* Category filter */}
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setSelectedCategory("all")}
 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
 selectedCategory ==="all"
 ?"bg-primary-600 text-white"
 :"bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
 }`}
 >
 All Files ({files.length})
 </button>
 {CATEGORIES.map(cat => {
 const count = files.filter(f => f.category === cat.value).length;
 if (count === 0) return null;
 return (
 <button
 key={cat.value}
 onClick={() => setSelectedCategory(cat.value)}
 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
 selectedCategory === cat.value
 ?"bg-primary-600 text-white"
 :"bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
 }`}
 >
 {cat.label} ({count})
 </button>
 );
 })}
 </div>

 {/* File list */}
 {isLoading ? (
 <div className="flex justify-center py-12"><Spinner /></div>
 ) : filtered.length === 0 ? (
 <Card>
 <div className="py-12 text-center">
 <FolderOpen className="mx-auto mb-3 text-slate-300"size={40} />
 <p className="text-slate-500 font-medium">No files yet</p>
 <p className="text-sm text-slate-400 mt-1">
 Upload your first file to get started
 </p>
 </div>
 </Card>
 ) : (
 <div className="grid gap-3">
 {filtered.map(file => {
 const FileIcon = getFileIcon(file.fileType);
 const isEditing = editingId === file.id;
 return (
 <Card key={file.id}>
 <div className="p-4 flex items-start gap-4">
 <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
 <FileIcon size={20} className="text-slate-500"/>
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-3 flex-wrap">
 <div className="min-w-0">
 <p className="font-medium text-slate-800 truncate">
 {file.originalName}
 </p>
 <div className="flex items-center gap-2 mt-0.5 flex-wrap">
 <span className="text-xs text-slate-400">
 {formatBytes(file.fileSize)}
 </span>
 <span className="text-xs text-slate-300">•</span>
 <span className="text-xs text-slate-400">
 {new Date(file.createdAt).toLocaleDateString()}
 </span>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(file.category)}`}>
 {CATEGORIES.find(c => c.value === file.category)?.label || file.category}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-1 flex-shrink-0">
 <a
 href={file.fileUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
 title="Download"
 >
 <Download size={16} />
 </a>
 <button
 onClick={() => isEditing ? setEditingId(null) : handleEdit(file)}
 className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
 title="Edit"
 >
 <Edit2 size={16} />
 </button>
 <button
 onClick={() => handleDelete(file.id)}
 disabled={deletingId === file.id}
 className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
 title="Delete"
 >
 {deletingId === file.id ? <Spinner /> : <Trash2 size={16} />}
 </button>
 </div>
 </div>

 {isEditing ? (
 <div className="mt-3 space-y-2">
 <select
 value={editCategory}
 onChange={e => setEditCategory(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800"
 >
 {CATEGORIES.map(c => (
 <option key={c.value} value={c.value}>{c.label}</option>
 ))}
 </select>
 <div className="flex gap-2">
 <input
 value={editDescription}
 onChange={e => setEditDescription(e.target.value)}
 placeholder="Add a description..."
 className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400"
 />
 <button
 onClick={() => handleSaveEdit(file.id)}
 className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
 >
 <Check size={16} />
 </button>
 <button
 onClick={() => setEditingId(null)}
 className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
 >
 <X size={16} />
 </button>
 </div>
 </div>
 ) : file.description ? (
 <p className="text-sm text-slate-500 mt-1">{file.description}</p>
 ) : null}
 </div>
 </div>
 </Card>
 );
 })}
 </div>
 )}

 {/* Upload modal */}
 {showUploadModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
 <div className="flex items-center justify-between p-5 border-b border-slate-200">
 <h3 className="font-semibold text-slate-800">Upload Files</h3>
 <button
 onClick={() => { setShowUploadModal(false); setPendingFiles([]); }}
 className="p-1 text-slate-400 hover:text-slate-600 rounded"
 >
 <X size={18} />
 </button>
 </div>
 <div className="p-5 space-y-4">
 <div>
 <p className="text-sm font-medium text-slate-700 mb-1">
 {pendingFiles.length} file{pendingFiles.length !== 1 ?"s":""} selected
 </p>
 <ul className="space-y-1">
 {pendingFiles.map((f, i) => (
 <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
 <File size={14} className="flex-shrink-0"/>
 <span className="truncate">{f.name}</span>
 <span className="text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
 </li>
 ))}
 </ul>
 </div>

 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Category
 </label>
 <select
 value={uploadForm.category}
 onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}
 className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
 >
 {CATEGORIES.map(c => (
 <option key={c.value} value={c.value}>{c.label}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Description (optional)
 </label>
 <input
 value={uploadForm.description}
 onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
 placeholder="e.g. Service contract template for new clients"
 className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400"
 />
 </div>

 {uploadError && (
 <p className="text-sm text-red-600">{uploadError}</p>
 )}
 </div>
 <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
 <button
 onClick={() => { setShowUploadModal(false); setPendingFiles([]); }}
 className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
 >
 Cancel
 </button>
 <button
 onClick={handleUpload}
 disabled={uploading}
 className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
 >
 {uploading ? <Spinner /> : <Upload size={15} />}
 {uploading ?"Uploading...":"Upload"}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
