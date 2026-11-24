@echo off
title H2 MilkTea - Tram In Truc Tiep & In Tu Xa (USB Printer Bridge)
cd /d "%~dp0..\.."
echo ============================================================
echo   H2 MILKTEA - TRAM IN TRUC TIEP (KHONG CAN CTRL+P)
echo   Ho tro in tu may tinh quay & nhan lenh in tu dien thoai
echo ============================================================
echo.
node scripts/print-bridge/h2-print-bridge.mjs
pause
