#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import subprocess
import time
from pathlib import Path

APP_PATH = Path(__file__).with_name("index.html").resolve()
APP_URI = APP_PATH.as_uri()

STARTUP_DELAY_SECONDS = 120
REMINDER_EVERY_SECONDS = 90 * 60
ACTIVE_FROM_HOUR = 8
ACTIVE_TO_HOUR = 23

MESSAGES = [
    "Abrite Agustin Control y anota lo importante antes de que se escape.",
    "Dos minutos de registro te ordenan el dia: trabajo, estudio, plata, DGLAB o gym.",
    "Chequeo rapido: si avanzaste algo, dejalo cargado y segui liviano.",
    "Tu habito se arma con una accion chica. Abri la app y registra lo de hoy.",
]


def is_active_hour() -> bool:
    hour = dt.datetime.now().hour
    return ACTIVE_FROM_HOUR <= hour < ACTIVE_TO_HOUR


def open_app() -> None:
    subprocess.Popen(["xdg-open", APP_URI], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def send_notification() -> None:
    message = MESSAGES[dt.datetime.now().hour % len(MESSAGES)]
    command = [
        "notify-send",
        "--app-name=Agustin Control",
        "--urgency=normal",
        "--icon=appointment-soon",
        "--action=open=Abrir app",
        "--wait",
        "Agustin Control",
        message,
    ]

    try:
        result = subprocess.run(command, text=True, capture_output=True, timeout=180)
        if result.stdout.strip() == "open":
            open_app()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        fallback = [
            "notify-send",
            "--app-name=Agustin Control",
            "Agustin Control",
            message,
        ]
        try:
            subprocess.run(fallback, timeout=15)
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass


def main() -> None:
    time.sleep(STARTUP_DELAY_SECONDS)
    while True:
        if is_active_hour():
            send_notification()
        time.sleep(REMINDER_EVERY_SECONDS)


if __name__ == "__main__":
    main()
