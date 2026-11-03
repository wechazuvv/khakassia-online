@echo off
chcp 65001 > nul
title Настройка доступа к Хакасия Онлайн
echo =========================================================
echo       🌐  ХАКАСИЯ ОНЛАЙН (khakassia-online.ru)
echo       Настройка открытия сайта по доменному имени
echo =========================================================
echo.
echo Этот файл прописывает адрес http://khakassia-online.ru
echo чтобы сайт открывался у вас в браузере как настоящий домен!
echo.
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ВНИМАНИЕ: Запустите этот файл от имени Администратора!
    echo     (Правый клик по файлу -> "Запуск от имени администратора")
    pause
    exit /b 1
)

findstr /C:"khakassia-online.ru" "%WINDIR%\System32\drivers\etc\hosts" >nul
if %errorlevel% equ 0 (
    echo [OK] Домен khakassia-online.ru уже добавлен в вашу систему!
) else (
    echo 192.168.0.12 khakassia-online.ru >> "%WINDIR%\System32\drivers\etc\hosts"
    echo [OK] Домен khakassia-online.ru успешно добавлен!
)

echo.
echo Теперь вы можете открыть браузер и перейти по адресу:
echo 👉 http://khakassia-online.ru
echo.
pause
