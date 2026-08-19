@echo off
chcp 65001 >nul
title CUMCM Visual Skill Installer
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-cumcm-visual-skill.ps1" -Action Install %*
set "CUMCM_INSTALL_EXIT=%ERRORLEVEL%"
echo.
if not "%CUMCM_INSTALL_NO_PAUSE%"=="1" pause
exit /b %CUMCM_INSTALL_EXIT%
