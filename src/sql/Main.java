package sql;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PushbackReader;
import java.io.Reader;
import java.nio.charset.Charset;
import java.nio.file.Files;

/**
 * Analizador sintáctico del LMD de SQL, con validación genérica para otras
 * sentencias SQL.
 * Uso: java sql.Main archivo.sql
 * El scanner (Lexico, generado por JLex) lee el archivo y le entrega los
 * tokens al parser (Parser, generado por CUP), que informa por cada
 * sentencia si es correcta o qué errores léxicos y sintácticos tiene.
 */
public class Main {

    private static final Charset UTF8 = Charset.forName("UTF-8");

    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Uso: java sql.Main archivo.sql");
            System.exit(2);
        }
        File archivo = new File(args[0]);
        System.out.println("Procesando archivo: " + args[0]);
        System.out.println();
        try {
            // El texto completo se usa para informar línea, columna y sentencia.
            String fuente = new String(Files.readAllBytes(archivo.toPath()), UTF8);
            if (fuente.startsWith("﻿")) {
                fuente = fuente.substring(1);
            }
            Analisis analisis = new Analisis(fuente, System.out);

            Lexico lexico = new Lexico(abrir(archivo));
            lexico.setAnalisis(analisis);
            Parser parser = new Parser(lexico);
            parser.setAnalisis(analisis);
            parser.parse();

            analisis.finalizar();
            System.exit(analisis.hayErrores() ? 1 : 0);
        } catch (IOException ex) {
            System.out.println("No se pudo leer el archivo: " + ex.getMessage());
            System.exit(2);
        } catch (Exception ex) {
            System.out.println(ex.toString());
            System.exit(2);
        }
    }

    /** Flujo de caracteres del archivo en UTF-8, sin la marca BOM si la tiene. */
    private static Reader abrir(File archivo) throws IOException {
        PushbackReader lector = new PushbackReader(new BufferedReader(
                new InputStreamReader(new FileInputStream(archivo), UTF8)));
        int primero = lector.read();
        if (primero != -1 && primero != '﻿') {
            lector.unread(primero);
        }
        return lector;
    }
}
