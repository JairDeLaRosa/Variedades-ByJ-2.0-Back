---
description: Genera o completa tests para el archivo o módulo indicado
argument-hint: <archivo o módulo>
---

Escribe tests para: $ARGUMENTS

1. Lee el código objetivo y sus dependencias antes de escribir nada.
2. Sigue la skill `testing`: patrón AAA, nombres que describen comportamiento, mocks solo en fronteras externas, `*.spec.ts` junto al archivo.
3. Cubre el camino feliz, al menos un caso de error por método y los casos borde del dominio.
4. Si el módulo tiene un bug conocido, añade el test de regresión.
5. Escribe los archivos, pero **no ejecutes** jest: el usuario debe decir "corre los tests". Al terminar, dilo explícitamente.
