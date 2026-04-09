# Demo Questions and Answers

Use this file to collect the questions you want to practice and the exact answers you will give.

## Q1. How is data calculated for all sensors?

### Question
How are the data values for all sensors calculated in this system?

### Answer (judge-ready)
GenTwin calculates all 51 sensor values from a normalized SWaT baseline. On each update tick, the simulator reads the next baseline row, adds small Gaussian noise to mimic real plant variation, and clips values to valid bounds. If an attack is active, the attack logic modifies only targeted sensors with a smooth transition over 5 seconds, so changes look realistic instead of jumping instantly. The backend then streams the final sensor packet every second to the dashboard.

### Optional technical backup line
If needed, you can add: the transition factor is alpha = min(1, elapsed_seconds / 5), and attack values are blended as (1 - alpha) * current + alpha * target.

## Next Questions (Fill As You Go)

### Q2
Question:
How does the attack work in GenTwin?

Answer:
The attack starts from a natural-language command (for example, spoof, drift, coordinated, or replay). The backend parser converts that sentence into a structured attack plan: target sensors, stage, intensity, and duration. Then the simulator injects that plan into the live sensor stream. Instead of instant jumps, the manipulated values transition smoothly over about 5 seconds, which makes the behavior look like a realistic process anomaly. During execution, the system tracks deviation from baseline and reports whether the attack was detected or became a blind spot.

### Q3
Question:
Is this replicating a real attack?

Answer:
It is a realistic emulation, not a literal copy of one specific historical incident. GenTwin uses real SWaT-style process behavior and physically consistent sensor dynamics, then applies attack patterns that match real ICS techniques (spoofing, drift, replay, coordinated multi-sensor manipulation). So it is realistic enough for security evaluation and live demonstrations, but it is intentionally controlled and safe, not live malware execution on a real plant.

### Q4
Question:
How does our system defend from attack?

Answer:
GenTwin defends in four steps: detect, explain, mitigate, and contain. First, it monitors live multi-sensor behavior and flags anomalies. Second, it explains why an event is suspicious using forensic features and gap analysis, so defenders know what changed and where. Third, it applies mitigation rules to close discovered blind spots and improve future detection coverage. Finally, the MIRROR layer can redirect suspicious probing activity into a decoy environment, which protects the real process while still collecting attacker behavior for profiling.

### Q5
Question:
What are the mitigation rules?

Answer:
Mitigation rules are auto-generated detection conditions that the system creates after analyzing a detected gap. Each rule contains: which sensors are involved, the threshold condition, a confidence score, and which attack it covers. In short, they are machine-generated IF-THEN security checks that turn explainability output into actionable defense logic.

Example you can say:
IF LIT101 > 0.78 AND FIT101 < 0.31 THEN flag anomaly.

Optional technical backup line:
In the backend, a rule entry stores rule_id, attack_id, condition_text, sensors_involved, threshold_dict, confidence, and attacks_covered.

### Q6
Question:
How does this system identify the gaps?

Answer:
GenTwin identifies gaps by stress-testing attacks and comparing two signals: impact versus detection. If an attack causes high operational impact but is detected poorly, it is marked as a blind spot (gap). The system then ranks these gaps by severity, explains the key sensors involved, and prioritizes them for mitigation-rule generation.

Optional technical backup line:
The backend first uses curated gap analysis entries when available; otherwise it flags attacks with high impact and low detection as synthetic gaps, then sorts them by impact score.

### Q7
Question:
What is the MIRROR decoy system, and why does the attacker not know it is a decoy?Launch attack. Graph integrity. Graph me up. The real time sensor deviation grid. Yeah. And now our system is protected. System attack slowly, slowly as a sudden spike. Do Edge broke out? Math basics. How the graph works? 

Answer:
MIRROR is a deception-defense layer that intercepts suspicious attacker probes and redirects them to a controlled fake plant environment instead of the real process. The decoy behaves like a normal OT system by returning realistic sensor telemetry, plausible alerts, and expected response timing. Because the interface, data format, and behavior look consistent with a real target, the attacker continues interacting with the decoy while the real plant stays protected.

Optional technical backup line:
The system logs attacker actions and serves decoy responses through the same interaction flow, so there is no obvious protocol-level signal telling the attacker they were redirected.

### Q8
Question:
Can you explain the GNN Relationship Panel?

Answer:
The GNN Relationship Panel monitors cross-stage sensor dependencies, not just individual sensor values. Each node represents one SWaT process stage using a representative sensor, and each edge represents an expected relationship between two stages. During a run, if a relationship deviates beyond threshold, that edge is marked broken and graph integrity drops. If no stream is running, the panel stays in default healthy state, which is why you see 100 percent integrity, 0/7 broken edges, and no latency value.

Optional technical backup line:
The panel computes edge deviation from a short baseline and marks an edge broken when deviation crosses a threshold; integrity is reduced based on broken-edge count and average deviation.
