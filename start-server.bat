@echo off
chcp 65001 >nul
title KTPMUD Server - Node.js
cd /d "%~dp0"

echo ===================================================================
echo    🚀 HỆ THỐNG QUẢN LÝ TIẾN ĐỘ DỰ ÁN KTPMUD (NODE.JS)
echo ===================================================================
echo.
echo    [1] Máy của bạn:  http://localhost:3000
echo    [2] Bạn bè (Wi-Fi): Xem địa chỉ IP hiển thị bên dưới
echo.
echo    * Lưu ý: ĐỪNG TẮT CỬA SỔ NÀY KHI ĐANG DÙNG HỆ THỐNG
echo ===================================================================
echo.

node server.js
pause
