import os
import json
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import httpx
from dotenv import load_dotenv

# Import database helpers
from database import get_state, save_state, init_db

# Load local .env if present
load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("msdk3-backend")

app = FastAPI(title="MSDK3 Job Application AI Assistant")

# Initialize database
init_db()

# Default mock state to seed the database if it is empty
DEFAULT_MOCK_CV = {
  "personal": {
    "fullname": "M. Sadiq",
    "title": "Senior AI Solutions Engineer",
    "email": "m.sadiq@example.com",
    "phone": "+966 50 123 4567",
    "website": "https://github.com/msadiq",
    "summary": "Driven AI engineer with 6+ years of experience building autonomous agents, integrating large language models, and developing highly responsive web interfaces. Specialized in orchestrating Gemini and Claude APIs to automate complex enterprise workflows."
  },
  "experience": [
    {
      "id": "exp-1",
      "company": "NeuralFlow Technologies",
      "role": "Lead AI Engineer",
      "dates": "2024 - Present",
      "bullets": [
        "Designed and deployed a multi-agent system using Gemini API that automated customer support classification, reducing response latency by 40%.",
        "Built full-stack React dashboards featuring real-time analytics for monitoring agentic workflow health and tokens performance.",
        "Collaborated with product teams to design robust prompt engineering frameworks that increased structured output accuracy by 25%."
      ]
    },
    {
      "id": "exp-2",
      "company": "AppForge Solutions",
      "role": "Senior Software Engineer",
      "dates": "2020 - 2024",
      "bullets": [
        "Developed scalable REST APIs using Node.js and Express that served over 100k daily active users.",
        "Led the migration of a legacy monolithic platform into modular microservices, enhancing system uptime to 99.9%.",
        "Implemented modern UI/UX design components using Vanilla CSS and React, improving Core Web Vitals score by 15 points."
      ]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "school": "King Fahd University of Petroleum and Minerals",
      "degree": "B.S. in Computer Science",
      "dates": "2016 - 2020"
    }
  ],
  "skills": ["Python", "JavaScript", "Google Gemini API", "Claude API", "React", "Node.js", "AI Agents", "SQL", "CSS Grid/Flexbox", "Git"]
}

DEFAULT_MOCK_APPLICATIONS = [
  {
    "id": "app-mock-1",
    "company": "Google DeepMind",
    "title": "Senior Machine Learning Engineer",
    "url": "https://careers.google.com/jobs/deepmind",
    "dateAdded": "2026-06-01",
    "status": "wishlist",
    "planType": "Auto-Apply Ready",
    "tailoredCv": {
      "bullets": [
        {
          "jobTitle": "Lead AI Engineer (NeuralFlow)",
          "bullets": [
            "Architected state-of-the-art multi-agent pipelines leveraging Gemini Pro models, boosting task-completion rates to 94%.",
            "Implemented custom prompt validation logic that eliminated hallucinations in LLM structured outputs."
          ]
        }
      ]
    },
    "coverLetter": "Dear Hiring Team at Google DeepMind,\n\nI am writing to express my strong interest in the Senior Machine Learning Engineer role. With my background in orchestrating multi-agent systems and utilizing the Gemini API at NeuralFlow, I am excited about the opportunity to contribute to DeepMind's state-of-the-art AI systems.\n\nI look forward to discussing how my experience fits your goals.\n\nSincerely,\nM. Sadiq",
    "prepQuestions": [
      {
        "q": "How do you handle latency when querying LLMs in a production workflow?",
        "a": "I utilize asynchronous task queues and prompt caching mechanisms. When using Gemini, I employ streaming responses to start updating the UI immediately."
      }
    ]
  },
  {
    "id": "app-mock-2",
    "company": "Stripe",
    "title": "Full Stack AI Developer",
    "url": "https://stripe.com/jobs",
    "dateAdded": "2026-06-03",
    "status": "applied",
    "planType": "Manual",
    "tailoredCv": {
      "bullets": [
        {
          "jobTitle": "Senior Software Engineer (AppForge)",
          "bullets": [
            "Spearheaded integration of LLM-based assistants inside transaction dashboards, streamlining merchant invoice operations.",
            "Optimized CSS and JavaScript delivery bundles to ensure smooth transitions and micro-animations."
          ]
        }
      ]
    },
    "coverLetter": "Dear Stripe Recruiting Team,\n\nI am thrilled to apply for the Full Stack AI Developer position. I have a long history of writing secure Node.js integrations alongside clean, responsive CSS frontends. Combining this full-stack knowledge with LLM integrations makes this role a perfect fit.\n\nBest regards,\nM. Sadiq",
    "prepQuestions": [
      {
        "q": "Why Stripe?",
        "a": "Stripe is the gold standard for web engineering. Integrating intelligent automation and LLMs into payment products is the next frontier of developer enablement."
      }
    ]
  }
]

DEFAULT_STATE = {
    "masterCv": DEFAULT_MOCK_CV,
    "applications": DEFAULT_MOCK_APPLICATIONS,
    "settings": {
        "provider": "mock",
        "apiKey": os.getenv("GEMINI_API_KEY", ""),
        "model": "gemini-2.5-flash"
    }
}

# Helper to get API Key and Model from saved settings
def get_api_credentials() -> tuple:
    state = get_state()
    if state and "settings" in state:
        settings = state["settings"]
        api_key = settings.get("apiKey", "").strip() or os.getenv("GEMINI_API_KEY", "").strip()
        model = settings.get("model", "gemini-2.5-flash").strip()
        return api_key, model
    return os.getenv("GEMINI_API_KEY", "").strip(), "gemini-2.5-flash"

@app.get("/api/state")
async def fetch_state():
    """Fetches the current application state from SQLite, seeding defaults if empty."""
    state = get_state()
    if not state:
        logger.info("Database empty, seeding default state.")
        save_state(DEFAULT_STATE)
        state = DEFAULT_STATE
    return state

@app.post("/api/state")
async def update_state(request: Request):
    """Saves the application state into the SQLite database."""
    try:
        data = await request.json()
        save_state(data)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error saving state: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid payload: {str(e)}")

@app.post("/api/ai/test-key")
async def test_key(request: Request):
    """Verifies a Gemini API key is valid."""
    try:
        body = await request.json()
        api_key = body.get("apiKey", "").strip()
        model = body.get("model", "gemini-2.5-flash").strip()
        
        if not api_key:
            return {"success": False, "message": "API Key is required."}
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json={"contents": [{"parts": [{"text": "Respond with OK."}]}]},
                timeout=10.0
            )
            
        if resp.status_code == 200:
            return {"success": True, "message": "API connection successful!"}
        else:
            try:
                err_data = resp.json()
                msg = err_data.get("error", {}).get("message", f"HTTP error {resp.status_code}")
            except Exception:
                msg = f"HTTP error {resp.status_code}"
            return {"success": False, "message": msg}
            
    except Exception as e:
        logger.error(f"Error testing key: {str(e)}")
        return {"success": False, "message": f"Network error: {str(e)}"}

@app.post("/api/ai/parse")
async def parse_resume(request: Request):
    """Extracts unstructured resume text into a structured JSON profile using Gemini."""
    try:
        body = await request.json()
        resume_text = body.get("resumeText", "")
        
        api_key, model = get_api_credentials()
        if not api_key:
            raise HTTPException(status_code=400, detail="Gemini API key is not configured in Settings.")
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        system_prompt = (
            "You are a professional resume parsing engine.\n"
            "Your task is to analyze the provided unstructured CV text and extract all details into a structured JSON object matching the candidate Master CV schema.\n"
            "Do not make up facts; extract only information present in the text.\n"
            "Always respond with valid JSON and do not wrap in markdown formatting."
        )
        
        prompt_text = f"""
{system_prompt}

Unstructured CV / Resume Text:
{resume_text}

Generate a JSON object matching this exact schema:
{{
  "personal": {{
    "fullname": "Extracted Full Name",
    "title": "Extracted Professional Title",
    "email": "Extracted Email Address",
    "phone": "Extracted Phone Number",
    "website": "Extracted Portfolio or LinkedIn Link",
    "summary": "Extracted or summarized professional intro pitch"
  }},
  "experience": [
    {{
      "id": "exp-1",
      "company": "Company Name",
      "role": "Role / Position Title",
      "dates": "Dates Employed (e.g. Jan 2022 - Present)",
      "bullets": [
        "Core accomplishment bullet point 1...",
        "Core accomplishment bullet point 2..."
      ]
    }}
  ],
  "education": [
    {{
      "id": "edu-1",
      "school": "School / University Name",
      "degree": "Degree / Field of study",
      "dates": "Graduation date or date range"
    }}
  ],
  "skills": ["skill1", "skill2", "skill3", "skill4"]
}}

Ensure all JSON values are correctly escaped. Output only the JSON."""

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt_text}]}],
                    "generationConfig": {"responseMimeType": "application/json"}
                },
                timeout=30.0
            )
            
        if resp.status_code != 200:
            try:
                err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
            except Exception:
                err_msg = f"HTTP status {resp.status_code}"
            raise HTTPException(status_code=resp.status_code, detail=f"Gemini API Error: {err_msg}")
            
        result = resp.json()
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        text = text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(text)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Gemini returned invalid JSON output.")
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/tailor")
async def tailor_resume(request: Request):
    """Tailors experience bullet points and drafts a cover letter for a target job details using Gemini."""
    try:
        body = await request.json()
        master_cv = body.get("masterCv", {})
        job_details = body.get("jobDetails", {})
        
        api_key, model = get_api_credentials()
        if not api_key:
            raise HTTPException(status_code=400, detail="Gemini API key is not configured in Settings.")
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        system_prompt = (
            "You are \"MSDK3 (RESUME AGENT)\", an expert AI Resume Tailoring Agent.\n"
            "Your objective is to adapt the candidate's Master CV to perfectly match the target Job Description.\n"
            "You must rewrite work experiences to highlight relevant skills, draft a customized cover letter, and generate interview preparation questions.\n"
            "Always respond in valid JSON format matching the schema below. Do not wrap the JSON output in markdown formatting (no code blocks)."
        )
        
        prompt_text = f"""
{system_prompt}

Candidate Master CV Data:
{json.dumps(master_cv, indent=2)}

Target Job Position: {job_details.get('title', '')} at {job_details.get('company', '')}
Target Job Listing URL: {job_details.get('url', 'N/A')}
Target Job Description:
{job_details.get('desc', '')}

Generate a JSON object matching this exact schema:
{{
  "matchScore": 85, // Integer (0 to 100) representing how well the candidate's master CV fits the job description. Be strict and realistic.
  "gapAnalysis": {{
    "matchedSkills": ["Skill in CV", "Another skill"], // Keywords/skills from the Job Description that the candidate already has in their Master CV
    "missingSkills": ["AWS", "Kubernetes"], // Required/preferred skills in the Job Description that are NOT mentioned in the candidate's Master CV
    "recommendations": "Add certification or highlight experience in project X to cover the missing AWS skills..." // Actionable advice to improve match score
  }},
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "bullets": [
    {{
      "jobTitle": "Lead AI Engineer (NeuralFlow Technologies)", // Use the company name and role from the candidate's experience list
      "bullets": [
        "A highly relevant rewritten achievement bullet point for this job...",
        "Another tailored achievement bullet point..."
      ]
    }}
  ],
  "coverLetter": "Dear [Hiring Manager / Team Name] at [Company]...\\n\\n[Paragraph 1: Pitch hook]\\n\\n[Paragraph 2: Explaining key alignment using work experience]\\n\\n[Paragraph 3: Call to action]\\n\\nSincerely,\\n{master_cv.get('personal', {}).get('fullname', '')}",
  "prepQuestions": [
    {{
      "q": "Anticipated screen question based on the job requirements?",
      "a": "Compelling answer showing how the candidate's Master CV answers this."
    }}
  ]
}}

Ensure all JSON strings are properly escaped. Do not output anything other than JSON."""

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt_text}]}],
                    "generationConfig": {"responseMimeType": "application/json"}
                },
                timeout=30.0
            )
            
        if resp.status_code != 200:
            try:
                err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
            except Exception:
                err_msg = f"HTTP status {resp.status_code}"
            raise HTTPException(status_code=resp.status_code, detail=f"Gemini API Error: {err_msg}")
            
        result = resp.json()
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        text = text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(text)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Gemini returned invalid JSON output.")
    except Exception as e:
        logger.error(f"Error tailoring CV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/search-jobs")
async def search_jobs(request: Request):
    """Executes a live search grounded by Google Search through Gemini to find active jobs."""
    try:
        body = await request.json()
        cv_title = body.get("cvTitle", "")
        location = body.get("location", "")
        cv_skills = body.get("cvSkills", [])
        
        api_key, model = get_api_credentials()
        if not api_key:
            raise HTTPException(status_code=400, detail="Gemini API key is not configured in Settings.")
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        prompt_text = f"""
You are a job search assistant. Your task is to find 4 real, active job openings matching:
Role Title: "{cv_title}"
Location preference: "{location}"

Search the web and extract matching vacancies. Compare each found vacancy against the candidate's skills list: {", ".join(cv_skills)}.
Return the vacancies in a JSON array of objects. Follow this exact schema:
[
  {{
    "title": "Exact Job Title",
    "company": "Company Name",
    "location": "Location (e.g. Remote or London, UK)",
    "url": "Active career page or listing URL",
    "desc": "Short 2-sentence description of the role requirements...",
    "matchScore": 85, // Integer representing fit against the candidate's skills
    "source": "LinkedIn" // e.g. LinkedIn, Google Jobs, Corporate Careers
  }}
]

Ensure the JSON output is valid and do not wrap in markdown formatting."""

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt_text}]}],
                    "tools": [{"googleSearch": {}}],
                    "generationConfig": {"responseMimeType": "application/json"}
                },
                timeout=30.0
            )
            
        if resp.status_code != 200:
            try:
                err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
            except Exception:
                err_msg = f"HTTP status {resp.status_code}"
            raise HTTPException(status_code=resp.status_code, detail=f"Gemini API Error: {err_msg}")
            
        result = resp.json()
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        text = text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(text)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Gemini returned invalid JSON output.")
    except Exception as e:
        logger.error(f"Error scanning jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files (will be moved to static/ directory)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
