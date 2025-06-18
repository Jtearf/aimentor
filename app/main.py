"""
Main entry point for the AI Mentor application.
"""
from fastapi import FastAPI
import uvicorn

app = FastAPI(
    title="AI Mentor",
    description="AI-powered mentoring and learning platform",
    version="0.1.0"
)

@app.get("/")
async def root():
    """Root endpoint returning basic API information."""
    return {
        "name": "AI Mentor API",
        "status": "online",
        "version": "0.1.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
