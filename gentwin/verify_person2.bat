@echo off
REM Quick Person 2 Verification Script for Windows
REM Run this to test Person 2 after fixes

echo ============================================================
echo Person 2 Post-Fix Verification
echo ============================================================
echo.

echo [1/3] Testing imports...
python -c "from analysis.run_person2 import main; print('✅ Imports OK')"
if errorlevel 1 goto error
echo.

echo [2/3] Quick validation...
python test_person2_quick.py
if errorlevel 1 goto error
echo.

echo [3/3] Running Person 2 pipeline (Stage 3 only - SHAP/LIME)...
python -c "from analysis.explainability_suite import build_gap_explanations; df = build_gap_explanations(max_rows=5); print(f'✅ Explained {len(df)} gaps'); print(df[['attack_id', 'shap_explanation', 'lime_explanation']].head())"
if errorlevel 1 goto error
echo.

echo ============================================================
echo ✅ Person 2 verification complete!
echo ============================================================
goto end

:error
echo ============================================================
echo ❌ Verification failed - check output above
echo ============================================================
exit /b 1

:end
