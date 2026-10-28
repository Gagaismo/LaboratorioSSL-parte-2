-- Sentencias con errores léxicos y sintácticos

SELECT FROM empleados;
INSERT empleados VALUES (1, 'error');
UPDATE usuarios WHERE id = 5;
SELECT * FROM tabla WHERE @campo # 10;
INSERT INTO usuarios (id, nombre) VALUES (1, 'Ana', 'extra');
INSERT INTO usuarios (id, nombre, email) VALUES (2, 'Luis');
SELECT nombre apellido FROM personas;
DELETE FROM logs WHERE fecha <> 5;
UPDATE productos SET precio = precio * 1.10;
SELECT * FROM clientes WHERE nombre = 'Ana;
SELECT * FROM clientes;
DELETE FROM pedidos WHERE (total > 100;
SELECT * FROM t WHERE a + 1;
