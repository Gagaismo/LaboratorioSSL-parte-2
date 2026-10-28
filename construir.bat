@echo off
rem Genera el scanner (JLex) y el parser (CUP), compila todo y exporta las
rem tablas LALR para la interfaz web.
rem Uso: construir.bat             (construye)
rem      construir.bat archivo.sql (construye y analiza el archivo)
setlocal
cd /d "%~dp0"

if not exist build\herramientas mkdir build\herramientas
if not exist build\clases mkdir build\clases
if not exist build\exportar mkdir build\exportar

echo [1/5] Compilando JLex y CUP...
javac -nowarn -encoding ISO-8859-1 -d build\herramientas herramientas\JLex\Main.java herramientas\java_cup\*.java herramientas\java_cup\runtime\*.java || exit /b 1

echo [2/5] JLex: Sql.lex -^> Lexico.java
pushd src\sql
java -cp ..\..\build\herramientas JLex.Main Sql.lex || (popd & exit /b 1)
move /y Sql.lex.java Lexico.java > nul

echo [3/5] CUP: Sql.cup -^> Parser.java y Simbolos.java
java -cp ..\..\build\herramientas java_cup.Main -parser Parser -symbols Simbolos < Sql.cup || (popd & exit /b 1)
popd

echo [4/5] Compilando el analizador...
javac -source 8 -target 8 -Xlint:-options -nowarn -encoding UTF-8 -cp build\herramientas -d build\clases src\sql\*.java || exit /b 1

echo [5/5] Exportando tablas LALR para la web...
javac -nowarn -encoding UTF-8 -cp build\clases;build\herramientas -d build\exportar herramientas\exportar\ExportarTablas.java || exit /b 1
java -cp build\clases;build\herramientas;build\exportar ExportarTablas src\sql\Parser.java docs\tablas.js || exit /b 1

if not "%~1"=="" java -cp build\clases;build\herramientas sql.Main %1
