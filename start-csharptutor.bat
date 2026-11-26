@echo off
rem Double-click this file to start CSharpTutor.
rem It always runs from its own folder, so it works no matter where you launch it from.
cd /d "%~dp0"

echo Starting CSharpTutor...
echo The app will open in your browser at http://localhost:3000
echo Keep this window open while you use the app. Close it to stop the app.
echo.

rem Open the browser after a short delay so the server has time to start
start "" /min cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000"

call npm run dev

echo.
echo CSharpTutor has stopped. If you saw "Port 3000 is already in use",
echo the app is already running: just open http://localhost:3000
pause
