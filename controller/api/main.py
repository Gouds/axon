from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from controller.api.routers import profiles, assets

app = FastAPI(title="Axon Controller API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(assets.router, prefix="/profiles", tags=["assets"])


@app.get("/health")
async def health():
    return {"role": "controller", "version": "0.1.0"}
