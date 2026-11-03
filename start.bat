@echo off
chcp 65001 > nul
title Хакасия Онлайн — khakassia-online.ru
echo =========================================================
echo       🌐  ХАКАСИЯ ОНЛАЙН  🌐
echo       Портал и Социальная Сеть Республики Хакасия
echo =========================================================
echo.
echo Адреса сайта:
echo  • Основной домен:          http://khakassia-online.ru
echo  • Локальный адрес:         http://localhost:3000
echo  • Для входа с телефона:    http://192.168.0.12
echo  • Для доступа из интернета: запустите share-online.bat
echo =========================================================
echo.

set PATH=C:\Users\sudoc\AppData\Local\Programs\nodejs;%PATH%

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден.
    pause
    exit /b 1
)

start "" http://khakassia-online.ru
node server.js
pause
