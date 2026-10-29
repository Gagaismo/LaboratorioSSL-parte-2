// Analizador del LMD de SQL para la web.
// El scanner reproduce las reglas de src/sql/Sql.lex (JLex) y el parser
// ejecuta las tablas LALR que generó CUP (tablas.js) con el mismo algoritmo
// de java_cup.runtime.lr_parser, incluida la recuperación de errores.
// El informe de texto es idéntico al que imprime sql.Main en Java.

(function (global) {
  "use strict";

  const T = typeof TABLAS !== "undefined" ? TABLAS : require("./tablas.js");
  const NUM = {};
  T.terminales.forEach((nombre, i) => { NUM[nombre] = i; });

  // ---------------- Scanner (mismas reglas y orden que Sql.lex) ----------------

  const PALABRAS = ["SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE",
                    "SET", "DELETE", "AND", "OR", "NOT"];
  const REGLAS = [];
  PALABRAS.forEach(p => REGLAS.push({ re: new RegExp(p, "iy"), token: p }));
  [["<=", "MENORIGUAL"], [">=", "MAYORIGUAL"], ["<", "MENOR"], [">", "MAYOR"], ["=", "IGUAL"],
   ["+", "MAS"], ["-", "MENOS"], ["*", "ASTERISCO"], ["/", "DIVISION"], [",", "COMA"],
   [";", "PTOCOMA"], ["(", "LPAREN"], [")", "RPAREN"]].forEach(([s, t]) => {
    REGLAS.push({ re: new RegExp(s.replace(/[+*/()]/g, "\\$&"), "y"), token: t });
  });
  REGLAS.push(
    { re: /[A-Za-z_][A-Za-z_0-9]*/y, token: "IDENTIFICADOR" },
    { re: /"[^"\r\n]+"/y, token: "IDENTIFICADOR" },
    { re: /[0-9]+/y, token: "ENTERO" },
    { re: /'(?:[^'\r\n]|'')*'/y, token: "CADENA" },
    { re: /'(?:[^'\r\n]|'')*/y, error: "CADENA_ABIERTA" },
    { re: /"[^"\r\n]*/y, error: "IDENTIFICADOR_ABIERTO" },
    { re: /--[^\r\n]*/y, ignorar: true },
    { re: /[ \t\r\n\f]+/y, ignorar: true },
    { re: /[^\n]/y, error: "CARACTER_INVALIDO" }
  );

  class Lexico {
    constructor(fuente, analisis) {
      this.fuente = fuente;
      this.analisis = analisis;
      this.pos = 0;
      this.tokens = [];
    }

    // Como JLex: gana la coincidencia más larga y, a igual longitud, la regla
    // que aparece primero.
    siguiente() {
      const texto = this.fuente;
      while (this.pos < texto.length) {
        let mejor = null, largo = 0;
        for (const regla of REGLAS) {
          regla.re.lastIndex = this.pos;
          const m = regla.re.exec(texto);
          if (m && m[0].length > largo) { mejor = regla; largo = m[0].length; }
        }
        const inicio = this.pos;
        const lexema = texto.substr(inicio, largo);
        this.pos += largo;
        if (mejor.ignorar) continue;
        if (mejor.error) {
          this.analisis.errorLexico(inicio, mejor.error, lexema);
          this.tokens.push({ error: mejor.error, izquierda: inicio, derecha: this.pos, valor: lexema });
          continue;
        }
        this.analisis.registrarToken(inicio);
        const token = { sym: NUM[mejor.token], izquierda: inicio, derecha: this.pos, valor: lexema };
        this.tokens.push(token);
        return token;
      }
      const fin = { sym: T.EOF, izquierda: texto.length, derecha: texto.length, valor: "" };
      return fin;
    }
  }

  // ---------------- Informe (igual que src/sql/Analisis.java) ----------------

  const MOSTRAR = {
    IDENTIFICADOR: "identificador", ENTERO: "entero", CADENA: "cadena", EOF: "fin de archivo",
    IGUAL: "'='", MENOR: "'<'", MAYOR: "'>'", MENORIGUAL: "'<='", MAYORIGUAL: "'>='",
    MAS: "'+'", MENOS: "'-'", ASTERISCO: "'*'", DIVISION: "'/'", COMA: "','",
    PTOCOMA: "';'", LPAREN: "'('", RPAREN: "')'"
  };
  const mostrar = nombre => MOSTRAR[nombre] || nombre;

  function recortar(s) { // String.trim() de Java
    let i = 0, j = s.length;
    while (i < j && s.charCodeAt(i) <= 32) i++;
    while (j > i && s.charCodeAt(j - 1) <= 32) j--;
    return s.substring(i, j);
  }

  class Analisis {
    constructor(fuente) {
      this.fuente = fuente;
      this.lineas = [];
      this.inicioTokens = [];
      this.pendientes = [];
      this.proximoToken = 0;
      this.finAnterior = 0;
      this.sentencias = [];
      this.correctas = 0;
      this.erroresLexicos = 0;
      this.erroresSintacticos = 0;
      this.fueraDeSentencia = [];
    }

    longitud() { return this.fuente.length; }
    hayErrores() { return this.erroresLexicos + this.erroresSintacticos > 0; }
    registrarToken(pos) { this.inicioTokens.push(pos); }

    errorLexico(pos, tipo, lexema) {
      let detalle;
      if (tipo === "CADENA_ABIERTA") {
        detalle = "cadena sin cerrar " + lexema + " (falta la comilla simple de cierre)";
      } else if (tipo === "IDENTIFICADOR_ABIERTO") {
        detalle = "identificador entre comillas dobles sin cerrar o vacío " + lexema;
      } else {
        detalle = "carácter no reconocido '" + lexema + "'";
      }
      this.erroresLexicos++;
      this.pendientes.push({ posicion: pos, largo: lexema.length, tipo: "léxico",
        texto: "Error léxico (" + this.ubicacion(pos) + "): " + detalle + "." });
    }

    errorSintactico(actual, esperados) {
      this.erroresSintacticos++;
      let texto = "Error sintáctico (" + this.ubicacion(actual.izquierda) + "): no se esperaba "
                  + this.describir(actual) + ".";
      if (esperados.length > 0) {
        texto += " Se esperaba: ";
        esperados.forEach((t, i) => {
          if (i > 0) texto += i === esperados.length - 1 ? " o " : ", ";
          texto += mostrar(T.terminales[t]);
        });
        texto += ".";
      }
      this.pendientes.push({ posicion: actual.izquierda, largo: actual.derecha - actual.izquierda,
                             tipo: "sintáctico", texto });
    }

    cerrarSentencia(tipo, fin, arbol) {
      const errores = this.tomarErrores(fin);
      let veredicto, correcta = false;
      if (tipo === null) {
        veredicto = "Incorrecta.";
      } else if (errores.length > 0) {
        veredicto = "Incorrecta: la estructura de " + tipo + " es válida, pero tiene errores léxicos.";
      } else {
        veredicto = "Correcta: sentencia " + tipo + ".";
        correcta = true;
        this.correctas++;
      }
      this.informar(fin, errores, veredicto, tipo, correcta, arbol);
    }

    sinRecuperacion(arbol) {
      this.informar(this.fuente.length, this.tomarErrores(Infinity),
        "Incorrecta: el archivo terminó antes de cerrar la sentencia con ';'.", null, false, arbol);
    }

    finalizar() {
      if (this.pendientes.length > 0) {
        this.fueraDeSentencia = this.pendientes;
        this.pendientes = [];
      }
    }

    tomarErrores(fin) {
      const errores = [];
      while (this.pendientes.length > 0 && this.pendientes[0].posicion < fin) {
        errores.push(this.pendientes.shift());
      }
      return errores;
    }

    informar(fin, errores, veredicto, tipo, correcta, arbol) {
      while (this.proximoToken < this.inicioTokens.length
             && this.inicioTokens[this.proximoToken] < this.finAnterior) {
        this.proximoToken++;
      }
      let inicio = this.proximoToken < this.inicioTokens.length
        ? this.inicioTokens[this.proximoToken] : this.finAnterior;
      if (errores.length > 0 && errores[0].posicion < inicio) inicio = errores[0].posicion;
      this.sentencias.push({
        numero: this.sentencias.length + 1,
        linea: this.linea(inicio),
        inicio, fin,
        texto: recortar(this.fuente.substring(inicio, fin)).replace(/[ \t\n\x0B\f\r]+/g, " "),
        errores, veredicto, tipo, correcta, arbol
      });
      this.finAnterior = fin;
    }

    describir(simbolo) {
      const nombre = T.terminales[simbolo.sym];
      const lexema = simbolo.valor || "";
      if (nombre === "EOF") return "el fin del archivo";
      if (nombre === "IDENTIFICADOR") return "el identificador " + lexema;
      if (nombre === "ENTERO") return "el entero " + lexema;
      if (nombre === "CADENA") return "la cadena " + lexema;
      if (/^\p{L}/u.test(lexema)) return "la palabra reservada " + lexema.toUpperCase();
      return "el símbolo '" + lexema + "'";
    }

    linea(pos) {
      let linea = 1;
      for (let i = 0; i < pos && i < this.fuente.length; i++) {
        if (this.fuente.charCodeAt(i) === 10) linea++;
      }
      return linea;
    }

    columna(pos) {
      const inicioLinea = pos > 0 ? this.fuente.lastIndexOf("\n", pos - 1) + 1 : 0;
      return pos - inicioLinea + 1;
    }

    ubicacion(pos) {
      return "línea " + this.linea(pos) + ", columna " + this.columna(pos);
    }

    // El mismo texto que imprime sql.Main (sin el encabezado "Procesando archivo").
    texto() {
      const salida = [];
      for (const s of this.sentencias) {
        salida.push("[" + s.numero + "] Línea " + s.linea + ": " + s.texto);
        for (const e of s.errores) salida.push("    " + e.texto);
        salida.push("    " + s.veredicto);
        salida.push("");
      }
      if (this.fueraDeSentencia.length > 0) {
        salida.push("[-] Fuera de toda sentencia:");
        for (const e of this.fueraDeSentencia) salida.push("    " + e.texto);
        salida.push("");
      }
      const n = this.sentencias.length;
      if (n === 0 && !this.hayErrores()) {
        salida.push("No se encontraron sentencias en el archivo.");
      } else {
        salida.push("Resumen: " + n + " sentencia(s) analizada(s), " + this.correctas
          + " correcta(s), " + (n - this.correctas) + " incorrecta(s). "
          + "Errores léxicos: " + this.erroresLexicos + ". Errores sintácticos: "
          + this.erroresSintacticos + ".");
      }
      return salida.join("\n") + "\n";
    }
  }

  // ---------------- Parser LALR (java_cup.runtime.lr_parser) ----------------

  function accion(estado, simbolo) {
    const fila = T.acciones[estado];
    for (let i = 0; i < fila.length; i += 2) {
      if (fila[i] === simbolo || fila[i] === -1) return fila[i + 1];
    }
    return 0;
  }

  function irA(estado, noTerminal) {
    const fila = T.irA[estado];
    if (!fila) return -1;
    for (let i = 0; i < fila.length; i += 2) {
      if (fila[i] === noTerminal || fila[i] === -1) return fila[i + 1];
    }
    return -1;
  }

  const SENTENCIA = { sent_select: "SELECT", sent_insert: "INSERT", sent_update: "UPDATE",
                      sent_delete: "DELETE", sent_generica: "SQL", error: null };

  function nombreSimbolo(s) {
    return s.terminal ? T.terminales[s.sym] : T.noTerminales[s.sym];
  }

  function analizar(fuente) {
    const analisis = new Analisis(fuente);
    const lexico = new Lexico(fuente, analisis);
    const traza = [];
    const LIMITE_TRAZA = 3000;
    let pila, actual, terminado = false, aceptado = false;

    const nodoTerminal = t => ({ simbolo: T.terminales[t.sym], valor: t.valor, hijos: [] });

    function anotar(entrada, accionTexto, tipo) {
      if (traza.length >= LIMITE_TRAZA) return;
      traza.push({
        pila: pila.map(s => (s.estado === undefined ? "" : (s.sym === -1 ? "" : nombreSimbolo(s) + " ")) + s.estado).join(" "),
        entrada: entrada ? (entrada.sym === T.EOF ? "EOF" : entrada.valor) : "",
        accion: accionTexto,
        tipo
      });
    }

    function escanear() { return lexico.siguiente(); }

    function admite(terminal) {
      const estados = pila.map(s => s.estado);
      for (;;) {
        const act = accion(estados[estados.length - 1], terminal);
        if (act === 0) return false;
        if (act > 0) return true;
        const prod = -act - 1;
        if (prod === T.produccionInicial) return true;
        estados.length -= T.producciones[prod].longitud;
        estados.push(irA(estados[estados.length - 1], T.producciones[prod].izquierda));
      }
    }

    function esperados() {
      const fila = T.acciones[pila[pila.length - 1].estado];
      const lista = [];
      for (let i = 0; i + 1 < fila.length; i += 2) {
        const t = fila[i];
        if (t !== -1 && t !== T.error && admite(t)) lista.push(t);
      }
      return lista.sort((a, b) => a - b);
    }

    // Reducción con la acción semántica de Sql.cup.
    function reducir(prod, entrada) {
      const p = T.producciones[prod];
      if (prod === T.produccionInicial) anotar(entrada, "aceptar", "aceptar");
      else anotar(entrada, "reducir " + p.texto, "reducir");
      const hijos = pila.splice(pila.length - p.longitud, p.longitud);
      const izquierda = hijos.length ? hijos[0].izquierda : (pila[pila.length - 1].derecha || 0);
      const derecha = hijos.length ? hijos[hijos.length - 1].derecha : izquierda;
      const nodo = { simbolo: T.noTerminales[p.izquierda],
                     hijos: hijos.length ? hijos.map(h => h.nodo) : [{ simbolo: "λ", hijos: [], vacio: true }] };
      if (prod === T.produccionInicial) {
        terminado = true;
        aceptado = true;
      } else if (T.noTerminales[p.izquierda] === "sentencia") {
        const primero = p.texto.split("::=")[1].trim().split(/\s+/)[0];
        analisis.cerrarSentencia(SENTENCIA[primero], hijos[hijos.length - 1].derecha, nodo);
      }
      const estado = irA(pila[pila.length - 1].estado, p.izquierda);
      pila.push({ sym: p.izquierda, terminal: false, estado, izquierda, derecha, nodo });
    }

    function desplazar(token, estado) {
      anotar(token, "desplazar " + estado, "desplazar");
      pila.push({ sym: token.sym, terminal: true, estado, izquierda: token.izquierda,
                  derecha: token.derecha, nodo: nodoTerminal(token) });
    }

    // find_recovery_config + read_lookahead + try_parse_ahead (error_sync_size = 1)
    function recuperar() {
      const derechaError = pila[pila.length - 1].derecha;
      let izquierdaError = pila[pila.length - 1].izquierda;
      const descartados = [];
      while (accion(pila[pila.length - 1].estado, T.error) <= 0) {
        const quitado = pila.pop();
        izquierdaError = quitado.izquierda;
        quitado.nodo.descartado = true;
        descartados.unshift(quitado.nodo);
        if (pila.length === 0) return false;
      }
      const estado = accion(pila[pila.length - 1].estado, T.error) - 1;
      anotar(actual, "error: se desapila hasta el estado " + pila[pila.length - 1].estado
             + " y se desplaza error -> " + estado, "error");
      const nodoError = { simbolo: "error", hijos: descartados, descartado: true };
      pila.push({ sym: T.error, terminal: true, estado, izquierda: izquierdaError,
                  derecha: derechaError, nodo: nodoError });
      let anticipado = actual;
      actual = escanear();
      for (;;) {
        if (admite(anticipado.sym)) {
          // parse_lookahead: se reprocesa el token anticipado con acciones
          for (;;) {
            const act = accion(pila[pila.length - 1].estado, anticipado.sym);
            if (act > 0) { desplazar(anticipado, act - 1); return true; }
            reducir(-act - 1, anticipado);
            if (terminado) return true;
          }
        }
        if (anticipado.sym === T.EOF) return false;
        anotar(anticipado, "error: se descarta el token", "error");
        nodoError.hijos.push(Object.assign(nodoTerminal(anticipado), { descartado: true }));
        anticipado = actual;
        actual = escanear();
      }
    }

    pila = [{ sym: -1, estado: T.estadoInicial, izquierda: 0, derecha: 0, nodo: null }];
    actual = escanear();
    while (!terminado) {
      const act = accion(pila[pila.length - 1].estado, actual.sym);
      if (act > 0) {
        desplazar(actual, act - 1);
        actual = escanear();
      } else if (act < 0) {
        reducir(-act - 1, actual);
      } else {
        anotar(actual, "error sintáctico", "error");
        analisis.errorSintactico(actual, esperados());
        if (!recuperar()) {
          const nodos = pila.slice(1).map(s => s.nodo).filter(n => n && n.simbolo !== "lista_sentencias");
          analisis.sinRecuperacion({ simbolo: "sentencia incompleta", hijos: nodos });
          anotar(actual, "no se pudo recuperar: fin del análisis", "error");
          terminado = true;
        }
      }
    }
    analisis.finalizar();
    return { analisis, tokens: lexico.tokens, traza, trazaCompleta: traza.length < LIMITE_TRAZA, aceptado };
  }

  const API = { analizar, TABLAS: T, mostrar };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else global.AnalizadorSQL = API;
})(typeof window !== "undefined" ? window : globalThis);
