# Analizador Sintáctico del LMD de SQL (JLex + Cup)

Actividad de Laboratorio del 2do Parcial de **Sintaxis y Semántica de los Lenguajes** (UTN FRT).

Parser en Java para las instrucciones `SELECT`, `INSERT`, `UPDATE` y `DELETE` de SQL. El scanner lo genera **JLex** a partir de las expresiones regulares de los componentes léxicos y el parser LALR(1) lo genera **Cup** a partir de una GIC en BNF. El programa lee un archivo de texto con sentencias SQL y por cada sentencia informa si es correcta, o qué errores léxicos y sintácticos tiene, con su línea y columna.

- Interfaz gráfica: https://gagaismo.github.io/LaboratorioSSL-parte-2/
- Consola (TUI): https://gagaismo.github.io/LaboratorioSSL-parte-2/consola.html
- Informe: [PDF](https://gagaismo.github.io/LaboratorioSSL-parte-2/informe.pdf) · [HTML](https://gagaismo.github.io/LaboratorioSSL-parte-2/informe.html)

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/sql/Sql.lex` | Especificación JLex: tokens y expresiones regulares |
| `src/sql/Sql.cup` | Especificación Cup: GIC en BNF, precedencias, recuperación de errores |
| `src/sql/Lexico.java` | Scanner generado por JLex |
| `src/sql/Parser.java`, `src/sql/Simbolos.java` | Parser y constantes de tokens generados por Cup |
| `src/sql/Analisis.java` | Errores, posiciones e informe por sentencia (compartido por scanner y parser) |
| `src/sql/Main.java` | Programa principal: `java sql.Main archivo.sql` |
| `herramientas/JLex`, `herramientas/java_cup` | JLex 1.2.6 y Cup 0.10k (material de la cátedra) |
| `pruebas/` | Archivos `.sql` de prueba y `comparar.js` (Java vs. web) |
| `docs/` | Interfaces web publicadas con GitHub Pages e informe |
| `Contexto/` | Enunciado y material complementario de la cátedra |

## Compilar y ejecutar

Requiere un JDK 8 o posterior. En Windows:

```bat
construir.bat
java -cp build\clases;build\herramientas sql.Main pruebas\validas.sql
```

`construir.bat` compila JLex y Cup, genera `Lexico.java` (JLex), `Parser.java` y `Simbolos.java` (Cup con `-parser Parser -symbols Simbolos`), compila el paquete `sql` y exporta las tablas LALR a `docs/tablas.js`. Con un archivo como argumento (`construir.bat pruebas\invalidas.sql`) además lo analiza.

El programa termina con código 0 si el archivo no tiene errores y 1 si los tiene.

En NetBeans: proyecto Java con fuentes existentes, con `src` y `herramientas` como carpetas de fuentes, y la ruta del `.sql` como argumento de ejecución.

## Ejemplo

```
[1] Línea 3: SELECT FROM empleados;
    Error sintáctico (línea 3, columna 8): no se esperaba la palabra reservada FROM. Se esperaba: '*' o identificador.
    Incorrecta.

[4] Línea 6: SELECT * FROM tabla WHERE @campo # 10;
    Error léxico (línea 6, columna 27): carácter no reconocido '@'.
    Error léxico (línea 6, columna 34): carácter no reconocido '#'.
    Error sintáctico (línea 6, columna 36): no se esperaba el entero 10. Se esperaba: '=', '<', '>', '<=', '>=', '+', '-', '*' o '/'.
    Incorrecta.
```

## Interfaces web

Las dos interfaces ejecutan el mismo autómata que el programa en Java: `docs/analizador.js` reproduce las reglas de `Sql.lex` y recorre las tablas que generó Cup (exportadas por `herramientas/exportar/ExportarTablas.java`) con el algoritmo de `java_cup.runtime.lr_parser`, incluida la recuperación de errores. Para verificarlo:

```bat
node pruebas\comparar.js pruebas\validas.sql pruebas\invalidas.sql pruebas\sin-punto-y-coma.sql
```

- **Interfaz gráfica** (`docs/index.html`): informe por sentencia con los errores marcados, árbol de análisis sintáctico, tokens, traza del parser, especificación y tabla LALR(1).
- **Consola** (`docs/consola.html`): se escriben sentencias SQL o comandos (`ayuda`, `ejemplo`, `tokens on`, `arbol on`, `traza on`, `gramatica`, `lexico`, `estado <n>`...).

## Informe

`python herramientas/informe/generar.py` regenera `docs/informe.html` (con el código y las salidas actuales de las pruebas) y `docs/informe.pdf` (con Microsoft Edge).
