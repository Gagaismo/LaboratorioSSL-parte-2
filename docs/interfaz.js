// Interfaz gráfica: analiza el texto del área de edición y muestra el informe
// por sentencia, el árbol sintáctico, los tokens, la traza LALR y las tablas.

(function () {
  "use strict";

  var T = AnalizadorSQL.TABLAS;
  var esc = Vistas.esc;
  var $ = function (id) { return document.getElementById(id); };
  var resultado = null;

  function tex(destino, formulas) {
    destino.innerHTML = "";
    formulas.forEach(function (f) {
      var div = document.createElement("div");
      if (window.katex) katex.render(f, div, { displayMode: true, throwOnError: false, strict: "ignore" });
      else div.textContent = f;
      destino.appendChild(div);
    });
  }

  function tablaHTML(titulos, filas, claseFila) {
    var h = "<thead><tr>" + titulos.map(function (t) { return "<th>" + t + "</th>"; }).join("") + "</tr></thead><tbody>";
    filas.forEach(function (f, i) {
      var c = claseFila ? claseFila(i) : "";
      h += "<tr" + (c ? ' class="' + c + '"' : "") + ">" + f.map(function (celda) {
        return typeof celda === "object" ? "<td class=\"" + celda.clase + "\">" + celda.html + "</td>" : "<td>" + esc(celda) + "</td>";
      }).join("") + "</tr>";
    });
    return h + "</tbody>";
  }

  // ---------- Resultado del análisis ----------

  // Texto de la sentencia tal como está en el archivo, con los errores marcados.
  function fuenteMarcada(s) {
    var fuente = resultado.analisis.fuente;
    var marcas = s.errores.map(function (e) {
      return { desde: Math.max(e.posicion, s.inicio), hasta: e.posicion + e.largo, tipo: e.tipo };
    }).sort(function (a, b) { return a.desde - b.desde; });
    var html = "", pos = s.inicio;
    marcas.forEach(function (m) {
      if (m.desde < pos) return;
      html += esc(fuente.substring(pos, m.desde));
      var trozo = fuente.substring(m.desde, Math.min(m.hasta, s.fin));
      html += '<mark class="' + (m.tipo === "léxico" ? "lexico" : "sintactico") + '" title="Error ' + m.tipo + '">'
              + (trozo ? esc(trozo) : "&#9251;") + "</mark>";
      pos = Math.max(m.hasta, m.desde);
    });
    if (pos < s.fin) html += esc(fuente.substring(pos, s.fin));
    return html;
  }

  function mostrarResumen() {
    var a = resultado.analisis, n = a.sentencias.length, mal = n - a.correctas;
    var div = $("resumen");
    div.hidden = false;
    div.className = "resultado " + (a.hayErrores() || mal ? "error" : "ok");
    if (n === 0 && !a.hayErrores()) {
      div.innerHTML = "No se encontraron sentencias en el archivo.";
      return;
    }
    div.innerHTML = "<b>" + n + "</b> sentencia(s) · <b>" + a.correctas + "</b> correcta(s) · <b>" + mal
      + "</b> incorrecta(s) · errores léxicos: <b>" + a.erroresLexicos + "</b> · errores sintácticos: <b>"
      + a.erroresSintacticos + "</b>";
  }

  function mostrarSentencias() {
    var a = resultado.analisis;
    var html = a.sentencias.map(function (s) {
      var estado = s.correcta ? "ok" : "error";
      return '<article class="sentencia ' + estado + '" data-n="' + s.numero + '" tabindex="0">'
        + '<div class="cabecera"><span>[' + s.numero + "] Línea " + s.linea + "</span>"
        + (s.tipo ? '<span class="tipo">' + s.tipo + "</span>" : "")
        + '<span class="veredicto">' + (s.correcta ? "✔ Correcta" : "✘ Incorrecta") + "</span></div>"
        + '<pre class="codigo">' + fuenteMarcada(s) + "</pre>"
        + (s.errores.length ? '<ul class="errores">' + s.errores.map(function (e) {
            return '<li class="' + (e.tipo === "léxico" ? "lexico" : "sintactico") + '">' + esc(e.texto) + "</li>";
          }).join("") + "</ul>" : "")
        + '<div class="pie">' + esc(s.veredicto) + ' <a href="#arbol-panel" data-arbol="' + s.numero + '">Ver árbol</a></div>'
        + "</article>";
    }).join("");
    if (a.fueraDeSentencia.length) {
      html += '<article class="sentencia error"><div class="cabecera"><span>Fuera de toda sentencia</span></div><ul class="errores">'
        + a.fueraDeSentencia.map(function (e) { return "<li>" + esc(e.texto) + "</li>"; }).join("") + "</ul></article>";
    }
    $("sentencias").innerHTML = html;
    $("salida-texto").textContent = "Procesando archivo: entrada.sql\n\n" + a.texto();
  }

  function mostrarSelectorArbol() {
    var sel = $("elegir-sentencia");
    sel.innerHTML = resultado.analisis.sentencias.map(function (s) {
      var t = s.texto.length > 70 ? s.texto.slice(0, 67) + "..." : s.texto;
      return '<option value="' + s.numero + '">[' + s.numero + "] " + esc(t) + "</option>";
    }).join("");
    mostrarArbol(1);
  }

  function mostrarArbol(n) {
    var s = resultado.analisis.sentencias[n - 1];
    $("elegir-sentencia").value = String(n);
    $("arbol").innerHTML = s && s.arbol ? Vistas.arbolSVG(s.arbol)
      : '<p class="tenue">No hay sentencias analizadas.</p>';
  }

  function mostrarTokens() {
    var a = resultado.analisis;
    var filas = resultado.tokens.map(function (t, i) {
      var ubic = a.linea(t.izquierda) + ":" + a.columna(t.izquierda);
      if (t.error) {
        return [i + 1, ubic, { clase: "mono izq", html: esc(t.valor) }, "error léxico", Vistas.ERRORES_LEXICOS[t.error]];
      }
      var nombre = T.terminales[t.sym];
      return [i + 1, ubic, { clase: "mono izq", html: esc(t.valor) }, nombre, Vistas.categoria(nombre)];
    });
    $("tokens").innerHTML = tablaHTML(["N°", "Línea:col", "Lexema", "Token", "Categoría"], filas,
      function (i) { return resultado.tokens[i].error ? "rechazo" : ""; });
  }

  function mostrarTraza() {
    var filas = resultado.traza.map(function (p, i) {
      return [i + 1, { clase: "mono izq", html: esc(p.pila) }, { clase: "mono", html: esc(p.entrada) },
              { clase: "izq", html: esc(p.accion) }];
    });
    $("traza").innerHTML = tablaHTML(["Paso", "Pila (símbolo estado)", "Entrada", "Acción"], filas, function (i) {
      var t = resultado.traza[i].tipo;
      return t === "error" ? "rechazo" : t === "aceptar" ? "aceptacion" : "";
    });
    $("traza-nota").textContent = resultado.trazaCompleta ? resultado.traza.length + " pasos."
      : "Se muestran los primeros " + resultado.traza.length + " pasos.";
  }

  function analizar() {
    resultado = AnalizadorSQL.analizar($("fuente").value);
    mostrarResumen();
    mostrarSentencias();
    mostrarSelectorArbol();
    mostrarTokens();
    mostrarTraza();
  }

  // ---------- Especificación y tabla (no dependen de la entrada) ----------

  function mostrarEspecificacion() {
    tex($("er"), [
      "L = [\\mathtt{A\\text{-}Z\\,a\\text{-}z\\,\\_}] \\qquad D = [\\mathtt{0\\text{-}9}] \\qquad"
        + " c_s = \\text{comilla simple} \\qquad c_d = \\text{comilla doble}",
      "\\mathrm{IDENTIFICADOR} = L\\,(L \\mid D)^{*} \\;\\mid\\; c_d\\,(\\Sigma - \\{c_d, \\text{fin de línea}\\})^{+}\\,c_d",
      "\\mathrm{ENTERO} = D^{+} \\qquad \\mathrm{CADENA} = c_s\\,\\big((\\Sigma - \\{c_s, \\text{fin de línea}\\}) \\mid c_s c_s\\big)^{*}\\,c_s",
      "\\text{Palabras reservadas (sin distinguir mayúsculas): } \\mathrm{SELECT, FROM, WHERE, INSERT, INTO, VALUES, UPDATE, SET, DELETE, AND, OR, NOT}"
    ]);
    var patrones = [
      ["SELECT … NOT", '"SELECT", "FROM", … (con %ignorecase)', "palabras reservadas", "select, Where"],
      ["IGUAL MENOR MAYOR MENORIGUAL MAYORIGUAL", '"=" "<" ">" "<=" ">="', "operadores relacionales", "<="],
      ["MAS MENOS ASTERISCO DIVISION", '"+" "-" "*" "/"', "operadores aritméticos", "*"],
      ["COMA PTOCOMA LPAREN RPAREN", '"," ";" "(" ")"', "separadores", ";"],
      ["IDENTIFICADOR", "{LETRA}({LETRA}|{DIGITO})*", "nombres de tablas y columnas", "agenda_telefonica"],
      ["IDENTIFICADOR", '\\"[^\\"\\r\\n]+\\"', "identificador con espacios", '"nombre completo"'],
      ["ENTERO", "{DIGITO}+", "constante entera", "50000"],
      ["CADENA", "'([^'\\r\\n]|'')*'", "constante cadena", "'It''s ok'"],
      ["(se descarta)", '[\\ \\t\\r\\n\\f]+ y "--"[^\\r\\n]*', "espacios y comentarios", "-- nota"],
      ["(error léxico)", "'([^'\\r\\n]|'')*  y  .", "cadena sin cerrar, carácter inválido", "@  #  'abc"]
    ];
    $("tabla-tokens").innerHTML = tablaHTML(["Token", "Patrón en Sql.lex", "Descripción", "Ejemplo"],
      patrones.map(function (p) {
        return [{ clase: "mono izq", html: esc(p[0]) }, { clase: "mono izq", html: esc(p[1]) }, { clase: "izq", html: esc(p[2]) },
                { clase: "mono izq", html: esc(p[3]) }];
      }));

    var vn = T.noTerminales.slice(1), vt = T.terminales.filter(function (t) { return t !== "EOF" && t !== "error"; });
    var conjunto = function (lista, porLinea) {
      var filas = [];
      for (var i = 0; i < lista.length; i += porLinea) {
        filas.push(lista.slice(i, i + porLinea).map(function (x) { return "\\mathrm{" + x.replace(/_/g, "\\_") + "}"; }).join(",\\ "));
      }
      return "\\left\\{\\begin{array}{l}" + filas.join(",\\\\") + "\\end{array}\\right\\}";
    };
    tex($("gic"), [
      "G = \\langle V_N,\\ V_T,\\ P,\\ \\mathrm{programa} \\rangle",
      "V_N = " + conjunto(vn, 6),
      "V_T = " + conjunto(vt, 8),
      "|P| = " + (T.producciones.length - 1) + " \\text{ producciones (más } \\$START \\to \\mathrm{programa\\ EOF} \\text{, que agrega CUP)}"
    ]);
    $("bnf").textContent = Vistas.bnfTexto();
  }

  function mostrarTablaLALR() {
    var acc = Vistas.columnasAccion(), ira = Vistas.columnasIrA();
    var cab = "<thead><tr><th rowspan=\"2\">Estado</th><th colspan=\"" + acc.length + "\">ACCIÓN</th><th colspan=\"" + ira.length
      + "\">IR-A</th></tr><tr>" + acc.map(function (t) { return '<th class="mono">' + esc(T.terminales[t]) + "</th>"; }).join("")
      + ira.map(function (n) { return '<th class="mono">' + esc(T.noTerminales[n]) + "</th>"; }).join("") + "</tr></thead>";
    var cuerpo = T.acciones.map(function (_, e) {
      return "<tr><th>" + e + "</th>" + Vistas.filaAccion(e).map(function (c) {
        return '<td class="' + (c[0] === "d" ? "desplazar" : c[0] === "r" ? "reducir" : c === "acc" ? "aceptar" : "") + '">' + c + "</td>";
      }).join("") + Vistas.filaIrA(e).map(function (c) { return '<td class="ira">' + c + "</td>"; }).join("") + "</tr>";
    }).join("");
    $("lalr").innerHTML = cab + "<tbody>" + cuerpo + "</tbody>";
    $("producciones").textContent = T.producciones.map(function (p, i) { return "r" + i + "  " + p.texto; }).join("\n");
  }

  // ---------- Eventos ----------

  $("analizar").addEventListener("click", analizar);
  $("fuente").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); analizar(); }
  });
  document.querySelectorAll("[data-ejemplo]").forEach(function (b) {
    b.addEventListener("click", function () { $("fuente").value = EJEMPLOS[b.dataset.ejemplo]; analizar(); });
  });
  $("archivo").addEventListener("change", function () {
    var f = this.files[0];
    if (!f) return;
    var lector = new FileReader();
    lector.onload = function () {
      $("fuente").value = String(lector.result).replace(/^﻿/, "");
      analizar();
    };
    lector.readAsText(f, "UTF-8");
    this.value = "";
  });
  $("elegir-sentencia").addEventListener("change", function () { mostrarArbol(parseInt(this.value, 10)); });
  $("sentencias").addEventListener("click", function (e) {
    var enlace = e.target.closest("[data-arbol]");
    if (enlace) mostrarArbol(parseInt(enlace.dataset.arbol, 10));
  });

  // index.html#invalidas (o #sin-punto-y-coma) abre directamente ese ejemplo.
  var inicial = decodeURIComponent(location.hash.slice(1));
  $("fuente").value = EJEMPLOS[inicial] || EJEMPLOS.validas;
  mostrarEspecificacion();
  mostrarTablaLALR();
  analizar();
})();
