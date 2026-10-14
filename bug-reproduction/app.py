import json
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from src.auth import verify_password
from src.users import find_user

PORT = int(os.environ.get("PORT", 3000))
PUBLIC_DIR = Path(__file__).parent / "public"

app = FastAPI()


@app.post("/api/login")
async def login(request: Request):
    try:
        body = await request.json()
    except json.JSONDecodeError:
        body = None
    if not isinstance(body, dict):
        return JSONResponse(
            {"ok": False, "message": "Invalid JSON body."}, status_code=400
        )

    username = body.get("username")
    password = body.get("password")
    if not username or not password:
        return JSONResponse(
            {"ok": False, "message": "Username and password are required."},
            status_code=400,
        )

    user = find_user(username)
    if user is None or not verify_password(user, password):
        print(f'[login] failed for "{username}"', flush=True)
        return JSONResponse(
            {"ok": False, "message": "Invalid username or password."}, status_code=401
        )

    print(f'[login] success for "{username}"', flush=True)
    return JSONResponse(
        {"ok": True, "message": f"Welcome back, {user['display_name']}!"}
    )


# Serves index.html at "/" plus the other files in public/. Mounted last so
# the API route above takes priority.
app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="public")


if __name__ == "__main__":
    print(f"Login app running at http://localhost:{PORT}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=PORT)
