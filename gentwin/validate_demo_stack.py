"""
validate_demo_stack.py
======================
Quick pre-demo checks for the GenTwin mirror demo backend.

Usage:
    python validate_demo_stack.py
    python validate_demo_stack.py --base-url http://127.0.0.1:8000 --timeout 6
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Dict, List, Tuple


def _http_json(base_url: str, method: str, path: str, timeout: float, payload: Dict[str, Any] | None = None) -> Tuple[int, Any]:
    url = urllib.parse.urljoin(base_url + "/", path.lstrip("/"))
    headers = {"Accept": "application/json"}
    data = None

    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            parsed = json.loads(body) if body else None
            return resp.status, parsed
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed_body = json.loads(body) if body else None
        except json.JSONDecodeError:
            parsed_body = body
        raise RuntimeError(f"{method} {path} -> HTTP {exc.code}: {parsed_body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"{method} {path} -> network error: {exc}") from exc


def _expect(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def _ws_url_from_http(base_url: str) -> str:
    if base_url.startswith("https://"):
        return "wss://" + base_url[len("https://") :]
    if base_url.startswith("http://"):
        return "ws://" + base_url[len("http://") :]
    return "ws://" + base_url


async def _websocket_smoke(ws_url: str, timeout: float) -> Dict[str, Any]:
    import websockets  # Optional runtime dependency from uvicorn[standard]

    async with websockets.connect(ws_url, open_timeout=timeout, close_timeout=timeout) as socket:
        raw = await asyncio.wait_for(socket.recv(), timeout=timeout)
        msg = json.loads(raw)
        _expect("timestamp" in msg, "websocket payload missing 'timestamp'")
        _expect("sensors" in msg and isinstance(msg["sensors"], dict), "websocket payload missing sensors map")
        return msg


def run_checks(base_url: str, timeout: float, skip_websocket: bool) -> int:
    failures: List[str] = []
    checks_run = 0
    attack_id: str | None = None

    def run(name: str, fn: Callable[[], None]) -> None:
        nonlocal checks_run
        checks_run += 1
        start = time.perf_counter()
        try:
            fn()
            elapsed = time.perf_counter() - start
            print(f"[PASS] {name} ({elapsed:.2f}s)")
        except Exception as exc:
            elapsed = time.perf_counter() - start
            print(f"[FAIL] {name} ({elapsed:.2f}s): {exc}")
            failures.append(name)

    def health() -> None:
        status, body = _http_json(base_url, "GET", "/api/health", timeout)
        _expect(status == 200, "health endpoint did not return 200")
        _expect(isinstance(body, dict), "health response is not a JSON object")
        _expect(body.get("status") == "ok", f"unexpected health status: {body}")

    def cards_all() -> None:
        status, body = _http_json(base_url, "GET", "/api/cards/all", timeout)
        _expect(status == 200, "cards endpoint did not return 200")
        _expect(isinstance(body, list) and len(body) > 0, "cards list is empty")

    def demo_status() -> None:
        status, body = _http_json(base_url, "GET", "/api/demo/status", timeout)
        _expect(status == 200, "demo status endpoint did not return 200")
        _expect(isinstance(body, dict), "demo status response is not a JSON object")
        _expect("running_moment" in body, "demo status missing running_moment")

    def genome_profile() -> None:
        status, body = _http_json(base_url, "GET", "/api/genome/profile", timeout)
        _expect(status == 200, "genome profile endpoint did not return 200")
        _expect(isinstance(body, dict), "genome profile response is not a JSON object")
        _expect("profile_type" in body, "genome profile missing profile_type")

    def results_summary() -> None:
        status, body = _http_json(base_url, "GET", "/api/results/summary", timeout)
        _expect(status == 200, "results summary endpoint did not return 200")
        _expect(isinstance(body, dict), "results summary response is not a JSON object")
        _expect("improvement_percentage" in body, "results summary missing improvement_percentage")

    def execute_attack() -> None:
        nonlocal attack_id
        status, body = _http_json(
            base_url,
            "POST",
            "/api/attacker/execute",
            timeout,
            payload={"command": "spoof the tank level sensor in stage P1"},
        )
        _expect(status == 200, "execute endpoint did not return 200")
        _expect(isinstance(body, dict), "execute response is not a JSON object")
        attack_id = body.get("attack_id")
        _expect(bool(attack_id), f"execute response missing attack_id: {body}")

    def attack_status() -> None:
        _expect(bool(attack_id), "attack_id missing from execute step")
        status, body = _http_json(base_url, "GET", f"/api/attacker/status/{attack_id}", timeout)
        _expect(status == 200, "attack status endpoint did not return 200")
        _expect(isinstance(body, dict), "attack status response is not a JSON object")
        _expect("attack_id" in body, "attack status missing attack_id")

    def attack_history() -> None:
        _expect(bool(attack_id), "attack_id missing from execute step")
        status, body = _http_json(base_url, "GET", "/api/attacker/history", timeout)
        _expect(status == 200, "attack history endpoint did not return 200")
        _expect(isinstance(body, dict), "attack history response is not a JSON object")
        attacks = body.get("attacks", [])
        _expect(isinstance(attacks, list), "history attacks payload is not a list")
        _expect(any(a.get("attack_id") == attack_id for a in attacks if isinstance(a, dict)), "new attack not found in history")

    def reset_attacks() -> None:
        status, body = _http_json(base_url, "POST", "/api/attacker/reset", timeout)
        _expect(status == 200, "reset endpoint did not return 200")
        _expect(isinstance(body, dict), "reset response is not a JSON object")
        _expect(body.get("status") == "reset", f"unexpected reset response: {body}")

    run("Health endpoint", health)
    run("Cards endpoint", cards_all)
    run("Demo status endpoint", demo_status)
    run("Genome profile endpoint", genome_profile)
    run("Results summary endpoint", results_summary)
    run("Execute attack endpoint", execute_attack)
    run("Attack status endpoint", attack_status)
    run("Attack history endpoint", attack_history)
    run("Reset endpoint", reset_attacks)

    if skip_websocket:
        print("[SKIP] WebSocket smoke test (disabled by --skip-websocket)")
    else:
        ws_url = urllib.parse.urljoin(_ws_url_from_http(base_url) + "/", "ws")

        def websocket_check() -> None:
            try:
                msg = asyncio.run(_websocket_smoke(ws_url, timeout))
                _expect("sensors" in msg and len(msg["sensors"]) > 0, "websocket sensors map is empty")
            except ModuleNotFoundError as exc:
                raise RuntimeError("websockets package not installed; install requirements first") from exc

        run("WebSocket stream endpoint", websocket_check)

    print("\n--- Validation Summary ---")
    print(f"Checks run: {checks_run}")
    print(f"Checks failed: {len(failures)}")

    if failures:
        print("Failed checks:")
        for name in failures:
            print(f"- {name}")
        return 1

    print("All checks passed. Demo backend is presentation-ready.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate GenTwin mirror demo backend endpoints")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Backend base URL")
    parser.add_argument("--timeout", type=float, default=6.0, help="Per-request timeout in seconds")
    parser.add_argument("--skip-websocket", action="store_true", help="Skip WebSocket smoke test")

    args = parser.parse_args()
    return run_checks(args.base_url.rstrip("/"), args.timeout, args.skip_websocket)


if __name__ == "__main__":
    sys.exit(main())
