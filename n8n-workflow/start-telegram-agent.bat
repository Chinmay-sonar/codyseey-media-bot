@echo off
title Telegram n8n Media Agent Bridge
echo ===================================================
echo   TELEGRAM TO N8N MEDIA AGENT BRIDGE
echo   Bot: @CodyseeyMediabot
echo   Target: http://localhost:5678/webhook/telegram-agent
echo ===================================================
echo.
node telegram-bridge.js
pause
