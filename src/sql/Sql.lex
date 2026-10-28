package sql;

import java_cup.runtime.Symbol;

%%

%public
%class Lexico
%cup
%char
%unicode
%ignorecase

%{
  /* Estado compartido con el parser: posiciones de tokens y errores. */
  private Analisis analisis;

  public void setAnalisis(Analisis analisis) {
    this.analisis = analisis;
  }

  /* Cada token lleva su lexema y su posicion (desplazamiento desde el
     inicio del archivo): left = inicio, right = fin. */
  private Symbol token(int tipo) {
    analisis.registrarToken(yychar);
    return new Symbol(tipo, yychar, yychar + yytext().length(), yytext());
  }
%}

%eofval{
  return new Symbol(Simbolos.EOF, analisis.longitud(), analisis.longitud(), "");
%eofval}

LETRA = [A-Za-z_]
DIGITO = [0-9]
IDENTIFICADOR = {LETRA}({LETRA}|{DIGITO})*
IDENTIFICADOR_DELIMITADO = \"[^\"\r\n]+\"
IDENTIFICADOR_ABIERTO = \"[^\"\r\n]*
ENTERO = {DIGITO}+
CADENA = '([^'\r\n]|'')*'
CADENA_ABIERTA = '([^'\r\n]|'')*
COMENTARIO = "--"[^\r\n]*
ESPACIO = [\ \t\r\n\f]+

%%

"SELECT" { return token(Simbolos.SELECT); }
"FROM" { return token(Simbolos.FROM); }
"WHERE" { return token(Simbolos.WHERE); }
"INSERT" { return token(Simbolos.INSERT); }
"INTO" { return token(Simbolos.INTO); }
"VALUES" { return token(Simbolos.VALUES); }
"UPDATE" { return token(Simbolos.UPDATE); }
"SET" { return token(Simbolos.SET); }
"DELETE" { return token(Simbolos.DELETE); }
"AND" { return token(Simbolos.AND); }
"OR" { return token(Simbolos.OR); }
"NOT" { return token(Simbolos.NOT); }

"<=" { return token(Simbolos.MENORIGUAL); }
">=" { return token(Simbolos.MAYORIGUAL); }
"<" { return token(Simbolos.MENOR); }
">" { return token(Simbolos.MAYOR); }
"=" { return token(Simbolos.IGUAL); }
"+" { return token(Simbolos.MAS); }
"-" { return token(Simbolos.MENOS); }
"*" { return token(Simbolos.ASTERISCO); }
"/" { return token(Simbolos.DIVISION); }
"," { return token(Simbolos.COMA); }
";" { return token(Simbolos.PTOCOMA); }
"(" { return token(Simbolos.LPAREN); }
")" { return token(Simbolos.RPAREN); }

{IDENTIFICADOR} { return token(Simbolos.IDENTIFICADOR); }
{IDENTIFICADOR_DELIMITADO} { return token(Simbolos.IDENTIFICADOR); }
{ENTERO} { return token(Simbolos.ENTERO); }
{CADENA} { return token(Simbolos.CADENA); }

{CADENA_ABIERTA} { analisis.errorLexico(yychar, Analisis.CADENA_ABIERTA, yytext()); }
{IDENTIFICADOR_ABIERTO} { analisis.errorLexico(yychar, Analisis.IDENTIFICADOR_ABIERTO, yytext()); }
{COMENTARIO} { }
{ESPACIO} { }
. { analisis.errorLexico(yychar, Analisis.CARACTER_INVALIDO, yytext()); }
