@echo off
chcp 65001 > nul
title MRDPSTOCK - Installation des dépendances et compilation

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║         MRDPSTOCK - Build Windows EXE           ║
echo  ║              M.R.D.P.S 27                       ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: Vérifier Node.js
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installé !
    echo.
    echo Téléchargez Node.js sur : https://nodejs.org  (version LTS recommandée)
    echo Puis relancez ce script.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js détecté : 
node --version
echo.

:: Installation des dépendances
echo [1/3] Installation des dépendances npm...
call npm install
if %errorlevel% neq 0 (
    echo [ERREUR] Echec npm install
    pause
    exit /b 1
)
echo [OK] Dépendances installées
echo.

:: Test de l'application
echo [2/3] Vérification de la structure...
if not exist "node_modules\electron" (
    echo [ERREUR] Electron non trouvé dans node_modules
    pause
    exit /b 1
)
if not exist "node_modules\react\umd\react.production.min.js" (
    echo [ERREUR] React non trouvé - npm install incomplet
    pause
    exit /b 1
)
echo [OK] Structure vérifiée
echo.

:: Compilation Windows EXE
echo [3/3] Compilation de l'exécutable Windows...
echo (Cette étape peut prendre 2-5 minutes, téléchargement de l'installeur Electron)
echo.
call npm run dist
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Echec de la compilation
    echo Essayez: npm run dist-portable (version portable sans installeur)
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║  [SUCCÈS] EXE créé dans le dossier dist/        ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo Fichiers générés dans : dist\
echo  - MRDPSTOCK Setup X.X.X.exe  (installeur)
echo  - MRDPSTOCK X.X.X.exe        (portable)
echo.
pause
