# Torre Diaria: versión inicial. Tareas

Plan del 2026-11-05. Rama `version-inicial`. Base de comparación: el commit actual de `version-inicial`. Solo hay documentación de proceso; no hay `CLAUDE.md`, `README` ni código, así que no hay ningún documento que contrastar con el código.

**[impacto]** Revisado el 2026-11-05 con `impacto.md`. Lo añadido o cambiado por ese análisis lleva la marca **[impacto]**.

## Objetivo

**No se cubre en esta fase el ranking diario compartido entre jugadores: queda para una segunda fase (D3).** Cualquiera puede abrir la web en el móvil o el ordenador y jugar, sin registrarse, el reto del día: la misma secuencia de piezas para todos y una partida de un solo toque. Al acabar puede copiar o compartir una tarjeta con emojis, su puntuación, el número de día y un enlace para retar a un amigo, o jugar partidas de práctica.

## Fuera de alcance

- Ranking global o compartido, servidor, base de datos (D1) y Pages Functions (D3).
- Desplegar en Cloudflare Pages y crear el repositorio en GitHub: se dejan preparados y se proponen en la revisión final (D10, D11).
- CI en GitHub Actions (D9).
- Anuncios, analítica, cookies, cuentas, nombres de jugador.
- Sonido, música, vibración, imágenes, fuentes o cualquier asset externo o de pago.
- Imagen de vista previa para redes (`og:image`) (D8).
- Traducciones: la interfaz va solo en español (supuesto).
- App instalable (PWA), modo sin conexión, aplicación de tienda.
- Antitrampas: sin servidor no hay puntuación que proteger (D3).
- Rachas, estadísticas históricas e historial de días anteriores.
- No se descarga nada de sitios ajenos, así que no aplica revisar `robots.txt`.
- **[impacto]** Igualdad de resultados entre motores distintos (Chrome frente a Safari o Firefox): solo se garantiza en el mismo navegador; entre motores se mide en T10, pero no se exige (riesgo 1 de `impacto.md`).

## Tareas

### T1. Andamiaje del proyecto

Crear un proyecto Astro en modo estático, con una sola página, TypeScript estricto, Vitest y Playwright. Incluye `package.json` con los scripts `dev`, `build`, `preview`, `test` (Vitest) y `e2e` (Playwright), `tsconfig.json` con `strict`, `.gitignore` (`node_modules`, `dist`, informes de Playwright), `package-lock.json` y la configuración de Playwright con dos proyectos: Chromium de escritorio (1280×800) y Chromium con emulación de móvil vertical táctil (por ejemplo `Pixel 7`). Sin React (D1).

Zonas: raíz del proyecto, `src/pages/index.astro`, `vitest.config.ts`, `playwright.config.ts`, `astro.config.mjs`.

Depende de: nada.

Requisitos comprobables:
- [ ] `npm ci` y `npm run build` terminan sin error y generan `dist/index.html`. Prueba: ejecutarlos en limpio.
- [ ] `npm test` pasa con al menos una prueba. Prueba: ejecutarlo.
- [ ] `npm run e2e` pasa en los dos proyectos con una prueba que abre la página y comprueba el título «Torre Diaria». Prueba: ejecutarlo.
- [ ] `tsconfig.json` tiene `"strict": true` (o extiende `astro/tsconfigs/strict` o `strictest`). Prueba: leerlo.
- [ ] No existe la carpeta `.github/`. Prueba: `git ls-files .github` vacío.
- [ ] Todas las dependencias directas tienen licencia MIT, ISC, BSD o Apache-2.0. Prueba: leer el campo `license` de cada una en `node_modules/<paquete>/package.json`.
- [ ] **[impacto]** En todo el árbol de dependencias no hay licencias GPL ni AGPL. Las LGPL (por ejemplo, los binarios de `sharp` si Astro los trae) solo se aceptan en herramientas de compilación que no llegan a `dist/` y se anotan en el README. Prueba: `npm query "*"` y revisar el campo `license`.
- [ ] **[impacto]** `planck` está fijado a una versión exacta en `package.json`, sin `^` ni `~`, para que una actualización no cambie las partidas. Prueba: leerlo.
- [ ] No está React entre las dependencias. Prueba: `npm ls react` no lo encuentra.

### T2. Fecha UTC, número de día y generador determinista

Módulo `src/logica/semilla.ts` sin dependencias del navegador:
- `fechaUTC(fecha: Date): string` con formato `AAAA-MM-DD` usando solo los métodos `getUTC*`.
- `numeroDia(fechaUTC: string): number`, con el día 1 fijado en la constante `DIA_1 = "2026-11-05"` (D5).
- Una función de *hash* de texto a entero de 32 bits sin signo y un generador pseudoaleatorio pequeño y conocido (por ejemplo `mulberry32`) que reciba esa semilla. No se usa `Math.random` en ningún sitio de la lógica salvo para crear la semilla de práctica.

Zonas: `src/logica/semilla.ts`, `src/logica/semilla.test.ts`.

Depende de: T1.

Requisitos comprobables:
- [ ] La misma fecha da la misma secuencia de 100 números en dos llamadas. Prueba: Vitest.
- [ ] `2026-11-05T23:59:59Z` y `2026-11-06T00:00:00Z` dan fechas y secuencias distintas. Prueba: Vitest.
- [ ] `new Date("2026-11-05T23:30:00-05:00")` da `2026-11-06`, y `new Date("2026-11-06T00:30:00+02:00")` da `2026-11-05`: no depende de la zona horaria del equipo. Prueba: Vitest.
- [ ] `numeroDia("2026-11-05") === 1` y `numeroDia("2026-12-05") === 31`. Prueba: Vitest.
- [ ] Los 5 primeros números de la semilla `"2026-11-05"` coinciden con valores fijados en la prueba, para detectar cualquier cambio accidental del algoritmo que rompería la igualdad entre jugadores. Prueba: Vitest.
- [ ] Todos los valores del generador están en `[0, 1)` en 10.000 extracciones. Prueba: Vitest.
- [ ] `src/logica/` no contiene `Math.random`, salvo en la función que crea la semilla de práctica. Prueba: buscar el texto.

### T3. Secuencia de piezas del día

Módulo `src/logica/piezas.ts`: `generarSecuencia(semilla, n)` devuelve `n` piezas con forma (catálogo pequeño: bloque, tablón, cuadrado, triángulo y alguna más que se pueda apilar), ancho, alto, color de una paleta fija y velocidad de vaivén. La velocidad crece con el número de pieza hasta un tope, para que la partida no se alargue sin fin (supuesto para la duración de 30 a 90 s, ver D6). Generar al menos 300 piezas por partida.

**[impacto]** La paleta tiene como mucho 9 colores y cada uno está ligado a un emoji cuadrado (🟥🟧🟨🟩🟦🟪🟫⬛⬜), para que la tarjeta muestre los colores que se vieron. El color se guarda como índice de esa paleta.

Zonas: `src/logica/piezas.ts`, `src/logica/piezas.test.ts`.

Depende de: T2.

Requisitos comprobables:
- [ ] La misma semilla da una secuencia idéntica (comparación profunda de 300 piezas). Prueba: Vitest.
- [ ] Dos fechas consecutivas dan secuencias distintas. Prueba: Vitest.
- [ ] Todas las medidas y velocidades de 300 piezas de 50 semillas distintas están dentro de los mínimos y máximos declarados como constantes en el módulo. Prueba: Vitest.
- [ ] La velocidad nunca baja de una pieza a la siguiente y no supera el tope. Prueba: Vitest.
- [ ] Todas las formas del catálogo salen al menos una vez en las 300 piezas de cada una de 10 semillas. Prueba: Vitest.
- [ ] **[impacto]** Cada color de la paleta tiene un emoji, y no hay más de 9. Prueba: Vitest.
- [ ] **[impacto]** Prueba dorada: las 5 primeras piezas de `"2026-11-05"` coinciden con valores fijados en la prueba, porque cambiar las constantes del módulo cambia los días ya compartidos. Prueba: Vitest.

### T4. Simulación de la partida sin pantalla y puntuación

Módulo `src/logica/simulacion.ts` con planck (D2), sin acceso al DOM, para poder probarlo en Node:
- Mundo con plataforma fija, gravedad y paso fijo de 1/60 s.
- La pieza activa cuelga por encima de la torre y va de lado a lado con una función determinista del número de paso. Su recorrido sobrepasa los bordes de la plataforma, de modo que soltarla en un extremo la hace caer fuera.
- `soltar()` deja caer la pieza activa. La siguiente aparece cuando la anterior se ha quedado quieta (velocidad bajo un umbral) o tras un máximo de 2 s; los toques mientras tanto se ignoran.
- Fin de partida: cuando el centro de cualquier pieza baja del nivel superior de la plataforma o sale de los límites del mundo.
- ~~Puntuación: número de piezas soltadas que siguen sobre la plataforma al acabar.~~ **[cambiado en desarrollo, decisión de diseño]** Puntuación: «piezas colocadas», el número de piezas soltadas que estaban en pie (centro por encima de la cara superior de la plataforma y dentro de su ancho) en el instante en que se soltó la pieza que provocó el fin (la última soltada). No cuenta esa pieza ni se penaliza el derrumbe posterior. Tras la caída la partida sigue simulando, sin piezas nuevas, hasta que todo está quieto o pasan 180 pasos (`MAX_PASOS_ASENTAR`), para la animación y para que pantalla y Node acaben en el mismo paso; esos pasos no cambian los puntos. La altura que se muestra y las formas de la tarjeta son las de las piezas colocadas.
  - Motivo: con la regla anterior se contaban piezas que se estaban cayendo (F3 de `pruebas.md`, una torre derrumbada marcó 17). Contar solo lo que queda tras asentar lo arreglaba, pero casi todas las partidas acaban derrumbando la torre y las puntuaciones bajaban mucho (por ejemplo, de 17 a 3), lo que estropeaba la sensación del juego y la tarjeta para compartir.
  - Pruebas: `src/logica/simulacion.test.ts`, la partida derrumbada del 2026-11-09 (18 piezas) da 17, las que estaban en pie antes del último toque, aunque al final solo queden 3 sobre la plataforma; el asentado dura como mucho 180 pasos y no cambia los puntos. Prueba dorada regenerada: `pasos` 1272 → 1273, la y de la séptima pieza -0,079678 → -0,268567, altura 3,547025 → 3,548099 (medida al soltar la séptima); los puntos (6) no cambian.
- Función `jugar(semilla, toques: number[])` que reproduce una partida a partir de los números de paso en que se tocó y devuelve `{ puntos, altura, formas, terminada, pasos }`. Sirve para las pruebas y, en la segunda fase, para validar puntuaciones en el servidor (D3).
- El módulo de física queda envuelto en este archivo: nada fuera de `simulacion.ts` importa planck (D2).
- **[impacto] Reglas de determinismo:**
  - El vaivén es una onda triangular lineal del número de paso, sin `Math.sin` ni `Math.cos`.
  - Las piezas nacen con ángulo 0.
  - La espera máxima son 120 pasos, no 2 s de reloj.
  - Las iteraciones de `world.step`, la gravedad y las opciones del mundo son constantes del módulo.
  - Los cuerpos se crean siempre en el mismo orden.
  - El módulo no lee el reloj ni usa azar (`Date.now`, `performance.now`, `Math.random`).
  - La misma API de pasos (`paso()` y `soltar()`) es la que usa la pantalla (T8), de modo que la partida en pantalla equivale a `jugar(semilla, toques)`.

Zonas: `src/logica/simulacion.ts`, `src/logica/simulacion.test.ts`, dependencia `planck`.

Depende de: T3.

Requisitos comprobables:
- [ ] Tocar en cuanto aparece la primera pieza (en el extremo de su recorrido) acaba la partida con 0 puntos. Prueba: Vitest con `jugar`.
- [ ] Tocar cada pieza cuando su centro pasa sobre el centro de la torre (calculado en la prueba con la misma función de vaivén) da al menos 5 puntos y la partida sigue sin terminar tras la quinta. Prueba: Vitest.
- [ ] La misma semilla y los mismos toques dan exactamente el mismo resultado en dos ejecuciones seguidas. Prueba: Vitest.
- [ ] Un toque durante la espera entre piezas no suelta nada (el número de piezas soltadas no cambia). Prueba: Vitest.
- [ ] Sin ningún toque, la partida no termina en 10.000 pasos y tiene 0 puntos. Prueba: Vitest.
- [ ] Ningún archivo fuera de `src/logica/simulacion.ts` importa `planck`. Prueba: buscar el texto.
- [ ] **[impacto]** Prueba dorada: una semilla y una lista de toques fijas dan `puntos`, `altura`, `pasos` y las posiciones finales de las piezas (redondeadas a 6 decimales) iguales a valores fijados en la prueba. Si se actualiza planck o se cambia la física, esta prueba falla a propósito. Prueba: Vitest.
- [ ] **[impacto]** `simulacion.ts` no contiene `Math.random`, `Date.now`, `performance.now`, `Math.sin` ni `Math.cos`. Prueba: buscar el texto.
- [ ] **[impacto]** Se mide en Node el tiempo de `jugar` para una partida de 40 piezas o más (mediana de 5 ejecuciones) y se anota en el README con la fecha: es el dato para decidir si cabe en los 10 ms de CPU de un Worker (D3). No es un umbral que deba cumplirse. Prueba: una prueba o un script de medición y la cifra en el README.

### T5. Tarjeta para compartir

Módulo `src/logica/tarjeta.ts`: `generarTarjeta({ modo, dia, puntos, altura, formas, origen })` devuelve el texto. Formato propuesto para el reto diario:

```
Torre Diaria #12 🏗️
🟥🟦🟨🟩🟪🟧🟥🟦
12 piezas · 3,4 m
¿Me superas? https://<origen>/?reto=12.12
```

Un emoji por pieza en la torre según su color (**[impacto]** el emoji ligado a ese color en la paleta de T3), con un máximo de 24 y después `+N`. En práctica, la cabecera es «Torre Diaria · Práctica», no lleva número de día y el enlace es la página principal sin `reto`. El origen se toma de `location.origin` al ejecutarse, sin dirección fija en el código (D10).

Zonas: `src/logica/tarjeta.ts`, `src/logica/tarjeta.test.ts`.

Depende de: T2 (número de día), T3 (paleta), T6 (formato del enlace).

Requisitos comprobables:
- [ ] La tarjeta del reto diario contiene `Torre Diaria #<dia>`, los puntos, la altura con coma decimal y `<origen>/?reto=<dia>.<puntos>`. Prueba: Vitest.
- [ ] La tarjeta de práctica contiene «Práctica», no contiene `#` seguido de número ni `reto=`. Prueba: Vitest.
- [ ] Con 0 puntos la tarjeta se genera sin fila vacía rota ni `NaN`. Prueba: Vitest.
- [ ] Con 100 piezas hay 24 emojis de pieza y `+76`. Prueba: Vitest.
- [ ] Ninguna tarjeta con hasta 999 puntos supera 280 caracteres (contando cada emoji como 2). Prueba: Vitest.
- [ ] Mismos datos, mismo texto. Prueba: Vitest.
- [ ] **[impacto]** Cada emoji de la fila es el de la paleta para el color de esa pieza. Prueba: Vitest.

### T6. Enlace de «reta a un amigo»

Módulo `src/logica/reto.ts`: `crearReto(dia, puntos)` y `leerReto(url, hoy)`. Formato `?reto=<dia>.<puntos>`. Quien abre el enlace juega la secuencia del día del reto y ve la puntuación a batir; si el día del reto es hoy y aún no ha jugado, esa partida cuenta como su reto diario oficial (D7).

Zonas: `src/logica/reto.ts`, `src/logica/reto.test.ts`.

Depende de: T2.

Requisitos comprobables:
- [ ] `leerReto(crearReto(12, 34))` devuelve `{ dia: 12, puntos: 34 }`. Prueba: Vitest.
- [ ] Devuelve `null` con `abc`, `12`, `12.`, `-1.5`, `0.5`, `12.-3`, `12.1000`, un día posterior a hoy, más de 20 caracteres y `<script>`. Prueba: Vitest.
- [ ] El texto del reto se muestra en la página con `textContent`, nunca como HTML. Prueba: Playwright abre `/?reto=1.5<img src=x onerror=alert(1)>` y comprueba que no salta ningún diálogo y que se trata como enlace inválido.

### T7. Resultado del día guardado en el navegador

Módulo `src/logica/registro.ts` sobre una interfaz de almacenamiento (en el navegador, `localStorage`): guarda el resultado oficial del día `{ dia, puntos, altura, formas }`. Solo hay un intento oficial por día; tras jugarlo, al volver se ve ese resultado con su tarjeta, y se ofrece práctica (D4). Si el almacenamiento falla (modo privado, cuota), el juego funciona igual sin guardar.

Zonas: `src/logica/registro.ts`, `src/logica/registro.test.ts`.

Depende de: T2.

Requisitos comprobables:
- [ ] Guardar y leer el resultado de hoy devuelve los mismos datos. Prueba: Vitest con almacenamiento en memoria.
- [ ] El resultado de ayer no cuenta como jugado hoy. Prueba: Vitest.
- [ ] Un almacenamiento que lanza error al leer o escribir no propaga la excepción y se informa como «no jugado». Prueba: Vitest.
- [ ] Datos corruptos (JSON inválido o campos que faltan) se ignoran sin error. Prueba: Vitest.
- [ ] Solo se usa una clave, con prefijo `torre-diaria:`, y no se guarda nada más. Prueba: Vitest y lectura del código.

### T8. Pantalla de juego: dibujo procedural y entrada de un toque

Carpeta `src/juego/`: dibujo en `<canvas>` con formas y colores generados por código (cielo en degradado que cambia con la altura, plataforma, piezas con un sombreado simple), cámara que sube con la torre, nitidez según `devicePixelRatio` y ajuste al cambiar el tamaño. Bucle con `requestAnimationFrame` y acumulador que llama a la simulación de T4 a paso fijo. Entrada: `pointerdown` en toda la zona de juego y `Espacio` o `Intro` en escritorio, con `touch-action: none` y sin zoom ni desplazamiento al tocar. Diseño vertical; en escritorio, una columna centrada. El contador de piezas está en el DOM con `aria-live="polite"`, y la pantalla expone su estado en un atributo (`data-estado="inicio|jugando|fin"`) para las pruebas.

**[impacto] Determinismo y rendimiento:**
- Un toque se guarda como «soltar en el siguiente paso simulado», y se registra el número de ese paso, nunca la hora.
- Al acabar, la lista de toques efectivos queda en memoria (y en `data-toques` del contenedor, para las pruebas). Es el dato que enviará la segunda fase.
- Como mucho 5 pasos de simulación por fotograma: el resto del acumulador se descarta, y el juego se ralentiza pero no se desincroniza.
- Con `visibilitychange` (pestaña oculta) la partida se pausa y el acumulador se vacía.
- El ratio de píxeles se limita a `min(devicePixelRatio, 2)`.
- Los degradados se crean al cambiar de tamaño, no en cada fotograma.

Zonas: `src/juego/*.ts`, `src/pages/index.astro`, estilos.

Depende de: T4.

Requisitos comprobables:
- [ ] `dist/` no contiene imágenes, audio ni fuentes (`.png .jpg .jpeg .gif .webp .avif .mp3 .ogg .wav .woff .woff2 .ttf`). El favicon, si lo hay, es un SVG en línea. Prueba: listar `dist/`.
- [ ] En el proyecto móvil de Playwright, un toque sobre el lienzo durante la partida suelta una pieza (cambia el contador o el estado). Prueba: Playwright.
- [ ] En escritorio, la tecla Espacio hace lo mismo. Prueba: Playwright.
- [ ] En 390×844 no hay desplazamiento horizontal (`document.documentElement.scrollWidth <= innerWidth`). Prueba: Playwright.
- [ ] **[impacto, cambiado]** El lienzo mide en píxeles reales su tamaño CSS por `min(devicePixelRatio, 2)`: con emulación a 3, el doble del tamaño CSS; con emulación a 1, el mismo. Prueba: Playwright.
- [ ] Ningún archivo de `src/juego/` importa `planck`. Prueba: buscar el texto.
- [ ] **[impacto]** El bucle no ejecuta más de 5 pasos por fotograma. Prueba: Vitest sobre la función del acumulador, con un salto de tiempo de 10 s.
- [ ] **[impacto]** Al acabar una partida, `data-toques` contiene una lista de enteros crecientes. Prueba: Playwright.

### T9. Pantallas de inicio y fin, copiar y compartir

- **Inicio:** botón «Jugar el reto de hoy #N» (o «Ver mi resultado de hoy» si ya jugó), botón «Práctica» y, si el enlace trae un reto válido, el aviso «Tu amigo hizo P piezas en el día #D. ¿Le superas?».
- **[impacto]** **Reto de hoy ya jugado:** si el enlace es de hoy y ya se jugó la partida oficial, se muestra el resultado propio junto al del amigo («Tú: X · Tu amigo: P») sin otra partida oficial; se ofrece práctica.
- **Fin:** puntos, altura, vista previa de la tarjeta, botón «Copiar» y botón «Compartir». «Compartir» solo aparece si existe `navigator.share`; si el usuario cancela (`AbortError`) no se muestra error. «Copiar» usa `navigator.clipboard.writeText` y, si no está disponible, una alternativa con un `textarea` seleccionado; confirma con «Copiado». En reto de un amigo dice si se ha batido su marca. Botón «Jugar práctica».
- **[impacto]** `navigator.share` se llama solo con `text` (que ya incluye el enlace), sin `url`, porque algunas apps se quedan con uno de los dos.
- **Práctica:** semilla aleatoria, no toca el resultado oficial del día y su tarjeta es la de práctica.

Zonas: `src/pages/index.astro`, `src/juego/pantallas.ts` (o equivalente).

Depende de: T5, T6, T7, T8.

Requisitos comprobables:
- [ ] Tras una partida oficial, recargar la página muestra el mismo resultado y no permite otra partida oficial ese día. Prueba: Playwright.
- [ ] Una partida de práctica tras la oficial no cambia el resultado guardado. Prueba: Playwright.
- [ ] Con `navigator.share` simulado, «Compartir» lo llama una vez con un `text` que contiene `Torre Diaria #`. **[impacto]** y sin la propiedad `url`. Prueba: Playwright con `addInitScript`.
- [ ] Sin `navigator.share`, el botón «Compartir» no está visible. Prueba: Playwright.
- [ ] «Copiar» deja en el portapapeles el texto exacto de la vista previa. Prueba: Playwright en Chromium con permisos `clipboard-read` y `clipboard-write`.
- [ ] Un `navigator.share` simulado que rechaza con `AbortError` no muestra mensaje de error. Prueba: Playwright.
- [ ] Abrir `/?reto=1.5` muestra «5» y «#1» en el aviso del reto. Prueba: Playwright.
- [ ] **[impacto]** Tras jugar la oficial de hoy, abrir `/?reto=<hoy>.5` muestra los dos resultados y no ofrece otra partida oficial. Prueba: Playwright.

### T10. Pruebas de extremo a extremo de una partida completa

Prueba Playwright en los dos proyectos que: abre la página con la fecha fijada (`page.clock.setFixedTime`, sin falsear los temporizadores para no detener la animación), pulsa «Jugar el reto de hoy», toca en cuanto aparece cada pieza hasta que la partida termina, comprueba la pantalla de fin y copia la tarjeta. Además, comprobación de que no hay errores en consola ni peticiones a otros dominios.

**[impacto]** Al final, la prueba lee `data-toques`, ejecuta `jugar(semilla del día, toques)` en Node (importando `src/logica/simulacion.ts` desde la prueba) y compara puntos y altura con los de la pantalla. Así se comprueba que el bucle de T8 equivale a `jugar` y que Node y Chromium coinciden. Para que la partida no termine con el primer toque, una variante toca cada pieza con un retraso fijo tras aparecer.

**[impacto]** Prueba informativa, que no bloquea: la misma comparación en Firefox y WebKit de Playwright (proyecto aparte, fuera de `npm run e2e`, por ejemplo `npm run e2e:motores`). El resultado (coincide o no, y en cuántas de 5 partidas) se anota en el README. Si los navegadores no se pueden instalar, se declara «sin comprobar». Es el dato para decidir la validación en el servidor de D3.

Zonas: `e2e/*.spec.ts`, `playwright.config.ts`.

Depende de: T9.

Requisitos comprobables:
- [ ] La partida completa termina y aparece `data-estado="fin"` en menos de 60 s en los dos proyectos. Prueba: `npm run e2e`.
- [ ] La tarjeta copiada contiene `Torre Diaria #<n>` con el número del día fijado. Prueba: Playwright.
- [ ] Ninguna página probada registra errores en consola ni excepciones sin capturar. Prueba: Playwright con `page.on('console')` y `page.on('pageerror')`.
- [ ] Todas las peticiones van al mismo origen. Prueba: Playwright con `page.on('request')`.
- [ ] `npm run e2e` pasa tres veces seguidas sin fallos intermitentes. Prueba: ejecutarlo tres veces y anotar el resultado.
- [ ] **[impacto]** En los dos proyectos de Chromium, `jugar` en Node con los toques de `data-toques` da los mismos puntos y la misma altura que la pantalla, en la variante con retraso, con al menos 3 piezas colocadas. Prueba: Playwright.
- [ ] **[impacto]** El resultado de la prueba de motores (Firefox y WebKit) está anotado en el README, aunque sea «no coincide» o «sin comprobar». Prueba: leerlo.

### T11. Preparar el despliegue y documentar (sin desplegar)

- `public/_headers` con cabeceras de seguridad básicas para Cloudflare Pages: `Content-Security-Policy` sin orígenes externos, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.
- **[impacto]** `astro.config.mjs` con `build.inlineStylesheets: 'never'`, para que la CSP no necesite `'unsafe-inline'`. Si Astro mete algún script en línea, se mueve a un archivo o se usa la CSP integrada de Astro con hashes; se anota la opción elegida.
- Metadatos para compartir sin imagen: `<title>`, `description`, `og:title`, `og:description`, `theme-color`, `viewport`.
- `README.md` con qué es, cómo instalar, desarrollar, probar (`npm test`, `npm run e2e`), compilar y desplegar a mano con `npx wrangler pages deploy dist --project-name torre-diaria` (que no se ejecuta en este cambio), y los motivos de las herramientas (D1, D2, D9). Anotar el tamaño de la compilación.
- **[impacto]** El README también recoge:
  - que el resultado de una partida solo se garantiza igual en el mismo navegador;
  - que el día cambia a medianoche UTC (la 1:00 o las 2:00 en España);
  - que los navegadores integrados de WhatsApp o Instagram guardan su propio resultado;
  - el tiempo de `jugar` medido en T4 y el resultado de la prueba de motores de T10.

Zonas: `public/_headers`, `astro.config.mjs`, `src/pages/index.astro`, `README.md`.

Depende de: T10.

Requisitos comprobables:
- [ ] `dist/_headers` existe tras `npm run build` y contiene `Content-Security-Policy`. Prueba: leerlo.
- [ ] **[impacto, cambiado]** Con esa CSP aplicada (añadida a las respuestas de `astro preview` con `page.route` en Playwright, sin instalar wrangler), la partida de T10 pasa sin errores de CSP en consola. Prueba: Playwright.
- [ ] **[impacto]** `dist/index.html` no contiene `<style>` ni `<script>` con código en línea (salvo los que tengan su hash en la CSP). Prueba: leerlo.
- [ ] El HTML compilado tiene `og:title`, `og:description` y `<meta name="viewport"` con `width=device-width`. Prueba: leer `dist/index.html`.
- [ ] El JavaScript de `dist/` ocupa menos de 150 KB comprimido con gzip, y la cifra está en el README con fecha. Prueba: comprimir y medir los `.js` de `dist/`. Si no cabe, anotarlo para la revisión en vez de cambiar de librería sin decidirlo. (**[impacto]** Estimación: planck ronda los 46 KB con gzip.)
- [ ] El README contiene los comandos de pruebas y despliegue y los motivos de no usar React y de usar planck. Prueba: leerlo.
- [ ] **[impacto]** El README contiene los cuatro avisos de arriba y las dos mediciones. Prueba: leerlo.
- [ ] No se ha ejecutado ningún despliegue ni se ha creado ningún repositorio remoto. Prueba: `git remote -v` vacío y declaración del desarrollador.

## Decisiones

- **D1. Astro con una sola página y TypeScript, sin React.** Astro está en la tabla de la estrategia para web pública y compila a estático para Cloudflare Pages. La interfaz es un lienzo y unos pocos botones; React añadiría peso y no resuelve nada aquí. Es una desviación de la fila «Interfaz de aplicación: React», y por la regla 2 el motivo se escribe en el README (T11). Fácil de deshacer: la lógica está en `src/logica/` sin dependencias de interfaz.
- **D2. Física con planck (Box2D en TypeScript, MIT, versión 1.5.1, con tipos incluidos, comprobado en el registro de npm el 2026-11-05).** Para un juego de apilar importa que las pilas aguanten estables, y el motor de Box2D lo hace mejor que matter-js (0.20.0, MIT, sin tipos propios), cuyas pilas altas tienden a temblar. Se descarta un motor propio por el coste de hacerlo estable. Queda envuelto en `simulacion.ts` para cambiarlo sin tocar el resto. El tamaño comprimido no está medido: lo mide T11. **[impacto]** Se fija la versión exacta (T1) y una prueba dorada (T4) detecta cualquier cambio de resultados. La trigonometría de planck puede diferir entre motores (supuesto), así que la igualdad solo se garantiza en el mismo navegador.
- **D3. El ranking diario compartido pasa a una segunda fase.** Motivos: necesita crear una base D1 y Pages Functions en la cuenta de Cloudflare del usuario; sin registro, cualquier puntuación enviada desde el navegador se puede falsificar, salvo que el servidor vuelva a simular la partida con `jugar(semilla, toques)` (T4 lo deja preparado); y los nombres libres necesitan moderación. Lo que sí entra en esta fase y sustituye al ranking: la tarjeta, el reto a un amigo y el resultado propio del día. Esquema propuesto para la segunda fase: `POST /api/partida` con `{ dia, toques }`, el Worker la vuelve a simular y guarda la puntuación en D1; `GET /api/ranking?dia=N` devuelve las 50 mejores. Con 100.000 escrituras al día en D1 y 100.000 peticiones al día en Workers sobra para empezar; el límite de 10 ms de CPU por petición puede no bastar para volver a simular partidas largas, y hay que medirlo antes. **[impacto]** Además:
  - El Worker usa V8: una partida jugada en Safari o Firefox puede no reproducirse igual y rechazarse aunque sea legítima. La prueba de motores de T10 lo mide; si no coinciden, las opciones son validar solo de forma aproximada o pasar a física de coma fija.
  - La medición de tiempo de T4 decide si caben los 10 ms de CPU.
  - Hace falta un índice `(dia, puntos)` y una consulta con `LIMIT 50`: cada consulta lee unas 50 filas y caben unas 100.000 al día en los 5 M de lecturas. Sin índice se agotan mucho antes.
  - Conviene guardar la clasificación en caché unos 60 s.
  - Las 100.000 peticiones al día de Workers se comparten con `App_Noticias/disparador`.

  **BLOQUEANTE para la segunda fase, no para esta:** necesita la cuenta de Cloudflare del usuario y que decida si quiere nombres de jugador y cómo moderarlos.
- **D4. Un solo intento oficial por día, guardado en el navegador.** Es lo que hace comparables las tarjetas entre amigos. Después se juega en práctica. Borrar el almacenamiento permite repetir: se acepta, porque sin servidor no se puede evitar. **[impacto]** Lo mismo pasa con los navegadores integrados (WhatsApp, Instagram), que tienen su propio almacenamiento. Fácil de deshacer: una comprobación en `registro.ts`.
- **D5. El día 1 es el 2026-11-05 (`DIA_1`).** Supuesto: la fecha real de publicación no se conoce. Cambiarla antes de publicar es una constante; después cambiaría los números de los días ya compartidos.
- **D6. Duración de 30 a 90 s, sin tope de tiempo.** La partida acaba solo cuando cae algo, como pide el encargo. La duración se busca con la velocidad creciente de las piezas (T3) y la espera hasta que la pieza se para (T4). Supuesto sin medir: un jugador medio coloca de 15 a 40 piezas a unos 2 s cada una. No se puede comprobar con pruebas automáticas: el probador debe jugar a mano al menos 3 partidas y anotar la duración, o declararlo «sin comprobar».
- **D7. El enlace de reto hace jugar la secuencia del día del reto.** Así se compite con las mismas piezas. Si ese día es hoy y no se ha jugado, la partida es la oficial; si es otro día, es una partida de reto que no se guarda como oficial. **[impacto]** Si es hoy y ya se jugó, se comparan los dos resultados sin otra partida oficial (T9). Formato `?reto=<dia>.<puntos>`, corto y legible en un mensaje.
- **D8. Sin `og:image` en esta fase.** Una imagen de vista previa sería un asset o requeriría generarla en la compilación. Se usan solo título y descripción. Es fácil de añadir después.
- **D9. Sin CI en GitHub Actions.** La cuota mensual ya va justa (la estrategia deja de 92 a 244 min para todo el CI), y el repositorio aún no existe en GitHub. Las pruebas se ejecutan en local. Si el usuario crea el repositorio como público, Actions es gratis allí y se puede añadir un CI mínimo de Vitest; se propone en la revisión final.
- **D10. Despliegue preparado pero no hecho, y origen sin fijar en el código.** El despliegue sería con `wrangler pages deploy` desde el equipo, sin gastar minutos de Actions y dentro de las 500 compilaciones al mes de Pages. **[impacto]** Supuesto: la documentación de Cloudflare liga ese límite a las compilaciones lanzadas desde Git, así que probablemente la subida directa no cuente; aunque contara, unos 10 despliegues al mes son el 2 %. Supuesto: el nombre `torre-diaria.pages.dev` está libre; no se ha comprobado. Como la tarjeta usa `location.origin`, cambiar de nombre o de dominio no exige tocar el código. **BLOQUEANTE solo para desplegar:** necesita iniciar sesión en Cloudflare con la cuenta del usuario y su aprobación en la revisión final.
- **D11. El repositorio sigue solo en local.** Lo decidió el coordinador (`estado.md`). La regla 5 de la estrategia («Todo en GitHub») pide subirlo; crear el repositorio, y si es público o privado, se decide en la revisión final. No es una contradicción con el código, solo un paso pendiente.
- **D12. Playwright solo con Chromium (escritorio y emulación de móvil).** Ahorra tiempo de instalación y de ejecución. Safari en iPhone real y los navegadores Android reales no se prueban automáticamente: el probador debe declararlo «sin comprobar» o probarlo a mano si tiene un móvil disponible. **[impacto]** Excepción: la prueba informativa de motores de T10 usa Firefox y WebKit de Playwright, fuera de `npm run e2e`. WebKit de Playwright no es Safari de iPhone: su resultado es orientativo.
- **D13. Sin descargas de sitios ajenos.** El juego no usa datos externos, así que no hay `robots.txt` ni condiciones que revisar.
- **Supuestos generales:** interfaz en español; números con coma decimal; sin sonido; la semilla de práctica no se comparte por enlace. **[impacto]** El día es UTC: en España cambia a la 1:00 en invierno y a las 2:00 en verano. Se anota para la revisión final.
- **Contradicciones entre estrategia y realidad:** no se ha encontrado ninguna. El proyecto solo tiene `docs/proceso/version-inicial/estado.md`, sin código que contrastar. **[impacto]** Matiz sin prueba concluyente: el límite de «500 compilaciones/mes» de la estrategia parece aplicarse solo a las compilaciones desde Git (ver `impacto.md`).

## Bloqueantes

- **Para esta fase:** ninguno. Todas las tareas T1 a T11 se pueden hacer en la rama sin pagar ni pedir nada.
- **Después de la revisión final (necesitan al usuario):** desplegar en Cloudflare Pages (D10) y crear el repositorio en GitHub (D11).
- **Segunda fase:** el ranking compartido necesita la cuenta de Cloudflare para D1 y decidir sobre nombres y moderación (D3). **[impacto]** Además depende de las dos mediciones de esta fase (tiempo de `jugar` y prueba de motores).
