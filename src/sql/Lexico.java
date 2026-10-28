package sql;
import java_cup.runtime.Symbol;


public class Lexico implements java_cup.runtime.Scanner {
	private final int YY_BUFFER_SIZE = 512;
	private final int YY_F = -1;
	private final int YY_NO_STATE = -1;
	private final int YY_NOT_ACCEPT = 0;
	private final int YY_START = 1;
	private final int YY_END = 2;
	private final int YY_NO_ANCHOR = 4;
	private final int YY_BOL = 65536;
	private final int YY_EOF = 65537;

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
	private java.io.BufferedReader yy_reader;
	private int yy_buffer_index;
	private int yy_buffer_read;
	private int yy_buffer_start;
	private int yy_buffer_end;
	private char yy_buffer[];
	private int yychar;
	private boolean yy_at_bol;
	private int yy_lexical_state;

	public Lexico (java.io.Reader reader) {
		this ();
		if (null == reader) {
			throw (new Error("Error: Bad input stream initializer."));
		}
		yy_reader = new java.io.BufferedReader(reader);
	}

	public Lexico (java.io.InputStream instream) {
		this ();
		if (null == instream) {
			throw (new Error("Error: Bad input stream initializer."));
		}
		yy_reader = new java.io.BufferedReader(new java.io.InputStreamReader(instream));
	}

	private Lexico () {
		yy_buffer = new char[YY_BUFFER_SIZE];
		yy_buffer_read = 0;
		yy_buffer_index = 0;
		yy_buffer_start = 0;
		yy_buffer_end = 0;
		yychar = 0;
		yy_at_bol = true;
		yy_lexical_state = YYINITIAL;
	}

	private boolean yy_eof_done = false;
	private final int YYINITIAL = 0;
	private final int yy_state_dtrans[] = {
		0
	};
	private void yybegin (int state) {
		yy_lexical_state = state;
	}
	private int yy_advance ()
		throws java.io.IOException {
		int next_read;
		int i;
		int j;

		if (yy_buffer_index < yy_buffer_read) {
			return yy_buffer[yy_buffer_index++];
		}

		if (0 != yy_buffer_start) {
			i = yy_buffer_start;
			j = 0;
			while (i < yy_buffer_read) {
				yy_buffer[j] = yy_buffer[i];
				++i;
				++j;
			}
			yy_buffer_end = yy_buffer_end - yy_buffer_start;
			yy_buffer_start = 0;
			yy_buffer_read = j;
			yy_buffer_index = j;
			next_read = yy_reader.read(yy_buffer,
					yy_buffer_read,
					yy_buffer.length - yy_buffer_read);
			if (-1 == next_read) {
				return YY_EOF;
			}
			yy_buffer_read = yy_buffer_read + next_read;
		}

		while (yy_buffer_index >= yy_buffer_read) {
			if (yy_buffer_index >= yy_buffer.length) {
				yy_buffer = yy_double(yy_buffer);
			}
			next_read = yy_reader.read(yy_buffer,
					yy_buffer_read,
					yy_buffer.length - yy_buffer_read);
			if (-1 == next_read) {
				return YY_EOF;
			}
			yy_buffer_read = yy_buffer_read + next_read;
		}
		return yy_buffer[yy_buffer_index++];
	}
	private void yy_move_end () {
		if (yy_buffer_end > yy_buffer_start &&
		    '\n' == yy_buffer[yy_buffer_end-1])
			yy_buffer_end--;
		if (yy_buffer_end > yy_buffer_start &&
		    '\r' == yy_buffer[yy_buffer_end-1])
			yy_buffer_end--;
	}
	private boolean yy_last_was_cr=false;
	private void yy_mark_start () {
		yychar = yychar
			+ yy_buffer_index - yy_buffer_start;
		yy_buffer_start = yy_buffer_index;
	}
	private void yy_mark_end () {
		yy_buffer_end = yy_buffer_index;
	}
	private void yy_to_mark () {
		yy_buffer_index = yy_buffer_end;
		yy_at_bol = (yy_buffer_end > yy_buffer_start) &&
		            ('\r' == yy_buffer[yy_buffer_end-1] ||
		             '\n' == yy_buffer[yy_buffer_end-1] ||
		             2028/*LS*/ == yy_buffer[yy_buffer_end-1] ||
		             2029/*PS*/ == yy_buffer[yy_buffer_end-1]);
	}
	private java.lang.String yytext () {
		return (new java.lang.String(yy_buffer,
			yy_buffer_start,
			yy_buffer_end - yy_buffer_start));
	}
	private int yylength () {
		return yy_buffer_end - yy_buffer_start;
	}
	private char[] yy_double (char buf[]) {
		int i;
		char newbuf[];
		newbuf = new char[2*buf.length];
		for (i = 0; i < buf.length; ++i) {
			newbuf[i] = buf[i];
		}
		return newbuf;
	}
	private final int YY_E_INTERNAL = 0;
	private final int YY_E_MATCH = 1;
	private java.lang.String yy_error_string[] = {
		"Error: Internal error.\n",
		"Error: Unmatched input.\n"
	};
	private void yy_error (int code,boolean fatal) {
		java.lang.System.out.print(yy_error_string[code]);
		java.lang.System.out.flush();
		if (fatal) {
			throw new Error("Fatal Error.\n");
		}
	}
	private int[][] unpackFromString(int size1, int size2, String st) {
		int colonIndex = -1;
		String lengthString;
		int sequenceLength = 0;
		int sequenceInteger = 0;

		int commaIndex;
		String workString;

		int res[][] = new int[size1][size2];
		for (int i= 0; i < size1; i++) {
			for (int j= 0; j < size2; j++) {
				if (sequenceLength != 0) {
					res[i][j] = sequenceInteger;
					sequenceLength--;
					continue;
				}
				commaIndex = st.indexOf(',');
				workString = (commaIndex==-1) ? st :
					st.substring(0, commaIndex);
				st = st.substring(commaIndex+1);
				colonIndex = workString.indexOf(':');
				if (colonIndex == -1) {
					res[i][j]=Integer.parseInt(workString);
					continue;
				}
				lengthString =
					workString.substring(colonIndex+1);
				sequenceLength=Integer.parseInt(lengthString);
				workString=workString.substring(0,colonIndex);
				sequenceInteger=Integer.parseInt(workString);
				res[i][j] = sequenceInteger;
				sequenceLength--;
			}
		}
		return res;
	}
	private int yy_acpt[] = {
		/* 0 */ YY_NOT_ACCEPT,
		/* 1 */ YY_NO_ANCHOR,
		/* 2 */ YY_NO_ANCHOR,
		/* 3 */ YY_NO_ANCHOR,
		/* 4 */ YY_NO_ANCHOR,
		/* 5 */ YY_NO_ANCHOR,
		/* 6 */ YY_NO_ANCHOR,
		/* 7 */ YY_NO_ANCHOR,
		/* 8 */ YY_NO_ANCHOR,
		/* 9 */ YY_NO_ANCHOR,
		/* 10 */ YY_NO_ANCHOR,
		/* 11 */ YY_NO_ANCHOR,
		/* 12 */ YY_NO_ANCHOR,
		/* 13 */ YY_NO_ANCHOR,
		/* 14 */ YY_NO_ANCHOR,
		/* 15 */ YY_NO_ANCHOR,
		/* 16 */ YY_NO_ANCHOR,
		/* 17 */ YY_NO_ANCHOR,
		/* 18 */ YY_NO_ANCHOR,
		/* 19 */ YY_NO_ANCHOR,
		/* 20 */ YY_NO_ANCHOR,
		/* 21 */ YY_NO_ANCHOR,
		/* 22 */ YY_NO_ANCHOR,
		/* 23 */ YY_NO_ANCHOR,
		/* 24 */ YY_NO_ANCHOR,
		/* 25 */ YY_NO_ANCHOR,
		/* 26 */ YY_NO_ANCHOR,
		/* 27 */ YY_NO_ANCHOR,
		/* 28 */ YY_NO_ANCHOR,
		/* 29 */ YY_NO_ANCHOR,
		/* 30 */ YY_NO_ANCHOR,
		/* 31 */ YY_NO_ANCHOR,
		/* 32 */ YY_NO_ANCHOR,
		/* 33 */ YY_NO_ANCHOR,
		/* 34 */ YY_NO_ANCHOR,
		/* 35 */ YY_NO_ANCHOR,
		/* 36 */ YY_NO_ANCHOR,
		/* 37 */ YY_NO_ANCHOR,
		/* 38 */ YY_NO_ANCHOR,
		/* 39 */ YY_NO_ANCHOR,
		/* 40 */ YY_NO_ANCHOR,
		/* 41 */ YY_NO_ANCHOR,
		/* 42 */ YY_NO_ANCHOR,
		/* 43 */ YY_NO_ANCHOR,
		/* 44 */ YY_NO_ANCHOR,
		/* 45 */ YY_NO_ANCHOR,
		/* 46 */ YY_NO_ANCHOR,
		/* 47 */ YY_NO_ANCHOR,
		/* 48 */ YY_NO_ANCHOR,
		/* 49 */ YY_NO_ANCHOR,
		/* 50 */ YY_NO_ANCHOR,
		/* 51 */ YY_NO_ANCHOR,
		/* 52 */ YY_NO_ANCHOR,
		/* 53 */ YY_NO_ANCHOR,
		/* 54 */ YY_NO_ANCHOR,
		/* 55 */ YY_NO_ANCHOR,
		/* 56 */ YY_NO_ANCHOR,
		/* 57 */ YY_NO_ANCHOR,
		/* 58 */ YY_NO_ANCHOR,
		/* 59 */ YY_NO_ANCHOR,
		/* 60 */ YY_NO_ANCHOR,
		/* 61 */ YY_NO_ANCHOR,
		/* 62 */ YY_NO_ANCHOR,
		/* 63 */ YY_NO_ANCHOR,
		/* 64 */ YY_NO_ANCHOR,
		/* 65 */ YY_NO_ANCHOR,
		/* 66 */ YY_NO_ANCHOR,
		/* 67 */ YY_NO_ANCHOR,
		/* 68 */ YY_NO_ANCHOR,
		/* 69 */ YY_NO_ANCHOR,
		/* 70 */ YY_NO_ANCHOR,
		/* 71 */ YY_NO_ANCHOR,
		/* 72 */ YY_NO_ANCHOR,
		/* 73 */ YY_NO_ANCHOR,
		/* 74 */ YY_NO_ANCHOR,
		/* 75 */ YY_NO_ANCHOR
	};
	private int yy_cmap[] = unpackFromString(1,65538,
"33:9,35,36,33,35,36,33:18,35,33,32,33:4,34,28,29,24,22,26,23,33,25,31:10,33" +
",27,19,20,21,33:2,15,30,4,18,2,6,30,11,12,30:2,3,9,13,8,17,30,7,1,5,16,14,1" +
"0,30:3,33:4,30,33,15,30,4,18,2,6,30,11,12,30:2,3,9,13,8,17,30,7,1,5,16,14,1" +
"0,30:3,33:65413,0:2")[0];

	private int yy_rmap[] = unpackFromString(1,76,
"0,1,2,3,1,4,1,5,1:6,6,7,1,8,9,10,1:2,11,12,10:3,1,10:8,13,14,15,10,16,17,18" +
",19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,10,39,40,41,42" +
",43,44,45,46,47,48,49,50")[0];

	private int yy_nxt[][] = unpackFromString(51,37,
"1,2,63:4,68,63,36,63,69,63,70,71,72,73,74,63,75,3,4,5,6,7,8,9,10,11,12,13,6" +
"3,14,15,16,17,18:2,-1:38,63,38,63:16,-1:11,63,39,-1:25,20,-1:36,21,-1:39,22" +
",-1:44,14,-1:6,37:31,-1,37:3,-1:2,17:33,23,17,-1:36,18:2,-1,63:18,-1:11,63," +
"39,-1:6,22:35,-1:35,17,-1:3,63:6,19,63:11,-1:11,63,39,-1:6,37:31,27,37:3,-1" +
":2,63:2,64,63,24,63:13,-1:11,63,39,-1:6,63:7,47,63:10,-1:11,63,39,-1:6,63,4" +
"8,63:16,-1:11,63,39,-1:6,49,63:3,50,63:13,-1:11,63,39,-1:6,63:4,25,63:13,-1" +
":11,63,39,-1:6,63:2,51,63:15,-1:11,63,39,-1:6,63:17,26,-1:11,63,39,-1:6,63:" +
"17,52,-1:11,63,39,-1:6,63:8,28,63:9,-1:11,63,39,-1:6,63:6,54,63:11,-1:11,63" +
",39,-1:6,63,55,63:16,-1:11,63,39,-1:6,63:7,29,63:10,-1:11,63,39,-1:6,63:15," +
"56,63:2,-1:11,63,39,-1:6,63:14,57,63:3,-1:11,63,39,-1:6,63:3,58,63:14,-1:11" +
",63,39,-1:6,63,30,63:16,-1:11,63,39,-1:6,63:6,59,63:11,-1:11,63,39,-1:6,63," +
"60,63:16,-1:11,63,39,-1:6,63:4,61,63:13,-1:11,63,39,-1:6,63:4,31,63:13,-1:1" +
"1,63,39,-1:6,63:4,32,63:13,-1:11,63,39,-1:6,33,63:17,-1:11,63,39,-1:6,63,34" +
",63:16,-1:11,63,39,-1:6,63,35,63:16,-1:11,63,39,-1:6,63,53,63:16,-1:11,63,3" +
"9,-1:6,63:2,66,63:15,-1:11,63,39,-1:6,63,67,63:16,-1:11,63,39,-1:6,63:4,62," +
"63:13,-1:11,63,39,-1:6,63:6,40,63:11,-1:11,63,39,-1:6,63:10,41,63:7,-1:11,6" +
"3,39,-1:6,63:12,42,63:5,-1:11,63,39,-1:6,63:7,43,63:10,-1:11,63,39,-1:6,63:" +
"14,44,63:3,-1:11,63,39,-1:6,63:12,45,63:5,-1:11,63,39,-1:6,63:16,46,63,-1:1" +
"1,63,39,-1:6,63,65,63:16,-1:11,63,39,-1:5");

	public java_cup.runtime.Symbol next_token ()
		throws java.io.IOException {
		int yy_lookahead;
		int yy_anchor = YY_NO_ANCHOR;
		int yy_state = yy_state_dtrans[yy_lexical_state];
		int yy_next_state = YY_NO_STATE;
		int yy_last_accept_state = YY_NO_STATE;
		boolean yy_initial = true;
		int yy_this_accept;

		yy_mark_start();
		yy_this_accept = yy_acpt[yy_state];
		if (YY_NOT_ACCEPT != yy_this_accept) {
			yy_last_accept_state = yy_state;
			yy_mark_end();
		}
		while (true) {
			if (yy_initial && yy_at_bol) yy_lookahead = YY_BOL;
			else yy_lookahead = yy_advance();
			yy_next_state = YY_F;
			yy_next_state = yy_nxt[yy_rmap[yy_state]][yy_cmap[yy_lookahead]];
			if (YY_EOF == yy_lookahead && true == yy_initial) {

  return new Symbol(Simbolos.EOF, analisis.longitud(), analisis.longitud(), "");
			}
			if (YY_F != yy_next_state) {
				yy_state = yy_next_state;
				yy_initial = false;
				yy_this_accept = yy_acpt[yy_state];
				if (YY_NOT_ACCEPT != yy_this_accept) {
					yy_last_accept_state = yy_state;
					yy_mark_end();
				}
			}
			else {
				if (YY_NO_STATE == yy_last_accept_state) {
					throw (new Error("Lexical Error: Unmatched Input."));
				}
				else {
					yy_anchor = yy_acpt[yy_last_accept_state];
					if (0 != (YY_END & yy_anchor)) {
						yy_move_end();
					}
					yy_to_mark();
					switch (yy_last_accept_state) {
					case 1:
						
					case -2:
						break;
					case 2:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -3:
						break;
					case 3:
						{ return token(Simbolos.MENOR); }
					case -4:
						break;
					case 4:
						{ return token(Simbolos.IGUAL); }
					case -5:
						break;
					case 5:
						{ return token(Simbolos.MAYOR); }
					case -6:
						break;
					case 6:
						{ return token(Simbolos.MAS); }
					case -7:
						break;
					case 7:
						{ return token(Simbolos.MENOS); }
					case -8:
						break;
					case 8:
						{ return token(Simbolos.ASTERISCO); }
					case -9:
						break;
					case 9:
						{ return token(Simbolos.DIVISION); }
					case -10:
						break;
					case 10:
						{ return token(Simbolos.COMA); }
					case -11:
						break;
					case 11:
						{ return token(Simbolos.PTOCOMA); }
					case -12:
						break;
					case 12:
						{ return token(Simbolos.LPAREN); }
					case -13:
						break;
					case 13:
						{ return token(Simbolos.RPAREN); }
					case -14:
						break;
					case 14:
						{ return token(Simbolos.ENTERO); }
					case -15:
						break;
					case 15:
						{ analisis.errorLexico(yychar, Analisis.IDENTIFICADOR_ABIERTO, yytext()); }
					case -16:
						break;
					case 16:
						{ analisis.errorLexico(yychar, Analisis.CARACTER_INVALIDO, yytext()); }
					case -17:
						break;
					case 17:
						{ analisis.errorLexico(yychar, Analisis.CADENA_ABIERTA, yytext()); }
					case -18:
						break;
					case 18:
						{ }
					case -19:
						break;
					case 19:
						{ return token(Simbolos.OR); }
					case -20:
						break;
					case 20:
						{ return token(Simbolos.MENORIGUAL); }
					case -21:
						break;
					case 21:
						{ return token(Simbolos.MAYORIGUAL); }
					case -22:
						break;
					case 22:
						{ }
					case -23:
						break;
					case 23:
						{ return token(Simbolos.CADENA); }
					case -24:
						break;
					case 24:
						{ return token(Simbolos.SET); }
					case -25:
						break;
					case 25:
						{ return token(Simbolos.NOT); }
					case -26:
						break;
					case 26:
						{ return token(Simbolos.AND); }
					case -27:
						break;
					case 27:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -28:
						break;
					case 28:
						{ return token(Simbolos.FROM); }
					case -29:
						break;
					case 29:
						{ return token(Simbolos.INTO); }
					case -30:
						break;
					case 30:
						{ return token(Simbolos.WHERE); }
					case -31:
						break;
					case 31:
						{ return token(Simbolos.SELECT); }
					case -32:
						break;
					case 32:
						{ return token(Simbolos.INSERT); }
					case -33:
						break;
					case 33:
						{ return token(Simbolos.VALUES); }
					case -34:
						break;
					case 34:
						{ return token(Simbolos.UPDATE); }
					case -35:
						break;
					case 35:
						{ return token(Simbolos.DELETE); }
					case -36:
						break;
					case 36:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -37:
						break;
					case 37:
						{ analisis.errorLexico(yychar, Analisis.IDENTIFICADOR_ABIERTO, yytext()); }
					case -38:
						break;
					case 38:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -39:
						break;
					case 39:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -40:
						break;
					case 40:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -41:
						break;
					case 41:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -42:
						break;
					case 42:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -43:
						break;
					case 43:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -44:
						break;
					case 44:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -45:
						break;
					case 45:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -46:
						break;
					case 46:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -47:
						break;
					case 47:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -48:
						break;
					case 48:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -49:
						break;
					case 49:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -50:
						break;
					case 50:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -51:
						break;
					case 51:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -52:
						break;
					case 52:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -53:
						break;
					case 53:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -54:
						break;
					case 54:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -55:
						break;
					case 55:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -56:
						break;
					case 56:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -57:
						break;
					case 57:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -58:
						break;
					case 58:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -59:
						break;
					case 59:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -60:
						break;
					case 60:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -61:
						break;
					case 61:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -62:
						break;
					case 62:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -63:
						break;
					case 63:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -64:
						break;
					case 64:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -65:
						break;
					case 65:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -66:
						break;
					case 66:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -67:
						break;
					case 67:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -68:
						break;
					case 68:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -69:
						break;
					case 69:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -70:
						break;
					case 70:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -71:
						break;
					case 71:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -72:
						break;
					case 72:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -73:
						break;
					case 73:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -74:
						break;
					case 74:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -75:
						break;
					case 75:
						{ return token(Simbolos.IDENTIFICADOR); }
					case -76:
						break;
					default:
						yy_error(YY_E_INTERNAL,false);
					case -1:
					}
					yy_initial = true;
					yy_state = yy_state_dtrans[yy_lexical_state];
					yy_next_state = YY_NO_STATE;
					yy_last_accept_state = YY_NO_STATE;
					yy_mark_start();
					yy_this_accept = yy_acpt[yy_state];
					if (YY_NOT_ACCEPT != yy_this_accept) {
						yy_last_accept_state = yy_state;
						yy_mark_end();
					}
				}
			}
		}
	}
}
