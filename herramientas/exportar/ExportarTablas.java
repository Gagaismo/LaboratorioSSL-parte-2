import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.lang.reflect.Field;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Exporta a JavaScript las tablas LALR que generó CUP en sql.Parser, para
 * que la interfaz web ejecute exactamente el mismo autómata que el parser
 * en Java. Los nombres de las producciones y de los no terminales se leen
 * de los comentarios que CUP deja en Parser.java.
 *
 * Uso: java -cp build/clases;build/herramientas;build/exportar
 *          ExportarTablas src/sql/Parser.java docs/tablas.js
 */
public class ExportarTablas {

    public static void main(String[] args) throws IOException {
        String codigo = new String(Files.readAllBytes(new File(args[0]).toPath()), Charset.forName("UTF-8"));
        Tablas parser = new Tablas();

        Map<Integer, String> producciones = new TreeMap<Integer, String>();
        Matcher caso = Pattern.compile("case (\\d+): // (.*?)\\s*\\r?\\n").matcher(codigo);
        while (caso.find()) {
            producciones.put(Integer.valueOf(caso.group(1)), caso.group(2).trim());
        }
        Map<Integer, String> noTerminales = new TreeMap<Integer, String>();
        Matcher simbolo = Pattern.compile("Symbol\\((\\d+)/\\*([^*]+)\\*/").matcher(codigo);
        while (simbolo.find()) {
            noTerminales.put(Integer.valueOf(simbolo.group(1)), simbolo.group(2));
        }
        Map<Integer, String> terminales = new TreeMap<Integer, String>();
        for (Field campo : sql.Simbolos.class.getFields()) {
            try {
                terminales.put(campo.getInt(null), campo.getName());
            } catch (IllegalAccessException e) {
                throw new IllegalStateException(e);
            }
        }

        StringBuilder js = new StringBuilder();
        js.append("// Generado por herramientas/exportar/ExportarTablas.java a partir de\n");
        js.append("// src/sql/Parser.java (CUP v0.10k). No editar a mano.\n");
        js.append("const TABLAS = {\n");
        js.append("  terminales: ").append(lista(terminales)).append(",\n");
        js.append("  noTerminales: ").append(lista(noTerminales)).append(",\n");
        js.append("  producciones: [\n");
        short[][] tabla = parser.producciones();
        for (int i = 0; i < tabla.length; i++) {
            js.append("    { izquierda: ").append(tabla[i][0]).append(", longitud: ").append(tabla[i][1])
              .append(", texto: ").append(cadena(producciones.get(i))).append(" },\n");
        }
        js.append("  ],\n");
        js.append("  acciones: ").append(matriz(parser.acciones())).append(",\n");
        js.append("  irA: ").append(matriz(parser.reducciones())).append(",\n");
        js.append("  estadoInicial: ").append(parser.start_state()).append(",\n");
        js.append("  produccionInicial: ").append(parser.start_production()).append(",\n");
        js.append("  EOF: ").append(parser.EOF_sym()).append(",\n");
        js.append("  error: ").append(parser.error_sym()).append("\n");
        js.append("};\n");
        js.append("if (typeof module !== \"undefined\") module.exports = TABLAS;\n");

        PrintWriter salida = new PrintWriter(args[1], "UTF-8");
        salida.print(js);
        salida.close();
        System.out.println("Tablas exportadas: " + tabla.length + " producciones, "
                           + parser.acciones().length + " estados -> " + args[1]);
    }

    /** Da acceso a las tablas protegidas de lr_parser. */
    static class Tablas extends sql.Parser {
        short[][] producciones() { return production_table(); }
        short[][] acciones() { return action_table(); }
        short[][] reducciones() { return reduce_table(); }
    }

    private static String lista(Map<Integer, String> nombres) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < nombres.size(); i++) {
            sb.append(i > 0 ? ", " : "").append(cadena(nombres.get(i)));
        }
        return sb.append("]").toString();
    }

    private static String matriz(short[][] filas) {
        StringBuilder sb = new StringBuilder("[\n");
        for (short[] fila : filas) {
            if (fila == null) {
                sb.append("    null,\n");
                continue;
            }
            sb.append("    [");
            for (int j = 0; j < fila.length; j++) {
                sb.append(j > 0 ? "," : "").append(fila[j]);
            }
            sb.append("],\n");
        }
        return sb.append("  ]").toString();
    }

    private static String cadena(String texto) {
        if (texto == null) {
            return "null";
        }
        return "\"" + texto.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
