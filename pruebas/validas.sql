-- Sentencias correctas del LMD de SQL (SELECT, INSERT, UPDATE, DELETE)

SELECT id, nombre, sueldo FROM empleados WHERE sueldo > 50000 AND activo = 1;
SELECT * FROM clientes;
SELECT * FROM personas;
SELECT nombre, apellido1 FROM personas;

INSERT INTO usuarios (id, usuario, email) VALUES (101, 'gaga', 'gaga@test.com');
INSERT INTO agenda_telefonica (nombre, numero) VALUES ('Roberto Jeldrez', '4886850');
INSERT INTO agenda_telefonica VALUES ('Roberto Jeldrez', '4886850');

UPDATE productos SET precio = precio * 110 / 100, stock = stock - 5 WHERE categoria = 'ventas';
UPDATE My_table SET field1 = 'updated value' WHERE field2 = 'N' OR field3 > 50;

DELETE FROM logs WHERE fecha < '2026-01-01';
DELETE FROM productos WHERE total = 520 * precio;

-- Identificadores con espacios entre comillas dobles, minúsculas y NOT
select "nombre completo" from "lista de alumnos" where not (nota < 4 or legajo >= 60000);
UPDATE alumnos
   SET nota = (parcial1 + parcial2) / 2
 WHERE NOT condicion = 'libre' AND (nota <= 10);
DELETE FROM sesiones;
INSERT INTO frases (texto) VALUES ('It''s ok');
