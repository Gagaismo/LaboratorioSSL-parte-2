package sql;

import java.io.PrintStream;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java_cup.runtime.Symbol;

/**
 * Estado compartido entre el scanner (Lexico) y el parser (Parser).
 * Junta los errores léxicos y sintácticos, los asigna a la sentencia en la
 * que ocurren y escribe el informe de cada sentencia y el resumen final.
 * Las posiciones son desplazamientos desde el inicio del archivo; acá se
 * traducen a línea y columna.
 */
public class Analisis {

    public static final int CARACTER_INVALIDO = 1;
    public static final int CADENA_ABIERTA = 2;
    public static final int IDENTIFICADOR_ABIERTO = 3;

    /** Un error todavía no asignado a ninguna sentencia. */
    private static class ErrorPendiente {
        final int posicion;
        final String texto;

        ErrorPendiente(int posicion, String texto) {
            this.posicion = posicion;
            this.texto = texto;
        }
    }

    private final String fuente;
    private final PrintStream salida;
    private final List<Integer> inicioTokens = new ArrayList<Integer>();
    private final List<ErrorPendiente> pendientes = new ArrayList<ErrorPendiente>();
    private int proximoToken = 0;
    private int finAnterior = 0;
    private int sentencias = 0;
    private int correctas = 0;
    private int erroresLexicos = 0;
    private int erroresSintacticos = 0;

    public Analisis(String fuente, PrintStream salida) {
        this.fuente = fuente;
        this.salida = salida;
    }

    public int longitud() {
        return fuente.length();
    }

    public boolean hayErrores() {
        return erroresLexicos + erroresSintacticos > 0;
    }

    /* ---------- Llamadas desde el scanner ---------- */

    public void registrarToken(int posicion) {
        inicioTokens.add(posicion);
    }

    public void errorLexico(int posicion, int tipo, String lexema) {
        String detalle;
        if (tipo == CADENA_ABIERTA) {
            detalle = "cadena sin cerrar " + lexema + " (falta la comilla simple de cierre)";
        } else if (tipo == IDENTIFICADOR_ABIERTO) {
            detalle = "identificador entre comillas dobles sin cerrar o vacío " + lexema;
        } else {
            detalle = "carácter no reconocido '" + lexema + "'";
        }
        erroresLexicos++;
        pendientes.add(new ErrorPendiente(posicion, "Error léxico (" + ubicacion(posicion) + "): " + detalle + "."));
    }

    /* ---------- Llamadas desde el parser ---------- */

    public void errorSintactico(Symbol actual, List esperados) {
        erroresSintacticos++;
        StringBuilder texto = new StringBuilder();
        texto.append("Error sintáctico (").append(ubicacion(actual.left)).append("): no se esperaba ")
             .append(describir(actual)).append(".");
        if (!esperados.isEmpty()) {
            texto.append(" Se esperaba: ");
            for (int i = 0; i < esperados.size(); i++) {
                if (i > 0) {
                    texto.append(i == esperados.size() - 1 ? " o " : ", ");
                }
                texto.append(mostrar(nombreTerminal(((Integer) esperados.get(i)).intValue())));
            }
            texto.append(".");
        }
        pendientes.add(new ErrorPendiente(actual.left, texto.toString()));
    }

    /** Se reconoció una sentencia completa hasta su ';' (tipo null: sentencia con error). */
    public void cerrarSentencia(String tipo, int fin) {
        List<ErrorPendiente> errores = tomarErrores(fin);
        String veredicto;
        if (tipo == null) {
            veredicto = "Incorrecta.";
        } else if (!errores.isEmpty()) {
            veredicto = "Incorrecta: la estructura de " + tipo + " es válida, pero tiene errores léxicos.";
        } else {
            veredicto = "Correcta: sentencia " + tipo + ".";
            correctas++;
        }
        informar(fin, errores, veredicto);
    }

    /** El parser llegó al fin del archivo sin poder recuperarse de un error. */
    public void sinRecuperacion() {
        informar(fuente.length(), tomarErrores(Integer.MAX_VALUE),
                 "Incorrecta: el archivo terminó antes de cerrar la sentencia con ';'.");
    }

    /* ---------- Llamada desde Main al terminar ---------- */

    public void finalizar() {
        if (!pendientes.isEmpty()) {
            salida.println("[-] Fuera de toda sentencia:");
            for (ErrorPendiente error : pendientes) {
                salida.println("    " + error.texto);
            }
            salida.println();
            pendientes.clear();
        }
        if (sentencias == 0 && !hayErrores()) {
            salida.println("No se encontraron sentencias en el archivo.");
            return;
        }
        salida.println("Resumen: " + sentencias + " sentencia(s) analizada(s), " + correctas
                       + " correcta(s), " + (sentencias - correctas) + " incorrecta(s). "
                       + "Errores léxicos: " + erroresLexicos + ". Errores sintácticos: "
                       + erroresSintacticos + ".");
    }

    /* ---------- Auxiliares ---------- */

    private List<ErrorPendiente> tomarErrores(int fin) {
        List<ErrorPendiente> errores = new ArrayList<ErrorPendiente>();
        while (!pendientes.isEmpty() && pendientes.get(0).posicion < fin) {
            errores.add(pendientes.remove(0));
        }
        return errores;
    }

    private void informar(int fin, List<ErrorPendiente> errores, String veredicto) {
        while (proximoToken < inicioTokens.size() && inicioTokens.get(proximoToken) < finAnterior) {
            proximoToken++;
        }
        int inicio = proximoToken < inicioTokens.size() ? inicioTokens.get(proximoToken) : finAnterior;
        if (!errores.isEmpty() && errores.get(0).posicion < inicio) {
            inicio = errores.get(0).posicion;
        }
        sentencias++;
        String texto = fuente.substring(inicio, fin).trim().replaceAll("\\s+", " ");
        salida.println("[" + sentencias + "] Línea " + linea(inicio) + ": " + texto);
        for (ErrorPendiente error : errores) {
            salida.println("    " + error.texto);
        }
        salida.println("    " + veredicto);
        salida.println();
        finAnterior = fin;
    }

    private String describir(Symbol simbolo) {
        String nombre = nombreTerminal(simbolo.sym);
        String lexema = simbolo.value == null ? "" : simbolo.value.toString();
        if (nombre.equals("EOF")) {
            return "el fin del archivo";
        } else if (nombre.equals("IDENTIFICADOR")) {
            return "el identificador " + lexema;
        } else if (nombre.equals("ENTERO")) {
            return "el entero " + lexema;
        } else if (nombre.equals("CADENA")) {
            return "la cadena " + lexema;
        } else if (Character.isLetter(lexema.isEmpty() ? ' ' : lexema.charAt(0))) {
            return "la palabra reservada " + lexema.toUpperCase();
        }
        return "el símbolo '" + lexema + "'";
    }

    /** Cómo se muestra un terminal en la lista de "se esperaba". */
    static String mostrar(String terminal) {
        if (terminal.equals("IDENTIFICADOR")) return "identificador";
        if (terminal.equals("ENTERO")) return "entero";
        if (terminal.equals("CADENA")) return "cadena";
        if (terminal.equals("EOF")) return "fin de archivo";
        if (terminal.equals("IGUAL")) return "'='";
        if (terminal.equals("MENOR")) return "'<'";
        if (terminal.equals("MAYOR")) return "'>'";
        if (terminal.equals("MENORIGUAL")) return "'<='";
        if (terminal.equals("MAYORIGUAL")) return "'>='";
        if (terminal.equals("MAS")) return "'+'";
        if (terminal.equals("MENOS")) return "'-'";
        if (terminal.equals("ASTERISCO")) return "'*'";
        if (terminal.equals("DIVISION")) return "'/'";
        if (terminal.equals("COMA")) return "','";
        if (terminal.equals("PTOCOMA")) return "';'";
        if (terminal.equals("LPAREN")) return "'('";
        if (terminal.equals("RPAREN")) return "')'";
        return terminal;
    }

    private static Map<Integer, String> nombres;

    /** Nombre del terminal según las constantes que generó CUP en Simbolos. */
    static String nombreTerminal(int simbolo) {
        if (nombres == null) {
            nombres = new HashMap<Integer, String>();
            for (Field campo : Simbolos.class.getFields()) {
                try {
                    nombres.put(campo.getInt(null), campo.getName());
                } catch (IllegalAccessException e) {
                    throw new IllegalStateException(e);
                }
            }
        }
        String nombre = nombres.get(simbolo);
        return nombre == null ? "#" + simbolo : nombre;
    }

    private int linea(int posicion) {
        int linea = 1;
        for (int i = 0; i < posicion && i < fuente.length(); i++) {
            if (fuente.charAt(i) == '\n') {
                linea++;
            }
        }
        return linea;
    }

    private String ubicacion(int posicion) {
        int inicioLinea = fuente.lastIndexOf('\n', posicion - 1) + 1;
        return "línea " + linea(posicion) + ", columna " + (posicion - inicioLinea + 1);
    }
}
