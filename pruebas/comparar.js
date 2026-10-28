// Verifica que la interfaz web (docs/analizador.js) produzca exactamente el
// mismo informe que el analizador en Java para cada archivo .sql dado.
// Uso: node pruebas/comparar.js pruebas/*.sql   (después de construir.bat)
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
global.TABLAS = require("../docs/tablas.js");
const { analizar } = require("../docs/analizador.js");

const separador = process.platform === "win32" ? ";" : ":";
const clases = ["build/clases", "build/herramientas"].join(separador);
let fallas = 0;

// docs/ejemplos.js debe tener el mismo contenido que los archivos de pruebas/.
const EJEMPLOS = require("../docs/ejemplos.js");
for (const nombre of Object.keys(EJEMPLOS)) {
  const archivo = path.join(__dirname, nombre + ".sql");
  const igual = fs.readFileSync(archivo, "utf8").replace(/\r\n/g, "\n") === EJEMPLOS[nombre];
  if (!igual) fallas++;
  console.log((igual ? "OK      " : "DIFIERE ") + "docs/ejemplos.js [" + nombre + "] = pruebas/" + nombre + ".sql");
}

for (const archivo of process.argv.slice(2)) {
  let java;
  try {
    java = execFileSync("java", ["-Dstdout.encoding=UTF-8", "-cp", clases, "sql.Main", archivo], { encoding: "utf8" });
  } catch (e) {
    java = e.stdout; // sql.Main sale con código 1 cuando hay errores
  }
  java = java.replace(/\r\n/g, "\n");
  let fuente = fs.readFileSync(archivo, "utf8");
  if (fuente.charCodeAt(0) === 0xfeff) fuente = fuente.slice(1);
  const web = "Procesando archivo: " + archivo + "\n\n" + analizar(fuente).analisis.texto();
  if (java === web) {
    console.log("OK      " + archivo);
  } else {
    fallas++;
    console.log("DIFIERE " + archivo);
    const a = java.split("\n"), b = web.split("\n");
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) { console.log("  java: " + a[i] + "\n  web:  " + b[i]); break; }
    }
  }
}
process.exit(fallas ? 1 : 0);
