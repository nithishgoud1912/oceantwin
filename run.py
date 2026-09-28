#!/usr/bin/env python3
"""
OceanTwin - Intelligent 3D Ocean Digital Twin & Observation Platform
Smart India Hackathon 2026 | PS ID: SIH 26067 | Team: Codeflex

Unified Runner Script to launch the Full-Stack Application
"""

import sys
import os
from pathlib import Path
import uvicorn

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if __name__ == "__main__":
    print("=" * 70)
    print("  OCEANTWIN: Intelligent 3D Ocean Digital Twin & Observation Platform")
    print("  Smart India Hackathon 2026 - Problem Statement: SIH 26067")
    print("  Theme: Disaster Management | Team Codeflex (ID: 50)")
    print("=" * 70)
    port = int(os.environ.get("PORT", 8080))
    print(f"  - Server running on port: {port}")
    print(f"  - Web Dashboard: http://localhost:{port}")
    print(f"  - Backend API: http://localhost:{port}/docs")
    print("=" * 70)

    uvicorn.run("main:app", app_dir=str(BACKEND_DIR), host=os.environ.get("HOST", "127.0.0.1"), port=port, reload=False)

