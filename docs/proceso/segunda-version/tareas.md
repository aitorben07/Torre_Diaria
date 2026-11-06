# Torre Diaria: segunda versión. Tareas

Plan del 2026-11-06. Rama `segunda-version`, creada desde `main`. Base: el código de `main` (v1) leído el 2026-11-06: `src/logica/*.ts`, `src/juego/*.ts`, `src/pages/index.astro`, `src/estilos.css`, `public/_headers`, `scripts/duracion.ts`, `e2e/*.ts`, `README.md` y `docs/proceso/version-inicial/`.

Los dos documentos de diseño que pide el encargo (`docs/diseno/diseno-juego.md` y `docs/diseno/anuncios.md`) van como **Anexo 1** y **Anexo 2** al final de este archivo. Al planificador solo se le permite crear este archivo (ver decisión S1), así que la tarea 0.1 los pasa a su sitio.

## Cambios [impacto] incorporados (prevalecen sobre el resto del plan)

El coordinador incorpora **todos** los cambios del apartado 5 de `impacto.md` («Cambios al plan»), marcados [impacto]. Donde una tarea de abajo o un anexo contradiga ese apartado, manda `impacto.md` §5. En resumen:

- **Alcance recortado (I1, aceptado):** 10 niveles en un mundo (Puerto); misiones diarias (C4) aplazadas a la siguiente fase; tienda con 6 temas y sin pestaña de efectos; 3 escenarios (Puerto gratis, Ciudad con 25 m o racha de 3, Nubes con 50 m o racha de 7); precios ×1,4 salvo Madera (300); anuncios solo como interfaz, `anunciosNulos` y llamadas, sin botones ocultos.
- **Migración v1 mínima (I2, aceptada):** el día jugado en la v1 se marca con `reglas: 1`, sin convertir puntos; la clave v1 no se borra. Guardado compacto con tramos de índices.
- **CI protegido (I3, aceptado):** `push` a `main` y `pull_request`, `concurrency`, `timeout-minutes: 20` y guarda `if: ${{ !github.event.repository.private }}`; pruebas de rendimiento saltadas en CI.
- **Técnicos:** G6, G8 y G11 nuevos; B1-B5 (retirada de piezas en un solo episodio de vida, objetivo del imán, cementado solo con cuerpos dormidos al colgar la pieza nueva, secuencias con prefijo estable, `jugar` con opciones, `flujo.ts` puro, 700 ms de espera en el fin); A1-A4 (fuente con `index.css` u `@font-face` propio, OFL copiada, `formatearNumero`, sin efectos caros por fotograma, p95 ≤ 33 ms o `RATIO_MAXIMO` 1,5, espera a la fuente en canvas); F1 con comprobación de píxeles; F3 con PNG generado al mostrar el fin y alternativa «Descargar imagen»; D2 muestra el siguiente desbloqueo por racha; H1 con las limitaciones nuevas.

## Objetivo

Al abrir la web se juega al momento una partida libre, repetible sin límite, más larga y con recompensas por acertar (perfectos, combos, vidas extra, monedas, desbloqueos), con una dirección de arte propia, sonido y vibración. Aparte se pueden elegir los retos diarios en un calendario con rachas y medallas, avanzar por 30 niveles con estrellas y compartir cualquier resultado con una imagen generada.

## Fuera de alcance

- Anuncios reales, SDK de portales, AdSense o AdMob: solo el plan (Anexo 2) y los huecos sin red (bloque G).
- Compras con dinero real, «quitar anuncios» de pago, gemas o moneda premium (S8).
- Servidor, ranking compartido, cuentas, amigos y sincronización entre dispositivos (D3 de la v1 sigue igual). Todo el progreso se guarda en `localStorage`.
- Logros, eventos temporales, pase de temporada, ruleta, cofres aleatorios, notificaciones push, PWA o modo sin conexión, traducciones (veredictos en el Anexo 1, apartado 9).
- App móvil con Expo y publicación en tiendas o portales.
- Desplegar en Cloudflare Pages: se propone en la revisión final, como en la v1 (D10).
- `og:image` (vista previa del enlace en redes): sigue sin hacerse (D8 de la v1); la imagen del bloque F es la que se comparte como archivo.
- Antitrampas: sin servidor no hay nada que proteger.
- Igualdad de resultados entre motores distintos: se sigue garantizando solo en el mismo navegador (README de la v1).
- Borrar progreso desde la interfaz, exportar o importar partidas guardadas.

## Qué se mantiene de la v1 (requisitos globales)

Se comprueban al cerrar **cada bloque**, no solo al final. Si un bloque rompe uno, el bloque no está terminado.

- [ ] G1. `npm test`, `npm run check`, `npm run build` y `npm run e2e` pasan. Prueba: ejecutarlos.
- [ ] G2. **Determinismo.** `src/logica/` no contiene `Math.random` salvo en `semillaPractica` (o su sustituta de la partida libre); `simulacion.ts` no contiene `Math.random`, `Date.now`, `performance.now`, `Math.sin` ni `Math.cos`; ningún archivo de producción fuera de `simulacion.ts` importa `planck` (los `*.test.ts` quedan fuera, F2 de la v1). Prueba: buscar el texto.
- [ ] G3. **Pantalla igual a Node.** La prueba de `e2e/partida.spec.ts` (toques registrados en `data-toques` y `jugar()` en Node) sigue pasando con las reglas nuevas, en partida libre y en reto diario: mismos puntos, mismas piezas colocadas y altura con 9 decimales. Prueba: `npm run e2e`.
- [ ] G4. **Pruebas doradas.** Existen pruebas doradas de semilla, secuencia y simulación; si se cambian, el commit dice por qué y con qué valores (como en la v1). Prueba: leer `git log` y las pruebas.
- [ ] G5. **Seguridad de los enlaces.** Todo texto que venga de la URL o del almacenamiento se escribe con `textContent`; la prueba de `/?reto=1.5<img src=x onerror=alert(1)>` sigue pasando, y hay una igual para cada parámetro nuevo (`?libre=`). Prueba: `npm run e2e` y buscar `innerHTML` en `src/` (no debe aparecer con datos externos).
- [ ] G6. **CSP.** `public/_headers` no añade orígenes externos ni `'unsafe-inline'`; el único cambio permitido es `font-src 'self'` (bloque A). `dist/index.html` no tiene `<script>` ni `<style>` con código en línea ni atributos `style="…"` (la CSP los bloquea; los estilos dinámicos se ponen desde TypeScript con `elemento.style`, que sí se permite). La prueba de `e2e/csp.spec.ts` pasa sin errores de CSP en consola. Prueba: `npm run e2e` y buscar `style="` en `dist/index.html`.
- [ ] G7. Todas las peticiones van al mismo origen y no hay errores en consola. Prueba: las comprobaciones de `e2e/` que ya lo hacen.
- [ ] G8. **Presupuesto de peso.** JavaScript de `dist/` ≤ 150 KB con `gzip -9`; fuentes ≤ 80 KB en total; `dist/` no contiene audio ni imágenes de mapa de bits (las fuentes y su licencia sí). Prueba: medir y anotar en el README.
- [ ] G9. Licencias: dependencias directas MIT, ISC, BSD, Apache-2.0 u OFL-1.1 (solo fuentes); sin GPL ni AGPL en el árbol. Prueba: `npm query "*"` y leer `license`.
- [ ] G10. Si el almacenamiento falla (modo privado, cuota, excepción), el juego funciona sin guardar y sin errores. Prueba: Vitest con almacén que lanza y la prueba e2e de `localStorage` bloqueado.

## Orden de los bloques

0 (documentos) → **B** (núcleo) → **A** (arte y jugosidad) → **C** (progreso y moneda) → **D** (retos diarios) → **E** (niveles) → **F** (compartir) → **G** (huecos de anuncios) → **H** (cierre). B va antes que A porque los efectos de A (perfecto, combo, caída) reaccionan a los eventos que crea B (S23). Cada bloque deja el juego jugable y con todas las pruebas en verde, y se puede revisar por separado con un commit o varios.

---

## Bloque 0. Documentos de diseño

### 0.1. Pasar los anexos a `docs/diseno/`

Copiar el **Anexo 1** de este archivo a `docs/diseno/diseno-juego.md` y el **Anexo 2** a `docs/diseno/anuncios.md`, sin cambiar el contenido. Desde ese momento, si cambian, mandan los de `docs/diseno/`; los anexos de aquí quedan como foto del plan.

Zonas: `docs/diseno/`.

Depende de: nada.

Requisitos comprobables:
- [ ] Existen los dos archivos y su texto coincide con los anexos (salvo el título de primer nivel). Prueba: compararlos.
- [ ] `diseno-juego.md` tiene los apartados de arte, núcleo, modos, economía, desbloqueos, niveles y la tabla de características; `anuncios.md` tiene formatos, puntos de entrada, frecuencias, lo que nunca se hace, plataformas, quitar anuncios y huecos en el código. Prueba: leerlos.

---

## Bloque B. Núcleo: vidas, perfectos, combos y partida libre por defecto

Las reglas exactas, con ejemplos numéricos, están en el **Anexo 1, apartado 2**. Todas las constantes van con nombre en `src/logica/` (no números sueltos) para poder ajustarlas con las mediciones de B4.

### B1. Vidas, retirada de piezas caídas y eventos de la partida

En `src/logica/simulacion.ts`:
- `Partida` recibe opciones `{ vidas, ... }` (por defecto `VIDAS_INICIALES = 3`). Al caer algo, la fase «asentando» funciona como en la v1 (hasta que todo está quieto o `MAX_PASOS_ASENTAR` pasos); al acabar, las piezas caídas se destruyen en el orden en que se soltaron, se resta **una** vida por episodio y, si quedan vidas, cuelga la siguiente pieza sobre lo que queda en pie. Con 0 vidas, fase `fin`.
- Una cola de eventos deterministas que la pantalla lee y vacía en cada paso (`tomarEventos()`): `soltada`, `colocada` (con calidad, combo y puntos ganados), `caida` (vidas que quedan, piezas perdidas), `vidaExtra`, `hito` (metros), `cementada`, `fin`. Los eventos no cambian la física: solo informan.
- `FormaColocada` guarda también `ancho` y `alto` (los necesita la imagen del bloque F).
- `jugar(semilla, toques, opciones?)` devuelve además `piezas` (colocadas en total), `perfectos`, `comboMax`, `alturaMax`, `vidas` (restantes) y `monedas` (bloque C las usa; aquí solo se calculan con la fórmula del Anexo 1, apartado 4).
- Constante `REGLAS = 2` exportada, que se guarda con cada resultado (C1) para distinguir partidas de la v1.

Zonas: `src/logica/simulacion.ts`, `src/logica/simulacion.test.ts`.

Depende de: nada.

Requisitos comprobables:
- [ ] Con 3 vidas, soltar las 3 primeras piezas en el extremo del vaivén (fuera de la plataforma) acaba la partida tras la tercera caída con 0 puntos, y tras la primera y la segunda la fase vuelve a `apuntando`. Prueba: Vitest con `jugar`.
- [ ] Tras un episodio de caída, `estado().cuerpos` no contiene ninguna pieza con el centro por debajo de `y = 0` ni fuera de `LIMITE_X`. Prueba: Vitest.
- [ ] Si dos o más piezas caen en el mismo episodio de asentado, se resta una sola vida y el evento `caida` lleva el número de piezas perdidas. Prueba: Vitest con una semilla y toques fijados que derrumban la torre (buscarlos con un script y fijarlos en la prueba).
- [ ] Con `vidas: 1` la partida acaba en la primera caída, como en la v1. Prueba: Vitest.
- [ ] La misma semilla, toques y opciones dan el mismo resultado y la misma lista de eventos en dos ejecuciones. Prueba: Vitest.
- [ ] Prueba dorada nueva con `REGLAS = 2`: semilla y toques fijos dan `puntos`, `piezas`, `perfectos`, `vidas`, `pasos` y posiciones finales (6 decimales) fijados en la prueba. Prueba: Vitest.
- [ ] G2 y G4. Prueba: buscar el texto.

### B2. Precisión, perfecto con imán, combo y puntuación

- Calidad de cada suelta según la distancia `d` entre la x de la pieza al soltar y el **objetivo** (x del centro de la pieza en pie más alta; 0 si no hay ninguna): perfecto si `d ≤ TOLERANCIA_PERFECTO` (0,12 m), bueno si `d ≤ TOLERANCIA_BUENO` (0,35 m), normal en otro caso.
- **Imán:** en un perfecto, la pieza se crea exactamente en la x del objetivo (Anexo 1, 2.2). Es determinista porque solo depende del estado.
- **Combo:** perfectos seguidos; un bueno, un normal o una caída lo ponen a 0. Cada 5 perfectos seguidos, +1 vida si hay menos de 3.
- **Puntuación** en una función pura `puntosDeColocada(calidad, combo)` más los hitos de altura, con la fórmula y los ejemplos del Anexo 1, apartado 2.3. La pieza cuenta como **colocada** cuando aparece la siguiente sin que haya caído nada; si hay caída durante su espera, no puntúa.
- Desde la pieza 100, la tolerancia de perfecto baja a 0,08 m (`TOLERANCIA_PERFECTO_FINAL`).

Zonas: `src/logica/simulacion.ts` o un `src/logica/puntuacion.ts` nuevo, con sus pruebas.

Depende de: B1.

Requisitos comprobables:
- [ ] Los ejemplos 1 a 5 del Anexo 1, apartado 2.3, son pruebas de Vitest y dan exactamente las cifras escritas: 75, 370, 185 (y 185 tras el derrumbe), y fin con los puntos acumulados. Prueba: Vitest (con `puntosDeColocada` y con secuencias de eventos sintéticas; los ejemplos con física, con semillas y toques buscados y fijados).
- [ ] Soltar cuando la pieza pasa exactamente por el objetivo da `perfecto` y la pieza queda creada con `x` igual al objetivo (diferencia 0). Prueba: Vitest.
- [ ] Soltar a 0,20 m del objetivo da `bueno`, no mueve la pieza y deja el combo a 0. Prueba: Vitest.
- [ ] Con 2 vidas, 5 perfectos seguidos dan un evento `vidaExtra` y 3 vidas; con 3 vidas no se pasa de 3. Prueba: Vitest.
- [ ] El hito de 5 m se cobra una sola vez aunque la torre baje por un derrumbe y vuelva a pasar de 5 m. Prueba: Vitest.
- [ ] Desde la pieza 100, `d = 0,10 m` ya no es perfecto. Prueba: Vitest.

### B3. Curva de dificultad y cementado de la base

- Velocidad: `v(i) = min(VEL_TOPE, VEL_MIN + VEL_INCREMENTO · i)`, con valores iniciales 1,3 m/s, 0,035 y tope 4,2 m/s (pieza 83), que se ajustan en B4.
- Formas por tramos de 10 piezas: las 5 primeras, solo bloque, tablón y cuadrado (como la v1); después, la probabilidad de trapecio y columna sube por tramo hasta un tope (tabla en el Anexo 1, 2.4).
- **Cementado:** cuando hay más de `MAX_DINAMICAS = 12` piezas dinámicas en pie, las más bajas que estén quietas pasan a estáticas (`setType("static")` en orden de soltado). Dejan de moverse y de caer. Motivo: alarga la partida sin que se derrumbe todo desde abajo y mantiene constante el coste de la física (S7). Evento `cementada`.
- La secuencia de piezas se genera bajo demanda o con un tope alto (al menos 600 piezas), porque 300 ya no bastan para el perfil experto.

Zonas: `src/logica/piezas.ts`, `src/logica/simulacion.ts`, pruebas.

Depende de: B2.

Requisitos comprobables:
- [ ] La velocidad nunca baja de una pieza a la siguiente y no supera `VEL_TOPE`. Prueba: Vitest.
- [ ] Nunca hay más de `MAX_DINAMICAS` piezas dinámicas en pie al aparecer una pieza nueva. Prueba: Vitest con una partida de 150 piezas del perfil experto.
- [ ] Una pieza cementada no cambia de posición en los 600 pasos siguientes. Prueba: Vitest.
- [ ] Tiempo medio por paso de la simulación con 150 piezas soltadas ≤ 2 veces el de 10 piezas, en Node. Prueba: ampliar `scripts/medir-jugar.ts` y anotar las cifras con fecha en el README.
- [ ] Prueba dorada nueva de las 5 primeras piezas de `"2026-11-05"` y otra de las piezas 100 a 104. Prueba: Vitest.

### B4. Jugadores simulados y medición de duración y puntos

Ampliar `scripts/duracion.ts` con tres perfiles que sueltan en la primera pasada por el objetivo (no por x = 0, como en la v1) con error uniforme: **novato** ±180 ms, **medio** ±90 ms y **experto** ±40 ms. Tope de seguridad: 30 minutos de partida. `npm run medir:duracion` mide 30 días seguidos por perfil (días 1 a 30) y escribe medianas y rangos de duración, piezas, puntos, perfectos y monedas. Ajustar las constantes de B2 y B3 hasta cumplir los objetivos.

Objetivos (Anexo 1, 2.5):

| Perfil | Duración mediana | Ninguna partida |
|---|---|---|
| novato | 60 a 150 s | llega a 30 min |
| medio | 120 a 300 s | llega a 30 min |
| experto | 240 a 720 s | llega a 30 min |

Zonas: `scripts/duracion.ts`, `scripts/medir-duracion.ts`, `scripts/duracion.test.ts`, constantes de B2 y B3.

Depende de: B3.

Requisitos comprobables:
- [ ] `npm run medir:duracion` cumple la tabla y sus cifras están en el README con fecha. Prueba: ejecutarlo y leer el README.
- [ ] La mediana de duración crece de novato a medio y de medio a experto, y también la de puntos. Prueba: la salida del script.
- [ ] `scripts/duracion.test.ts` comprueba en `npm test` novato y medio con 3 días y tarda ≤ 60 s en este equipo. Prueba: `npm test` y el tiempo que muestra Vitest.
- [ ] Los perfiles son deterministas: dos ejecuciones dan las mismas cifras. Prueba: ejecutar el script dos veces.

### B5. Partida libre por defecto y flujo de pantallas

- Al abrir `/` sin parámetros, la partida libre ya está en marcha: la pieza va de lado a lado, el primer toque la suelta. Un aviso «Toca para soltar» aparece solo hasta el primer toque de la primera partida de ese navegador.
- HUD en el DOM: puntos (grande, arriba al centro), vidas (3 iconos), combo (solo si ≥ 2), récord libre. El contador accesible sigue con `aria-live="polite"`.
- Fin de partida libre: puntos, récord, «Otra vez» (botón principal, reinicia en un toque; también Espacio o Intro), «Compartir» y acceso a Retos, Niveles y Colección. Los accesos a bloques aún no hechos no se muestran.
- `?reto=` válido abre la pantalla del reto del amigo, no la partida libre. El reto de hoy se puede jugar desde un botón «Reto de hoy» hasta que el bloque D ponga el calendario.
- `semillaPractica` pasa a llamarse `semillaLibre` (o se mantiene con un alias) y la palabra «Práctica» desaparece de la interfaz.
- Actualizar `e2e/ayudas.ts` y las pruebas que pulsan «Jugar el reto de hoy» o «Jugar práctica».

Zonas: `src/juego/principal.ts`, `src/juego/pantallas.ts`, `src/pages/index.astro`, `src/estilos.css`, `e2e/*.ts`.

Depende de: B2 (eventos y puntos). Puede hacerse con B3 y B4 en paralelo.

Requisitos comprobables:
- [ ] Al cargar `/`, sin ningún clic, `data-estado="jugando"` y `data-modo="libre"`; un toque en el lienzo suelta la pieza. Prueba: Playwright en escritorio y móvil.
- [ ] Tras el fin, «Otra vez» empieza otra partida con otra semilla (`data-semilla` cambia) en un solo toque, y Espacio hace lo mismo. Prueba: Playwright.
- [ ] El aviso «Toca para soltar» no aparece en la segunda partida ni tras recargar. Prueba: Playwright.
- [ ] Con `/?reto=1.5` se ve el aviso del reto del amigo con «#1» y «5», y no empieza la partida libre. Prueba: Playwright.
- [ ] El HUD muestra las vidas que quedan tras una caída (`data-vidas` y los iconos). Prueba: Playwright.
- [ ] Ningún botón ni texto de la interfaz contiene «Práctica». Prueba: Playwright y buscar el texto en `src/`.
- [ ] G1 a G10. Prueba: las de cada uno.

---

## Bloque A. Arte, jugosidad, sonido y háptica

La dirección de arte está en el **Anexo 1, apartado 1**, con colores, medidas y tiempos. Todo es visual: nada de este bloque toca `src/logica/simulacion.ts` ni cambia puntos o pasos.

### A1. Tipografía local, paleta y CSP

- Instalar `@fontsource-variable/bricolage-grotesque` (OFL-1.1; versión 5.3.0 en el registro de npm el 2026-11-06) con versión exacta e importar solo los subconjuntos latino y latino extendido. Copiar su `LICENSE` a `dist/` (por ejemplo `public/fuentes/OFL.txt`).
- Variables CSS con la paleta del Anexo 1, 1.2; quitar los colores sueltos de `estilos.css`.
- `public/_headers`: `font-src 'none'` pasa a `font-src 'self'`. Nada más.

Zonas: `package.json`, `src/estilos.css`, `public/_headers`, `public/fuentes/`.

Depende de: nada (se puede hacer con B).

Requisitos comprobables:
- [ ] `dist/` contiene los `.woff2` de la fuente, que suman ≤ 80 KB, y el texto de la licencia OFL. Prueba: listar y medir `dist/`.
- [ ] En la página compilada, `document.fonts.check('16px "Bricolage Grotesque Variable"')` es `true` tras cargar y no hay peticiones a otros orígenes. Prueba: Playwright.
- [ ] La única diferencia en `public/_headers` respecto a `main` es `font-src 'self'`. Prueba: `git diff main -- public/_headers`.
- [ ] Todos los pares de texto y fondo de la paleta usados en la interfaz tienen contraste ≥ 4,5:1 (texto normal) o ≥ 3:1 (texto de 24 px o más). Prueba: Vitest que calcula el contraste WCAG a partir de una tabla de pares exportada en TypeScript, la misma de la que salen las variables CSS (o leyendo `estilos.css`).

### A2. Piezas, escenario y temas

- Dibujo de piezas con el estilo del Anexo 1, 1.3: esquinas redondeadas (solo visual), contorno de tinta, sombra desplazada «de impresión», trama de puntos en la mitad superior y ojos en bloque y cuadrado que parpadean y se asustan al inclinarse más de 10°.
- La pieza cuelga de un gancho con cable; el objetivo se marca con una guía vertical tenue sobre la cima.
- Escenario «Puerto» con 3 capas en paralaje (agua, grúas y muelles en silueta, nubes), cielo que oscurece con la altura (Anexo 1, 1.4) y base cementada con aspecto de piedra.
- Estructura de datos `Tema` (colores de piezas, contorno, trama, ojos sí o no) y `Escenario` (capas y colores) en `src/juego/temas.ts`, para que el bloque C añada temas sin tocar el dibujo. En este bloque solo existen el tema «Riso» y el escenario «Puerto».
- Los degradados, tramas y siluetas se generan al cambiar de tamaño o de tema, no en cada fotograma (como en la v1).

Zonas: `src/juego/dibujo.ts`, `src/juego/temas.ts` (nuevo), pruebas de `dibujo.test.ts`.

Depende de: A1, B1 (piezas cementadas).

Requisitos comprobables:
- [ ] Ningún archivo de `src/juego/` importa `planck` ni escribe en el estado de la `Partida`. Prueba: buscar el texto y revisar que solo se llama a `estado()` y `tomarEventos()`.
- [ ] Con la misma semilla y toques, cambiar de tema no cambia puntos ni pasos. Prueba: Playwright con dos temas forzados (o Vitest sobre `jugar`, que no recibe tema).
- [ ] Capturas de inicio, partida a mitad (≥ 10 piezas), perfecto, caída y fin en 390×844 y 1280×800, guardadas en `docs/proceso/segunda-version/capturas/`. Prueba: existen y el revisor las compara con el Anexo 1, 1.3 a 1.5.
- [ ] Mediana de tiempo entre fotogramas ≤ 17,5 ms y percentil 95 ≤ 25 ms durante 20 s de partida en Chromium de escritorio. Prueba: Playwright que mide con `requestAnimationFrame`. Con CPU ralentizada ×4 (CDP `Emulation.setCPUThrottlingRate`) en el proyecto móvil se mide y se anota, sin umbral obligatorio.

### A3. Jugosidad

Efectos del Anexo 1, 1.5: aplastar y estirar al aterrizar y al soltar, polvo al tocar, anillo y chispas en el perfecto, texto emergente («PERFECTO», «×3», «+30»), confeti desde combo 3, sacudida de cámara en la caída, destello de vida extra y celebración de récord. Funciones puras de curvas y sacudida en `src/juego/efectos.ts`, con semilla visual propia (no la de la partida). Con `prefers-reduced-motion: reduce`: sin sacudida ni destellos y con la mitad de partículas.

Zonas: `src/juego/efectos.ts` (nuevo), `src/juego/dibujo.ts`, `src/juego/principal.ts`.

Depende de: A2, B2.

Requisitos comprobables:
- [ ] Cada evento de B1 (`colocada` con cada calidad, `caida`, `vidaExtra`, `hito`) lanza su efecto: la prueba lee un contador de efectos expuesto en `data-efectos` (solo para pruebas). Prueba: Playwright con una partida de toques fijados.
- [ ] La sacudida vale 0 a los 250 ms y las curvas de aplastar vuelven a escala 1 a los 160 ms. Prueba: Vitest sobre `efectos.ts`.
- [ ] Con `reducedMotion: 'reduce'` no hay sacudida (desplazamiento de cámara por sacudida = 0). Prueba: Playwright con `page.emulateMedia`.
- [ ] Nunca hay más de 200 partículas vivas. Prueba: Vitest.
- [ ] Los efectos no cambian puntos ni pasos (G3 sigue pasando). Prueba: `npm run e2e`.

### A4. Sonido sintetizado y háptica

- `src/juego/sonido.ts` con WebAudio, sin archivos: los sonidos del Anexo 1, 1.6. El `AudioContext` se crea o se reanuda en el primer gesto del usuario. Volumen general 0,5.
- `src/juego/haptica.ts` con `navigator.vibrate` si existe, con los patrones del Anexo 1, 1.6.
- Botones de sonido y vibración en la interfaz; su valor se guarda en C1 (hasta entonces, en memoria).
- Al ocultar la pestaña, el sonido se suspende con la partida.

Zonas: `src/juego/sonido.ts`, `src/juego/haptica.ts` (nuevos), `principal.ts`, `index.astro`.

Depende de: A3.

Requisitos comprobables:
- [ ] `dist/` no contiene `.mp3`, `.ogg`, `.wav` ni `.m4a`. Prueba: listar.
- [ ] Antes del primer gesto no se crea ningún `AudioContext` en estado `running`. Prueba: Playwright con un `addInitScript` que envuelve `AudioContext` y cuenta.
- [ ] Con el sonido apagado no se crea ningún nodo de audio al soltar piezas. Prueba: Playwright con el mismo envoltorio.
- [ ] Con `navigator.vibrate` simulado, un perfecto lo llama con el patrón del Anexo 1; con la vibración apagada, no lo llama; sin `navigator.vibrate` no hay error. Prueba: Playwright con `addInitScript`.
- [ ] La nota del perfecto sube con el combo (frecuencias del Anexo 1, 1.6). Prueba: Vitest sobre la función que elige la nota.

### A5. Interfaz con la nueva dirección de arte

Rehacer paneles, botones y HUD según el Anexo 1, 1.7: sin la barra negra de la v1, paneles de papel con sombra desplazada, botones gruesos con borde de tinta y efecto de pulsado, números tabulares. En escritorio, la columna pasa de 480 px a `min(100vw, 56.25vh)` (proporción 9:16) con el escenario extendido a los lados en vez de fondo plano.

Zonas: `src/estilos.css`, `src/pages/index.astro`, `src/juego/pantallas.ts`.

Depende de: A1, B5.

Requisitos comprobables:
- [ ] En 390×844 no hay desplazamiento horizontal, y en 1280×800 la zona de juego ocupa ≥ 400 px de ancho. Prueba: Playwright.
- [ ] Todos los botones miden ≥ 44×44 px. Prueba: Playwright recorriendo `button:visible`.
- [ ] Todo se puede hacer con teclado: Tab llega a todos los botones visibles y el foco se ve (`:focus-visible`). Prueba: Playwright.
- [ ] G6: no hay `style="` en `dist/index.html`. Prueba: buscar el texto.

---

## Bloque C. Progreso guardado, moneda y desbloqueos

Economía y catálogo con cifras en el **Anexo 1, apartados 4 y 5**.

### C1. Guardado v2 con versión y migración

Nuevo `src/logica/progreso.ts`, sobre la interfaz `Almacen` de la v1, con una sola clave `torre-diaria:progreso` y este contenido (todos los campos validados al leer, como hace hoy `registro.ts`):

```
{ version: 2, monedas, catalogo: { comprados: string[], equipado: { tema, escenario, efecto } },
  libre: { record, alturaRecord, partidas },
  diarios: { [dia]: { puntos, piezas, altura, perfectos, formas, enSuDia, reglas } },
  racha: { actual, mejor, ultimoDia, congeladores },
  niveles: { [n]: estrellas },
  misiones: { fecha, lista, progreso, cobradas },
  ajustes: { sonido, vibracion, tutorialVisto },
  estadisticas: { piezas, perfectos, comboMax, alturaMax } }
```

- **Migración:** si no hay clave v2 y existe `torre-diaria:resultado` (v1) válida, se crea la v2 con ese día en `diarios` como `{ piezas: p, puntos: p × 10, altura, formas, enSuDia: true, reglas: 1 }` y una racha de 1 si ese día es hoy o ayer. La clave v1 **no se borra** (S20).
- Campo desconocido o `version` mayor que 2: se conserva lo legible y se ignora lo demás, sin error. Datos corruptos: se empieza de cero sin borrar la clave hasta el primer guardado.
- Un solo `setItem` por guardado; `registro.ts` queda como lector de la v1 para la migración.

Zonas: `src/logica/progreso.ts`, `src/logica/progreso.test.ts`, `src/logica/registro.ts`, `src/juego/principal.ts`.

Depende de: B1.

Requisitos comprobables:
- [ ] Guardar y leer devuelve los mismos datos. Prueba: Vitest con almacén en memoria.
- [ ] Con solo la clave v1 del día 3 (`{dia:3,puntos:7,...}`), al leer se obtiene `diarios[3].piezas === 7`, `puntos === 70`, `reglas === 1`, y la clave v1 sigue existiendo. Prueba: Vitest.
- [ ] Con JSON inválido, tipos erróneos o `version: 99` no hay excepción y se obtiene un progreso válido. Prueba: Vitest con una lista de 10 casos corruptos.
- [ ] Con un almacén que lanza al leer y al escribir, el juego funciona y `guardar` devuelve `false` (G10). Prueba: Vitest.
- [ ] Solo se escriben claves con el prefijo `torre-diaria:` y, de ellas, solo `torre-diaria:progreso`. Prueba: Vitest con un almacén espía.
- [ ] 365 días de diarios ocupan ≤ 100 KB serializados (las `formas` se limitan a 60 piezas). Prueba: Vitest.

### C2. Monedas, récords y estadísticas

- Funciones puras: `monedasDePartida(resultado)`, `premioDiario(medalla, racha)`, `premioNivel(estrellasNuevas, mundoCompletado)` con las cifras del Anexo 1, 4.2.
- Al acabar cada partida se suman las monedas una sola vez (aunque se recargue la página en la pantalla de fin) y se actualizan récord y estadísticas.
- Pantalla de fin: «+N monedas» con animación de recuento; «¡Nuevo récord!» si lo es.
- Línea de récord: en la partida libre se dibuja una línea discontinua a la altura récord con la etiqueta «Récord» (Anexo 1, 2.6).

Zonas: `src/logica/economia.ts` (nuevo), `progreso.ts`, `principal.ts`, `pantallas.ts`, `dibujo.ts`.

Depende de: C1, A3.

Requisitos comprobables:
- [ ] Los ejemplos de monedas del Anexo 1, 4.2, dan las cifras escritas (54, 125 y 386 para las partidas tipo). Prueba: Vitest.
- [ ] Recargar en la pantalla de fin no vuelve a sumar las monedas de esa partida. Prueba: Playwright.
- [ ] Superar el récord muestra «¡Nuevo récord!» y lo guarda; no superarlo, no. Prueba: Playwright con progreso sembrado en `localStorage`.
- [ ] La línea de récord está a la altura guardada. Prueba: Vitest sobre la función que calcula su posición en pantalla.

### C3. Catálogo, compra, equipar y pantalla Colección

- `src/logica/catalogo.ts`: los artículos del Anexo 1, 5 (6 temas, 3 efectos, 4 escenarios y el congelador de racha) con id, tipo, precio o condición de desbloqueo.
- `comprar(progreso, id)` y `equipar(progreso, id)` puros: no se compra sin monedas suficientes ni dos veces; los escenarios no se compran, se desbloquean al cumplir su condición (altura récord o mundo completado).
- Pantalla Colección: tres pestañas (Piezas, Escenarios, Efectos), cada artículo con vista previa dibujada en un `<canvas>` pequeño, estado (equipado, comprado, precio, «Llega a 25 m») y botón. Al desbloquear un escenario por altura, aviso en la pantalla de fin.
- Los temas y efectos nuevos se añaden a `temas.ts` y `efectos.ts` (A2, A3).

Zonas: `src/logica/catalogo.ts`, `src/juego/temas.ts`, `src/juego/coleccion.ts` (nuevo), `index.astro`, estilos.

Depende de: C2.

Requisitos comprobables:
- [ ] Comprar con monedas insuficientes no cambia el progreso; con suficientes, resta el precio exacto y lo añade a `comprados`; comprar dos veces no resta dos veces. Prueba: Vitest.
- [ ] Un escenario no se puede comprar; se desbloquea al guardar una altura récord ≥ a su condición. Prueba: Vitest.
- [ ] Equipar un tema cambia los colores dibujados en la siguiente partida y se mantiene tras recargar. Prueba: Playwright leyendo `data-tema`.
- [ ] Cada artículo del catálogo tiene vista previa y no hay ids repetidos. Prueba: Vitest y Playwright.

### C4. Misiones diarias

Tres misiones por día UTC elegidas con la semilla `misiones-<fecha>` de un repertorio de 8 tipos (Anexo 1, 4.3), con progreso acumulado entre partidas de ese día y cobro con un toque. Al completar las tres, premio extra. Se ven en el inicio (desplegable) y en la pantalla de fin.

Zonas: `src/logica/misiones.ts` (nuevo), `progreso.ts`, `pantallas.ts`.

Depende de: C2.

Requisitos comprobables:
- [ ] La misma fecha da las mismas 3 misiones, distintas entre sí. Prueba: Vitest.
- [ ] A medianoche UTC las misiones cambian y el progreso del día anterior no cuenta. Prueba: Vitest con fechas fijadas.
- [ ] Una misión se cobra una sola vez y suma su premio exacto. Prueba: Vitest.
- [ ] Una misión de «haz 5 perfectos» avanza con los perfectos de varias partidas libres del mismo día. Prueba: Vitest con resultados sintéticos.

### C5. Medición del ritmo de la economía

`scripts/economia.ts` (`npm run medir:economia`): simula 45 días de cada perfil con el plan de juego del Anexo 1, 4.4 (minutos al día, partidas libres, reto diario, misiones) usando resultados reales de `jugar` con los perfiles de B4 (una muestra de 10 partidas por perfil, reutilizada), y escribe cuándo se hace la primera compra, cuántos artículos hay al día 7 y en qué día se completa el catálogo comprable.

Zonas: `scripts/economia.ts`, `package.json`.

Depende de: C3, C4, B4.

Requisitos comprobables:
- [ ] Novato: primera compra en ≤ 12 minutos de juego simulado. Prueba: salida del script.
- [ ] Medio: entre 3 y 6 artículos comprados al día 7, y el catálogo comprable completo entre los días 10 y 30. Prueba: salida del script.
- [ ] Experto: no completa el catálogo antes del día 7. Prueba: salida del script.
- [ ] Las cifras están en el README con fecha. Prueba: leerlo.

---

## Bloque D. Retos diarios seleccionables, medallas y rachas

### D1. Lógica de retos diarios y rachas

En `src/logica/diarios.ts` (puro):
- Todos los días desde el 1 (`DIA_1`) hasta hoy se pueden jugar; los futuros, no.
- El **primer intento** de cada día es el oficial y se guarda. Si se juega ese mismo día UTC, `enSuDia: true` y cuenta para la racha; si se juega otro día, es «atrasado»: da medalla y monedas pero no cuenta para la racha. Las repeticiones de un día ya jugado no se guardan (son como una partida libre con esas piezas y no dan monedas).
- **Medallas** por puntos: bronce, plata y oro con umbrales `UMBRAL_BRONCE/PLATA/ORO` fijados con B4 (S26): bronce = mediana del novato, plata = mediana del medio, oro = percentil 25 del experto, redondeados a 50.
- **Racha:** días seguidos hasta hoy (o ayer, si hoy aún no se ha jugado) con oficial `enSuDia`. Si falta un día y hay congeladores, se gasta uno por día perdido, automáticamente al abrir, y la racha sigue. Máximo 2 congeladores.
- Premios del Anexo 1, 4.2 (`premioDiario`).

Zonas: `src/logica/diarios.ts`, `src/logica/diarios.test.ts`, `progreso.ts`.

Depende de: C2.

Requisitos comprobables:
- [ ] Oficiales `enSuDia` los días 5, 6 y 7: racha 3 el día 7, racha 3 el día 8 antes de jugar y racha 0 el día 9 sin congeladores. Prueba: Vitest.
- [ ] Con 1 congelador, faltar el día 8 y jugar el 9 da racha 4 y 0 congeladores; faltar el 8 y el 9 con 1 congelador da racha 0. Prueba: Vitest.
- [ ] Un atrasado (día 3 jugado el día 7) da medalla y monedas, `enSuDia: false`, y no cambia la racha. Prueba: Vitest.
- [ ] Jugar otra vez un día ya jugado no cambia lo guardado ni suma monedas. Prueba: Vitest.
- [ ] Con los umbrales fijados, en los días 1 a 30 el novato consigue bronce o más en ≥ 50 % de los días, el medio plata o más en ≥ 50 % y el experto oro en ≥ 50 %. Prueba: `npm run medir:duracion` (o un script de D1) y anotar en el README.
- [ ] El día cambia a medianoche UTC (como en la v1). Prueba: Vitest con fechas fijadas.

### D2. Pantalla Retos con calendario

Pantalla con el mes actual en cuadrícula (lunes primero), flechas para meses anteriores hasta el de `DIA_1`, y cada día con su estado: futuro (gris), sin jugar, jugado en su día (medalla), atrasado (medalla con marca), hoy (resaltado). Arriba, racha actual, mejor racha y congeladores, con un botón para comprar congelador (200 monedas). Tocar un día abre su ficha: «Jugar» si no se ha jugado, o su resultado con «Compartir» y «Jugar otra vez (no cuenta)».

Zonas: `src/juego/retos.ts` (nuevo), `index.astro`, estilos, `principal.ts`.

Depende de: D1, A5.

Requisitos comprobables:
- [ ] Con la fecha fijada al día 40 (`page.clock.setFixedTime`), el calendario muestra el mes actual, deja ir hasta noviembre de 2026 y no más atrás, y los días posteriores a hoy no son pulsables. Prueba: Playwright.
- [ ] Jugar el reto de hoy desde el calendario y recargar: el día sale con medalla y la racha es 1; no se ofrece otro intento oficial. Prueba: Playwright.
- [ ] Jugar un día pasado lo marca como atrasado y la racha no cambia. Prueba: Playwright con progreso sembrado.
- [ ] Comprar un congelador con 250 monedas deja 50 y 1 congelador; con 2 congeladores el botón está desactivado. Prueba: Playwright.

### D3. Enlace de reto v2

- `?reto=<dia>.<puntos>` con puntos de 0 a 999.999 (el formato de la v1 admitía hasta 999 y ahora los puntos son mayores). Mismo control de formato, largo máximo y días futuros.
- Si el día del reto es hoy y no se ha jugado, es el intento oficial (como la v1). Si es un día pasado sin jugar, es su intento atrasado. Si ya se jugó, se comparan los dos resultados y se ofrece «Jugar otra vez (no cuenta)».

Zonas: `src/logica/reto.ts`, `reto.test.ts`, `principal.ts`, `e2e/`.

Depende de: D1.

Requisitos comprobables:
- [ ] `leerReto(crearReto(12, 123456))` devuelve `{ dia: 12, puntos: 123456 }`. Prueba: Vitest.
- [ ] Devuelve `null` con `12.1000000`, `12.0123`, `abc`, `12.`, `-1.5`, un día futuro, más de 20 caracteres y `<script>`. Prueba: Vitest.
- [ ] G5 con `?reto=`. Prueba: Playwright.
- [ ] Abrir `/?reto=<hoy>.500` sin haber jugado y acabar la partida la guarda como oficial de hoy y suma racha. Prueba: Playwright.

---

## Bloque E. Niveles tipo saga

Diseño en el **Anexo 1, apartado 6**.

### E1. Datos y reglas de los niveles

- `src/logica/niveles.ts`: tabla de 30 niveles en 3 mundos con `semilla` fija (`nivel-<n>`), vidas, velocidad inicial, formas permitidas, objetivo (`piezas`, `altura`, `perfectos`, `combo`, `puntos`, `alturaConPiezas`) y umbrales `P2` y `P3` de estrellas.
- `Partida` acepta un objetivo: al cumplirse, fase `fin` con `victoria: true` (después de asentar). Al quedarse sin vidas, `victoria: false`. `jugar` lo admite en las opciones.
- Estrellas: 1 al cumplir el objetivo; 2 si además puntos ≥ `P2`; 3 si puntos ≥ `P3`. Se guarda la mejor; las estrellas nuevas dan monedas (Anexo 1, 4.2).
- Desbloqueo: el nivel n+1 al completar el n; el mundo 2 además necesita 15 estrellas y el mundo 3, 40 (de las 60 posibles de los mundos 1 y 2).

Zonas: `src/logica/niveles.ts`, `niveles.test.ts`, `simulacion.ts`, `progreso.ts`.

Depende de: B3, C2.

Requisitos comprobables:
- [ ] Hay 30 niveles, cada uno con objetivo válido, `P2 < P3` y semilla distinta. Prueba: Vitest.
- [ ] Un nivel de «coloca 5 piezas» acaba con `victoria: true` justo cuando la quinta cuenta como colocada. Prueba: Vitest.
- [ ] El nivel 11 no se desbloquea con el 10 completado y 14 estrellas, y sí con 15. Prueba: Vitest.
- [ ] Mejorar de 1 a 3 estrellas da el premio de 2 estrellas nuevas, y repetir con 3 no da nada. Prueba: Vitest.
- [ ] Prueba dorada de un nivel (semilla, toques y resultado fijados). Prueba: Vitest.

### E2. Validación automática de los niveles

`scripts/niveles.ts` (`npm run medir:niveles`): juega cada nivel 10 veces por perfil (errores con semillas distintas) y fija o comprueba `P2` y `P3` (P2 = mediana de puntos del medio cuando gana, P3 = mediana del experto, redondeados a 50).

Zonas: `scripts/niveles.ts`, `package.json`, `niveles.ts`.

Depende de: E1, B4.

Requisitos comprobables:
- [ ] El novato completa los niveles 1 a 5 en ≥ 6 de 10 intentos cada uno. Prueba: salida del script.
- [ ] El medio completa cada nivel del mundo 1 en ≥ 6 de 10, del mundo 2 en ≥ 4 de 10 y del mundo 3 en ≥ 2 de 10. Prueba: salida del script.
- [ ] El experto consigue 3 estrellas en ≥ 3 de 10 intentos de cada nivel (todas las estrellas son alcanzables). Prueba: salida del script.
- [ ] Duración mediana de un nivel ganado por el medio: de 30 a 120 s. Prueba: salida del script.
- [ ] Las cifras están en el README con fecha. Prueba: leerlo.

### E3. Mapa de la saga

Pantalla Niveles: camino vertical en zigzag de abajo arriba con los 30 niveles como fichas redondas (número, estrellas, candado), fondo de cada mundo con su escenario, desplazamiento vertical y el último nivel disponible centrado al abrir. Ficha del nivel con el objetivo en una frase («Llega a 6 m con 2 vidas»), estrellas y «Jugar». Al ganar: estrellas una a una con sonido, «Siguiente nivel» y «Repetir». Al perder: «Repetir» y «Mapa». El mapa se dibuja en el DOM con SVG en línea o en `<canvas>` (sin atributos `style`, G6).

Zonas: `src/juego/mapa.ts` (nuevo), `index.astro`, estilos, `principal.ts`.

Depende de: E1, A5.

Requisitos comprobables:
- [ ] Con progreso nuevo solo el nivel 1 se puede pulsar. Prueba: Playwright.
- [ ] Ganar el nivel 1 (toques fijados con la ayuda de `data-x`) muestra estrellas, desbloquea el 2 y se mantiene tras recargar. Prueba: Playwright.
- [ ] Al abrir el mapa con el nivel 12 disponible, su ficha queda visible sin desplazarse. Prueba: Playwright con progreso sembrado.
- [ ] El objetivo de cada nivel se muestra con una frase de ≤ 40 caracteres. Prueba: Vitest sobre `textoObjetivo`.

---

## Bloque F. Compartir con imagen generada

Diseño de la imagen en el **Anexo 1, apartado 7**.

### F1. Imagen PNG en `<canvas>`

`src/juego/imagen.ts`: `dibujarImagen(ctx, datos)` sobre un lienzo de 1080×1350 con la composición del Anexo 1, 7 (cabecera, modo, torre con las formas reales colocadas, puntos, datos y llamada a jugar con el dominio de `location.host`) y `generarPNG(datos): Promise<Blob>` con `canvas.toBlob`. Usa el tema equipado y la fuente local (espera a `document.fonts.ready`). Vale para los tres modos: libre, reto diario y nivel.

Zonas: `src/juego/imagen.ts` (nuevo).

Depende de: A2, C2 (y D1 y E1 para los datos de racha y estrellas; sin ellos, esa línea no se pinta).

Requisitos comprobables:
- [ ] `generarPNG` devuelve un `Blob` de tipo `image/png`, de 1080×1350 (`createImageBitmap`) y ≤ 600 KB, en los tres modos. Prueba: Playwright con `page.evaluate`.
- [ ] La imagen de un resultado fijado coincide con una captura de referencia (`toHaveScreenshot` del lienzo, con tolerancia pequeña). Prueba: Playwright en Chromium de escritorio.
- [ ] Con 0 piezas, 1 pieza y 200 piezas la imagen se genera sin errores; con más de 40 piezas se ve «+N». Prueba: Playwright.
- [ ] La imagen no contiene emojis ni texto que venga de la URL (solo datos propios y `location.host`). Prueba: lectura del código y G5.

### F2. Texto para compartir v2 y enlaces por modo

- `generarTarjeta` sin emojis (S18): una línea con modo, puntos, altura y dato destacado, y otra con «¿Me superas?» y el enlace. Ejemplos en el Anexo 1, 7.2.
- Enlaces: reto diario `?reto=<dia>.<puntos>`; partida libre `?libre=<semilla>.<puntos>` (la semilla libre pasa a ser de 1 a 7 caracteres `[0-9a-z]`); nivel, la página principal.
- `?libre=` válido abre la pantalla «Tu amigo hizo N puntos en esta partida» y hace jugar esa semilla como partida libre (cuenta para récord y monedas como cualquier libre). Validación como `?reto=`: formato estricto, largo máximo 20, `null` si no encaja.

Zonas: `src/logica/tarjeta.ts`, `src/logica/reto.ts` (o `enlaces.ts`), `semilla.ts`, pruebas, `principal.ts`.

Depende de: B5, D3.

Requisitos comprobables:
- [ ] Ninguna tarjeta contiene caracteres fuera del rango BMP ni de los bloques de emojis (comprobación por expresión regular `\p{Extended_Pictographic}`). Prueba: Vitest en los tres modos.
- [ ] Las tarjetas miden ≤ 200 caracteres con puntos de 999.999. Prueba: Vitest.
- [ ] `leerLibre(crearLibre("a1b2c3", 1240))` devuelve `{ semilla: "a1b2c3", puntos: 1240 }`; devuelve `null` con `ABC.1`, `a1b2c3d4.1`, `a.1000000`, `a.`, `<script>`. Prueba: Vitest.
- [ ] Abrir `/?libre=<semilla>.300` hace jugar esa semilla (`data-semilla` la contiene) y muestra «300». Prueba: Playwright.
- [ ] G5 con `?libre=`. Prueba: Playwright.

### F3. Compartir archivo, descargar y copiar

- «Compartir»: si `navigator.canShare?.({ files: [archivo] })` es verdadero, `navigator.share({ files: [archivo], text })`; si no, pero hay `navigator.share`, `share({ text })` y se ofrece «Descargar imagen»; si no hay ninguno, «Descargar imagen» y «Copiar texto». Cancelar (`AbortError`) no muestra error.
- «Descargar imagen»: enlace temporal con `URL.createObjectURL` y `download="torre-diaria-<modo>.png"`, revocado tras usarlo.
- Vista previa de la imagen en el panel de fin como `<canvas>` reducido (no como `<img>`, para no tocar `img-src`).
- En todos los modos: fin de libre, fin y ficha de reto diario, fin de nivel.

Zonas: `src/juego/pantallas.ts`, `principal.ts`, `index.astro`.

Depende de: F1, F2.

Requisitos comprobables:
- [ ] Con `canShare` y `share` simulados que aceptan archivos, «Compartir» llama a `share` una vez con un `File` `image/png` y un `text` que contiene el enlace, sin `url`. Prueba: Playwright con `addInitScript`.
- [ ] Sin soporte de archivos pero con `share`, se llama con solo `text` y el botón «Descargar imagen» está visible. Prueba: Playwright.
- [ ] Sin `navigator.share`, «Descargar imagen» lanza una descarga `.png` (evento `download` de Playwright) y «Copiar texto» deja el texto en el portapapeles. Prueba: Playwright.
- [ ] Un `share` que rechaza con `AbortError` no muestra error. Prueba: Playwright.
- [ ] `public/_headers` no cambia en este bloque. Prueba: `git diff`.

---

## Bloque G. Huecos para anuncios (sin anuncios)

Plan completo en el **Anexo 2**. Aquí solo la interfaz, una implementación vacía y las llamadas en los puntos del flujo.

### G1. Interfaz `Anuncios` y puntos de llamada

- `src/juego/anuncios.ts`: tipo `Anuncios` con `disponible(tipo)`, `intersticial(motivo)`, `recompensado(motivo)` (resuelve `"visto" | "cancelado" | "error"`), `partidaEmpieza()` y `partidaPara()`; y `anunciosNulos`, que dice «no disponible» y resuelve al momento sin hacer nada.
- Se elige la implementación por `import.meta.env.PUBLIC_PLATAFORMA` (solo existe `web`, que usa `anunciosNulos`).
- Llamadas en los puntos del Anexo 2, apartado 2: `partidaEmpieza/partidaPara` al empezar y acabar o pausar cualquier partida; `intersticial("otra-vez")` y `intersticial("siguiente-nivel")` en esas transiciones; los botones recompensados («×2 monedas», «Seguir con 1 vida», «Congelador gratis») existen ocultos y solo se muestran si `disponible("recompensado")` es verdadero.

Zonas: `src/juego/anuncios.ts` (nuevo), `principal.ts`, `pantallas.ts`, `index.astro`.

Depende de: B5, C2, D2, E3.

Requisitos comprobables:
- [ ] En la compilación normal ningún botón de anuncio está visible en ninguna pantalla. Prueba: Playwright recorriendo fin de libre, fin de nivel y Retos.
- [ ] Con un `Anuncios` falso inyectado en una prueba que cuenta llamadas, una partida libre completa y «Otra vez» llaman a `partidaEmpieza` 2 veces, `partidaPara` 1 vez e `intersticial("otra-vez")` 1 vez; y el reto diario nunca llama a `recompensado("seguir")`. Prueba: Vitest sobre el controlador de flujo o Playwright con un modo de prueba.
- [ ] `dist/` no contiene direcciones de SDK de anuncios (`crazygames`, `poki`, `googlesyndication`, `adsbygoogle`) y no hay peticiones a otros orígenes (G7). Prueba: buscar el texto en `dist/` y `npm run e2e`.
- [ ] Con `anunciosNulos`, «Otra vez» empieza la partida en el mismo fotograma lógico que en el bloque B (no hay espera). Prueba: Playwright (B5 sigue pasando).

---

## Bloque H. Cierre

### H1. Documentación

README al día: cómo se juega ahora (libre por defecto, vidas, perfectos, combos), modos, economía, niveles, compartir, guardado v2 y migración, mediciones nuevas con fecha (B3, B4, C5, D1, E2, G8, A2) y enlaces a `docs/diseno/`. Corregir lo desfasado (S2): el repositorio ya está en GitHub y es público.

Zonas: `README.md`.

Depende de: los bloques anteriores.

Requisitos comprobables:
- [ ] El README no dice que el repositorio esté solo en local ni que no haya CI si H2 se hace. Prueba: leerlo.
- [ ] Todas las cifras del README tienen fecha y se pueden repetir con un comando escrito al lado. Prueba: leerlo.

### H2. CI mínimo en GitHub Actions

`.github/workflows/pruebas.yml`: en `push` y `pull_request`, `npm ci`, `npm run check`, `npm test`, `npm run build` y `npm run e2e` (solo Chromium), con caché de npm y de los navegadores de Playwright. Ver S21.

Zonas: `.github/workflows/`.

Depende de: H1.

Requisitos comprobables:
- [ ] El flujo pasa en la rama `segunda-version` en GitHub. Prueba: ver la ejecución en la pestaña Actions.
- [ ] La duración de una ejecución está anotada en el README (sin coste, por ser repositorio público). Prueba: leerlo.
- [ ] El repositorio sigue siendo público (si fuera privado, el CI consumiría la cuota compartida y hay que desactivarlo). Prueba: la página del repositorio.

---

## Decisiones

- **S1. Solo puedo crear este archivo.** Las instrucciones del planificador permiten crear únicamente `docs/proceso/<cambio>/tareas.md`; el encargo pide además `docs/diseno/diseno-juego.md` y `docs/diseno/anuncios.md`. Su contenido completo va en los Anexos 1 y 2 y la tarea 0.1 los copia. Fácil de deshacer: si el coordinador prefiere crearlos él, basta con copiarlos.
- **S2. El README está desfasado (no es una contradicción con la estrategia).** Dice «sin repositorio en GitHub (D11)» y «Sin CI (D9). La cuota de GitHub Actions va justa y el repositorio aún no está en GitHub». Prueba: `.git/config` tiene `origin = https://github.com/aitorben07/Torre_Diaria.git` y la página del repositorio muestra «Public» (comprobado el 2026-11-06). Corrección: H1 lo actualiza y H2 añade un CI, que en un repositorio público no gasta cuota según la estrategia.
- **S3. Las reglas nuevas cambian los resultados de todos los días.** Es aceptable porque el juego no se ha desplegado (README: «Aún no está desplegado en ningún sitio»), así que no hay tarjetas ni enlaces de la v1 en circulación. Se versiona con `REGLAS = 2`, se regeneran las pruebas doradas y las partidas de la v1 guardadas se marcan `reglas: 1`. Si se hubiera desplegado, habría que mantener las dos reglas por día.
- **S4. Tres vidas en vez de acabar a la primera caída.** Es lo que más alarga la partida sin quitar tensión y se entiende al instante (corazones). Fácil de deshacer: `VIDAS_INICIALES = 1` vuelve a la regla de la v1.
- **S5. Perfecto con imán y tolerancia fija en metros.** El imán premia acertar con una torre más recta (como Stack) y la tolerancia fija hace el perfecto más difícil cuanto más rápida va la pieza: de ±92 ms a 1,3 m/s a ±29 ms a 4,2 m/s. Son constantes.
- **S6. Puntuación:** 10 por pieza colocada, bonus de precisión con combo hasta ×5, 50 por cada 5 m nuevos; el derrumbe no resta, como decidió la v1. Ejemplos en el Anexo 1, 2.3.
- **S7. Cementar la base.** Mantiene como mucho 12 piezas dinámicas: la partida larga cuesta lo mismo por paso y no se derrumba entera desde abajo, que sería frustrante a los 5 minutos. Beneficio extra para la segunda fase (validación en servidor). Fácil de deshacer: `MAX_DINAMICAS = Infinity`.
- **S8. Una sola moneda blanda, sin gemas.** Sin compras con dinero no hay nada que vender con una moneda premium, y dos monedas complican la tienda (punto 6). Si llegan compras, se valora la segunda moneda (Anexo 1, 4.1).
- **S9. Los escenarios se ganan jugando, no se compran.** Así «llegar a cierto punto desbloquea cosas» (punto 2 del usuario) y las monedas quedan para temas y efectos.
- **S10. Retos diarios:** el primer intento de cada día es el oficial; el de días pasados cuenta como «atrasado» (medalla sí, racha no). Las repeticiones no se guardan. Mantiene comparables las tarjetas (D4 de la v1) y deja jugar todos los retos que existan (punto 3).
- **S11. Racha con congelador comprable (200 monedas, máximo 2).** Funciona en juegos de hábito y es un gasto útil de moneda. Fácil de quitar.
- **S12. 30 niveles en 3 mundos en esta fase**, con estrellas por objetivo y puntos. Suficiente para validar si gustan antes de hacer más; los datos son una tabla.
- **S13. Sin React aunque haya más pantallas.** Calendario, mapa y colección son listas y fichas sencillas; el peso de React (del orden de 40 a 50 KB con gzip, supuesto sin medir) se comería un tercio del presupuesto. Es la misma desviación de la estrategia que D1 de la v1, ya escrita en el README. Si las pantallas crecen mucho, se reconsidera.
- **S14. Tipografía Bricolage Grotesque** (variable, OFL-1.1), por npm (`@fontsource-variable/bricolage-grotesque` 5.3.0, consultado en el registro de npm el 2026-11-06), empaquetada en `dist/`. Tiene carácter sin ser la redondeada habitual de los juegos casuales. Única excepción a la CSP: `font-src 'self'`.
- **S15. Dirección de arte «risografía» con piezas con ojos** (Anexo 1, 1). Colores planos de tinta, sombra desplazada y trama de puntos: se dibuja barato en canvas, es reconocible y se aleja del degradado y brillo genéricos de la v1. Fácil de cambiar: va en `temas.ts`.
- **S16. Sonido sintetizado con WebAudio, sin archivos.** No hay que revisar licencias ni pesar archivos, y el tono puede subir con el combo. Si no convence, se añaden efectos CC0 empaquetados más adelante.
- **S17. Imagen de 1080×1350 (4:5)** con vista previa en `<canvas>`, para no añadir `blob:` a `img-src`.
- **S18. Texto para compartir sin emojis.** El usuario pidió «sin emoticonos básicos»; la imagen es lo vistoso y el texto queda sobrio, con el enlace.
- **S19. Enlace `?libre=` con la semilla.** Permite retar a un amigo también en la partida libre (punto 4, «compartir todos los resultados»). Los niveles enlazan a la página principal porque el amigo puede no tenerlos desbloqueados.
- **S20. Clave nueva `torre-diaria:progreso` y la de la v1 sin borrar.** Si hay que volver atrás, la v1 sigue leyendo su clave.
- **S21. CI en GitHub Actions con e2e de Chromium.** El repositorio es público y Actions es gratis ahí (estrategia, «Capacidad gratuita»). Fácil de deshacer: borrar el archivo. Si se hace privado, hay que desactivarlo por la cuota.
- **S22. Misiones diarias sí; logros, eventos, ranking y demás, más adelante o no** (tabla del Anexo 1, 9).
- **S23. Orden B antes de A**, porque la jugosidad depende de los eventos del núcleo.
- **S24. Descargas de sitios ajenos: ninguna.** La fuente llega por npm como cualquier dependencia. Las páginas de CrazyGames, Poki y Google se han leído a mano para el Anexo 2, no se descarga nada de ellas, así que no aplica `robots.txt`.
- **S25. Las duraciones, umbrales y precios son objetivos medidos con jugadores simulados.** Sin comprobar con personas; el probador debe jugar a mano al menos 5 partidas libres y 3 niveles y anotar duraciones, o declararlo «sin comprobar».
- **S26. Umbrales de medalla y estrellas por medición** (D1, E2), no a ojo: así se ajustan solos si cambia la dificultad.
- **S27. Ajustes de sonido y vibración** guardados en el progreso; el movimiento reducido sigue la preferencia del sistema, sin botón propio.
- **Supuestos:** interfaz solo en español; números con punto de miles («1.240») y coma decimal; día UTC como en la v1; el usuario juega sobre todo en móvil.

## Bloqueantes

- **Para esta fase: ninguno.** Todo se hace en la rama sin pagar ni pedir nada.
- **Tras la revisión final (necesitan al usuario):** desplegar en Cloudflare Pages (D10 de la v1).
- **Para cuando se implementen anuncios (Anexo 2, apartado 8):** cuenta en el portal o en AdSense, consentimiento de privacidad en la UE (asesoría legal), dominio propio si AdSense lo exige (pago), cuota de Google Play para AdMob (pago) y cobro de «quitar anuncios» (pago, fiscal y legal). Ninguno afecta a esta fase.

---

# Anexo 1. Diseño del juego (contenido de `docs/diseno/diseno-juego.md`)

Principio que manda sobre todo lo demás (punto 6 del usuario): **un toque, se entiende al instante, y siempre hay un siguiente objetivo cerca** (un perfecto más, el récord, la misión, la medalla, la estrella, el siguiente desbloqueo).

## 1. Dirección de arte

### 1.1. Idea

«Taller de risografía en el puerto»: piezas de colores de tinta plana, impresas sobre papel crema, con la sombra desplazada de una impresión mal registrada y una trama de puntos. Las piezas tienen ojos y reaccionan: es lo que da personalidad y se recuerda. Nada de degradados brillantes ni sombras difusas genéricas.

### 1.2. Paleta (tema «Riso»)

| Uso | Nombre | Valor |
|---|---|---|
| Fondo, paneles | Papel | `#F3EAD7` |
| Papel en sombra, trama | Papel oscuro | `#E2D3B5` |
| Contornos, texto | Tinta | `#1E1B33` |
| Pieza 0, botón principal | Rosa fluor | `#FF4F8B` |
| Pieza 1, perfecto, monedas | Amarillo | `#FFC93C` |
| Pieza 2 | Turquesa | `#12A4A0` |
| Pieza 3 | Azul riso | `#2F5DDB` |
| Pieza 4 | Naranja | `#FF7A3D` |
| Pieza 5 | Verde | `#3BB273` |
| Pieza 6 | Violeta | `#7A5CC7` |
| Cielo a 0 m | Amanecer | `#FBD9C0` → `#F3EAD7` |
| Cielo a 30 m | Tarde | `#9ED3E0` |
| Cielo a 60 m | Anochecer | `#3E3A7A` |
| Cielo desde 100 m | Noche | `#1A1840`, estrellas `#FFF3C4` |
| Agua del puerto | | `#2F5DDB` al 35 % sobre papel |

Texto siempre en tinta sobre papel o sobre amarillo; en rosa, tinta (contraste ≈ 5,5:1, se verifica en A1).

### 1.3. Piezas

- Formas físicas de la v1 (bloque, tablón, cuadrado, trapecio, columna); el dibujo redondea las esquinas un 8 % del lado menor (solo visual).
- Contorno de tinta de 0,035 m; sombra del mismo color oscurecido un 35 %, desplazada (0,06 m, −0,06 m).
- Trama de puntos de papel al 25 % en la mitad superior (patrón creado una vez con `createPattern`).
- Ojos en bloque y cuadrado: dos puntos de tinta de 0,07 m con brillo; parpadean cada 2 a 5 s (azar visual), se cierran contentos en un perfecto y se abren mucho si la pieza gira más de 10°.
- La pieza colgada pende de un gancho amarillo con cable de tinta; se inclina ±4° según la dirección del vaivén (visual).
- Base cementada: piezas en gris piedra `#B9AE98` con contorno, sin ojos (duermen).

### 1.4. Escenario y cámara

- Plataforma: muelle de madera con bolardos. Capas en paralaje: agua con ondas (0,1×), grúas y barcos en silueta azul riso al 40 % (0,3×), nubes de papel (0,6×).
- Al subir: el puerto queda abajo, aparecen gaviotas (10 a 30 m), globos (30 a 60 m), aviones de papel, y estrellas desde 100 m. Marcas de altura cada 5 m en el borde izquierdo («10 m»).
- Otros escenarios desbloqueables: Ciudad (azoteas y depósitos de agua), Nubes (islas flotantes) y Espacio (planetas de papel). Misma estructura de capas.
- Cámara: la de la v1 (suave), con un leve alejamiento (hasta 10 %) cuando la torre pasa de 20 m para ver más torre.

### 1.5. Animación y jugosidad

| Momento | Efecto | Valores |
|---|---|---|
| Soltar | Estirar | escala (0,94, 1,06), 80 ms |
| Aterrizar | Aplastar y rebote visual | (1,12, 0,88) → 1 en 160 ms, curva «ease-out-back»; 6 a 10 motas de polvo, 300 ms |
| Bueno | Texto «BIEN» pequeño | 400 ms |
| Perfecto | Anillo amarillo que se expande desde el contacto; 12 chispas; texto «PERFECTO» que pasa de 0,6 a 1,1 a 1 en 220 ms; «+30» que sube y se desvanece en 600 ms | |
| Combo ≥ 2 | Indicador «×N» junto a los puntos que late | |
| Combo ≥ 3 | Confeti de la paleta | 20 piezas |
| Vida extra | El corazón vuela del punto de contacto al HUD | 500 ms |
| Hito de 5 m | Banda «¡15 m!» que cruza la pantalla | 700 ms |
| Caída | La pieza gira al caer; plof de agua al llegar abajo; sacudida de cámara | 8 px que decae en 250 ms; vida que se rompe en el HUD |
| Récord superado | Cruzar la línea de récord: destello, «¡RÉCORD!» | |
| Fin | La torre se ve entera (cámara se aleja), recuento de puntos y monedas | 800 ms |

Con movimiento reducido: sin sacudida ni destellos, la mitad de partículas.

### 1.6. Sonido (WebAudio) y háptica

| Momento | Sonido | Vibración |
|---|---|---|
| Soltar | «tic»: triangular 660 Hz, 40 ms | — |
| Aterrizar | «toc»: seno 180 → 120 Hz, 90 ms, más ruido con filtro paso bajo a 800 Hz | 8 ms |
| Perfecto | nota de la escala pentatónica de Do según el combo: 523, 587, 659, 784, 880, 1047 Hz (combo 1 a 6+), triangular más seno a la octava, 180 ms | 15 ms |
| Vida extra | arpegio 523, 659, 784 Hz | 15, 30, 15 ms |
| Hito | dos notas 784 y 1047 Hz | — |
| Caída | ruido con barrido 600 → 80 Hz, 400 ms, y seno 90 Hz | 30, 40, 30 ms |
| Récord, estrellas | arpegio ascendente | 20 ms por estrella |

Volumen general 0,5. Sonido y vibración se pueden apagar; iOS no vibra (se ignora en silencio).

### 1.7. Interfaz

- Tipografía Bricolage Grotesque: títulos 800, botones 700, números con cifras tabulares.
- Paneles de papel con borde de tinta de 3 px y sombra desplazada (6 px, 6 px) en tinta: sin sombras difusas.
- Botón principal: rosa con texto de tinta, borde de tinta; al pulsar baja 3 px y la sombra se reduce.
- HUD: puntos grandes arriba al centro; vidas como tres bloquecitos con ojos a la izquierda; combo y récord a la derecha.
- Barra inferior en el inicio y el fin: Retos (con la racha), Niveles, Colección (con las monedas), Ajustes.

## 2. Núcleo de juego

### 2.1. Ciclo

La pieza va de lado a lado sobre la torre; un toque la suelta; al quedarse quieta aparece la siguiente. Si algo cae de la plataforma, se pierde una vida (3 al empezar) y se sigue con lo que quede en pie. Sin vidas, fin.

### 2.2. Precisión

- Objetivo: x del centro de la pieza en pie más alta (0 si no hay ninguna).
- Perfecto: a ≤ 0,12 m del objetivo (≤ 0,08 m desde la pieza 100). La pieza se coloca exactamente en el objetivo (imán).
- Bueno: a ≤ 0,35 m. Normal: el resto.
- Combo: perfectos seguidos; cualquier otra cosa lo pone a 0. Cada 5 perfectos seguidos, +1 vida (máximo 3).

### 2.3. Puntuación

- Pieza colocada (aparece la siguiente sin caída): **+10**.
- Precisión: perfecto **+10 × min(combo, 5)**; bueno **+5**; normal +0.
- Hito: **+50** por cada 5 m de altura máxima nueva en la partida (se cobra una vez).
- Caída: la pieza que estaba en espera no puntúa, −1 vida, combo a 0. Lo ya ganado no se resta.

Ejemplos:
1. Perfecto, perfecto, bueno, normal; torre de 3,1 m: (10+10) + (10+20) + (10+5) + (10+0) = **75**.
2. Siete perfectos seguidos y se pasa de 5 m: 20 + 30 + 40 + 50 + 60 + 60 + 60 + 50 = **370**; con 2 vidas, la quinta da +1 vida.
3. Diez piezas colocadas con 2 perfectos sueltos (combo 1 cada uno) y 3 buenos, torre de 6 m: 100 + 20 + 15 + 50 = **185**.
4. **Derrumbe:** en el ejemplo 3, la pieza 11 se suelta mal y arrastra a la 8, la 9 y la 10. Vidas 3 → 2, la 11 no puntúa, los puntos siguen en **185** y la torre baja a 4,2 m. Al volver a pasar de 5 m no se cobra otra vez ese hito; sí el de 10 m cuando llegue.
5. **Fin:** con 1 vida, una pieza cae: vidas 0, fin con los puntos acumulados. Si al caer una pieza ya colocada se cae también la que estaba en espera, es un solo episodio y una sola vida.

### 2.4. Curva de dificultad (valores iniciales, se ajustan con B4)

- Velocidad: 1,3 m/s + 0,035 por pieza, tope 4,2 m/s en la pieza 83.
- Formas: piezas 1 a 5, solo bloque, tablón y cuadrado. Desde la 6, trapecio y columna con probabilidad 10 % cada una, +3 puntos por tramo de 10 piezas, tope 25 % cada una.
- Desde la pieza 100, perfecto más estrecho.
- Cementado: como mucho 12 piezas dinámicas; las de abajo se vuelven piedra.

### 2.5. Duración y puntuación esperadas por perfil (objetivos que se miden en B4)

| Perfil | Error de toque | Duración mediana | Piezas | Puntos aprox. | Monedas por partida |
|---|---|---|---|---|---|
| Novato | ±180 ms | 60 a 150 s | 20 a 45 | 300 a 800 | ~54 |
| Medio | ±90 ms | 2 a 5 min | 45 a 100 | 1.000 a 3.000 | ~125 |
| Experto | ±40 ms | 4 a 12 min | 100 a 250 | 4.000 a 12.000 | ~386 |

Cálculo de referencia: cada pieza tarda unos 2,5 a 3 s (llegar al centro, 3,4 m / velocidad, más quedarse quieta). Medio: 70 piezas ≈ 3,2 min; 70 × 10 + 25 perfectos con combo medio 2,4 (≈ 600) + 25 buenos (125) + 6 hitos (300) ≈ 1.700 puntos.

### 2.6. Superarse

Línea de récord en el escenario, «¡Nuevo récord!», medallas del día, estrellas de nivel, misiones del día y el siguiente desbloqueo a la vista en la pantalla de fin («Te faltan 120 monedas para Caramelo», «Llega a 25 m para la Ciudad»).

## 3. Modos

- **Libre (por defecto):** se abre la web y se juega. Sin límite de partidas. Cuenta para récord, monedas, misiones y desbloqueos por altura.
- **Retos diarios:** calendario con todos los días desde el día 1; un intento oficial por día (el de hoy suma racha; los atrasados solo medalla). Medallas bronce, plata y oro por puntos. Racha con congeladores.
- **Niveles:** mapa de saga con 30 niveles, objetivos cortos y 3 estrellas.

## 4. Economía

### 4.1. Una moneda blanda

**Monedas**, una sola. Se ganan jugando y se gastan en cosas visibles. Sin gemas: una moneda premium solo tiene sentido si se vende, y en esta fase no se vende nada. Si más adelante hay compras, una segunda moneda escasa (gemas) se reservaría para artículos exclusivos, nunca para ventaja en el reto diario.

### 4.2. De dónde salen

| Fuente | Monedas |
|---|---|
| Pieza colocada | 1 |
| Perfecto | +1 |
| Hito de 5 m | +5 |
| Reto diario oficial | sin medalla 15, bronce 30, plata 60, oro 100, más 10 × min(racha, 7) |
| Misión diaria | 30, 40 o 50; las tres: +50 |
| Estrella nueva de nivel | 20; mundo completo con 3 estrellas en todo: +200 |

Partidas tipo: novato 35 piezas, 4 perfectos, 3 hitos = 35 + 4 + 15 = **54**; medio 70, 25, 6 = 70 + 25 + 30 = **125**; experto 180, 126, 16 = 180 + 126 + 80 = **386**. Unas 36 a 48 monedas por minuto en todos los perfiles: el tiempo jugado se premia parecido.

### 4.3. Misiones diarias (repertorio)

Haz N perfectos (5, 10, 15) · Combo de N (3, 5) · Llega a N m en una partida (10, 20, 30) · Coloca N piezas en total (50, 100) · Juega el reto de hoy · Gana un nivel · Consigue una estrella nueva · Supera tu récord. Tres al día, distintas, por semilla de la fecha.

### 4.4. En qué se gastan y ritmo

| Artículo | Tipo | Precio o condición |
|---|---|---|
| Riso | tema de piezas | gratis |
| Madera | tema | 300 |
| Caramelo | tema | 700 |
| Neón | tema | 1.200 |
| Mármol | tema | 1.800 |
| Oro | tema | 3.000 |
| Polvo | efecto de aterrizaje | gratis |
| Confeti | efecto | 500 |
| Chispas | efecto | 1.000 |
| Puerto | escenario | gratis |
| Ciudad | escenario | 25 m en libre o mundo 1 completo |
| Nubes | escenario | 50 m o mundo 2 |
| Espacio | escenario | 100 m o mundo 3 |
| Congelador de racha | consumible | 200 (máx. 2) |

Total comprable: 8.500. Plan de juego simulado (C5): novato 10 min al día (libre y reto), medio 15 min (libre, reto, misiones, niveles), experto 25 min. Objetivo: el novato compra Madera en ≤ 12 min de juego; el medio tiene 3 a 6 artículos el día 7 y todo entre los días 10 y 30. Ejemplo medio: 4 libres (500) + reto plata con racha 3 (90) + misiones (170) ≈ 760 al día → 8.500 en unos 11 días.

## 5. Desbloqueos

- Por monedas: temas y efectos.
- Por progreso: escenarios (altura o mundos), mundos de niveles (estrellas).
- Siempre a la vista el siguiente: la pantalla de fin muestra lo más cercano.

## 6. Niveles tipo saga

30 niveles en 3 mundos de 10: **Puerto** (1-10, aprendizaje, lento), **Ciudad** (11-20, más rápido, columnas y trapecios), **Nubes** (21-30, rápido, piezas estrechas, retos de 1 vida). Nivel 10, 20 y 30: «jefe», más largo.

Tipos de objetivo: coloca N piezas · llega a N m · haz N perfectos · combo de N · consigue N puntos · llega a N m con como mucho M piezas · cualquiera de los anteriores con 1 o 2 vidas.

Ejemplo del mundo 1: 1) coloca 5 piezas; 2) llega a 3 m; 3) haz 2 perfectos; 4) coloca 10; 5) combo de 3; 6) 6 m con 2 vidas; 7) coloca 8 con 1 vida; 8) 400 puntos; 9) 8 m con como mucho 12 piezas; 10) 12 m con 2 vidas.

Estrellas: 1 al cumplir; 2 con puntos ≥ P2; 3 con puntos ≥ P3 (medidos en E2). Mundo 2 con 15 estrellas; mundo 3 con 40.

## 7. Compartir

### 7.1. Imagen (1080×1350)

Fondo de papel con grano y el escenario equipado en suave; arriba, «TORRE DIARIA» en 800 con sombra desplazada; una etiqueta con el modo («RETO #16 · 6 NOV», «PARTIDA LIBRE», «NIVEL 12 ★★☆»); en el centro, la torre dibujada con las formas, medidas y colores reales colocadas (hasta 40; luego «+N»), con ojos; los puntos en grande; una fila de datos (altura, perfectos, mejor combo, racha en el diario); abajo, «¿Me superas?» y el dominio. Nada de emojis.

### 7.2. Texto

- Diario: `Torre Diaria #16: 1.240 puntos, 18,4 m, racha de 5 días.` / `¿Me superas? https://<origen>/?reto=16.1240`
- Libre: `Torre Diaria: 2.310 puntos y 27,1 m en partida libre.` / `¿Me superas? https://<origen>/?libre=a1b2c3.2310`
- Nivel: `Torre Diaria: nivel 12 con 3 estrellas.` / `Juega en https://<origen>/`

## 8. Interfaz y flujo

Abrir → partida libre en marcha → fin (puntos, monedas, récord, siguiente desbloqueo, Otra vez, Compartir, barra con Retos, Niveles y Colección). El primer contacto no tiene menús.

## 9. Características de los juegos casuales con más descargas

| Característica | Veredicto | Motivo |
|---|---|---|
| Combos y recompensa por precisión | **Sí, ahora** | Es la maestría que pide el punto 2; un toque sigue bastando |
| Récord personal visible | **Sí, ahora** | Superarse sin servidor |
| Moneda blanda y tienda de aspectos | **Sí, ahora** | Desbloqueos con sentido, sin ventaja de juego |
| Desbloqueos por hitos | **Sí, ahora** | «Llegar a cierto punto desbloquea cosas» |
| Niveles tipo saga con estrellas | **Sí, ahora** (30) | Objetivos cortos y claros |
| Reto diario con calendario y racha | **Sí, ahora** | Hábito diario; ya existía la base |
| Misiones diarias | **Sí, ahora** (3 al día) | Baratas, sin servidor, dan objetivos a corto plazo |
| Protección de racha | **Sí, ahora** | Evita perder el hábito por un día |
| Tutorial en partida | **Sí, ahora** (un aviso) | Entender al instante sin menús |
| Recompensa por entrar cada día (calendario de 7 días) | **No** | La racha del reto diario ya cumple ese papel; dos calendarios confunden |
| Logros | Más adelante | Útiles, pero amplían mucho el alcance; con las estadísticas guardadas son fáciles de añadir |
| Eventos temporales | Más adelante | Necesitan contenido y calendario de publicación |
| Ranking | Más adelante | Necesita servidor y antitrampas (D3 de la v1) |
| Amigos | Más adelante | Necesita cuentas; el enlace de reto cubre lo básico |
| Fantasma del amigo (su torre de fondo) | Más adelante | Bonito, pero el enlace tendría que llevar sus toques |
| Potenciadores antes de partida | Más adelante | Rompen la igualdad del reto diario; solo valdrían en niveles |
| Seguir viendo un anuncio | Más adelante (con anuncios) | Anexo 2 |
| Notificaciones push | Más adelante | Necesita PWA y un servidor de avisos (Supabase no tiene hueco) |
| Pase de temporada | No | Necesita compras y contenido continuo |
| Ruleta o cofres aleatorios | No | Parecen apuestas y añaden pantallas; las probabilidades habría que publicarlas |
| Vidas o energía que limitan las partidas | No | Contradice «juega cuantas veces quieras» |
| Moneda premium (gemas) | No por ahora | Ver 4.1 |

---

# Anexo 2. Plan de anuncios, sin implementar (contenido de `docs/diseno/anuncios.md`)

Nada de esto se implementa en la segunda versión. El bloque G solo deja los huecos.

## 1. Papel de los anuncios

Pagar el juego sin estropearlo: anuncios **opcionales con premio** como fuente principal y un **intersticial** espaciado en transiciones naturales. El reto diario se mantiene limpio y justo: nadie gana puntos viendo anuncios.

## 2. Formatos y puntos exactos de entrada

| # | Momento del flujo | Formato | Qué se ofrece | Límite |
|---|---|---|---|---|
| 1 | Fin de partida **libre**, antes de mostrar el resultado final, si se han perdido las 3 vidas | Recompensado, opcional | «Seguir con 1 vida» | 1 por partida; solo si los puntos ≥ 30 % del récord; nunca en reto diario ni niveles |
| 2 | Pantalla de fin de partida libre | Recompensado, opcional | «×2 monedas de esta partida» | 5 al día |
| 3 | Pantalla Retos | Recompensado, opcional | «Congelador de racha gratis» | 1 a la semana; alternativa: comprarlo con 200 monedas |
| 4 | Pulsar «Otra vez» en libre | Intersticial | — | Ver apartado 3 |
| 5 | Pulsar «Siguiente nivel» | Intersticial | — | Ver apartado 3 |

Todos los recompensados tienen alternativa sin anuncio o son un extra; ningún nivel ni medalla exige verlos.

## 3. Frecuencias y límites del intersticial

Se pide solo si se cumplen todas: han pasado ≥ 180 s desde el último anuncio de cualquier tipo; ≥ 3 partidas o niveles desde el último intersticial; ≥ 5 min de sesión; no es el primer día del jugador; en esa misma transición no se ha ofrecido el «Seguir» del punto 1. Los portales aplican además sus propios topes (CrazyGames, como mucho uno cada 3 minutos): el juego pide y el SDK decide.

## 4. Lo que nunca se hace

- Anuncios durante la partida, al pulsar botones de navegación (Inicio, Retos, Colección, Ajustes) o nada más abrir la web propia.
- Anuncios en el reto diario oficial, o cualquier ventaja de puntuación a cambio de verlos.
- Encadenar anuncios por un premio, dar el premio si el anuncio falla, o mostrar botones de anuncio que no hacen nada.
- Botones engañosos, cierre escondido o retrasado.
- Banners en la zona de juego o que tapen la interfaz; anuncios dentro de la imagen para compartir.
- Bloquear o castigar a quien usa bloqueador de anuncios: el juego entero funciona sin anuncios.
- Combinar en la misma transición un intersticial y un «Seguir con anuncio» (regla de CrazyGames).
- Recoger datos para anuncios sin consentimiento en la UE.

**Banners:** no en esta fase de anuncios. Pagan poco y empeoran el aspecto. Si un portal los pide, solo en pantallas de menú que duren más de 5 s y nunca en la partida.

## 5. Plataformas

| | Portales web (CrazyGames, Poki) | Web propia (AdSense, juegos H5) | Móvil (AdMob) |
|---|---|---|---|
| Cómo | Se sube la compilación al portal; anuncios solo por su SDK (`commercialBreak`/`rewardedBreak` en Poki; `requestAd("midgame" | "rewarded")` en CrazyGames) | API de colocación de anuncios de Google (`adBreak`, tipos `next` y `reward`) | App Expo con anuncios nativos |
| Requisitos | Revisión del portal; no se permiten otros anuncios; pausar juego y sonido durante el anuncio; avisar `gameplayStart/Stop` | Cuenta AdSense aprobada y acceso a juegos H5 (en beta según Google); probablemente dominio propio (sin comprobar); consentimiento en la UE con una plataforma certificada | Publicar en tienda: Google Play cobra su cuota; AdMob exige vincular la app (sin comprobar en detalle) |
| Coste | Gratis; reparto de ingresos | Gratis salvo dominio | Cuota de tienda |
| Recomendación | **Primera opción**: trae jugadores y gestiona el consentimiento | Después, si hay tráfico propio | Solo si el juego funciona en web |

Notas técnicas para portales: la compilación del portal no usa `public/_headers` (lo sirve el portal), pero su CSP debe permitir el SDK; el enlace para compartir debería apuntar a la página del juego en el portal; el portal puede pedir su propio guardado. Todo eso va en una compilación aparte (`PUBLIC_PLATAFORMA=crazygames`), sin tocar la web.

## 6. Quitar anuncios

Compra única (orientativo, 2,99 €) que quita los intersticiales y mantiene los recompensados como opcionales (o da su premio sin anuncio una vez al día). Solo cuando haya un medio de pago: compras del portal o tienda móvil. Cobrar en la web propia exige pasarela de pago y obligaciones fiscales: decide el usuario.

## 7. Huecos en el código (bloque G)

- `src/juego/anuncios.ts`: interfaz `Anuncios` (`disponible`, `intersticial`, `recompensado`, `partidaEmpieza`, `partidaPara`) y `anunciosNulos`, que no hace nada.
- Llamadas ya puestas en los puntos 1 a 5 y al empezar y acabar cada partida; botones recompensados ocultos mientras `disponible` sea falso.
- Para implementar más adelante: una política pura (`src/logica/politica-anuncios.ts`) con las reglas del apartado 3, probada con Vitest, y un adaptador por plataforma que cargue su SDK solo en esa compilación.

## 8. Lo que necesitará al usuario

Cuenta de desarrollador en el portal elegido; si es web propia, cuenta AdSense, posible dominio (pago) y consentimiento de privacidad (asesoría legal); para móvil, cuota de Google Play (pago); para «quitar anuncios», un medio de cobro (pago, fiscal y legal).

## Fuentes (consultadas el 2026-11-06)

- [CrazyGames: requisitos de anuncios](https://docs.crazygames.com/requirements/ads/) y [SDK HTML5 v3, anuncios de vídeo](https://docs.crazygames.com/sdk/html5-v3/video-ads)
- [Poki: SDK HTML5](https://sdk.poki.com/html5.html) y [requisitos](https://sdk.poki.com/new-requirements)
- [Google: API de colocación de anuncios](https://developers.google.com/ad-placement/apis) y [tipos de colocación](https://developers.google.com/ad-placement/docs/placement-types)
- [Registro de npm: @fontsource-variable/bricolage-grotesque](https://registry.npmjs.org/@fontsource-variable/bricolage-grotesque/latest)
