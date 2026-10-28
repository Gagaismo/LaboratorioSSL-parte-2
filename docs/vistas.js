// Vistas compartidas por la interfaz gráfica y la consola: gramática en BNF,
// tabla LALR(1), descripción de tokens y árbol de análisis sintáctico.

var Vistas = (function () {
  "use strict";

  var T = AnalizadorSQL.TABLAS;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ---------- Gramática ----------

  // Producciones agrupadas por no terminal, con su número (el de CUP).
  function gramatica() {
    var grupos = [], porNombre = {};
    T.producciones.forEach(function (p, i) {
      var partes = p.texto.split("::=");
      var izq = partes[0].trim(), der = partes[1].trim();
      if (!porNombre[izq]) { porNombre[izq] = { izquierda: izq, alternativas: [] }; grupos.push(porNombre[izq]); }
      porNombre[izq].alternativas.push({ numero: i, derecha: der === "" ? "λ" : der });
    });
    return grupos;
  }

  function bnfTexto() {
    var ancho = Math.max.apply(null, gramatica().map(function (g) { return g.izquierda.length; }));
    var lineas = [];
    gramatica().forEach(function (g) {
      g.alternativas.forEach(function (a, k) {
        var izq = k === 0 ? g.izquierda + " ".repeat(ancho - g.izquierda.length) + " ::= " : " ".repeat(ancho) + "   | ";
        lineas.push(izq + a.derecha);
      });
    });
    return lineas.join("\n");
  }

  // ---------- Tabla LALR(1) ----------

  function columnasAccion() {
    return T.terminales.map(function (t, i) { return i; });
  }
  function columnasIrA() {
    return T.noTerminales.map(function (n, i) { return i; }).filter(function (i) { return i !== 0; });
  }

  // Celdas ACCIÓN del estado: dN = desplazar e ir al estado N, rN = reducir
  // con la producción N, acc = aceptar.
  function filaAccion(estado) {
    var fila = T.acciones[estado], celdas = {}, defecto = "";
    for (var i = 0; i < fila.length; i += 2) {
      var v = fila[i + 1], texto = v > 0 ? "d" + (v - 1) : v < 0 ? (-v - 1 === T.produccionInicial ? "acc" : "r" + (-v - 1)) : "";
      if (fila[i] === -1) defecto = texto; else celdas[fila[i]] = texto;
    }
    return columnasAccion().map(function (t) { return celdas[t] !== undefined ? celdas[t] : defecto; });
  }

  function filaIrA(estado) {
    var fila = T.irA[estado], celdas = {};
    if (fila) for (var i = 0; i < fila.length; i += 2) if (fila[i] !== -1) celdas[fila[i]] = String(fila[i + 1]);
    return columnasIrA().map(function (n) { return celdas[n] || ""; });
  }

  // ---------- Tokens ----------

  var CATEGORIA = {
    IDENTIFICADOR: "identificador", ENTERO: "constante entera", CADENA: "constante cadena",
    IGUAL: "operador relacional", MENOR: "operador relacional", MAYOR: "operador relacional",
    MENORIGUAL: "operador relacional", MAYORIGUAL: "operador relacional",
    MAS: "operador aritmético", MENOS: "operador aritmético", ASTERISCO: "operador aritmético / todas las columnas",
    DIVISION: "operador aritmético", AND: "operador lógico", OR: "operador lógico", NOT: "operador lógico",
    COMA: "separador", PTOCOMA: "fin de sentencia", LPAREN: "paréntesis", RPAREN: "paréntesis"
  };
  function categoria(nombre) { return CATEGORIA[nombre] || "palabra reservada"; }

  var ERRORES_LEXICOS = {
    CARACTER_INVALIDO: "carácter no reconocido",
    CADENA_ABIERTA: "cadena sin cerrar",
    IDENTIFICADOR_ABIERTO: "identificador entre comillas sin cerrar"
  };

  // ---------- Árbol de análisis sintáctico ----------

  function etiqueta(n) { return n.simbolo; }
  function anchoTexto(s, px) { return String(s).length * px; }

  // Disposición simple: cada subárbol ocupa el ancho de sus hojas (o el de su
  // etiqueta si es mayor) y el padre queda centrado sobre sus hijos.
  function arbolSVG(raiz) {
    var SEP = 14, NIVEL = 62, ALTO = 26, PX = 7.6;
    var nodos = [], aristas = [], profundidadMax = 0;

    function medir(n) {
      var hoja = !n.hijos || n.hijos.length === 0;
      n._w = Math.max(anchoTexto(hoja && n.valor !== undefined ? n.valor : etiqueta(n), PX),
                      hoja && n.valor !== undefined ? anchoTexto(etiqueta(n), 6.2) : 0) + 16;
      var suma = 0;
      (n.hijos || []).forEach(function (h) { suma += medir(h); });
      n._span = Math.max(n._w + SEP, suma);
      return n._span;
    }
    function ubicar(n, x0, prof) {
      n._prof = prof;
      profundidadMax = Math.max(profundidadMax, prof);
      var hijos = n.hijos || [];
      if (hijos.length === 0) { n._x = x0 + n._span / 2; return; }
      var suma = hijos.reduce(function (s, h) { return s + h._span; }, 0);
      var x = x0 + (n._span - suma) / 2;
      hijos.forEach(function (h) { ubicar(h, x, prof + 1); x += h._span; });
      n._x = (hijos[0]._x + hijos[hijos.length - 1]._x) / 2;
    }
    function recolectar(n, padre) {
      nodos.push(n);
      if (padre) aristas.push([padre, n]);
      (n.hijos || []).forEach(function (h) { recolectar(h, n); });
    }
    medir(raiz);
    ubicar(raiz, 0, 0);
    recolectar(raiz, null);

    var ancho = raiz._span, alto = profundidadMax * NIVEL + ALTO + 34;
    var y = function (n) { return 16 + n._prof * NIVEL; };
    var svg = ['<svg class="arbol" viewBox="0 0 ' + ancho.toFixed(0) + " " + alto + '" width="' + ancho.toFixed(0)
               + '" role="img" aria-label="Árbol de análisis sintáctico">', '<g class="ramas">'];
    aristas.forEach(function (a) {
      svg.push('<line x1="' + a[0]._x.toFixed(1) + '" y1="' + (y(a[0]) + ALTO).toFixed(1) + '" x2="' + a[1]._x.toFixed(1)
               + '" y2="' + y(a[1]).toFixed(1) + '"/>');
    });
    svg.push("</g>");
    nodos.forEach(function (n) {
      var hoja = !n.hijos || n.hijos.length === 0;
      var clase = n.simbolo === "error" ? "error" : n.descartado ? "descartado" : n.vacio ? "vacio"
                  : hoja && n.valor !== undefined ? "hoja" : "no-terminal";
      var texto = hoja && n.valor !== undefined ? n.valor : etiqueta(n);
      var w = n._w;
      svg.push('<g class="' + clase + '"><rect x="' + (n._x - w / 2).toFixed(1) + '" y="' + y(n) + '" width="' + w.toFixed(1)
               + '" height="' + ALTO + '" rx="' + (hoja ? 3 : 12) + '"/>'
               + '<text x="' + n._x.toFixed(1) + '" y="' + (y(n) + 17) + '" text-anchor="middle">' + esc(texto) + "</text>"
               + (hoja && n.valor !== undefined ? '<text class="token" x="' + n._x.toFixed(1) + '" y="' + (y(n) + ALTO + 13)
                  + '" text-anchor="middle">' + esc(n.simbolo) + "</text>" : "")
               + "</g>");
    });
    svg.push("</svg>");
    return svg.join("");
  }

  // Árbol con caracteres de recuadro, para la consola.
  function arbolTexto(raiz) {
    var lineas = [];
    function nodoTexto(n) {
      var hoja = !n.hijos || n.hijos.length === 0;
      var t = hoja && n.valor !== undefined ? n.simbolo + "  " + n.valor : n.simbolo;
      return n.descartado && n.simbolo !== "error" ? t + "  (descartado)" : t;
    }
    function recorrer(n, prefijo, ultimo, raizNodo) {
      lineas.push(raizNodo ? nodoTexto(n) : prefijo + (ultimo ? "└─ " : "├─ ") + nodoTexto(n));
      var hijos = n.hijos || [];
      hijos.forEach(function (h, i) {
        recorrer(h, raizNodo ? "" : prefijo + (ultimo ? "   " : "│  "), i === hijos.length - 1, false);
      });
    }
    recorrer(raiz, "", true, true);
    return lineas.join("\n");
  }

  return {
    esc: esc, gramatica: gramatica, bnfTexto: bnfTexto,
    columnasAccion: columnasAccion, columnasIrA: columnasIrA, filaAccion: filaAccion, filaIrA: filaIrA,
    categoria: categoria, ERRORES_LEXICOS: ERRORES_LEXICOS,
    arbolSVG: arbolSVG, arbolTexto: arbolTexto
  };
})();
