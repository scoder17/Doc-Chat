import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setStatus("Uploading...");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post("http://localhost:8000/upload", formData);
      setStatus("File uploaded and processed!");
    } catch {
      setStatus("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question) return;
    const q = question;
    setChat((prev) => [...prev, { sender: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const form = new FormData();
      form.append("q", q);
      const res = await axios.post("http://localhost:8000/ask", form);
      const a = res.data.answer;
      setChat((prev) => [...prev, { sender: "bot", text: a }]);
    } catch {
      setChat((prev) => [...prev, { sender: "bot", text: "Error getting response." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 text-lg font-semibold text-center">
        📄 DocChat — Chat with Your PDF
      </header>

      <main className="flex-1 overflow-auto p-4 space-y-4">
        {chat.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`px-4 py-2 rounded-2xl max-w-xl shadow-md ${
                msg.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-700"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-center text-gray-400">Thinking...</div>}
        <div ref={bottomRef} />
      </main>

      <footer className="bg-gray-800 p-4">
        <form onSubmit={ask} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 bg-gray-700 p-2 rounded-lg border border-gray-600"
          />
          <button
            type="submit"
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            Send
          </button>
        </form>

        <form onSubmit={handleUpload} className="mt-4 flex items-center gap-2">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-sm text-gray-300"
          />
          <button type="submit" className="bg-green-600 px-3 py-1 rounded hover:bg-green-700">
            Upload PDF
          </button>
          <span className="text-sm text-blue-400">{status}</span>
        </form>
      </footer>
    </div>
  );
}