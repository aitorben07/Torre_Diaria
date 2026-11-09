# Torre Diaria: tercera versión. Impacto

Análisis del 2026-11-09 sobre `docs/proceso/tercera-version/tareas.md` (plan del mismo día, T1 a T35). Base: el código de la rama `tercera-version` (`983a51d`, igual a `main` más el plan), `README.md`, `docs/diseno/`, `docs/proceso/segunda-version/` (impacto, pruebas y estado), `C:\Users\aitor\Music\ESTRATEGIA_PROYECTOS.md`, las tres últimas ejecuciones del CI (`gh run list`) y mediciones propias.

Marcas:
- **[comprobado]**: lo he leído en el código o en una fuente.
- **[medido]**: lo he ejecutado hoy en este equipo (Windows 10, Node 24.18.0, Chromium de Playwright 1.64.1).
- **[supuesto]**: lo deduzco sin medirlo.
- **[a medir]**: un umbral que no he podido comprobar; digo cómo se fija.

**Cómo medí sin tocar el código.** Copié `semilla.ts`, `piezas.ts`, `puntuacion.ts` y `simulacion.ts` al directorio temporal de la sesión, con las constantes leídas de variables de entorno y un modelo del «ritmo» del Anexo J: +1 al soltar, −4 al caer, ×1,08 con combo ≥ 5, tope 3,4. Los jugadores simulados son los de `scripts/duracion.ts`, en los días 1 a 30. Con las constantes de la v2, la copia reproduce exactamente las cifras del README: novato 83,24 s, medio 169,8 s y experto 302,33 s. Para el marcador y la música usé un servidor `astro preview` sobre el `dist/` actual (compilado a las 14:50, después del último commit de `src/`, el de las 13:56) y una página vacía. Cerré el servidor por PID (18328; padre 6052, ya terminado) y no queda ningún puerto mío abierto. No he modificado ni `tareas.md` ni `estado.md`, ni ningún archivo del proyecto salvo este.

---

## 0. Resumen

- **Bloqueantes para esta fase: ninguno.** Todo es gratis y usa las herramientas de la estrategia (ver 3).
- **Con las velocidades del Anexo J (1,6 a 1,77 m/s) las partidas se acortan casi a la mitad [medido].** Novato: de 83 s a entre 45 y 52 s. Medio: de 170 s a entre 79 y 111 s. Los dos salen de los rangos que B2 exige mantener. Además, la cadencia del medio solo baja de 2,6 s con 1,77, justo en el borde de la ventana del perfecto.
  - **Combinación que lo cumple todo a la vez [medido]:** `VEL_INICIAL` 1,3, `VEL_INCREMENTO` 0,025, `AMPLITUD` de 3,4 a 2,6 y `HUECO_COLGADA` de 2,5 a 1,8. La primera pieza llega al centro en 2,0 s, la ventana del perfecto es de 123 ms y la cadencia del medio es de 2,47 s. La décima pieza se coloca en 25 s en lugar de 38 s. Duraciones: novato 62 s, medio 142 s y experto 262 s.
  - El arranque se acelera acortando el recorrido y la caída, no subiendo la velocidad, que es lo que hace fallar al novato.
- **Al poner `REGLAS = 3`, el código actual deja sin medalla todos los retos ya jugados [comprobado].** `medallaDe` solo la da si `reglas === REGLAS` (`src/logica/diarios.ts:33-35`), y hay otros 3 sitios iguales. Además, L1 cambia los umbrales. Hacen falta umbrales por versión de reglas.
- **El desborde del marcador está reproducido [medido].** Desde «1.000», el número se sale de la pegatina en 320, 360 y 1280×600, y la columna derecha se sale del HUD en 320×568. En 320 px no caben en una fila las vidas, 999.999 a 24 px o más, «Récord 999.999» y el botón de pausa que añade E3.
- **El plan se contradice en 6 puntos con el código o consigo mismo** (ver 5, «Contradicciones»). Por ejemplo:
  - `VEL_SUELO` 1,2 anula el reloj al principio y sube los niveles 1 a 3, hoy a 0,9 m/s.
  - Cambiar la velocidad a mitad del vaivén hace saltar la pieza.
  - Las monedas de la dorada no llegarían al saldo.
  - «Abandonar» castiga a quien lo usa, porque recargar la página ya reinicia el oficial sin que cuente.
- **Alcance:** es más que la v2, que pasó por tres vueltas del probador y del revisor entre el 6 y el 9 de noviembre. Propongo 10 recortes que mantienen los 9 pedidos (apartado 4.2).

---

## 1. Qué se ve afectado

### 1.1. Lógica (`src/logica/`)

| Archivo | Qué cambia | Dónde engancha hoy [comprobado] |
|---|---|---|
| `simulacion.ts` | `REGLAS = 3`, ritmo, velocidad de la pieza que cuelga, especiales, `usar`, `seguir`, `ayudas` en `jugar` | `REGLAS` en `:17`. `AMPLITUD` y `HUECO_COLGADA` en `:37` y `:39`. `posicionVaiven` calcula x como `pasoLocal × velocidad` (`:180-185`), así que un cambio de velocidad a mitad del vaivén mueve la pieza de golpe. `xColgada` usa `piezaActual().velocidad` (`:361`). `cerrarEpisodio` (`:415-430`) es donde va el respiro. `colgarPieza` (`:439-443`) es donde se fija la velocidad. `cementar` (`:455-467`) sirve para la pieza de cemento. `jugar` está en `:510-521` |
| `piezas.ts` | La velocidad deja la secuencia. Formas, medidas y colores, iguales | `VEL_MIN`, `VEL_TOPE` y `VEL_INCREMENTO` en `:31-33`. `Pieza.velocidad` en `:56`. `velocidadDePieza` en `:86-88` y su uso en `:146`. Las doradas de `piezas.test.ts:72-92` llevan `velocidad` |
| `puntuacion.ts` | Puntos de la dorada | `puntosDeColocada` en `:42-46`. El getter `monedas` (`:98-100`) solo cuenta piezas, perfectos e hitos |
| `economia.ts` | Monedas de la dorada y `estadisticas.partidas` | El saldo **no** usa `Resultado.monedas`. Lo recalcula `monedasDePartida` (`:23-25`) desde `PartidaAcabada` (`:38-49`) en `cobrarLibre` (`:80-97`) y en `registrarOficial`. `sumarEstadisticas` (`:52-63`) es el sitio natural de `partidas` |
| `diarios.ts` | Umbrales nuevos y medallas de días v2 | Umbrales en `:19-21`. `medallaDe` con `reglas === REGLAS` en `:33-35`. Se guarda `reglas: REGLAS` en `:111` |
| `progreso.ts` | Versión 3 y campos nuevos | `VERSION_PROGRESO` en `:11`. `ajustes` en `:37` y `:175-182`. Acepta `version ≥ 2` en `:135`. `escribirProgreso` (`:244-252`) escribe solo lo normalizado, así que la v2 borraría los campos v3 al guardar |
| `niveles.ts` | Velocidades y especiales desde el nivel 4 | Tabla en `:46-55` (0,9 a 1,8 m/s) |
| `reto.ts` | Nada (los formatos no cambian) | `:13-15` |
| Nuevos | `ritmo.ts`, `especiales.ts`, `objetos.ts`, `recompensas.ts`, `tienda.ts` | — |

### 1.2. Pantalla (`src/juego/`, `src/pages/`, `src/estilos.css`)

- **`principal.ts` (950 líneas):**
  - medallas y datos de días con `reglas === REGLAS` en `:169`, `:205` y `:238`;
  - barra que se oculta en el oficial en `:243-248`;
  - el oficial solo se guarda al acabar (`:461-468`);
  - teclado y `focoEnControl` en `:806-855`;
  - `visibilitychange` en `:922-930`;
  - arranque con `abrir` en `:945-950`;
  - interruptores de la barra en `:820-834`.
- **`flujo.ts`:**
  - `Pantalla` y `Panel` en `:17-19`;
  - `abrir` empieza la partida libre (`:76-80`);
  - `sinPausa` (`:92-95`) impide hoy pausar el oficial, con el motivo «se podrían mirar las piezas y empezar otra vez»;
  - paneles sobre la partida en pausa en `:136-145`.
- **`sonido.ts`:**
  - una sola salida con `VOLUMEN` 0,5 (`:7`, `:65-67`);
  - contexto creado tras el primer gesto (`:38-69`);
  - suspensión con la pestaña oculta (`:72-76`);
  - `estrella()` usa 988 Hz, un Si, que está fuera de la pentatónica (`:161-162`).
- **`anuncios.ts`:** `MotivoRecompensado` (`:13`), `anunciosDePlataforma`, que hoy ignora su argumento (`:41-43`), y las llamadas (`:62-72`).
- **`pantallas.ts`:** `pintarHud` (`:121-123`) y el conteo de puntos con `prefers-reduced-motion` propio (`:298`).
- **`dibujo.ts`:** `ANCHO_VISTA` 9,2 m (`:22`). `ESPACIO_SOBRE_CIMA` depende de `HUECO_COLGADA` (`:27`), así que la cámara se adapta sola si baja el hueco.
- **`imagen.ts`:** el título en `:240`.
- **`coleccion.ts`, `mapa.ts` y `retos.ts`:** las medallas salen de `medallaDe` (`retos.ts:100`, `:149`).
- **`estilos.css`:**
  - HUD con `1fr auto 1fr` en `:130-140`;
  - `.hud-puntos` con `min-width: 4.5ch` y `nowrap` en `:196-207`;
  - tres `@media (prefers-reduced-motion` en `:496`, `:971` y `:1409`.
- **`index.astro`:** `<h1>` solo para lectores en `:36` y HUD en `:40-52`.

### 1.3. Configuración, CI y pruebas

- **`public/_headers:5`:** la CSP no necesita cambios (ver 2.7).
- **`package.json`:** scripts nuevos (`build:demo`). No hay `cross-env` y R9 prohíbe añadirlo.
- **`playwright.config.ts`:** un solo `webServer` en `:24-29`, 2 hilos en `:16` y tiempo por prueba de 60 s.
- **`.github/workflows/pruebas.yml`:** `timeout-minutes: 30` en la línea 24.
- **Ejecuciones recientes del CI [comprobado]:** 7 min 20 s, 7 min 27 s y 7 min 50 s.
  - En la `42631796082`, `npm test` tardó 5 s, `npm run build` 1 s y `npm run e2e` 6 min 39 s.
  - `e2e/` tiene 100 definiciones de prueba en 17 archivos. Se ejecutan 169 y se saltan 33.
- **Ayudas e2e:**
  - `esperarLibre` (`e2e/ayudas.ts:66-70`) supone que al abrir ya se juega. Se usa **88 veces** [comprobado con `grep`].
  - `abrirRetos` y `empezarHoy` (`:73-84`) pasan por la barra que desaparece.
  - `soltarEnExtremo` suelta con |x| ≥ 2,6 m (`:226`). Con `AMPLITUD` 2,6 esa ventana casi desaparece (ver 2.1).
- **Doradas de pruebas que cambian:**
  - `piezas.test.ts:52-58` («la velocidad nunca baja»);
  - `piezas.test.ts:72-92` (campo `velocidad`);
  - la dorada de simulación de `simulacion.test.ts:201-207`;
  - `diarios.test.ts:111-117`.

### 1.4. Datos y servicios

- **Datos guardados de jugadores reales:** `torre-diaria:progreso` v2, con días `reglas: 2` desde el 2026-11-09. Hay que migrarlos (ver 2.2).
- **Integraciones y trabajos programados:** ninguno nuevo. No hay SDK, red ni servidor.
- **Cloudflare Pages:** el despliegue queda fuera de esta fase.

---

## 2. Riesgos

### 2.1. Velocidad de arranque: lo medido

**Dónde se va el tiempo de cada pieza [medido].** Cada pieza tarda lo que le cuesta llegar al objetivo (`AMPLITUD / v`) más su caída desde `HUECO_COLGADA`. La caída son √(2 · 2,5 / 10) ≈ 0,71 s más lo que tarda en quedarse quieta. Bajar `ESPERA_MIN` de 20 a 10 pasos no cambia nada: las cifras salen idénticas. Por eso subir la velocidad solo ataca la mitad del problema, y la mitad que más castiga al novato. Con ±180 ms de error a 1,7 m/s, el novato falla por ±0,31 m, y la tolerancia del perfecto es de 0,16 m.

Medianas de los días 1 a 30. «Primera» es el segundo de la primera suelta del medio. «Cadencia» es la mediana de segundos entre las sueltas 1 a 10. «10.ª» es el segundo en que se coloca la décima pieza. Ritmo del Anexo J en todas menos la v2. Sin especiales ni objetos.

| Constantes (v inicial, incremento, `AMPLITUD`, `HUECO`) | Primera | Cadencia medio | 10.ª medio | Novato | Medio | Experto | Puntos novato / medio |
|---|---|---|---|---|---|---|---|
| **v2:** 1,0, +0,03, 3,4, 2,5 (sin ritmo) | 3,38 s | 3,77 s (novato 3,91; experto 3,76) | 38,4 s | 83,2 s | 169,8 s | 302,3 s | 567,5 / 2.430 |
| Plan: 1,6, +0,025, 3,4, 2,5 | 2,10 | 2,74 | 27,7 | **51,7** | **111,2** | — | 322,5 / 1.372,5 |
| Plan: 1,7, +0,025, 3,4, 2,5 | 1,98 | 2,64 | 26,8 | **45,3** | **97,9** | **230,5** | 297,5 / 1.127,5 |
| 1,77, +0,025, 3,4, 2,5 (tope de la ventana) | 1,90 | 2,58 | 26,7 | **44,6** | **79,2** | — | 272,5 / 990 |
| 1,7, +0,025, 2,8, 2,5 | 1,63 | 2,34 | 24,1 | **41,3** | **86,1** | — | 310 / 1.130 |
| 1,3, +0,03, 2,6, 2,5 | 1,98 | 2,55 | 25,8 | **56,6** | **113,1** | — | 385 / 1.997,5 |
| 1,3, +0,03, 2,6, 1,8 | 1,98 | 2,43 | 24,7 | **55,1** | 121,3 | — | 467,5 / 2.147,5 |
| 1,4, +0,025, 2,6, 1,8 | 1,83 | 2,35 | 23,7 | **54,8** | 133,0 | — | 410 / 2.222,5 |
| **Propuesta: 1,3, +0,025, 2,6, 1,8** | **1,98** | **2,47** (novato 2,62; experto 2,44) | **24,9** | **62,4** | **142,0** | **262,4** | 467,5 / 2.497,5 (experto 6.250) |

En negrita, lo que incumple los rangos de B2: novato de 60 a 150 s, medio de 120 a 300 s y experto de 240 a 720 s.

- **Con la propuesta:**
  - la primera pieza llega al centro en 2,6 / 1,3 = 2,0 s; en Node, `2.6/1.3 <= 2` da `true` y no hay problema de redondeo;
  - la ventana del perfecto es de 0,16 / 1,3 = 123 ms (≥ 90);
  - la cadencia del medio es de 2,47 s (≤ 2,6);
  - las tres duraciones caen dentro de sus rangos y ninguna partida llega al tope;
  - el arranque es un 35 % más rápido: 25 s hasta la décima pieza en lugar de 38 s.
- **Margen escaso:** el novato queda a 2,4 s del mínimo de 60. Las especiales pegajosa y de cemento estabilizan la torre, así que es probable que alarguen la partida [supuesto]. L1 lo vuelve a medir.
- **Puntos:** quedan en la escala de la v2 (medio 2.497 frente a 2.430). Así, los enlaces `?reto=` de la v2 siguen siendo comparables a grandes rasgos. Con 1,7 m/s, el medio bajaría a 1.127.
- **Efectos de cambiar `AMPLITUD` y `HUECO_COLGADA`:**
  - Ninguno de los dos cambia la secuencia de formas.
  - La vista de 9,2 m sigue conteniendo el vaivén: 2,6 + 1,1 m de media pieza ≤ 4,6 m.
  - La cámara se ajusta sola, porque `dibujo.ts:27` depende de `HUECO_COLGADA`.
  - Cambian la dorada de simulación (cambia de todos modos) y las capturas.
- **Ayuda e2e `soltarEnExtremo`:** suelta con |x| ≥ 2,6 m (`e2e/ayudas.ts:226`). Con `AMPLITUD` 2,6, eso solo ocurre en el instante del giro. Con el umbral en 2,2 m, **las 90 piezas soltadas así (3 vidas × 30 días) cayeron [medido]**, igual que con la v2 en 2,6 m.
- **Tiempo de cada medición:** novato 8 s, medio 20 s y experto 44 s [medido]. Una vuelta de ajuste cuesta unos 72 s.

### 2.2. Reglas v3 con jugadores reales

- **Medallas de los días ya jugados:**
  - `medallaDe` (`diarios.ts:33-35`) devuelve `null` si `reglas !== REGLAS`. Con `REGLAS = 3`, los días v2 se quedan sin medalla en Retos y en su ficha (`retos.ts:100`, `:149`; `principal.ts:238`).
  - `principal.ts:169` y `:205` también usan `=== REGLAS` para «no es la v1»: los perfectos y los puntos del día en el aviso `?reto=` desaparecerían.
  - Y aunque se cambie a `>= 2`, los umbrales nuevos de L1 recalcularían la medalla de un día v2 con otra regla.
  - **Corrección:** guardar los umbrales por versión de reglas (`UMBRALES[2] = 550 / 2.400 / 4.000`) y que `medallaDe` use los de `jugado.reglas`. `registrarOficial` usa los de `REGLAS`. Los 4 sitios pasan a `reglas >= 2`. Es reversible: sin datos nuevos.
- **Racha, monedas y estrellas guardadas:** no cambian, porque no se recalculan [comprobado].
- **Repetir o jugar atrasado un día de la v2:** se juega con las reglas 3. Es aceptable y lo anota el plan.
- **Imágenes de días pasados:** se rehacen con `generarSecuencia` (`principal.ts:164-171`). Las formas no cambian, así que salen iguales.
  - Si H3 pinta las especiales en la imagen, tiene que hacerlo solo en días con `reglas ≥ 3`. En la v2 no las había.
- **Enlaces `?reto=` y `?libre=` de la v2:** el formato no cambia (`reto.ts:13-15`). Con la propuesta de 2.1, los puntos quedan en la misma escala [medido], así que el riesgo baja de «comparan reglas distintas» a «comparan partidas parecidas».
  - Con las velocidades del Anexo J, los puntos del medio bajarían a la mitad y el amigo que llega de la v2 parecería imbatible.
- **Equidad del reto diario:**
  - Las especiales salen de la semilla y el ritmo es determinista, así que el reto es igual para todos.
  - La pausa no da ventaja: el vaivén se congela.
  - **Pero hay una laguna que ya existe:** el oficial solo se guarda al acabar (`principal.ts:461-468`), así que recargar la página reinicia el intento sin que cuente. T29 añade «Abandonar», que **sí** cuenta. Eso castiga al jugador honrado y no cierra la laguna.
  - **Recomendación:** en la pausa del oficial, solo «Seguir» y «Ajustes», como la v2, que tampoco tenía salida. La laguna de recargar queda anotada como limitación conocida: sin ranking, el impacto es bajo y viene de la v2.
- **Volver atrás:**
  - Pages guarda los despliegues anteriores [supuesto: el panel de Cloudflare permite volver a uno].
  - El código v2 lee un progreso v3 (`version ≥ 2`, `progreso.ts:135`) y no pierde monedas, retos ni niveles.
  - Pero al primer guardado lo reescribe solo con sus campos (`progreso.ts:244-252`): se pierden objetos, desbloqueos, avisos vistos y `ajustes.musica`.
  - Al volver a la v3, la migración los rehace: desbloqueos por `partidas` y música según el sonido, pero no los objetos comprados.
  - T31 dice «no pierde monedas ni retos», y es cierto, pero hay que añadir «sí pierde objetos». Hoy no hay compras reales, así que se acepta y se anota.
- **Partidas para desbloquear objetos:** al migrar, un jugador de la v2 con más de 6 partidas recibe los 3 objetos con 2 de regalo cada uno. Es un regalo razonable y no un riesgo.

### 2.3. Determinismo

- **El reloj a mitad del vaivén hace saltar la pieza [comprobado en `simulacion.ts:180-185`].** x se calcula como `(pasoLocal · v · PASO) mod recorrido`. Si v pasa a ×0,6 con la pieza a mitad de camino, x cambia de golpe, a veces más de 1 m.
  - **Corrección:** la pieza que cuelga lleva la distancia recorrida acumulada (`distancia += v · PASO` en cada paso) y su posición sale de ahí.
  - La racha (×1,08) solo se aplica al colgar, así que no tiene el problema.
- **`VEL_SUELO` contradice dos requisitos:**
  1. I1 pide «velocidad sin reloj × `RELOJ_MULT` (diferencia < 0,001)». Con la propuesta del plan, 1,6 × 0,6 = 0,96 sube a 1,2: el requisito falla con las primeras 7 piezas, y el reloj, al principio, frena un 25 % y no un 40 %.
  2. La fórmula del Anexo J aplica `clamp(VEL_SUELO, …)` a todo. Los niveles 1 a 3 (0,9 m/s, `niveles.ts:46-48`) pasarían a 1,2 sin que nadie lo decida.
  - **Corrección:** quitar `VEL_SUELO`. Con el ritmo ≥ 0, la velocidad base nunca baja de la inicial de esa partida. El reloj multiplica después.
- **Especiales «se pidan en el orden que se pidan» (H1).** Con un único generador `semilla|especiales`, el resultado depende de cuántas veces se haya consultado.
  - **Corrección:** un generador por tramo, `crearGenerador(\`${semilla}|especiales|${tramo}\`)`, sin estado entre tramos.
- **Pegajosa (`WeldJoint`).** Es determinista en el mismo motor. `destroyBody` destruye también sus uniones, así que retirar una pieza unida no rompe nada [supuesto, por cómo funciona Box2D].
  - Falta decidir si se une también a la plataforma. Recomiendo que **no**: solo a piezas, para que una pegajosa sobre la plataforma no sea un ancla.
- **Ayudas en `jugar`:** con `{ paso, tipo }` y el seguir aplicado en el paso en que acabó, la pantalla y Node coinciden. Tienen que ir en `data-ayudas`, como dice el plan.
- **Velocidad con multiplicadores:** las multiplicaciones son IEEE y dan lo mismo en todos los motores. Redondear a centésimas tras los multiplicadores mantiene `data-velocidad` legible y la tabla de pruebas exacta.

### 2.4. Marcador

Reproducido con el `dist/` actual: textos de A1, `Combo ×12` y `Récord 999.999` visibles [medido].

| Pantalla | Primer caso que falla | Datos |
|---|---|---|
| 320×568 | «1.000» | número: `scrollWidth` 115 > `clientWidth` 105. `.lado` acaba en x = 352 px con el HUD en 320: «Récord 999.999» se corta |
| 360×640 | «1.000» | 115 > 105 |
| 390×844 | «12.345» | 138 > 132 |
| 1280×800 | ninguno | la columna de 450 px da sitio |
| 1280×600 | «1.000» | 115 > 105. `.lado` acaba en 823 con el HUD en 809 |

- **Causa confirmada:** la que supone T28. Las columnas laterales `1fr` crecen hasta el ancho mínimo de su texto `nowrap` (111 a 121 px) y la central `auto` se queda en el `min-width: 4.5ch` (105 px). El número se sale de la pegatina.
- **Cálculo en 320 px:** hay 296 px útiles.
  - En la v2: vidas 86 px + «999.999» a 36,8 px, 161 px con relleno + «Récord 999.999» 121 px + 2 huecos de 8 px = 384 px. No cabe ni hoy.
  - Con el número a 24 px (≈ 114 px, escalado lineal [supuesto]) siguen siendo 337 px.
  - Con el botón de pausa de E3 (44 px y un hueco), 387 px.
  - **El requisito de A1, con todo visible en una fila, no se puede cumplir en 320 px.** «Récord» y «Meta» tienen que ir bajo el número o partirse en dos líneas («Récord» / «999.999», unos 60 px).
  - Y A1 tiene que reservar ya el hueco del botón de pausa, o E3 lo vuelve a romper.

### 2.5. Música sintetizada

- **Coste en el hilo principal [medido en una página vacía, sin el juego].** Simulé el peor caso del Anexo F: capa 3 a 112 BPM, con marimba, contramelodía en semicorcheas, cepillo, bombo, bajo y colchón. Son unos 19,5 sucesos por segundo, cada uno con 2 a 6 nodos.

  | CPU | Temporizador y anticipación | Tic: media | p95 | Máximo | Tics en 10 s |
  |---|---|---|---|---|---|
  | ×1 | 25 ms y 0,1 s | 0,30 ms | 0,7 ms | 74 ms (el primero: arranque del contexto) | 392 de 400 |
  | ×4 | 25 ms y 0,1 s | 0,72 ms | 4,1 ms | 10,7 ms | **251 de 400** |
  | ×4 | 50 ms y 0,2 s | 1,03 ms | 3,8 ms | 21,5 ms | 173 de 200 |

  - De media es poco: 0,72 ms × 25 tics/s ≈ 1,8 % del hilo con CPU ×4.
  - El problema son los picos de 4 a 21 ms que caen dentro de un fotograma. El p95 del móvil en la v2 deja **2 a 7 ms** de margen hasta 33 ms (26 a 31 ms medidos, README).
  - Con CPU ×4, el temporizador de 25 ms solo dispara el 63 % de las veces. Con 0,1 s de anticipación, eso ya roza los huecos.
  - **Recomendación:** programar desde el bucle de fotogramas que ya existe, sin `setInterval` propio. Así no hay temporizador que compita, y al ocultar la pestaña el bucle se para solo.
    - Anticipación de 0,2 s.
    - Un filtro por instrumento creado una vez, y no uno por nota. Eso deja la mitad de nodos por nota.
  - El coste del hilo de audio en un móvil real no lo he medido [a medir: solo con un dispositivo].
- **Autoplay:** el `AudioContext` se crea tras el primer gesto (`sonido.ts:38-69`). En este equipo tarda de 0,4 a 6 s (README:154).
  - En la primera visita, la música del inicio no suena hasta el primer toque, que casi siempre es «Jugar». Pasa directa a la de partida.
  - El inicio mejora el sonido en iPhone: el gesto de «Jugar» abre el contexto antes de la primera pieza.
  - `data-musica` tiene que decir la pista que toca aunque aún no suene.
- **iPhone en silencio:** WebAudio no suena (README:104).
  - **No** hay que forzarlo con `navigator.audioSession.type = "playback"`: quien tiene el móvil en silencio no espera música [supuesto, sin dispositivo].
- **«Todo en la misma escala» (T6):** `estrella()` usa 784, **988** (Si) y 1.175 Hz (`sonido.ts:162`), y suena justo con la fanfarria. O se pasa a 784, 880 y 1.047 Hz, o T6 se matiza.
- **Peso [comprobado y supuesto].**
  - JavaScript actual: 79.889 bytes con `gzip -9`. De ellos, planck ocupa unos 54,8 KB: su `planck.min.js` comprimido.
  - El código propio, unos 298 KB de fuente con comentarios, deja unos 25 KB comprimidos.
  - La v3 añade quizá entre 120 y 180 KB de fuente: de 10 a 20 KB más comprimidos [supuesto].
  - Total esperado: **90 a 100 KB de 150**. Las partituras como datos pesan 1 o 2 KB.
- **Pruebas:**
  - El contexto real tarda en abrirse, lo que hace frágiles las pruebas de audio.
  - Para contar nodos por salida (C2, D1) conviene un `AudioContext` falso que pase a `running` y cuente lo que se crea, junto al mudo de `e2e/ayudas.ts:23-36`.
  - El real, solo en D4.

### 2.6. Pagos y vídeos: lo que condiciona el diseño ya

- **Botones muertos (R12):**
  - Con `anunciosNulos` y `pagosNulos` no se verá en la web ningún vídeo ni ninguna compra con dinero. Es correcto.
  - Consecuencia: el pedido 9 («monedas por dinero y vídeo cada x horas») solo se puede enseñar en la revisión con la compilación de demostración. Por eso **K3 no debe ser el primer recorte**, aunque el plan lo marque como aplazable.
  - La ficha «Monedas gratis» del inicio nunca se verá en la web. La quitaría del inicio: queda en la pestaña Monedas.
- **Pautas de la red CPC sobre monedas virtuales (marzo de 2025) [comprobado en búsqueda; no descargué ninguna página]:**
  - **Precio real visible:** `Pagos.productos()` debe dar el precio en céntimos y la moneda, no solo un texto. Si no, no se puede mostrar «≈ X €» junto a un precio en monedas. La tarjeta de objeto de J1 tiene que dejar hueco para esa línea, visible solo con `pagos.disponible()`.
  - **Paquetes que no cuadran con los precios** (1.000, 3.000 y 8.000 frente a 120, 180 y 250): las pautas los señalan. Basta anotarlo para cuando se activen.
  - **Derecho de desistimiento de 14 días, incluida la moneda no usada:** hay que saber cuántas monedas compradas quedan sin gastar.
    - Con `compras.transacciones` como lista de ids, no se puede.
    - **Corrección barata ya:** guardar `{ id, producto, monedas, fecha }`. Así se evita otra migración al activar.
  - **Menores:**
    - nada de ofertas de una sola vez («lote de inicio»), que es presión (T22);
    - textos sin imperativos de compra;
    - la pestaña Monedas nunca por defecto;
    - «¿Seguir?», en el momento de perder, nunca ofrece dinero real.
- **Lo pagado nunca se recorta.** El lote del Anexo I da 3 de cada objeto «sin pasar del máximo de 9»: se pagaría por unidades que luego se tiran.
  - **Corrección:** un «Pack de ayudas» repetible (3 de cada objeto), que solo se ofrece si con él ningún objeto pasa de 9.
  - Así se mantiene «objetos por dinero», que pidió el usuario, sin la oferta de una vez.
- **Para activar, fuera de esta fase:**
  - **Lo pagado solo vive en `localStorage`.** Si el jugador borra los datos, pierde lo comprado. Hace falta restaurar las compras, con un servidor o un recibo.
  - **Stripe no está en la tabla de herramientas de la estrategia:** exige un motivo escrito (regla 2).
  - **En las apps de Android e iOS**, los bienes digitales van por la facturación de la tienda.
  - **Con anuncios:** consentimiento, y edad mínima de 14 años en España para consentir [supuesto, a revisar por la asesoría legal].

### 2.7. Seguridad y CSP

- **La CSP no cambia (R6):**
  - **Logo:** un SVG en línea dentro del HTML no es script ni estilo. Los atributos de presentación (`fill`) los permite `style-src 'self'`, y `style="` no. El parpadeo, con una clase y CSS.
  - **Favicon:** sigue en `data:image/svg+xml`, permitido por `img-src data:`. Con trazados, porque un `data:` no carga la fuente.
  - **Música y pagos:** la música no usa `media-src` y los pagos nulos no hacen peticiones.
- **R14 tal como está no prueba nada en un punto:** el minificador renombra `pagosSimulados`, así que buscar ese nombre en `dist/` siempre da «limpio».
  - **Corrección:**
    - buscar solo textos que sobreviven a la minificación («Demostración», «Vídeo de prueba», «Pago simulado»);
    - elegir la implementación con `import.meta.env.MODE === "demo"` en el nivel superior, que Vite convierte en constante y elimina;
    - no pasar el valor como argumento en tiempo de ejecución, como hace hoy `anunciosDePlataforma(import.meta.env.PUBLIC_PLATAFORMA)`.
- **R5 sigue cubierto:** los textos nuevos con datos del guardado (contadores de objetos, saldo) van por `textContent`. Hoy hay 0 `innerHTML` en `src/`.

### 2.8. Pruebas, CI y tiempo

- **Tiempo de CI [comprobado y supuesto]:**
  - Hoy, `npm run e2e` tarda 6 min 39 s en CI y unos 14 min en local, con 169 pruebas.
  - Los requisitos de Playwright del plan suman unas 50 pruebas nuevas en dos proyectos: unas 100 ejecuciones más [supuesto, contadas en los requisitos].
  - A ritmo constante, serían unos 11 min de e2e en CI (unos 12 a 13 min en total) y unos 22 min en local.
  - El arranque más rápido acorta las partidas en tiempo real, porque la décima pieza llega 13 s antes [medido en 2.1].
  - Cabe en el tope de 30 min, pero en local se acerca a lo que tolera el proceso.
- **Recomendaciones para las pruebas:**
  - las pruebas de solo DOM o maquetación, en el proyecto `escritorio` salvo que el tacto importe;
  - la lógica nueva (flujo, objetos, recompensas, tienda, ritmo y especiales), con Vitest, que en CI tarda 5 s.
- **Compilación de demostración:** `npm run build` tarda 1 s en CI [comprobado], así que el requisito de K3 («≤ 3 min de CI») se cumple de sobra. Lo que cuesta son las pruebas de la demo.
- **`PUBLIC_PLATAFORMA=demo astro build` no funciona en este equipo:** `npm config get script-shell` da `null`, así que `npm run` usa cmd.exe en Windows, y no hay `cross-env` (R9 lo prohíbe).
  - **Corrección:** `astro build --mode demo --outDir dist-demo`. La CLI de Astro 7.4.5 admite los dos parámetros [comprobado con `--help`].
  - Que `--mode demo` siga compilando como producción es [supuesto]: hay que comprobarlo en K3.
- **Pruebas que se rompen seguro:**
  - las 88 llamadas a `esperarLibre` (se arreglan cambiando la ayuda);
  - `abrirRetos` y `empezarHoy`;
  - las 13 apariciones de la barra o de «Colección» en `e2e/`;
  - `soltarEnExtremo` (2.1);
  - las doradas de 1.3;
  - las capturas.
- **Espacio con «Jugar» enfocado:** el inicio pone el foco en «Jugar». Si el manejador global de Espacio (`principal.ts:843-855`) también actúa en el inicio, una pulsación puede empezar la partida en `keydown` y luego activar el botón en `keyup`, o soltar la primera pieza. Hace falta un requisito.

### 2.9. Alcance

Son 35 tareas sobre un `principal.ts` de 950 líneas, con 6 pantallas o paneles nuevos o rehechos (inicio, pausa, ajustes, tienda, mapa y «¿Seguir?") y dos subsistemas nuevos (música y objetos). La v2 tenía 28 tareas y tres vueltas del probador. **Sin recortes, la entrega pulida es improbable sin varias vueltas [supuesto].** Lo que más cuesta y menos aporta a los 9 pedidos:
- efectos reducidos con tres posiciones (C3; no lo pidió el usuario);
- el tempo variable de la música;
- «Abandonar» con confirmación;
- la mini-tienda en pausa;
- el logo en canvas;
- el lote de inicio;
- «¿Seguir?» en los niveles;
- los premios de los niveles 3, 6 y 9.

Ver los recortes en 4.2.

---

## 3. Coste gratuito

| Recurso | Consumo | Cálculo | Queda |
|---|---|---|---|
| GitHub Actions | 0 min de la cuota | Repositorio público y guarda `if: !private` (README:68). Duración por ejecución: hoy de 7 min 20 s a 7 min 50 s; con la v3, de 12 a 15 min [a medir en E4 y L4] | Los 92 a 244 min libres de la estrategia siguen intactos. Tope por ejecución: 30 min |
| Caché de Actions | Sin cambio (npm y Chromium) | Ninguna dependencia nueva (R9) | — |
| Cloudflare Pages | 0 en esta fase; 1 despliegue tras la aprobación | Subida directa con `wrangler`. Supongo que no gasta compilaciones de Pages, que son las de Git [supuesto]. Sigue habiendo 1 archivo JS: sin riesgo para los 20.000 archivos | 500 compilaciones al mes |
| Supabase, D1, Workers, Resend, Expo | 0 | No se usan | Sin cambio |
| Peso para el jugador | JS de 79,9 KB a unos 90-100 KB con gzip [supuesto]; fuentes, sin cambio (60.012 B) | 2.5 | 50-60 KB de JS y 20 KB de fuentes |
| `localStorage` | 47 KB (365 días de experto, README) + inventario + 50 transacciones de unos 60 B ≈ 50 KB | Límite del plan: 100 KB | ≈ 50 KB |
| CPU del jugador | Música: ≈ 1,8 % del hilo principal con CPU ×4 [medido en 2.5], más el hilo de audio [a medir en móvil] | — | — |
| Uso del plan de Claude | Alto: 35 tareas y vueltas de ajuste. Cada medición de duración, unos 72 s | — | Los recortes de 4.2 lo bajan |

**Bloqueantes de coste o de herramienta: ninguno.** Para activar pagos más adelante, Stripe no está en la tabla de herramientas de la estrategia y hará falta un motivo escrito. No afecta a esta fase.

---

## 4. Cómo encajarlo mejor

### 4.1. Recomendación

1. **Velocidad: acortar el recorrido y la caída, no solo subir la velocidad** (2.1). Constantes de partida: 1,3 m/s, +0,025, tope 3,4, `AMPLITUD` 2,6, `HUECO_COLGADA` 1,8, respiro de 4 y racha ×1,08 con combo ≥ 5. Sin `VEL_SUELO`.
2. **Una sola tabla de umbrales por versión de reglas** en `diarios.ts`. Los sitios que preguntan «¿es de la v1?» lo hacen con `reglas >= 2` o `reglas === 1`, nunca con `=== REGLAS`.
3. **Reutilizar lo que hay:**
   - **Paneles:** el mecanismo de paneles sobre la partida en pausa (`flujo.ts:136-145`) para Ajustes y para la Tienda que se abre con «+».
   - **Guardado:** `Guardado.cambiar` para gastar y comprar, que ya resuelve dos pestañas.
   - **Monedas:** `monedasDePartida` para las de la dorada.
   - **Cementado:** `cementar` para la especial de cemento.
   - **Pruebas e2e:** el envoltorio de `AudioContext` de `e2e/arte.spec.ts:111-136`.
   - **Selección por plataforma:** el patrón `anunciosDePlataforma`, pero con `MODE` constante (2.7).
4. **Sacar de `principal.ts`** el inicio, la pausa, los objetos y la tienda a archivos propios, como ya propone el plan. Sin React (T30).
5. **Música programada desde el bucle de fotogramas,** con filtros por instrumento y anticipación de 0,2 s (2.5).

### 4.2. Recortes propuestos (los 9 pedidos se mantienen)

| # | Recorte | Pedido que lo cubre igual | Por qué |
|---|---|---|---|
| R-1 | Sin C3 ni «Efectos reducidos» en Ajustes: se sigue al sistema, como en la v2 | Ajustes con música y sonidos separados | No lo pidió el usuario. Ahorra una refactorización de 5 sitios (no 3: también `pantallas.ts:298` y `principal.ts:59`) |
| R-2 | Música con tempo fijo por pista (inicio 88 y partida 104 BPM), capas 0 a 2, sin variación B ni contramelodía. La victoria reutiliza el arpegio de `sonido.record()` | Música | Las capas ya hacen que «crezca con la torre». El tempo variable obliga a cambiar de tempo al empezar el compás y a probarlo |
| R-3 | Pausa del oficial con «Seguir» y «Ajustes», sin «Abandonar» | Pantalla de inicio | Recargar ya reinicia el oficial sin contar (2.2). «Abandonar» solo castiga y añade confirmación y pruebas |
| R-4 | «¿Seguir?» solo en la partida libre; en los niveles, solo reloj y cemento | Objetos | `anuncios.md`, apartado 2, punto 1: «nunca en reto diario ni niveles». Un nivel de 1 vida (el 7) perdería sentido |
| R-5 | Sin premios de primera victoria en los niveles 3, 6 y 9 | Objetos | Los regalos de desbloqueo ya enseñan los objetos. Es un camino más que probar |
| R-6 | Con 0 unidades, «+» abre la Tienda (pestaña Objetos) encima de la partida en pausa, en lugar de una mini-tienda | Objetos con compra por monedas o vídeo | Mecanismo existente: un componente menos |
| R-7 | Logo en SVG en el inicio y favicon nuevo. La imagen para compartir mantiene su título de texto (`imagen.ts:240`) con el mismo estilo | Logo | Usar el logo en canvas obliga a dibujar las letras como trazados (un SVG como imagen no carga la fuente de la página) y a regenerar la referencia de compartir |
| R-8 | Sin `lote-inicio`: en su lugar, «Pack de ayudas» repetible, solo si no se pierde nada por el tope de 9 | Objetos por dinero | CPC y menores (2.6). Además, sin la marca «una vez» |
| R-9 | Sin «Cómo se juega» | — | El plan ya lo daba por aplazable |
| R-10 | Sin la ficha «Monedas gratis» en el inicio: el vídeo de monedas vive en Tienda > Monedas | Monedas por vídeo cada x horas | En la web nunca se ve (R12). Un inicio más limpio: «que se entienda al instante» |

K3 (la demo) **no** se recorta: es la única forma de enseñar el pedido 9 en la revisión (2.6). Pero se simplifica a un proyecto de Playwright solo en escritorio con pocas pruebas.

---

## 5. Cambios al plan

Formato pegable. Cada línea dice a qué tarea o bloque afecta y lleva la marca **[impacto]**.

### Requisitos globales

- **R8, añadir [impacto]:** «De los 79.889 B de JavaScript con gzip, planck ocupa unos 54,8 KB (su `planck.min.js` comprimido, medido el 2026-11-09). Estimación para la v3: 90 a 100 KB. Se mide al cerrar D, I y J, no solo en L4».
- **R14, cambiar [impacto]:** quitar «pagosSimulados» de la lista, porque el minificador renombra los identificadores. Buscar «Demostración», «Vídeo de prueba» y «Pago simulado». Requisito añadido: «la implementación se elige con `import.meta.env.MODE === "demo"` en el nivel superior del módulo, no con un argumento en tiempo de ejecución».
- **R16, nuevo [impacto]:** «Medallas por versión de reglas: un día con `reglas: 2` muestra la medalla de los umbrales de la v2 (550, 2.400 y 4.000), y uno con `reglas: 3`, la de los nuevos. Ningún código compara `reglas === REGLAS` para decidir si un día es de la v1. Prueba: Vitest sobre `diarios.ts` y buscar `=== REGLAS` en `src/`».
- **R17, nuevo [impacto]:** «Duración de las pruebas: `npm run e2e` en CI ≤ 20 min [a medir al cerrar E4: se anota la cifra y, si pasa de 20, las pruebas de solo DOM pasan a un único proyecto]. Las pruebas nuevas de maquetación o DOM van solo en `escritorio` salvo que dependan del tacto».

### Bloque A

- **A1, cambiar [impacto]:** el primer paso ya está hecho; se mantiene en el commit. Causa comprobada el 2026-11-09 con el `dist/` de la v2:
  - El número desborda la pegatina desde «1.000» en 320×568, 360×640 y 1280×600, y desde «12.345» en 390×844.
  - `.lado` se sale del HUD en 320×568 (x = 352 de 320) y en 1280×600.
  - En 1280×800 no falla.
- **A1, cambiar requisito [impacto]:** «En 320 px no caben en una fila vidas, 999.999 a ≥ 24 px, "Récord 999.999" y la pausa (cálculo: 387 px de 296). "Récord" y "Meta" van bajo el número o en dos líneas. El número nunca lleva puntos suspensivos. La prueba reserva ya el hueco de 44×44 px del botón de pausa de E3». El requisito de «≥ 24 px» se mantiene.

### Bloque C1

- **C1, cambiar [impacto]:** `compras` pasa a `{ transacciones: Array<{ id, producto, monedas, fecha }> (≤ 50) }`, sin `loteInicio`. Motivo: al activar pagos hay que saber cuántas monedas compradas quedan sin gastar (desistimiento de 14 días de la moneda no usada, pautas CPC de 2025).
- **C1, añadir [impacto]:** requisito «un progreso v3 leído por `normalizar` de `main` conserva monedas, diarios, racha, niveles y catálogo (Vitest, con el código de la v2 fijado en la prueba o con la lista de claves). Al guardar, la v2 borra los campos v3 (objetos, desbloqueos y vistos): se anota en el README como efecto de volver atrás».

### Bloque B

- **B1, cambiar [impacto]:** quitar `VEL_SUELO`. Fórmula: `v = min(VEL_TOPE, centésimas((velocidadInicialDeLaPartida + VEL_INCREMENTO · ritmo) · racha)) · reloj`, con `ritmo ≥ 0`. Motivos:
  - con el suelo, el requisito de I1 («× `RELOJ_MULT`, diferencia < 0,001») falla en las primeras piezas;
  - los niveles 1 a 3 (0,9 m/s) subirían a 1,2 sin decidirlo.
- **B1, cambiar [impacto]:** valores de partida medidos el 2026-11-09 (días 1 a 30, ver `impacto.md` 2.1):
  - `VEL_INICIAL` 1,3, `VEL_INCREMENTO` 0,025, `VEL_TOPE` 3,4;
  - `AMPLITUD` 3,4 → **2,6** y `HUECO_COLGADA` 2,5 → **1,8** (`simulacion.ts:37`, `:39`);
  - `RESPIRO_CAIDA` 4, `RACHA_COMBO` 5, `RACHA_MULT` 1,08.

  Resultado: primera pieza en 2,0 s, ventana de 123 ms, cadencia del medio 2,47 s, y novato, medio y experto con 62,4, 142,0 y 262,4 s. Con los valores del Anexo J (1,6 a 1,77), el novato baja a 45-52 s y el medio a 79-111 s. Las formas no cambian.
- **B1, añadir [impacto]:** «Los 4 sitios que usan `reglas === REGLAS` (`diarios.ts:34`, `principal.ts:169`, `:205`, y `medallaDe` desde `retos.ts:100`, `:149` y `principal.ts:238`) pasan a umbrales por versión (R16)».
- **B1, añadir [impacto]:** «La velocidad se redondea a centésimas después de los multiplicadores y la pantalla la expone en `data-velocidad`».
- **B2, cambiar [impacto]:** anotar las cifras de la v2 ya medidas el 2026-11-09 con la lógica de `main`:
  - primera suelta: 3,38 a 3,42 s;
  - cadencia: novato 3,91 s, medio 3,77 s y experto 3,76 s;
  - décima colocada: novato 40,5 s, medio 38,4 s y experto 38,3 s.

  Se quita la estimación «unos 4 s». Los requisitos numéricos de B2 se mantienen: con los valores de B1 se cumplen todos a la vez [medido], así que «manda la cadencia» solo hará falta si las especiales los mueven en L1.
- **B2, añadir [impacto]:** «`soltarEnExtremo` (`e2e/ayudas.ts:226`) suelta con |x| ≥ 2,2 m en lugar de 2,6. Medido: con `AMPLITUD` 2,6, 90 de 90 piezas soltadas así caen».

### Bloque H

- **H1, cambiar [impacto]:** generador por tramo, `crearGenerador(\`${semilla}|especiales|${tramo}\`)`, sin estado entre tramos. Así se cumple «se pidan en el orden que se pidan».
- **H2, añadir [impacto]:** «La dorada suma monedas a través de `PartidaAcabada.doradas` y `monedasDePartida` (`economia.ts:23-25`, `:38-49`). Hoy el saldo no usa `Resultado.monedas`, así que sin esto las 10 monedas no se cobran nunca. En los niveles, que solo pagan estrellas, la dorada da puntos y no monedas. Requisito: Vitest de `cobrarLibre` y `registrarOficial` con 2 doradas = +20».
- **H2, añadir [impacto]:** «La pegajosa se une solo a piezas, no a la plataforma. Requisito: retirar en un episodio una pieza unida no lanza excepciones y retira también la unión (Vitest)».
- **H3, añadir [impacto]:** «La imagen de un día guardado pinta las especiales solo si `reglas ≥ 3`».

### Bloque I1

- **I1, añadir [impacto]:** «La pieza que cuelga lleva la distancia recorrida acumulada (`+= v · PASO` en cada paso) en lugar de `pasoLocal · v`. Requisito: al usar el reloj a mitad del vaivén, |x(n+1) − x(n)| ≤ v · PASO + 1e-9 en todos los pasos (Vitest)». Motivo: `posicionVaiven` (`simulacion.ts:180-185`) salta si cambia v.
- **I1, cambiar [impacto]:** `seguir()` solo en libre. En niveles devuelve `false`, como en el reto (R-4).

### Bloque E

- **E1 y E3, cambiar [impacto] (R-3):** en el oficial y en su repetición, la pausa ofrece solo «Seguir» y «Ajustes». Sale de E3 el requisito de «Abandonar el reto». Motivo: el oficial solo se guarda al acabar (`principal.ts:461-468`) y recargar lo reinicia sin contar. Se anota esa laguna como limitación conocida en el README. Se mantiene «al volver de otra pestaña, queda en pausa».
- **E2, añadir requisito [impacto]:** «Con el foco en "Jugar", una pulsación de Espacio (y otra de Intro) empieza la partida una sola vez y no suelta ninguna pieza: `data-toques` vacío 500 ms después (Playwright)».
- **E2, cambiar [impacto] (R-10):** quitar la ficha «Monedas gratis» del inicio.
- **E4, cambiar [impacto]:**
  - `esperarLibre` (88 usos) pulsa «Jugar»;
  - `abrirRetos` y `empezarHoy` (`e2e/ayudas.ts:73-84`) pasan por la tarjeta del inicio;
  - hay que revisar las 13 apariciones de la barra o de «Colección» en `e2e/`.

  Se añade la duración medida a R17.

### Bloque C2-C3

- **C2, cambiar [impacto] (R-1, R-9):** Ajustes con Música, Sonidos, Vibración (si existe), «Créditos y licencias» con la privacidad en el mismo texto, y la versión. Sin «Efectos reducidos» ni «Cómo se juega». Salen los requisitos de efectos reducidos.
- **C3, quitar [impacto] (R-1).** Si se mantiene, añadir a sus zonas `pantallas.ts:298` y `principal.ts:59`, que también leen `prefers-reduced-motion`.
- **C1, ajuste [impacto]:** sin `ajustes.efectosReducidos` si se quita C3.

### Bloque D

- **D1, cambiar [impacto]:** sin temporizador propio. `musica.programar(ctx.currentTime)` se llama desde el bucle de fotogramas, con `ANTICIPACION_S = 0,2` y un filtro por instrumento creado una vez.
  - Motivo [medido el 2026-11-09, página vacía, CPU ×4]: el tic de 25 ms tarda 0,72 ms de media, con p95 de 4,1 ms y máximo de 10,7 ms, y solo se dispara 251 de 400 veces en 10 s. El p95 de fotogramas del móvil en la v2 tiene 2 a 7 ms de margen.
  - Requisito «En pausa y con la pestaña oculta no se programa ninguna nota» se mantiene.
  - Se sustituye «Tiempo medio de cada vuelta del temporizador» por «coste de `programar` por fotograma: media y p95 anotados con CPU ×4 [a medir en D4: si el p95 de fotogramas del móvil pasa de 33 ms, se quita la percusión con la CPU lenta o en táctil]».
- **D1, añadir [impacto]:** en `e2e/ayudas.ts`, un `AudioContext` falso que pasa a `running` y cuenta los nodos por salida, para C2 y D1. El real, solo en D4 (abrirlo tarda de 0,4 a 6 s en este equipo, README:154).
- **D2, cambiar [impacto] (R-2):**
  - pistas «inicio» (88 BPM) y «partida» (104 BPM, fija), una variación, y motivo de fin;
  - la victoria reutiliza `sonido.record()`;
  - `estrella()` pasa a 784, 880 y 1.047 Hz (`sonido.ts:162` usa 988, fuera de la pentatónica, contra T6).
  - Salen los requisitos de tempo de D1 y D2.
- **D3, cambiar [impacto]:** capas 0 a 2 sin contramelodía (R-2). `data-musica` dice la pista que toca aunque el contexto aún no exista. Anotar: en la primera visita, la música del inicio no suena hasta el primer toque (política de autoplay). No usar `navigator.audioSession` para saltarse el silencio del iPhone.

### Bloque G

- **G1, cambiar [impacto] (R-7):** logo en SVG en línea en el inicio (sin `style="`; letras con la fuente de la página) y favicon nuevo con trazados. Sale la salida en canvas y no se regenera la referencia de `e2e/compartir.spec.ts`: la imagen mantiene el título de texto con el mismo estilo.

### Bloque I2-I4

- **I2, cambiar [impacto] (R-5):** sin premios de primera victoria en los niveles 3, 6 y 9. «Partida terminada» = libre, oficial y nivel (las que pasan por `sumarEstadisticas`, `economia.ts:52-63`). La repetición no cuenta.
- **I3, cambiar [impacto] (R-4, R-6):**
  - «¿Seguir?» solo en libre;
  - con 0 unidades, «+» abre la Tienda en la pestaña Objetos como panel encima de la partida en pausa (`flujo.ts:136-145`);
  - «¿Seguir?» nunca ofrece dinero real ni enlaza a Monedas.

### Bloque J

- **J1, añadir [impacto]:** cada precio en monedas deja hueco para «≈ X,XX €», visible solo con `pagos.disponible()`. La pestaña por defecto es Objetos y Monedas nunca lo es. Sin imperativos de compra en los textos. Motivo: pautas CPC de 2025 y menores.

### Bloque K

- **K1, cambiar [impacto] (R-8):**
  - productos `monedas-1000`, `monedas-3000`, `monedas-8000` y `pack-ayudas` (3 de cada objeto, repetible);
  - `pack-ayudas` solo se puede comprar si con él ningún objeto pasa de 9: lo pagado nunca se recorta;
  - `productos()` da `{ id, centimos, moneda, texto }`;
  - sale el requisito del lote de una vez y entra «con 7 relojes, `pack-ayudas` no está disponible» (Vitest).
- **K3, cambiar [impacto]:**
  - `build:demo` = `astro build --mode demo --outDir dist-demo`, porque `PUBLIC_PLATAFORMA=demo …` no funciona con `npm run` en Windows (cmd.exe; sin `cross-env`, R9);
  - comprobar que `--mode demo` compila como producción [supuesto];
  - proyecto `demo` solo en escritorio, con ≤ 6 pruebas;
  - el requisito «≤ 3 min de CI» pasa a «el proyecto `demo` tarda ≤ 1 min en CI [a medir]» (la compilación ya tarda 1 s en CI, ejecución `42631796082`).
- **K4, añadir a «Para activar» [impacto]:**
  - restaurar compras (sin servidor, borrar los datos del sitio pierde lo pagado);
  - desistimiento de 14 días de la moneda no usada;
  - paquetes que no cuadran con los precios (CPC);
  - Stripe, fuera de la tabla de herramientas de la estrategia (hace falta un motivo escrito);
  - facturación obligatoria de Google Play y App Store en apps;
  - con anuncios, consentimiento y edad mínima para consentir en España (a revisar por la asesoría).

### Bloque L

- **L1, añadir [impacto]:** los umbrales nuevos se escriben en `UMBRALES[3]` sin tocar `UMBRALES[2]` (R16).
- **L2, añadir [impacto]:** `AMPLITUD` 2,6 y `HUECO_COLGADA` 1,8 cambian todos los niveles. Los niveles 1 a 3 a 0,9 m/s ya llegan al centro en 2,9 s en lugar de 3,8. Se miden antes de subirles la velocidad.
- **L4, añadir [impacto]:** anotar la duración de `npm run e2e` en local y en CI (R17).

### Decisiones nuevas para la revisión final

- **[impacto] V1.** Arranque rápido con recorrido de 2,6 m y caída de 1,8 m a 1,3 m/s, en lugar de 1,6 a 1,77 m/s. Medido: es la única combinación probada que cumple a la vez la cadencia y las tres duraciones. Se deshace con dos constantes.
- **[impacto] V2.** Umbrales de medalla por versión de reglas: los retos de la v2 conservan su medalla.
- **[impacto] V3.** Recortes R-1 a R-10. Cada uno se puede añadir después sin migrar datos, salvo efectos reducidos, que añadiría un campo aditivo.
- **[impacto] V4.** La laguna de recargar el oficial se mantiene y se anota.
- **[impacto] V5.** `compras` guarda objetos con producto y monedas desde ya.

### Contradicciones con la realidad (no oculto ninguna; no he editado la estrategia)

1. **Anexo J frente a B2:** con 1,6 a 1,77 m/s no se cumplen las duraciones. Prueba: tabla de 2.1. Corrección: V1.
2. **`VEL_SUELO` frente a I1 y a los niveles 1 a 3.** Prueba: 1,6 × 0,6 = 0,96 < 1,2, y la tabla en `niveles.ts:46-48`. Corrección: quitar el suelo (B1).
3. **T2, «los días ya jugados se conservan con su medalla»:** el código actual la oculta al cambiar `REGLAS`. Prueba: `diarios.ts:33-35`. Corrección: R16.
4. **T31, «volver a la v2 no pierde nada»:** pierde los campos v3 al primer guardado. Prueba: `progreso.ts:244-252`. Corrección: anotarlo (C1).
5. **T6, «los efectos nunca desafinan»:** la estrella usa 988 Hz. Prueba: `sonido.ts:162`. Corrección: D2.
6. **T29 frente a la laguna de recargar:** prueba en `principal.ts:461-468`. Corrección: R-3.
7. **I3 frente a `anuncios.md` (apartado 2, punto 1: «Seguir… nunca en reto diario ni niveles»):** corrección R-4, o cambiar `anuncios.md` a sabiendas en 0.1.
8. **A1 frente a la geometría en 320 px:** cálculo en 2.4. Corrección: el cambio de A1.
9. **K3 frente a Windows:** prueba: `npm config get script-shell` = `null`. Corrección: `--mode`.
10. **Estrategia:** no contradice el plan. Su fila del CI de Torre Diaria (7 min 47 s) seguirá siendo cierta hasta medir la v3; la actualiza el documentador con la cifra de R17.

---

**Riesgo grave ajeno al alcance:** ninguno.

## Fuentes

- Pautas CPC sobre monedas virtuales en videojuegos (21 de marzo de 2025), consultadas con una búsqueda web y sin descargar páginas: [Lewis Silkin](https://www.lewissilkin.com/insights/2025/03/26/eu-bodies-act-against-gaming-companies-to-protect-children-from-in-game-purchase-102k658), [JD Supra](https://jdsupra.com/legalnews/eu-new-european-consumer-protection-9246457), [ZwillGen](https://www.zwillgen.com/gaming/cpcn-announces-virtual-currency-consumer-protection-guidelines/) y [CMS](https://cms.law/en/gbr/legal-updates/level-up-compliance-video-games-industry-in-the-spotlight-again-for-consumer-law-compliance).
- Código y datos del proyecto citados con `archivo:línea`. CI: `gh run list` y `gh run view 42631796082`.
