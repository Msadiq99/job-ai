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
    "fullname": "Mohamed El Sadiq",
    "title": "Senior Project Engineer",
    "email": "sadiqgeneralmail@gmail.com",
    "phone": "+966565712713",
    "website": "https://linkedin.com/in/msadiq",
    "summary": "Senior Project Engineer with 17+ years of experience delivering industrial, utility, and energy-related projects across Saudi Arabia. Proven leadership in project execution, plant operations, maintenance, commissioning, and asset reliability, with strong multidisciplinary expertise in mechanical, electrical, and instrumentation systems. Extensive experience supporting Aramco-regulated environments, EPC/PMC coordination, and high-risk operational facilities. Recognized for driving safety, reliability, and performance across complex industrial plants."
  },
  "experience": [
    {
      "id": "exp-1",
      "company": "Abdullah Hashim Industrial Gases & Equipment (AHG)",
      "role": "Senior Project Engineer",
      "dates": "Jan 2025 - Present",
      "bullets": [
        "Lead multidisciplinary engineering and project execution activities for large-scale industrial gas and utility facilities, acting as the technical focal point between operations, maintenance, contractors, and management.",
        "Oversee project planning, engineering reviews, construction coordination, and commissioning readiness for plant upgrades, brownfield modifications, and reliability-driven capital projects.",
        "Provide senior-level oversight of mechanical, electrical, and instrumentation systems, including rotating equipment, compressors, cryogenic systems, power distribution, and DCS-controlled processes.",
        "Manage contractor performance, technical compliance, and HSE adherence, ensuring alignment with international engineering standards and company governance.",
        "Drive asset integrity, reliability improvement, and lifecycle optimization initiatives, reducing unplanned downtime and improving plant availability.",
        "Support management with project risk assessments, cost control, schedule monitoring, and executive reporting."
      ]
    },
    {
      "id": "exp-2",
      "company": "Abdullah Hashim Industrial Gases & Equipment (AHG)",
      "role": "Assistant Plant Manager (CO2)",
      "dates": "Sep 2022 - Dec 2024",
      "bullets": [
        "Directed CO2 production operations, including raw material handling, compression, storage, and distribution, ensuring safe and reliable output.",
        "Led preventive and corrective maintenance strategies to maximize equipment uptime and operational efficiency.",
        "Enforced regulatory compliance, conducted audits, and closed corrective actions in line with corporate and international standards.",
        "Championed HSE leadership, risk assessments, and safety culture across production and maintenance teams.",
        "Delivered measurable cost reductions through process optimization and resource efficiency improvements."
      ]
    },
    {
      "id": "exp-3",
      "company": "Abdullah Hashim Industrial Gases & Equipment (AHG)",
      "role": "Senior Operations & Maintenance Engineer (ASU)",
      "dates": "Jan 2012 - Sep 2022",
      "bullets": [
        "Led operations and maintenance for Air Separation Units (O2 / N2) in high-demand industrial environments.",
        "Developed and executed preventive maintenance programs, reducing downtime and extending equipment lifecycle.",
        "Conducted root cause analysis for critical equipment failures and implemented long-term reliability solutions.",
        "Supervised and mentored technicians, ensuring high technical performance and safety compliance.",
        "Supported capital projects, plant upgrades, and commissioning activities."
      ]
    },
    {
      "id": "exp-4",
      "company": "Dar El Tasmeem Construction (EPC)",
      "role": "MEP Site Engineer",
      "dates": "Jan 2011 - Jan 2012",
      "bullets": [
        "Performed as a site-based EPC execution engineer, supervising MEP works to ensure compliance with approved drawings, project specifications, and HSE requirements.",
        "Acted as the site interface between EPC project management, subcontractors, and consultants, supporting coordination and resolution of technical and constructability issues.",
        "Reviewed shop drawings, material submittals, and method statements, ensuring alignment with design intent and international standards.",
        "Supervised installation, testing, and commissioning support for MEP, HVAC, electrical, and plumbing systems, contributing to timely project delivery.",
        "Monitored site progress and quality, supporting schedule adherence, inspection approvals, and handover readiness."
      ]
    },
    {
      "id": "exp-5",
      "company": "Cairo Electric Consultant (PMC)",
      "role": "Electrical Engineer",
      "dates": "Jan 2008 - Jan 2011",
      "bullets": [
        "Worked in a consultant / PMC-style role, providing design review, site supervision, and technical compliance oversight for electrical systems.",
        "Oversaw installation and testing of power and light-current systems, ensuring compliance with approved designs, local regulations, and international electrical codes.",
        "Prepared and reviewed shop drawings, technical calculations, and material submissions, coordinating approvals with contractors and stakeholders.",
        "Conducted site inspections, progress evaluations, and quality checks, reporting findings and recommendations to project management teams.",
        "Ensured contractor adherence to building codes, safety standards, and project specifications, supporting safe and compliant project execution."
      ]
    },
    {
      "id": "exp-6",
      "company": "Air Products & Aramco Projects",
      "role": "Senior Project Engineer (PMC Oversight)",
      "dates": "2012 - Present (Highlights)",
      "bullets": [
        "Supported owner-side / PMC oversight for industrial gas plants, oil refineries, and natural gas facilities with Air Products and Aramco across Saudi Arabia and the GCC.",
        "Directed equipment installation, plant modifications, mechanical completion, pre-commissioning, and commissioning activities.",
        "Executed natural gas purging, leak testing, pressure testing, drying, and system cleaning in compliance with international standards and HSE requirements.",
        "Supported ASU, specialty gases, cryogenic systems, and rotating equipment commissioning and operational readiness.",
        "Delivered medical gas systems installation and commissioning for government, private, and military hospitals.",
        "Managed industrial gas and cryogenic equipment installations for food, beverage, and multi-industry clients, coordinating EPC contractors and operations teams."
      ]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "school": "Higher Technological Institute (HTI), Egypt",
      "degree": "Bachelor of Electrical Engineering (B.Eng.)",
      "dates": "Graduated: June 2008"
    }
  ],
  "skills": [
    "Senior Project Engineering (PMC)",
    "EPC Contractor Oversight",
    "Project Execution & Governance",
    "Engineering Design Review",
    "Construction Supervision",
    "Commissioning & Startup",
    "Mechanical Completion",
    "Operational Readiness & Handover",
    "Electrical Systems (HV/MV, MCC, Switchgear)",
    "Instrumentation & Control (DCS/PLC)",
    "Rotating Equipment Integration",
    "Plant Operations & Asset Integrity",
    "Shutdown & Turnaround Management",
    "HSE Leadership",
    "QA/QC Compliance",
    "International Standards (IEC, ISA, IEEE)",
    "Multidisciplinary Coordination",
    "Risk Management",
    "Schedule & Progress Monitoring"
  ]
}


DEFAULT_MOCK_APPLICATIONS = []

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
    api_key = ""
    
    # 1. Load from environment (.env file)
    env_key = os.getenv("GEMINI_API_KEY", "").strip()
    if env_key and env_key != "YOUR_GEMINI_API_KEY_HERE":
        api_key = env_key

    # 2. Fallback to SQLite database settings if not set in .env
    if not api_key and state and "settings" in state:
        db_key = state["settings"].get("apiKey", "").strip()
        is_masked = (db_key == "********") or ("..." in db_key and len(db_key) < 20)
        if db_key and not is_masked:
            api_key = db_key

    model = "gemini-2.5-flash"
    if state and "settings" in state:
        model = state["settings"].get("model", "gemini-2.5-flash").strip()
        
    return api_key, model

@app.get("/api/state")
async def fetch_state():
    """Fetches the current application state from SQLite, seeding defaults if empty."""
    state = get_state()
    if not state:
        logger.info("Database empty, seeding default state.")
        save_state(DEFAULT_STATE)
        state = DEFAULT_STATE
    
    # Secure API Key: Mask it before returning to the frontend to prevent leakage
    if "settings" in state:
        api_key = state["settings"].get("apiKey", "").strip()
        env_key = os.getenv("GEMINI_API_KEY", "").strip()
        
        has_env_key = env_key and env_key != "YOUR_GEMINI_API_KEY_HERE"
        has_db_key = api_key and not ((api_key == "********") or ("..." in api_key and len(api_key) < 20))
        
        if has_env_key:
            if len(env_key) > 12:
                state["settings"]["apiKey"] = f"{env_key[:6]}...{env_key[-4:]}"
            else:
                state["settings"]["apiKey"] = "********"
        elif has_db_key:
            if len(api_key) > 12:
                state["settings"]["apiKey"] = f"{api_key[:6]}...{api_key[-4:]}"
            else:
                state["settings"]["apiKey"] = "********"
        else:
            state["settings"]["apiKey"] = ""
            
    return state

@app.post("/api/state")
async def update_state(request: Request):
    """Saves the application state into the SQLite database, preserving any existing API key if a masked one is received."""
    try:
        data = await request.json()
        
        if "settings" in data:
            incoming_key = data["settings"].get("apiKey", "").strip()
            is_masked = (incoming_key == "********") or ("..." in incoming_key and len(incoming_key) < 20)
            
            if is_masked:
                existing = get_state()
                if existing and "settings" in existing:
                    data["settings"]["apiKey"] = existing["settings"].get("apiKey", "")
                    
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
