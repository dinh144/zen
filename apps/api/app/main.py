from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .cards import router as cards_router

app = FastAPI(title="zen API", version="1.0.0")

# Any origin, bearer token, no credentials: the web app, the extension and local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cards_router, prefix="/api")


@app.exception_handler(HTTPException)
async def _http_exception(request: Request, exc: HTTPException) -> JSONResponse:
    body = exc.detail if isinstance(exc.detail, dict) and "error" in exc.detail else {"error": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=body)
