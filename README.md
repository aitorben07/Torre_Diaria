# Torre Diaria

Juego web de apilar piezas con un solo toque. Cada día hay un reto con la misma secuencia de piezas para todos; se juega sin registrarse, en el móvil o en el ordenador. Al acabar se copia o se comparte una tarjeta con emojis, la puntuación, el número de día y un enlace para retar a un amigo. También hay partidas de práctica.

En esta fase no hay ranking compartido ni servidor: el resultado del día se guarda solo en el navegador (ver `docs/proceso/version-inicial/tareas.md`, D3).

La partida acaba cuando una pieza cae de la plataforma. La puntuación son las **piezas colocadas**: las que estaban en pie (centro por encima de la plataforma y dentro de sus 4 m de ancho) en el momento de soltar la última pieza. No cuenta esa última ni se resta lo que se derrumbe después. Tras la caída, la escena sigue moviéndose sin piezas nuevas hasta que todo está quieto o pasan 180 pasos (3 s); es solo animación y no cambia los puntos. La altura y las formas de la tarjeta son las de las piezas colocadas.

## Uso

Necesita Node 22 o posterior (probado con Node 24.18.0 y npm 11.16.0).

```sh
npm ci                                  # instalar
npx playwright install chromium         # navegador de las pruebas e2e (una vez)
npm run dev                             # servidor de desarrollo
npm test                                # pruebas de la lógica (Vitest)
npm run e2e                             # pruebas en Chromium de escritorio y móvil (Playwright)
npm run e2e:motores                     # prueba informativa en Firefox y WebKit (no bloquea)
npm run check                           # comprobación de tipos (astro check)
npm run build                           # compila a dist/
npm run preview                         # sirve dist/
npm run medir                           # mide el tiempo de jugar() en Node
npm run medir:duracion                  # mide la duración de las partidas con jugadores simulados
```

`npm run e2e` compila y sirve `dist/` en el puerto 4329 antes de probar. Para las pruebas, el contenedor `#juego` expone su estado en atributos `data-*` (`estado`, `fase`, `x`, `toques`, `puntos`, `altura`, `semilla`). La partida que se compara con `jugar` en Node toca con un `pointerdown` lanzado dentro de la página cuando la pieza pasa por el centro, porque un toque desde Playwright llega cientos de milisegundos tarde con varios navegadores en paralelo; las demás pruebas usan toques y teclas reales. `npm run e2e:motores` necesita `npx playwright install firefox webkit`.

### Desplegar (a mano, no se ha hecho)

```sh
npm run build
npx wrangler pages deploy dist --project-name torre-diaria
```

Requiere iniciar sesión en Cloudflare con la cuenta del propietario. `public/_headers` pone la CSP y las demás cabeceras de seguridad en Cloudflare Pages. El enlace de la tarjeta usa `location.origin`, así que cambiar de nombre o de dominio no exige tocar el código.

## Estructura

- `src/logica/`: lógica pura, sin navegador. `semilla.ts` (fecha UTC, número de día y generador), `piezas.ts` (secuencia y paleta), `simulacion.ts` (física con planck y `jugar(semilla, toques)`), `tarjeta.ts`, `reto.ts`, `registro.ts`.
- `src/juego/`: pantalla. `bucle.ts` (paso fijo), `dibujo.ts` (canvas), `pantallas.ts` (inicio, fin, copiar y compartir), `principal.ts` (entrada).
- `src/pages/index.astro` y `src/estilos.css`: la única página.
- `e2e/`: pruebas de Playwright. `scripts/medir-jugar.ts`: medición de tiempo. `scripts/duracion.ts` y `scripts/medir-duracion.ts`: jugadores simulados para medir la duración (D6).

## Por qué estas herramientas

- **Astro sin React (D1).** La estrategia pide React para interfaces de aplicación, pero aquí la interfaz es un lienzo y unos pocos botones: React solo añadiría peso. Astro compila a una página estática para Cloudflare Pages. La lógica está en `src/logica/` sin dependencias de interfaz, así que se puede cambiar.
- **planck para la física (D2).** Es Box2D en TypeScript (MIT): las pilas aguantan más estables que con matter-js, y hacer un motor propio estable cuesta mucho. Está fijado a la versión exacta `1.5.1` y solo lo importa `src/logica/simulacion.ts`; una prueba dorada falla si una actualización cambia los resultados.
- **Sin CI (D9).** La cuota de GitHub Actions va justa y el repositorio aún no está en GitHub. Las pruebas se ejecutan en local.

## Avisos

- **El resultado de una partida solo se garantiza igual en el mismo navegador.** Las piezas son las mismas para todos, pero planck usa `Math.sin`, `Math.cos` y `Math.atan2` en cada paso (`node_modules/planck/src/dynamics/Position.ts`, `src/common/Rot.ts`), y esas funciones pueden dar decimales distintos en otros motores. La misma secuencia de toques puede dar otra puntuación en Safari que en Chrome.
- **El día cambia a medianoche UTC:** a la 1:00 en España en invierno y a las 2:00 en verano.
- **Los navegadores integrados de WhatsApp o Instagram guardan su propio resultado.** Si se abre el enlace ahí y luego en el navegador normal, no aparece el resultado del día y se puede repetir el intento oficial. Lo mismo pasa al borrar los datos del sitio.
- Toda la interfaz va en español.

## Mediciones (2026-11-05)

- **Tamaño de la compilación:** el JavaScript de `dist/` ocupa 220,4 KB sin comprimir y **50,1 KB con gzip** (50.110 bytes, nivel 9), por debajo del presupuesto de 150 KB. El CSS, 1,8 KB (0,9 KB con gzip). `dist/` entero, 225,6 KB en 4 archivos (`index.html`, `_headers`, un JS y un CSS). No hay imágenes, audio ni fuentes.
- **Código en línea:** con `build.inlineStylesheets: 'never'`, Astro no deja ningún `<style>` ni `<script>` en línea en `dist/index.html` (el script se sirve como módulo externo). La CSP no necesita `'unsafe-inline'` ni hashes, así que no se usa la CSP integrada de Astro.
- **Tiempo de `jugar` en Node:** partida de 43 piezas soltadas (41 colocadas, 5.489 pasos, semilla `2026-11-06`): **mediana de 1142 ms (1,1 s)** en 5 ejecuciones (1010 a 1253 ms), Node 24.18.0 en este equipo Windows. Unos 0,2 ms por paso. (Antes de asentar las piezas al acabar, F3 de `pruebas.md`: 42 en pie, 5.309 pasos y mediana de 1033 ms (1,0 s).) (Antes de suavizar el inicio, con la semilla `2026-11-21`: 44 piezas, 4.266 pasos, mediana de 1002 ms (1,0 s); con el inicio nuevo esa semilla solo aguanta 37 piezas, por eso se cambió.) Queda muy por encima de los 10 ms de CPU por petición de un Worker gratuito: volver a simular partidas en el servidor (D3) no cabe tal cual. Se repite con `npm run medir`.
- **Duración de las partidas (D6, 2026-11-05, `npm run medir:duracion`):** dos jugadores simulados en Node sueltan cada pieza la primera vez que pasa por el centro, con un error de tiempo uniforme fijado por semilla: el **cuidadoso** de ±60 ms y el **descuidado** de ±150 ms. Se juegan los días 1 a 10; la duración es pasos/60.
  - **Antes** (vaivén de 2 a 5 m/s con +0,08 por pieza, triángulo con cima del 30 % y cualquier forma desde la primera pieza): cuidadoso, **mediana de 23,0 s** (9,3 a 39,5 s, de 3 a 16 piezas); descuidado, **mediana de 12,4 s** (9,2 a 19,1 s, de 3 a 7 piezas). Coincide con lo que midió el probador jugando en el navegador (9 a 43 s).
  - **Con el inicio suavizado** (vaivén desde 1,2 m/s con +0,05 por pieza hasta 5 m/s en la pieza 77, cima del triángulo del 50 % y las 5 primeras piezas solo bloque, tablón o cuadrado): cuidadoso, **mediana de 54,6 s** (49,9 a 66,8 s, de 15 a 20 piezas); descuidado, **mediana de 36,7 s** (25,0 a 59,7 s, de 6 a 18 piezas). Cumple el objetivo (descuidado ≥ 30 s, cuidadoso ≤ 90 s) y ninguna partida llega al tope de 10 minutos. Con los días 11-20, 41-50 y 101-110 las medianas quedan entre 50 y 54 s (cuidadoso) y entre 34 y 46 s (descuidado).
  - **Ahora**, además, al caer una pieza la escena sigue hasta que todo está quieto (como mucho 180 pasos, 3 s) antes de la tarjeta de fin: cuidadoso, **mediana de 57,6 s** (49,9 a 68,7 s); descuidado, **mediana de 38,0 s** (25,4 a 62,7 s). Sigue cumpliendo el objetivo. Con los días 11-20, 41-50 y 101-110: 56,4, 56,3 y 52,5 s (cuidadoso) y 36,0, 48,3 y 36,8 s (descuidado).
  - Es orientativo: los jugadores simulados sueltan siempre en la primera pasada; una persona que espera a otra pasada alarga la partida. `scripts/duracion.test.ts` comprueba el objetivo en cada `npm test`.
- **Prueba de motores (`npm run e2e:motores`), comparando con `jugar` en Node 24.18.0:**
  - **WebKit 27.2 de Playwright:** mismos puntos en 5 de 5 partidas, pero puntos y altura idénticos al bit solo en 1 de 5; en las otras 4 la altura difiere en el último decimal (por ejemplo, 2,3434351896686842 frente a 2,3434351896686847). Con dos ejecuciones de 5 partidas, el resultado fue el mismo: 1 de 5 exactas y 5 de 5 con los mismos puntos. WebKit de Playwright no es Safari de iPhone: es orientativo.
  - **Firefox 157 de Playwright: sin comprobar.** Se instaló, pero Windows no deja ejecutar `firefox.exe` en este equipo (`spawn UNKNOWN`, «Permission denied»). `npm run e2e:motores` falla por eso en el proyecto `firefox`.
- **Equivalencia entre la pantalla y Node:** en Chromium de escritorio y móvil, `jugar` en Node con los toques registrados en la pantalla da **siempre los mismos puntos**, pero la altura solo es idéntica al bit en 5 de 10 partidas; en las demás difiere en el último decimal (`e2e/partida.spec.ts` la compara con 9 decimales). El motivo: en 20.000 ángulos, `Math.sin`, `Math.cos` y `Math.atan2` dan un valor distinto en 5.361 de 60.000 casos entre Chrome 156 y Node 24 (V8 13.6), aunque los dos usan V8. Para la segunda fase (D3) significa que ni siquiera un Worker con V8 reproduce al bit una partida de Chrome: hay que validar con margen (por ejemplo, solo los puntos) o pasar a una física sin trigonometría del sistema.

## Licencias

Todas las dependencias directas son MIT o Apache-2.0. En el árbol completo (`npm query "*"`) no hay GPL ni AGPL. Hay licencias que no son MIT/ISC/BSD/Apache pero sí permisivas, y todas son de herramientas de compilación que no llegan a `dist/`: `lightningcss` (MPL-2.0), `lru-cache`, `sax` y `common-ancestor-path` (BlueOak-1.0.0), `mdn-data` (CC0-1.0) y `tslib` (0BSD). La única LGPL es `@img/sharp-win32-x64` (Apache-2.0 AND LGPL-3.0-or-later), los binarios de `sharp`, dependencia opcional de Astro para procesar imágenes: solo se usa al compilar y no llega a `dist/`. Lo que llega a `dist/` es código propio y planck (MIT).
