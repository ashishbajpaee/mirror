"""
attacker_genome.py — Attacker Behavioural Profiling Panel
==========================================================
Classifies the attacker based on session history across 4 dimensions:
1. Reconnaissance Style
2. Attack Sequencing
3. Detection Response
4. Objective Signature
"""

from typing import List
from fastapi import APIRouter

router = APIRouter(prefix="/api/genome")

def classify_attacker(history: List[dict]) -> dict:
    """
    Given a list of attack properties (from session record), output a genome profile.
    """
    if not history:
        return {
            "profile_type": "Unknown",
            "confidence": 0,
            "dimension_scores": {
                "reconnaissance": "Unknown",
                "sequencing": "Unknown",
                "detection_response": "Unknown",
                "objective": "Unknown"
            },
            "key_insight": "No attacks launched yet.",
            "recommended_response": "Monitor for anomalous activity.",
            "risk_level": "LOW"
        }
    
    num_attacks = len(history)

    # 1. Reconnaissance Style
    # Check if stages are attacked sequentially, the same stage repeatedly, or jump randomly
    stages = [h.get("target_stage") for h in history if h.get("target_stage")]
    recon_style = "Random"
    if stages:
        if len(set(stages)) == 1:
            recon_style = "Targeted"
        else:
            # Check if stages are somewhat sequential (P1 -> P2 -> P3)
            int_stages = []
            for s in stages:
                try:
                    int_stages.append(int(s[1:]))
                except:
                    pass
            if int_stages and len(int_stages) > 1 and all(int_stages[i] <= int_stages[i+1] for i in range(len(int_stages)-1)):
                recon_style = "Systematic"
            elif len(int_stages) > 1 and all(int_stages[i] >= int_stages[i+1] for i in range(len(int_stages)-1)):
                recon_style = "Systematic" # Reverse sequential

    # 2. Attack Sequencing
    first_attack = history[0]
    sequencing = "Sensor-focused"
    first_type = first_attack.get("attack_type", "")
    if first_type == "actuator_block":
        sequencing = "Control-focused"
    elif first_attack.get("target_stage") == "P1":
        sequencing = "Entry-point thinker"
    
    # Try to determine if they went for highest blindspot sensor first
    if first_attack.get("blindspot_score", 0) > 6.0:
        sequencing = "Informed"

    # 3. Detection Response
    # Track what happens after a detection
    detection_response = "Cautious"
    if num_attacks > 1:
        # Check consecutive pairs
        escalation = False
        persistence = False
        adaption = False
        for i in range(len(history)-1):
            prev = history[i]
            cur = history[i+1]
            if prev.get("detected"):
                if cur.get("attack_type") == prev.get("attack_type") and cur.get("target_sensors") == prev.get("target_sensors"):
                    persistence = True
                elif cur.get("attack_type") != prev.get("attack_type") or cur.get("target_stage") != prev.get("target_stage"):
                    adaption = True
                if cur.get("attack_type") == "coordinated":
                    escalation = True
        
        if escalation:
            detection_response = "Aggressive"
        elif adaption:
            detection_response = "Adaptive"
        elif persistence:
            detection_response = "Persistent"
    else:
        # Not enough data for response, assume Adaptive if fast attack
        pass 

    # 4. Objective Signature
    # Mostly sensor spoofing -> Data manip, actuator block -> Disruption, coordinated/drift -> Surveillance/Stealth
    attack_types = [h.get("attack_type") for h in history]
    spoofs = sum(1 for a in attack_types if a == "sensor_spoof")
    blocks = sum(1 for a in attack_types if a == "actuator_block")
    stealths = sum(1 for a in attack_types if a in ["drift", "replay"])
    
    objective = "Data manipulation"
    if blocks > spoofs and blocks > stealths:
        objective = "Disruption"
    elif stealths > spoofs and stealths > blocks:
        objective = "Surveillance"
    elif "coordinated" in attack_types:
        objective = "Financial" # Mapping fast aggressive -> Ransomware/Financial

    # CLASSIFICATION LOGIC
    profile_type = "Opportunistic Attacker"
    risk_level = "MEDIUM"
    confidence = min(30 + num_attacks * 15, 95) # Goes up with more attacks

    if recon_style == "Systematic" and sequencing == "Informed" and detection_response == "Adaptive" and objective == "Surveillance":
        profile_type = "Nation-State Actor"
        risk_level = "CRITICAL"
    elif recon_style == "Random" and (detection_response == "Aggressive" or objective == "Financial"):
        profile_type = "Criminal Ransomware Group"
        risk_level = "HIGH"
    elif recon_style == "Targeted" and sequencing == "Sensor-focused" and detection_response == "Cautious":
        profile_type = "Insider Threat"
        risk_level = "CRITICAL"
    elif recon_style == "Random" and detection_response == "Persistent" and objective == "Disruption":
        profile_type = "Opportunistic Attacker"
        risk_level = "MEDIUM"
    elif recon_style == "Systematic" and detection_response == "Adaptive":
        profile_type = "Security Researcher"
        risk_level = "LOW"
    elif recon_style == "Random" and detection_response == "Persistent":
        profile_type = "Script Kiddie"
        risk_level = "LOW"

    # Key Insight
    if profile_type == "Insider Threat":
        key_insight = "Attacker focuses heavily on a specific stage, moving cautiously — suggesting prior system knowledge."
        rec_resp = "Review authentication logs. Check operator access patterns and cross-validate with shift records."
    elif profile_type == "Nation-State Actor":
        key_insight = "Systematic, informed reconnaissance showing advanced evasion and persistence."
        rec_resp = "Activate Incident Response plan. Isolate affected network segments and alert national CERT."
    elif profile_type == "Criminal Ransomware Group":
        key_insight = "Aggressive, noisy attacks aimed at maximum disruption."
        rec_resp = "Lock down actuators physically. Isolate IT from OT networks immediately."
    elif profile_type == "Security Researcher":
        key_insight = "Methodical probing without destructive intent, adapting when detected."
        rec_resp = "Monitor activity. Check if vulnerability assessment is authorized."
    elif profile_type == "Script Kiddie":
        key_insight = "Repeated, identical attacks ignoring detection responses."
        rec_resp = "Block source IPs dynamically. Basic firewall rules are sufficient."
    else:
        key_insight = "Random, unstructured attacks suggesting opportunistic exploitation."
        rec_resp = "Enhance perimeter monitoring. Patch known vulnerabilities."

    if num_attacks < 2:
        profile_type = "Analyzing behaviour..."
        confidence = 10
        key_insight = "Need more data to form a reliable profile."
        rec_resp = "Wait for more attack data."
        risk_level = "LOW"

    return {
        "profile_type": profile_type,
        "confidence": confidence,
        "dimension_scores": {
            "reconnaissance": recon_style,
            "sequencing": sequencing,
            "detection_response": detection_response,
            "objective": objective
        },
        "key_insight": key_insight,
        "recommended_response": rec_resp,
        "risk_level": risk_level
    }

def _get_history_dicts():
    from backend.attacker_terminal import session
    records = session.all()
    # Serialize the records to dicts for the classifier
    out = []
    for r in records:
        out.append({
            "attack_type": r.parsed.get("attack_type"),
            "target_stage": r.parsed.get("target_stage"),
            "target_sensors": r.sensors_affected,
            "detected": r.detected,
            "blindspot_score": r.blindspot_score,
        })
    return out

@router.get("/profile")
def get_genome_profile():
    history = _get_history_dicts()
    return classify_attacker(history)

@router.get("/timeline")
def get_genome_timeline():
    history = _get_history_dicts()
    timeline = {}
    for i in range(1, len(history) + 1):
        partial_history = history[:i]
        timeline[f"after_attack_{i}"] = classify_attacker(partial_history)
    return timeline
