@echo off
cd /d "C:\Users\chris\Apps\Maraton\tools"
set MARATON_PUERTO=8788
set MARATON_ATLETAS=jonah,yuli
for /d %%D in ("C:\Users\chris\AppData\Local\hermes\tools\python-3.14*") do set PY=%%D\python.exe
"%PY%" maraton_webhook.py >> "%LOCALAPPDATA%\hermes\cache\maraton\receptor.log" 2>&1
