"""Genera docs/informe.html a partir de plantilla.html y docs/informe.pdf con Edge.

Inserta el código fuente actual, la gramática exportada por CUP y las salidas
reales de sql.Main sobre los archivos de pruebas, para que el informe no quede
desactualizado. Requiere haber ejecutado construir.bat.

Uso: python herramientas/informe/generar.py
"""
import html
import json
import os
import subprocess
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOCS = os.path.join(RAIZ, "docs")
SEP = ";" if os.name == "nt" else ":"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"


def leer(ruta):
    with open(os.path.join(RAIZ, ruta), encoding="utf-8") as f:
        return f.read()


def lineas(ruta):
    return str(len(leer(ruta).splitlines()))


def ejecutar_java(archivo):
    r = subprocess.run(
        ["java", "-Dstdout.encoding=UTF-8", "-cp", SEP.join(["build/clases", "build/herramientas"]), "sql.Main", archivo],
        cwd=RAIZ, capture_output=True)
    return r.stdout.decode("utf-8").replace("\r\n", "\n").rstrip()


# La gramática y la traza de ejemplo salen del mismo motor que usa la web
# (tablas exportadas de Parser.java), cargado en Node.
SCRIPT_NODE = r"""
const vm = require("vm"), fs = require("fs");
const ctx = { console };
vm.createContext(ctx);
for (const f of ["tablas.js", "analizador.js", "vistas.js"]) {
  vm.runInContext(fs.readFileSync("docs/" + f, "utf8").replace(/^const TABLAS/m, "var TABLAS"), ctx);
}
const r = vm.runInContext("AnalizadorSQL.analizar('SELECT * FROM clientes;')", ctx);
console.log(JSON.stringify({
  bnf: vm.runInContext("Vistas.bnfTexto()", ctx),
  producciones: ctx.TABLAS.producciones.length - 1,
  estados: ctx.TABLAS.acciones.length,
  traza: r.traza.map((p, i) => [String(i + 1), p.pila, p.entrada, p.accion])
}));
"""


def main():
    datos = json.loads(subprocess.run(["node", "-e", SCRIPT_NODE], cwd=RAIZ, capture_output=True,
                                      check=True).stdout.decode("utf-8"))
    generadas = sum(int(lineas("src/sql/" + f)) for f in ["Lexico.java", "Parser.java", "Simbolos.java"])
    reemplazos = {
        "BNF": html.escape(datos["bnf"]),
        "CANTIDAD_PRODUCCIONES": str(datos["producciones"]),
        "CANTIDAD_ESTADOS": str(datos["estados"]),
        "TRAZA_EJEMPLO": "".join("<tr>" + "".join('<td class="izq mono">' + html.escape(c) + "</td>" for c in fila)
                                 + "</tr>\n" for fila in datos["traza"]),
        "LINEAS_LEX": lineas("src/sql/Sql.lex"),
        "LINEAS_CUP": lineas("src/sql/Sql.cup"),
        "LINEAS_GENERADAS": str(generadas),
        "FUENTE_VALIDAS": html.escape(leer("pruebas/validas.sql").rstrip()),
        "SALIDA_VALIDAS": html.escape(ejecutar_java("pruebas/validas.sql")),
        "FUENTE_INVALIDAS": html.escape(leer("pruebas/invalidas.sql").rstrip()),
        "SALIDA_INVALIDAS": html.escape(ejecutar_java("pruebas/invalidas.sql")),
        "FUENTE_SIN_PYC": html.escape(leer("pruebas/sin-punto-y-coma.sql").rstrip()),
        "SALIDA_SIN_PYC": html.escape(ejecutar_java("pruebas/sin-punto-y-coma.sql")),
        "CODIGO_LEX": html.escape(leer("src/sql/Sql.lex").rstrip()),
        "CODIGO_CUP": html.escape(leer("src/sql/Sql.cup").rstrip()),
        "CODIGO_MAIN": html.escape(leer("src/sql/Main.java").rstrip()),
        "CODIGO_ANALISIS": html.escape(leer("src/sql/Analisis.java").rstrip()),
    }
    texto = leer("herramientas/informe/plantilla.html")
    for clave, valor in reemplazos.items():
        texto = texto.replace("{{" + clave + "}}", valor)
    if "{{" in texto:
        sys.exit("Quedaron marcadores sin reemplazar en la plantilla")
    with open(os.path.join(DOCS, "informe.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(texto)
    print("docs/informe.html generado")

    if os.path.exists(EDGE):
        subprocess.run([EDGE, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                        "--print-to-pdf=" + os.path.join(DOCS, "informe.pdf"),
                        "file:///" + os.path.join(DOCS, "informe.html").replace("\\", "/")],
                       check=True, capture_output=True)
        print("docs/informe.pdf generado")
    else:
        print("No se encontró Microsoft Edge: informe.pdf no se regeneró")


if __name__ == "__main__":
    main()
