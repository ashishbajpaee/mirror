import asyncio
from typing import Optional
from fastapi import APIRouter

router = APIRouter(prefix="/api/demo")

# ── Global State Machine ──
class DemoState:
    def __init__(self):
        self.running_moment: Optional[int] = None
        self.elapsed_seconds: int = 0
        self.total_seconds: int = 0
        self.current_action_text: Optional[str] = None
        self.shap_data: Optional[dict] = None
        self.final_stats: list = []
        self._task: Optional[asyncio.Task] = None
        self._stop_event: Optional[asyncio.Event] = None

    def get_stop_event(self) -> asyncio.Event:
        """Lazily create stop event on the current running loop."""
        if self._stop_event is None:
            self._stop_event = asyncio.Event()
        return self._stop_event

demo_state = DemoState()


def _is_stopped() -> bool:
    """None-safe check for whether the stop event has been set."""
    ev = demo_state._stop_event
    return ev is not None and ev.is_set()


async def sleep_interruptible(seconds: float):
    """Sleep that can be interrupted by a stop event."""
    stop_event = demo_state.get_stop_event()
    try:
        await asyncio.wait_for(stop_event.wait(), timeout=seconds)
    except asyncio.TimeoutError:
        pass


def _launch_attack(command: str):
    import time as _time
    import numpy as _np
    from backend.attacker_terminal import parse_attack_command, session, simulator, AttackRecord
    parsed = parse_attack_command(command)
    
    if simulator:
        atype = parsed["attack_type"]
        sensors = parsed["target_sensors"]
        duration = parsed["duration"]
        intensity = parsed.get("intensity", 0.5)

        if atype == "sensor_spoof":
            simulator.sensor_spoof(sensors[0], intensity * 0.05, duration=duration)
        elif atype == "actuator_block":
            simulator.sensor_spoof(sensors[0], 0.0, duration=duration)
        elif atype == "drift":
            simulator.drift_attack(sensors[0], 0.01 * intensity, duration=duration)
        elif atype == "coordinated":
            attack_vector = _np.random.uniform(0.0, intensity, 51)
            simulator.coordinated_attack(sensors, attack_vector, duration=duration)

        baseline = simulator.get_next_reading()
        attack_id = f"demo-atk-{demo_state.running_moment}"
        record = AttackRecord(
            attack_id=attack_id,
            command=command,
            parsed=parsed,
            launch_time=_time.time(),
            duration=duration,
            sensors_affected=sensors,
            baseline_snapshot={s: baseline["sensors"].get(s, 0.0) for s in sensors[:5]},
        )
        session.add(record)


async def _moment_1():
    demo_state.total_seconds = 15
    for i in range(15):
        if _is_stopped(): break
        demo_state.elapsed_seconds = i
        demo_state.current_action_text = "Plant running optimally."
        await sleep_interruptible(1.0)


async def _moment_2():
    demo_state.total_seconds = 30
    _launch_attack("subtle spoof on LIT101 with 15% deviation")
    
    for i in range(30):
        if _is_stopped(): break
        demo_state.elapsed_seconds = i
        if i == 15:
            # Flash "BLINDSPOT DETECTED BY GENTWIN ANALYSIS"
            demo_state.current_action_text = "BLINDSPOT DETECTED BY GENTWIN ANALYSIS"
            demo_state.shap_data = {
                "summary": "Tree SHAP localized a subtle anomaly cluster around LIT101 and flow correlations.",
                "top_features": [
                    {"sensor": "LIT101", "shap_value": 0.45, "direction": "decrease"},
                    {"sensor": "FIT101", "shap_value": 0.18, "direction": "increase"},
                    {"sensor": "P101", "shap_value": 0.05, "direction": "decrease"},
                    {"sensor": "AIT201", "shap_value": 0.01, "direction": "decrease"}
                ]
            }
        elif i < 15:
            demo_state.current_action_text = "Attack running silently..."
        await sleep_interruptible(1.0)


async def _moment_3():
    demo_state.total_seconds = 30
    for i in range(30):
        if _is_stopped(): break
        demo_state.elapsed_seconds = i
        if i == 0:
            demo_state.current_action_text = "DEPLOYING AI FIX RULE..."
        elif i == 3:
            demo_state.current_action_text = "Retesting LIT101..."
            _launch_attack("spoof the tank level sensor in stage P1")
        elif i == 5:
            demo_state.current_action_text = "DETECTED in 1.8s — ATTACK NEUTRALISED"
        await sleep_interruptible(1.0)


async def _moment_4():
    demo_state.total_seconds = 45
    _launch_attack("attack all sensors in stage 1 at once")
    
    for i in range(45):
        if _is_stopped(): break
        demo_state.elapsed_seconds = i
        if i == 8:
            _launch_attack("attack all sensors in stage 2 at once")
            demo_state.current_action_text = "Plant failure in: 4:32"
        elif i == 9:
            demo_state.current_action_text = "Plant failure in: 4:31"
        elif i == 10:
            demo_state.current_action_text = "Plant failure in: 4:30"
        elif i == 16:
            _launch_attack("attack all sensors in stage 3 at once")
            demo_state.current_action_text = "Plant failure in: 4:24"
        elif i == 20:
            from backend.attacker_terminal import session
            session.clear()
            demo_state.current_action_text = "CASCADE CONTAINED — P4/P5/P6 PROTECTED"
        elif i > 25:
            demo_state.current_action_text = None
            
        await sleep_interruptible(1.0)


async def _moment_5():
    demo_state.total_seconds = 15
    stats = [
        "1,000 attacks generated",
        "847 detected by standard systems",
        "153 gaps discovered by GenTwin",
        "7 critical cascade chains found",
        "153 rules auto-generated",
        "0 gaps remaining",
        "93% improvement in security coverage",
        "The plant is more secure than it was 4 minutes ago."
    ]
    
    for i in range(15):
        if _is_stopped(): break
        demo_state.elapsed_seconds = i
        idx = int(i / 1.5)
        if idx < len(stats):
            # Accumulate stats
            demo_state.final_stats = stats[:idx+1]
        await sleep_interruptible(1.0)


# ── Internal Task Runner ──
async def _run_moment(moment_number: int):
    # Setup
    demo_state.running_moment = moment_number
    demo_state.elapsed_seconds = 0
    demo_state.current_action_text = None
    demo_state.shap_data = None
    demo_state.final_stats = []
    # Create a fresh event on the current loop
    demo_state._stop_event = asyncio.Event()

    try:
        if moment_number == 1:
            await _moment_1()
        elif moment_number == 2:
            await _moment_2()
        elif moment_number == 3:
            await _moment_3()
        elif moment_number == 4:
            await _moment_4()
        elif moment_number == 5:
            await _moment_5()
    finally:
        if not _is_stopped():
            # Completed naturally
            demo_state.running_moment = None
            demo_state.current_action_text = None


# ── API Endpoints ──

@router.post("/moment/{moment_number}")
async def trigger_moment(moment_number: int):
    # Stop existing task if any
    if demo_state._task and not demo_state._task.done():
        demo_state._stop_event.set()
        await asyncio.sleep(0.1) # tiny yield
        
    demo_state._task = asyncio.create_task(_run_moment(moment_number))
    return {"status": "started", "moment": moment_number}


@router.get("/status")
def get_status():
    return {
        "running_moment": demo_state.running_moment,
        "elapsed_seconds": demo_state.elapsed_seconds,
        "total_seconds": demo_state.total_seconds,
        "current_action_text": demo_state.current_action_text,
        "shap_data": demo_state.shap_data,
        "final_stats": demo_state.final_stats
    }


@router.post("/stop")
def stop_moment():
    if demo_state._task and not demo_state._task.done():
        stop_event = demo_state.get_stop_event()
        stop_event.set()
    demo_state.running_moment = None
    demo_state.current_action_text = None
    demo_state.shap_data = None
    return {"status": "stopped"}


@router.post("/reset")
def reset_demo_state():
    stop_moment()
    from backend.attacker_terminal import session
    session.clear()
    demo_state.final_stats = []
    return {"status": "reset_to_start"}
