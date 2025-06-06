from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from tempfile import NamedTemporaryFile
from typing import List
import fitz
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

GEMINI_API_KEY = ""

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
genai.configure(api_key=GEMINI_API_KEY)

model = SentenceTransformer('all-MiniLM-L6-v2')
index = None
texts = []

def extract_text_from_pdf(file_path):
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def chunk_text(text, max_tokens=500):
    paragraphs = text.split("\n")
    chunks, chunk = [], ""
    for para in paragraphs:
        if len(chunk) + len(para) < max_tokens:
            chunk += para + " "
        else:
            chunks.append(chunk.strip())
            chunk = para
    if chunk:
        chunks.append(chunk.strip())
    return chunks

def get_embeddings(texts: List[str]) -> List[List[float]]:
    return model.encode(texts).tolist()

def create_index(embeddings):
    dim = len(embeddings[0])
    faiss_index = faiss.IndexFlatL2(dim)
    faiss_index.add(np.array(embeddings).astype("float32"))
    return faiss_index

def search_index(query: str):
    q_embed = model.encode([query])[0]
    D, I = index.search(np.array([q_embed]).reshape(1, -1).astype("float32"), k=3)
    return [texts[i] for i in I[0]]

def generate_answer(query: str, context_chunks: List[str]):
    context = "\n".join(context_chunks)
    prompt = f"""You are a helpful assistant. Use the context to answer the question.

Context:
{context}

Question: {query}
Answer:"""
    gmodel = genai.GenerativeModel("gemini-2.0-flash")
    response = gmodel.generate_content(prompt)
    return response.text

# === Routes ===
@app.post("/upload")
async def upload_file(file: UploadFile):
    global index, texts
    with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    raw_text = extract_text_from_pdf(tmp_path)
    texts = chunk_text(raw_text)
    embeds = get_embeddings(texts)
    index = create_index(embeds)

    return {"message": "Document processed and indexed."}

@app.post("/ask")
async def ask_question(q: str = Form(...)):
    if not index:
        return JSONResponse(status_code=400, content={"error": "No document uploaded yet."})
    top_chunks = search_index(q)
    answer = generate_answer(q, top_chunks)
    return {"answer": answer}

@app.get("/")
async def root():
    return "Welcome to DocChat! Use POST /upload to send a PDF and POST /ask to ask questions."