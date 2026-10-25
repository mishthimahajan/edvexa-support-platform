
import { useState } from "react";
import { api } from "../api/client";
import { BookOpen, Upload, Search, Send } from "lucide-react";

type SearchResult = {
  id?: string;
  content?: string;
  text?: string;
  filename?: string;
  document?: { filename?: string };
};

export default function KnowledgeBase() {
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF or TXT file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/knowledge/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(response.data.message ?? "Document uploaded successfully.");
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Document upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function searchDocuments(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/knowledge/search", {
        params: { q: query },
      });
      const data = response.data;
      setResults(Array.isArray(data) ? data : data.results ?? data.chunks ?? []);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Document search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const response = await api.post("/knowledge/answer", { question });
      setAnswer(response.data.answer ?? response.data.text ?? "");
      setSources(response.data.sources ?? []);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not answer that question.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="knowledge-page">
      <header className="knowledge-heading">
        <div>
          <p className="eyebrow">SUPPORT RESOURCES</p>
          <h1><BookOpen size={27} /> Knowledge Base</h1>
          <p>Upload support documents and find answers from your knowledge.</p>
        </div>
      </header>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-box">{error}</p>}

      <section className="panel knowledge-panel">
        <h2><Upload size={19} /> Upload a document</h2>
        <p>Supported formats: PDF and TXT.</p>
        <form onSubmit={uploadDocument}>
          <input
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
          <button disabled={loading || !file}>
            {loading ? "Please wait..." : "Upload document"}
          </button>
        </form>
      </section>

      <section className="panel knowledge-panel">
        <h2><Search size={19} /> Search documents</h2>
        <form onSubmit={searchDocuments}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search password reset, billing..."
            required
          />
          <button disabled={loading || !query.trim()}>Search</button>
        </form>

        {results.map((item, index) => (
          <article className="knowledge-result" key={item.id ?? index}>
            <strong>{item.filename ?? item.document?.filename ?? "Document excerpt"}</strong>
            <p>{item.content ?? item.text ?? JSON.stringify(item)}</p>
          </article>
        ))}
        {!results.length && <p className="empty-state">Search results will appear here.</p>}
      </section>

      <section className="panel knowledge-panel">
        <h2><Send size={19} /> Ask the knowledge base</h2>
        <form onSubmit={askQuestion}>
          <textarea
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="How can a customer reset their password?"
            required
          />
          <button disabled={loading || !question.trim()}>
            {loading ? "Generating answer..." : "Ask question"}
          </button>
        </form>

        {answer && (
          <div className="knowledge-answer">
            <h3>Answer</h3>
            <p>{answer}</p>
            <h3>Sources</h3>
            {sources.length ? (
              <ul>
                {sources.map((source, index) => (
                  <li key={index}>{JSON.stringify(source)}</li>
                ))}
              </ul>
            ) : (
              <p>No source references were returned.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
