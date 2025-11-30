import { useState, useRef, Dispatch, SetStateAction } from "react";
import {
  Upload,
  Cpu,
  Zap,
  FileText,
  Trash2,
  FileJson,
  File,
  FileSpreadsheet,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  content: string;
  source: string;
}

interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  feedback: "up" | "down" | null;
}

/* ---------------- PDF DOWNLOAD ---------------- */
/* ---------------- PDF DOWNLOAD ---------------- */
function downloadPDF() {
  const element = document.getElementById("chat-container");
  if (!element) return;

  // @ts-ignore – because html2pdf comes from CDN
  html2pdf()
    .set({
      margin: 10,
      filename: "search_history.pdf",
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
}

/* ---------------- HIGHLIGHTING ---------------- */
function highlightSentences(answer: string, question: string) {
  if (!question.trim()) return answer;

  const q = question.toLowerCase();
  const importantWords = q.split(/\s+/).filter((w) => w.length > 3);
  const sentences = answer.match(/[^.!?]+[.!?]?/g) || [answer];

  function score(sentence: string) {
    const s = sentence.toLowerCase();
    let score = 0;
    importantWords.forEach((word) => {
      if (s.includes(word)) score += 2;
    });
    if (q.includes("definition") && s.includes("meaning")) score += 2;
    if (q.includes("what") && s.includes("is")) score += 1;
    return score;
  }

  return sentences
    .map((sentence) => {
      const sc = score(sentence);
      if (sc >= 2) {
        // Removed py-0.5 to fix PDF overlap issue
        return `<mark class="bg-yellow-200 px-1 rounded-md">${sentence}</mark>`;
      }
      return sentence;
    })
    .join(" ");
}

/* ---------------- SIDEBAR ICONS ---------------- */
interface SidebarProps {
  filePreviews: {
    name: string;
    size?: number;
    type?: string;
    preview?: string;
  }[];
  selectedFiles: number[];
  setSelectedFiles: Dispatch<SetStateAction<number[]>>;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  deleteFile: (index: number) => void;
}

function FileIconWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-6 h-6 flex items-center justify-center shrink-0">
      {children}
    </div>
  );
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "pdf":
      return (
        <FileIconWrapper>
          <FileText className="w-5 h-5 text-red-500" strokeWidth={1.5} />
        </FileIconWrapper>
      );
    case "doc":
    case "docx":
      return (
        <FileIconWrapper>
          <FileText className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
        </FileIconWrapper>
      );
    case "txt":
      return (
        <FileIconWrapper>
          <FileText className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
        </FileIconWrapper>
      );
    case "csv":
      return (
        <FileIconWrapper>
          <FileSpreadsheet
            className="w-5 h-5 text-green-600"
            strokeWidth={1.5}
          />
        </FileIconWrapper>
      );
    case "json":
      return (
        <FileIconWrapper>
          <FileJson className="w-5 h-5 text-orange-500" strokeWidth={1.5} />
        </FileIconWrapper>
      );
    default:
      return (
        <FileIconWrapper>
          <File className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
        </FileIconWrapper>
      );
  }
}

export function Sidebar({
  filePreviews,
  selectedFiles,
  setSelectedFiles,
  isOpen,
  setIsOpen,
  deleteFile,
}: SidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const isResizing = useRef(false);

  const startResizing = () => {
    isResizing.current = true;
    document.addEventListener("mousemove", resizeSidebar);
    document.addEventListener("mouseup", stopResizing);
  };

  const resizeSidebar = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.min(Math.max(e.clientX, 80), 420);
    setSidebarWidth(newWidth);
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", resizeSidebar);
    document.removeEventListener("mouseup", stopResizing);
  };

  return (
    <div
      className="fixed top-0 left-0 h-full bg-white shadow-xl border-r border-gray-200 transition-all duration-200 z-50 flex"
      style={{ width: isOpen ? sidebarWidth : 56 }}
    >
      <div className="p-3 w-full relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-6 bg-brand-500 text-white rounded-full p-1 shadow-md"
        >
          {isOpen ? "◀" : "▶"}
        </button>

        {isOpen && (
          <h2 className="text-lg font-bold text-brand-700 mb-4">
            Documents Uploaded
          </h2>
        )}

        <div className="space-y-3 overflow-y-auto max-h-[85vh] pr-2">
          {filePreviews.map((file, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between gap-3 p-2 rounded-md transition
              ${selectedFiles.includes(idx) ? "bg-brand-50" : "bg-gray-50 hover:bg-gray-100"}`}
            >
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(idx)}
                  onChange={(e) =>
                    setSelectedFiles((prev: number[]) =>
                      e.target.checked
                        ? [...prev, idx]
                        : prev.filter((i) => i !== idx)
                    )
                  }
                  className="w-4 h-4 min-w-4 min-h-4 appearance-none border border-gray-400 rounded-sm checked:bg-brand-600 checked:border-brand-600 cursor-pointer flex-shrink-0"
                />

                {getFileIcon(file.name)}

                {isOpen && (
                  <span className="text-sm font-medium truncate">
                    {file.name}
                  </span>
                )}
              </div>

              <button
                onClick={() => deleteFile(idx)}
                className="p-1 text-gray-500 hover:text-red-600 transition shrink-0"
                title="Delete file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {isOpen && (
        <div
          onMouseDown={startResizing}
          className="w-1 cursor-ew-resize bg-transparent hover:bg-gray-300 transition"
        />
      )}
    </div>
  );
}

/* ---------------- MAIN PAGE ---------------- */
export default function Index() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState(0);
  const [filePreviews, setFilePreviews] = useState<
    { name: string; size: number; type: string; preview?: string }[]
  >([]);
  const [fileTexts, setFileTexts] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const getCardColor = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "pdf":
        return "bg-rose-50";
      case "doc":
      case "docx":
        return "bg-indigo-50";
      case "txt":
        return "bg-gray-50";
      case "csv":
        return "bg-emerald-50";
      case "json":
        return "bg-amber-50";
      default:
        return "bg-white";
    }
  };

  const handleFeedback = async (index: number, type: "up" | "down") => {
    const chat = chatHistory[index];

    // 1. Optimistic UI Update
    const newHistory = [...chatHistory];
    if (newHistory[index].feedback === type) {
      newHistory[index].feedback = null;
    } else {
      newHistory[index].feedback = type;
    }
    setChatHistory(newHistory);

    // 2. Send to Backend
    try {
      await fetch("http://127.0.0.1:8000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: chat.id,
          feedback_type: type,
          question: chat.question,
          answer: chat.answer,
        }),
      });
    } catch (err) {
      console.error("Failed to send feedback", err);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const uploadedPreviewData: {
      name: string;
      size: number;
      type: string;
      preview?: string;
    }[] = [];
    const uploadedTexts: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://127.0.0.1:8000/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        uploadedPreviewData.push({
          name: file.name,
          size: file.size,
          type: file.type || "Unknown",
          preview: data.text?.slice(0, 400) || "",
        });
        uploadedTexts.push(data.text || "");
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
        alert(`Error uploading ${file.name}. Check backend logs for details.`);
      }
    }

    setFilePreviews((prev) => [...prev, ...uploadedPreviewData]);
    setFileTexts((prev) => [...prev, ...uploadedTexts]);
    setUploadedFiles((prev) => prev + uploadedPreviewData.length);
  };

  const removeFile = (index: number) => {
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
    setFileTexts((prev) => prev.filter((_, i) => i !== index));
    setUploadedFiles((prev) => Math.max(0, prev - 1));
  };

  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) {
      alert("Please enter a question.");
      return;
    }

    setIsSearching(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          selectedFiles: selectedFiles,
          fileTexts: fileTexts,
          chatHistory: [...chatHistory].reverse(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        question: query,
        answer: data.answer,
        feedback: null,
      };

      // Update History
      setChatHistory((prev) => [newMsg, ...prev]);

      // Update Results (keeping this for backward compatibility if used elsewhere, though history is main)
      const newResult = {
        id: (results.length + 1).toString(),
        content: data.answer,
        source:
          selectedFiles.length === 0
            ? "All Documents"
            : `Selected Documents (${selectedFiles.length})`,
      };
      setResults((prev) => [newResult, ...prev]);

      setQuery("");
    } catch (err) {
      console.error(err);
      alert("Error fetching AI response");
    } finally {
      setIsSearching(false);
    }
  };

  /* ---------------- Helpers ---------------- */
  const truncateFileName = (name: string, maxBaseLength = 32) => {
    if (!name) return "";
    if (name.length <= maxBaseLength + 6) return name;
    const parts = name.split(".");
    const extension = parts.length > 1 ? `.${parts.pop()}` : "";
    const base = parts.join(".");
    const trimmedBase = base.slice(0, maxBaseLength);
    return `${trimmedBase}...${extension}`;
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-semantic-secondary transition-all duration-300"
      style={{ marginLeft: isSidebarOpen ? "256px" : "56px" }}
    >
      <Sidebar
        filePreviews={filePreviews}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        deleteFile={removeFile}
      />

      <header className="border-b border-brand-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-500 rounded-lg">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                SemanticSearch
              </h1>
              <p className="text-sm text-gray-600">
                AI-Powered Multi-Document Analysis
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="bg-brand-100 text-brand-700">
            {uploadedFiles} Document{uploadedFiles !== 1 ? "s" : ""} Indexed
          </Badge>
        </div>
      </header>

      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Beyond Keywords.{" "}
              <span className="bg-gradient-to-r from-brand-500 to-semantic-accent bg-clip-text text-transparent">
                Across All Your Documents.
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Upload multiple files and ask questions naturally. Our AI
              understands context across all formats — not just words.
            </p>

            <div className="bg-white rounded-2xl shadow-xl border border-brand-200 p-8 mb-12">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Ask something about your documents..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-4 pr-4 py-6 text-lg border-2 border-brand-200 focus:border-brand-500 rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !query.trim()}
                  className="px-8 py-6 text-lg bg-brand-500 hover:bg-brand-600 rounded-xl"
                >
                  {isSearching ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Searching...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5" />
                      <span>Search</span>
                    </div>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center space-x-2 px-6 py-3 bg-brand-50 hover:bg-brand-100 rounded-lg border-2 border-dashed border-brand-300 transition-colors">
                    <Upload className="h-5 w-5 text-brand-600" />
                    <span className="text-brand-700 font-medium">
                      Upload Multiple PDF / DOCX / TXT / CSV / JSON
                    </span>
                  </div>
                </label>
              </div>

              {filePreviews.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filePreviews.map((file, idx) => {
                    return (
                      <div
                        key={idx}
                        className={`relative border border-brand-200 rounded-lg p-4 shadow-sm flex flex-col gap-2 ${getCardColor(file.name)}`}
                      >
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute top-3 right-3 text-gray-500 hover:text-red-500 transition"
                          aria-label={`Delete ${file.name}`}
                        >
                          ×
                        </button>

                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gray-100 shrink-0">
                            {getFileIcon(file.name)}
                          </div>

                          <div className="flex-1 min-w-0 pr-8">
                            <h4 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 break-words">
                              {truncateFileName(file.name, 40)}
                            </h4>
                            <p className="text-xs text-gray-500 truncate">
                              {file.type} • {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>

                        <div
                          className="text-gray-700 text-sm whitespace-pre-line overflow-hidden"
                          style={{ maxHeight: 80 }}
                        >
                          {file.preview}
                        </div>

                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(idx)}
                          onChange={(e) =>
                            setSelectedFiles((prev: number[]) =>
                              e.target.checked
                                ? [...prev, idx]
                                : prev.filter((i) => i !== idx)
                            )
                          }
                          className="absolute bottom-3 right-3 w-4 h-4 cursor-pointer"
                          aria-label={`Select ${file.name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {chatHistory.length > 0 && (
              <div id="chat-container" className="space-y-4 text-left">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Search History
                  </h3>
                  <button
                    onClick={downloadPDF}
                    className="px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg shadow hover:bg-brand-600 transition"
                  >
                    Download Chat History
                  </button>
                </div>

                {chatHistory.map((chat, idx) => (
                  <Card key={idx} className="border-brand-200">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-brand-600 text-base">
                        Q: {chat.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p
                        className="text-gray-700 leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{
                          __html: highlightSentences(
                            chat.answer,
                            chat.question
                          ),
                        }}
                      />

                      {/* --- FEEDBACK SECTION START --- */}
                      <div className="mt-4 flex items-center gap-2 border-t pt-3">
                        <span className="text-xs text-gray-400 font-medium">
                          Was this helpful?
                        </span>

                        <button
                          onClick={() => handleFeedback(idx, "up")}
                          className={`p-1.5 rounded-md transition-colors ${
                            chat.feedback === "up"
                              ? "bg-green-100 text-green-600"
                              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleFeedback(idx, "down")}
                          className={`p-1.5 rounded-md transition-colors ${
                            chat.feedback === "down"
                              ? "bg-red-100 text-red-600"
                              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                      {/* --- FEEDBACK SECTION END --- */}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// To run the app -
// 1. Open terminal
// 2. cd backend
// 3. uvicorn main:app --reload
// 4. open new terminal
// 5. npm run dev
