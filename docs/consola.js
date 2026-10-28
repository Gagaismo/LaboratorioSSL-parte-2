// Consola estilo TUI: se escriben sentencias SQL (terminadas en ';', pueden
// ocupar varias líneas) o comandos, y se muestra el mismo informe que sql.Main.

(function () {
  "use strict";

  var T = AnalizadorSQL.TABLAS;
  var esc = Vistas.esc;
  var salida = document.getElementById("salida");
  var entrada = document.getElementById("entrada");
  var prompt = document.getElementById("prompt");
  var estadoBarra = document.getElementById("estado");

  var config = { tokens: false, arbol: false, traza: false };
  var historial = [], posHistorial = 0;
  var pendiente = [];          // líneas de una sentencia que todavía no terminó en ';'
  var ultimo = null;           // último resultado, para "arbol N"

  var PROMPT = "sql&gt;", PROMPT_CONTINUA = "&nbsp;&nbsp;-&gt;";

  function escribir(html, clase) {
    var div = document.createElement("div");
    div.className = "linea" + (clase ? " " + clase : "");
    div.innerHTML = html;
    salida.appendChild(div);
    salida.scrollTop = salida.scrollHeight;
  }
  function bloque(html, clase) { escribir("<pre" + (clase ? ' class="' + clase + '"' : "") + ">" + html + "</pre>"); }

  // Tabla con caracteres de recuadro.
  function tabla(titulos, filas, marcar) {
    var anchos = titulos.map(function (t, i) {
      return Math.max.apply(null, [t.length].concat(filas.map(function (f) { return String(f[i]).length; })));
    });
    function linea(a, b, c) { return a + anchos.map(function (w) { return "─".repeat(w + 2); }).join(b) + c; }
    function fila(celdas) {
      return "│" + celdas.map(function (c, i) {
        c = String(c);
        return " " + c + " ".repeat(anchos[i] - c.length) + " ";
      }).join("│") + "│";
    }
    var out = [esc(linea("┌", "┬", "┐")), esc(fila(titulos)), esc(linea("├", "┼", "┤"))];
    filas.forEach(function (f, i) {
      var t = esc(fila(f)), clase = marcar ? marcar(i) : "";
      out.push(clase ? '<span class="' + clase + '">' + t + "</span>" : t);
    });
    out.push(esc(linea("└", "┴", "┘")));
    return out.join("\n");
  }

  // ---------- Análisis ----------

  function analizarTexto(texto, nombre) {
    var r = AnalizadorSQL.analizar(texto);
    ultimo = r;
    var a = r.analisis;
    if (config.tokens) {
      escribir("Tokens (scanner generado por JLex):", "tenue");
      bloque(tabla(["N°", "Lín:col", "Lexema", "Token"], r.tokens.map(function (t, i) {
        return [i + 1, a.linea(t.izquierda) + ":" + a.columna(t.izquierda), t.valor,
                t.error ? "error léxico: " + Vistas.ERRORES_LEXICOS[t.error] : T.terminales[t.sym]];
      }), function (i) { return r.tokens[i].error ? "aviso" : ""; }));
    }
    if (config.traza) {
      escribir("Traza del parser LALR(1)" + (r.trazaCompleta ? "" : " (primeros " + r.traza.length + " pasos)") + ":", "tenue");
      bloque(tabla(["Paso", "Pila", "Entrada", "Acción"], r.traza.map(function (p, i) {
        return [i + 1, p.pila, p.entrada, p.accion];
      }), function (i) { return r.traza[i].tipo === "error" ? "error" : r.traza[i].tipo === "aceptar" ? "ok" : ""; }));
    }
    if (nombre) escribir("Procesando archivo: " + esc(nombre), "tenue");
    a.sentencias.forEach(function (s) {
      escribir("[" + s.numero + "] Línea " + s.linea + ": " + esc(s.texto));
      s.errores.forEach(function (e) {
        escribir("    " + esc(e.texto), e.tipo === "léxico" ? "aviso" : "error");
      });
      escribir("    " + (s.correcta ? "✔ " : "✘ ") + esc(s.veredicto), s.correcta ? "ok" : "error");
      if (config.arbol && s.arbol) bloque(esc(indentar(Vistas.arbolTexto(s.arbol))), "titulo");
    });
    if (a.fueraDeSentencia.length) {
      escribir("[-] Fuera de toda sentencia:");
      a.fueraDeSentencia.forEach(function (e) { escribir("    " + esc(e.texto), "error"); });
    }
    var n = a.sentencias.length;
    if (n === 0 && !a.hayErrores()) {
      escribir("No se encontraron sentencias.", "tenue");
    } else {
      escribir("Resumen: " + n + " sentencia(s), " + a.correctas + " correcta(s), " + (n - a.correctas)
               + " incorrecta(s). Errores léxicos: " + a.erroresLexicos + ". Errores sintácticos: "
               + a.erroresSintacticos + ".", a.hayErrores() || a.correctas < n ? "error" : "ok");
    }
  }

  function indentar(texto) {
    return texto.split("\n").map(function (l) { return "    " + l; }).join("\n");
  }

  // ---------- Comandos ----------

  var comandos = {
    ayuda: function () {
      bloque(esc([
        "Escribí sentencias SQL terminadas en ';' (pueden ocupar varias líneas; el prompt cambia a -> hasta el ';').",
        "Ejemplo: SELECT nombre, apellido FROM personas WHERE edad >= 18;",
        "",
        "Comandos:",
        "  ejemplo validas|errores|sin-pyc   Analiza uno de los archivos de prueba (pruebas/*.sql).",
        "  archivo                           Elige un archivo .sql de tu equipo y lo analiza.",
        "  tokens on|off                     Muestra la secuencia de tokens del scanner (JLex).",
        "  arbol on|off                      Muestra el árbol de análisis sintáctico de cada sentencia.",
        "  arbol <n>                         Muestra el árbol de la sentencia n del último análisis.",
        "  traza on|off                      Muestra la traza del parser LALR(1) (pila, entrada, acción).",
        "  gramatica                         Muestra la GIC en BNF (Sql.cup).",
        "  lexico                            Muestra las expresiones regulares de los tokens (Sql.lex).",
        "  producciones                      Lista las producciones numeradas como en la tabla LALR.",
        "  estado <n>                        Muestra la fila ACCIÓN / IR-A del estado n de la tabla LALR(1).",
        "  cancelar                          Descarta la sentencia que se estaba escribiendo.",
        "  limpiar                           Limpia la pantalla.",
        "",
        "Atajos: F1 ayuda · F2 válidas · F3 con errores · F4 gramática · F5 tokens · F6 árbol · F7 traza",
        "        ↑↓ historial · Ctrl+L limpiar · Esc cancelar"
      ].join("\n")));
    },

    ejemplo: function (arg) {
      var nombres = { validas: "validas", errores: "invalidas", invalidas: "invalidas", "sin-pyc": "sin-punto-y-coma",
                      "sin-punto-y-coma": "sin-punto-y-coma" };
      var clave = nombres[arg || "validas"];
      if (!clave) return escribir("Uso: ejemplo validas|errores|sin-pyc", "error");
      var texto = EJEMPLOS[clave];
      bloque(esc(texto.replace(/\s+$/, "")), "tenue");
      analizarTexto(texto, "pruebas/" + clave + ".sql");
    },

    archivo: function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".sql,.txt,text/plain";
      input.onchange = function () {
        var f = input.files[0];
        if (!f) return;
        var lector = new FileReader();
        lector.onload = function () { analizarTexto(String(lector.result).replace(/^﻿/, ""), f.name); };
        lector.readAsText(f, "UTF-8");
      };
      input.click();
    },

    tokens: function (arg) { alternar("tokens", arg); },
    traza: function (arg) { alternar("traza", arg); },

    arbol: function (arg) {
      if (/^\d+$/.test(arg)) {
        var s = ultimo && ultimo.analisis.sentencias[parseInt(arg, 10) - 1];
        if (!s) return escribir("No hay una sentencia " + esc(arg) + " en el último análisis.", "error");
        escribir("[" + s.numero + "] " + esc(s.texto));
        return bloque(esc(indentar(Vistas.arbolTexto(s.arbol))), "titulo");
      }
      alternar("arbol", arg);
    },

    gramatica: function () {
      escribir("GIC G = ⟨VN, VT, P, programa⟩ en BNF (λ = cadena vacía):", "tenue");
      bloque(esc(Vistas.bnfTexto()));
      escribir("Precedencia (de menor a mayor): OR < AND < NOT (derecha) < + - < * /   (todas asociativas a izquierda salvo NOT)", "tenue");
    },

    lexico: function () {
      escribir("Expresiones regulares de Sql.lex (JLex, con %ignorecase):", "tenue");
      bloque(tabla(["Token", "Expresión regular"], [
        ["SELECT FROM WHERE INSERT INTO", '"SELECT" "FROM" "WHERE" "INSERT" "INTO"'],
        ["VALUES UPDATE SET DELETE", '"VALUES" "UPDATE" "SET" "DELETE"'],
        ["AND OR NOT", '"AND" "OR" "NOT"'],
        ["MENORIGUAL MAYORIGUAL MENOR MAYOR IGUAL", '"<=" ">=" "<" ">" "="'],
        ["MAS MENOS ASTERISCO DIVISION", '"+" "-" "*" "/"'],
        ["COMA PTOCOMA LPAREN RPAREN", '"," ";" "(" ")"'],
        ["IDENTIFICADOR", "[A-Za-z_]([A-Za-z_]|[0-9])*  |  \\\"[^\\\"\\r\\n]+\\\""],
        ["ENTERO", "[0-9]+"],
        ["CADENA", "'([^'\\r\\n]|'')*'"],
        ["(se ignora)", '[\\ \\t\\r\\n\\f]+   y   "--"[^\\r\\n]*'],
        ["(error léxico)", "'([^'\\r\\n]|'')*  (cadena sin cerrar)   y   .  (cualquier otro carácter)"]
      ]));
      escribir("Ante dos reglas que reconocen el mismo lexema más largo gana la que aparece primero:"
               + " por eso las palabras reservadas van antes que IDENTIFICADOR.", "tenue");
    },

    producciones: function () {
      bloque(esc(T.producciones.map(function (p, i) { return ("r" + i).padEnd(4) + p.texto; }).join("\n")));
    },

    estado: function (arg) {
      var e = parseInt(arg, 10);
      if (!/^\d+$/.test(arg || "") || e >= T.acciones.length) {
        return escribir("Uso: estado <n>   (0 a " + (T.acciones.length - 1) + ")", "error");
      }
      var acc = Vistas.filaAccion(e), ira = Vistas.filaIrA(e), filas = [];
      Vistas.columnasAccion().forEach(function (t, i) { if (acc[i]) filas.push(["ACCIÓN", T.terminales[t], describirAccion(acc[i])]); });
      Vistas.columnasIrA().forEach(function (n, i) { if (ira[i]) filas.push(["IR-A", T.noTerminales[n], "ir al estado " + ira[i]]); });
      escribir("Estado " + e + " de la tabla LALR(1) (los terminales no listados son error):", "tenue");
      bloque(tabla(["Tabla", "Símbolo", "Acción"], filas));
    },

    cancelar: function () { pendiente = []; actualizarPrompt(); escribir("Sentencia descartada.", "tenue"); },
    limpiar: function () { salida.innerHTML = ""; }
  };
  var alias = { help: "ayuda", "?": "ayuda", clear: "limpiar", cls: "limpiar", "árbol": "arbol", "gramática": "gramatica",
                "léxico": "lexico", ejemplos: "ejemplo" };

  function describirAccion(c) {
    if (c === "acc") return "aceptar";
    if (c[0] === "d") return "desplazar e ir al estado " + c.slice(1);
    return "reducir con " + c + ": " + T.producciones[parseInt(c.slice(1), 10)].texto;
  }

  function alternar(opcion, arg) {
    if (arg !== "on" && arg !== "off") return escribir("Uso: " + opcion + " on|off   (actual: " + (config[opcion] ? "on" : "off") + ")", "error");
    config[opcion] = arg === "on";
    escribir(opcion + " " + arg);
    actualizarEstado();
  }

  function esComando(linea) {
    var m = /^\s*(\S+)/.exec(linea);
    if (!m) return false;
    var nombre = m[1].toLowerCase();
    return !!comandos[alias[nombre] || nombre];
  }

  function ejecutar(linea) {
    escribir('<span class="prompt">' + (pendiente.length ? PROMPT_CONTINUA : PROMPT) + "</span> " + esc(linea));
    if (pendiente.length === 0 && esComando(linea)) {
      var m = /^\s*(\S+)\s*(.*)$/.exec(linea), nombre = m[1].toLowerCase();
      comandos[alias[nombre] || nombre](m[2].trim());
      return;
    }
    if (pendiente.length > 0 && /^\s*cancelar\s*$/i.test(linea)) return comandos.cancelar();
    pendiente.push(linea);
    var texto = pendiente.join("\n");
    // La sentencia se analiza cuando la última línea termina en ';'.
    if (/;\s*$/.test(texto)) {
      pendiente = [];
      actualizarPrompt();
      analizarTexto(texto);
    } else {
      actualizarPrompt();
    }
  }

  function actualizarPrompt() { prompt.innerHTML = pendiente.length ? PROMPT_CONTINUA : PROMPT; }

  function actualizarEstado() {
    estadoBarra.textContent = "tokens " + (config.tokens ? "on" : "off") + " · árbol " + (config.arbol ? "on" : "off")
      + " · traza " + (config.traza ? "on" : "off");
  }

  entrada.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var linea = entrada.value;
      entrada.value = "";
      if (!linea.trim() && pendiente.length === 0) return;
      if (linea.trim()) { historial.push(linea); posHistorial = historial.length; }
      ejecutar(linea);
    } else if (e.key === "ArrowUp") {
      if (posHistorial > 0) entrada.value = historial[--posHistorial];
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      posHistorial = Math.min(historial.length, posHistorial + 1);
      entrada.value = historial[posHistorial] || "";
      e.preventDefault();
    } else if (e.key === "Escape" && pendiente.length) {
      e.preventDefault();
      comandos.cancelar();
    }
  });

  var atajos = {
    F1: "ayuda", F2: "ejemplo validas", F3: "ejemplo errores", F4: "gramatica",
    F5: function () { return "tokens " + (config.tokens ? "off" : "on"); },
    F6: function () { return "arbol " + (config.arbol ? "off" : "on"); },
    F7: function () { return "traza " + (config.traza ? "off" : "on"); }
  };
  function atajo(tecla) {
    var c = atajos[tecla];
    if (pendiente.length) comandos.cancelar();
    ejecutar(typeof c === "function" ? c() : c);
  }
  document.addEventListener("keydown", function (e) {
    if (atajos[e.key]) {
      e.preventDefault();
      atajo(e.key);
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      comandos.limpiar();
    }
  });
  document.querySelectorAll("[data-tecla]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.tecla === "L") comandos.limpiar();
      else atajo(b.dataset.tecla);
      entrada.focus();
    });
  });
  salida.addEventListener("click", function () { if (!window.getSelection().toString()) entrada.focus(); });

  var banner = [
    "UTN FRT · Sintaxis y Semántica de los Lenguajes · 2do Parcial",
    "Analizador Sintáctico del LMD de SQL",
    "Scanner: JLex (Sql.lex)  ·  Parser LALR(1): CUP (Sql.cup)"
  ];
  var ancho = Math.max.apply(null, banner.map(function (s) { return s.length; })) + 4;
  escribir(esc(["╔" + "═".repeat(ancho) + "╗"]
    .concat(banner.map(function (s) { return "║  " + s + " ".repeat(ancho - s.length - 2) + "║"; }))
    .concat(["╚" + "═".repeat(ancho) + "╝"]).join("\n")), "pre titulo");
  escribir('Escribí una sentencia SQL terminada en ";" o <span class="cmd">ayuda</span> para ver los comandos.'
           + ' Probá <span class="cmd">ejemplo errores</span>.', "tenue");
  actualizarEstado();
  // consola.html#ejemplo%20errores ejecuta ese comando (varios separados por "|").
  if (location.hash.length > 1) {
    decodeURIComponent(location.hash.slice(1)).split("|").forEach(function (c) { ejecutar(c.trim()); });
  }
  entrada.focus();
})();
