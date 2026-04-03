import { useState } from"react";
import { useQuery } from"@tanstack/react-query";
import { Paperclip, X, File, FileText, Image, Check, FolderOpen, ChevronDown, ChevronUp } from"lucide-react";

interface BusinessFile {
 id: string;
 originalName: string;
 fileType: string;
 fileSize: number;
 category: string;
 description: string;
}

interface Props {
 selectedFileIds: string[];
 onChange: (ids: string[]) => void;
 dark?: boolean;
}

function formatBytes(bytes: number): string {
 if (bytes === 0) return"0 B";
 const k = 1024;
 const sizes = ["B","KB","MB"];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) +""+ sizes[i];
}

function getFileIcon(fileType: string) {
 if (fileType.startsWith("image/")) return Image;
 if (fileType ==="application/pdf"|| fileType.includes("document") || fileType.includes("word")) return FileText;
 return File;
}

export default function FileAttachmentPicker({ selectedFileIds, onChange, dark = false }: Props) {
 const [open, setOpen] = useState(false);

 const { data: files = [], isLoading } = useQuery<BusinessFile[]>({
 queryKey: ["/api/files"],
 });

 const toggle = (id: string) => {
 if (selectedFileIds.includes(id)) {
 onChange(selectedFileIds.filter(x => x !== id));
 } else {
 onChange([...selectedFileIds, id]);
 }
 };

 const remove = (id: string) => onChange(selectedFileIds.filter(x => x !== id));

 const selectedFiles = files.filter(f => selectedFileIds.includes(f.id));

 if (dark) {
 return (
 <div>
 {/* Attach button + selected pills row */}
 <div className="flex items-center gap-2 flex-wrap">
 <button
 type="button"
 onClick={() => setOpen(!open)}
 className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
 >
 <Paperclip className="w-3.5 h-3.5"/>
 {selectedFileIds.length === 0 ?"Attach file from library": `${selectedFileIds.length} attached`}
 {open ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
 </button>
 {selectedFiles.map(f => (
 <span
 key={f.id}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
 style={{ background:"rgba(255,255,255,0.1)", color:"#cbd5e1"}}
 >
 <File className="w-3 h-3"/>
 {f.originalName.length > 20 ? f.originalName.slice(0, 20) +"…": f.originalName}
 <button onClick={() => remove(f.id)} className="ml-0.5 hover:text-white">
 <X className="w-3 h-3"/>
 </button>
 </span>
 ))}
 </div>

 {/* Expandable file list */}
 {open && (
 <div
 className="mt-3 rounded-xl overflow-hidden"
 style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)"}}
 >
 {isLoading ? (
 <p className="text-xs text-slate-400 p-4">Loading files...</p>
 ) : files.length === 0 ? (
 <div className="p-4 text-center">
 <FolderOpen className="w-6 h-6 text-slate-600 mx-auto mb-1"/>
 <p className="text-xs text-slate-500">No files in library yet.</p>
 <p className="text-xs text-slate-600 mt-0.5">Upload files in the File Library to attach them to emails.</p>
 </div>
 ) : (
 <div className="divide-y"style={{ borderColor:"rgba(255,255,255,0.08)"}}>
 {files.map(f => {
 const FileIcon = getFileIcon(f.fileType);
 const isSelected = selectedFileIds.includes(f.id);
 return (
 <button
 key={f.id}
 type="button"
 onClick={() => toggle(f.id)}
 className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
 >
 <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
 isSelected ?"bg-primary-600 border-primary-600":"border-slate-600"
 }`}>
 {isSelected && <Check className="w-3 h-3 text-white"/>}
 </div>
 <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0"/>
 <div className="flex-1 min-w-0">
 <p className="text-xs text-slate-200 truncate">{f.originalName}</p>
 {f.description ? <p className="text-xs text-slate-500 truncate">{f.description}</p> : null}
 </div>
 <span className="text-xs text-slate-600 flex-shrink-0">{formatBytes(f.fileSize)}</span>
 </button>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>
 );
 }

 // Light mode variant
 return (
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <button
 type="button"
 onClick={() => setOpen(!open)}
 className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
 >
 <Paperclip className="w-4 h-4"/>
 {selectedFileIds.length === 0 ?"Attach from library": `${selectedFileIds.length} file${selectedFileIds.length !== 1 ?"s":""} attached`}
 {open ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
 </button>
 {selectedFiles.map(f => (
 <span
 key={f.id}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-700 border border-primary-200"
 >
 <File className="w-3 h-3"/>
 {f.originalName.length > 20 ? f.originalName.slice(0, 20) +"…": f.originalName}
 <button onClick={() => remove(f.id)} className="ml-0.5 hover:text-primary-900">
 <X className="w-3 h-3"/>
 </button>
 </span>
 ))}
 </div>

 {open && (
 <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-white">
 {isLoading ? (
 <p className="text-sm text-slate-400 p-4">Loading files...</p>
 ) : files.length === 0 ? (
 <div className="p-4 text-center">
 <FolderOpen className="w-6 h-6 text-slate-300 mx-auto mb-1"/>
 <p className="text-sm text-slate-500">No files in library.</p>
 <p className="text-xs text-slate-400 mt-0.5">Upload files in the File Library first.</p>
 </div>
 ) : (
 <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
 {files.map(f => {
 const FileIcon = getFileIcon(f.fileType);
 const isSelected = selectedFileIds.includes(f.id);
 return (
 <button
 key={f.id}
 type="button"
 onClick={() => toggle(f.id)}
 className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
 isSelected ?"bg-primary-50":"hover:bg-slate-50"
 }`}
 >
 <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
 isSelected ?"bg-primary-600 border-primary-600":"border-slate-300"
 }`}>
 {isSelected && <Check className="w-2.5 h-2.5 text-white"/>}
 </div>
 <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0"/>
 <div className="flex-1 min-w-0">
 <p className="text-sm text-slate-700 truncate">{f.originalName}</p>
 {f.description ? <p className="text-xs text-slate-400 truncate">{f.description}</p> : null}
 </div>
 <span className="text-xs text-slate-400 flex-shrink-0">{formatBytes(f.fileSize)}</span>
 </button>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>
 );
}
