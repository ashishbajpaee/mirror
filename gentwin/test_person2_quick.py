"""
Quick Person 2 Pipeline Test
=============================
Rapid validation of Person 2 without full pipeline run.
Run: python test_person2_quick.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

def test_imports():
    """Test all Person 2 modules import correctly."""
    print("Testing imports...")
    try:
        from twin.simpy_simulator import simulate_attack_library
        from analysis.gap_discovery import identify_security_gaps
        from analysis.explainability_suite import build_gap_explanations
        from innovations.rl_adaptive_defense import train_q_agent
        from innovations.immunity_score import compute_immunity_score
        from innovations.dna_fingerprint import build_dna_fingerprints
        from innovations.timeline_builder import build_timeline
        from analysis.run_person2 import main
        print("✅ All Person 2 imports successful")
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False


def test_artifacts_exist():
    """Check if required Person 1 artifacts exist."""
    print("\nChecking Person 1 artifacts...")
    from config import MODELS_SAVE_DIR
    
    required = {
        "attack_library.csv": "Input for simulation",
        "vae_best.pth": "VAE model for explainability"
    }
    
    all_exist = True
    for artifact, purpose in required.items():
        path = os.path.join(MODELS_SAVE_DIR, artifact)
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  ✅ {artifact}: {size:,} bytes - {purpose}")
        else:
            print(f"  ⚠️  {artifact}: MISSING - {purpose}")
            all_exist = False
    
    return all_exist


def test_person2_outputs():
    """Check if Person 2 outputs have been generated."""
    print("\nChecking Person 2 outputs...")
    from config import MODELS_SAVE_DIR
    
    outputs = [
        "impact_analysis.csv",
        "security_gaps.csv",
        "security_gaps_explained.csv",
        "rl_q_table.csv",
        "immunity_scores.csv",
        "attack_dna.csv",
        "incident_timeline.csv"
    ]
    
    count = 0
    for out in outputs:
        path = os.path.join(MODELS_SAVE_DIR, out)
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  ✅ {out}: {size:,} bytes")
            count += 1
        else:
            print(f"  ⚠️  {out}: Not generated yet")
    
    print(f"\n  Generated: {count}/{len(outputs)} artifacts")
    return count > 0


def main():
    print("=" * 60)
    print("  Person 2 Quick Validation")
    print("=" * 60)
    
    results = []
    
    # Test 1: Imports
    results.append(("Imports", test_imports()))
    
    # Test 2: Person 1 artifacts
    results.append(("Person 1 Artifacts", test_artifacts_exist()))
    
    # Test 3: Person 2 outputs
    results.append(("Person 2 Outputs", test_person2_outputs()))
    
    # Summary
    print("\n" + "=" * 60)
    print("  Summary")
    print("=" * 60)
    for name, passed in results:
        status = "✅ PASS" if passed else "⚠️  WARN"
        print(f"  {status}: {name}")
    
    passed_count = sum(1 for _, p in results if p)
    print(f"\n  Overall: {passed_count}/{len(results)} checks passed")
    
    if all(p for _, p in results):
        print("\n✅ Person 2 is ready to run!")
        print("   Execute: python analysis/run_person2.py")
    else:
        print("\n⚠️  Some checks failed. Person 2 may run with fallbacks.")
        print("   Execute: python analysis/run_person2.py (will use relaxed thresholds)")
    
    print("=" * 60)


if __name__ == "__main__":
    main()
