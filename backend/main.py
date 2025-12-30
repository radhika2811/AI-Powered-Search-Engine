from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict

import google.generativeai as genai

# --- Import Your Extractors ---
from extractors.pdf_extractor import extract_pdf_text
from extractors.docx_extractor import extract_docx_text
from extractors.text_extractor import extract_text_file
from extractors.csv_extractor import extract_csv_text
from extractors.json_extractor import extract_json_text

app = FastAPI()

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GOOGLE_API_KEY = "AIzaSyBrZTKyP1y9XSYs6CacYhL1CpoKjZVLDbs"
genai.configure(api_key=GOOGLE_API_KEY)

# -------------------------------------
# GLOBAL MEMORY TO STORE ALL DOC TEXTS
# -------------------------------------
all_uploaded_texts = []
all_uploaded_previews = []


# -------------------------------------
# Helper: Ask Gemini
# -------------------------------------
def query_gemini(question: str, context: str):
    prompt = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt)
    return response.text

# -------------------------------------
# NEW HELPER: Query Transformation
# -------------------------------------
def _get_standalone_query(chat_history: List[Dict], follow_up_question: str) -> str:
    """
    Rewrites a follow-up question into a standalone question using chat history.
    """
    # Format the chat history into a simple string
    history_str = ""
    for turn in chat_history:
        # Using .get() to be safe if keys differ slightly
        q = turn.get('question', '')
        a = turn.get('answer', '')
        history_str += f"User: {q}\nAI: {a}\n"

    prompt = f"""Given the following chat history and a new user question, rewrite the user's question to be a standalone question that can be understood without the history. If the question is already standalone, just return it as is.

Chat History:
{history_str}

User Question:
{follow_up_question}

Standalone Question:"""

    try:
        # Use a fast model for this lightweight task
        model = genai.GenerativeModel("gemini-1.5-flash") 
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error in query transformation: {e}")
        return follow_up_question # Fallback to original if error
  
    
# -------------------------------------
# UPLOAD ENDPOINT
# -------------------------------------
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        content_type = file.content_type.lower()

        # Detect & extract file type
        if content_type == "application/pdf":
            text = extract_pdf_text(file_bytes)

        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            text = extract_docx_text(file_bytes)

        elif content_type.startswith("text/") or file.filename.endswith(".txt"):
            text = extract_text_file(file_bytes)

        elif file.filename.endswith(".csv"):
            text = extract_csv_text(file_bytes)

        elif file.filename.endswith(".json"):
            text = extract_json_text(file_bytes)

        else:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unsupported file type: {file.content_type}"},
            )

        # Store full text & preview
        all_uploaded_texts.append(text)
        preview = text[:8000]
        all_uploaded_previews.append(preview)

        return {"text": preview}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# -------------------------------------
# Request Model for SEARCH Endpoint
# -------------------------------------
class ChatTurn(BaseModel):
    question: str
    answer: str

class SearchRequest(BaseModel):
    question: str
    fileTexts: list[str]
    selectedFiles: list[int]
    chatHistory: List[ChatTurn] = [] # <--- Add this with default empty list


# -------------------------------------
# SEARCH ENDPOINT
# -------------------------------------
@app.post("/search")
async def search(req: SearchRequest):
    try:
        question = req.question
        file_texts = req.fileTexts
        selected = req.selectedFiles
        chat_history = req.chatHistory # <--- Get the history

        # -----------------------------------------------
        # 1. CONTEXTUAL AWARENESS (NEW STEP)
        # -----------------------------------------------
        # If we have history, rewrite the question to be "standalone"
        final_question = question
        if chat_history:
            print(f"Original Query: {question}")
            final_question = _get_standalone_query([t.dict() for t in chat_history], question)
            print(f"Rewritten Query: {final_question}")
        
        # -----------------------------------------------
        # CASE A → NO DOCUMENTS UPLOADED → NORMAL SEARCH
        # -----------------------------------------------
        if len(file_texts) == 0:
            answer = query_gemini(
                final_question, # <--- Use final_question
                context="No documents provided. Answer normally."
            )
            return {
                "answer": answer,
                "mode": "general"
            }

        # -----------------------------------------------
        # CASE B → DOCUMENTS EXIST → PERSONALIZED SEARCH
        # -----------------------------------------------

        # No checkbox selected → use ALL uploaded docs
        if len(selected) == 0:
            context = "\n\n".join(file_texts)

        # Use selected documents only
        else:
            context = "\n\n".join(file_texts[i] for i in selected)

        answer = query_gemini(final_question, context) # <--- Use final_question
        return {
            "answer": answer,
            "mode": "document"
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
# -------------------------------------
# OLD ASK ENDPOINT (Optional)
# -------------------------------------
@app.post("/ask")
async def ask_question(question: str = Form(...), context: str = Form(...)):
    try:
        answer = query_gemini(question, context)
        return {"answer": answer}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
