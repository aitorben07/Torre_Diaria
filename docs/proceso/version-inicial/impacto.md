# Torre Diaria: versión inicial. Impacto

Análisis del 2026-11-05 sobre `docs/proceso/version-inicial/tareas.md` (commit `978b3b5` de `version-inicial`) frente a `C:\Users\aitor\Music\ESTRATEGIA_PROYECTOS.md`.

**Base comprobada:** el repositorio solo tiene `docs/proceso/version-inicial/estado.md` y `tareas.md` (`git status` limpio, tres commits). No hay código, así que las citas `archivo:línea` apuntan al plan y a la estrategia. Todo lo que dice «supuesto» no se ha podido medir porque aún no hay código ni dependencias instaladas.

## Qué se ve afectado

Proyecto nuevo: no hay módulos, datos, usuarios ni trabajos previos que puedan romperse. Lo que crea el plan:

| Pieza | Dónde | Comentario |
|---|---|---|
| Lógica pura (semilla, piezas, simulación, tarjeta, reto, registro) | `tareas.md:42-151` (T2-T7) | El núcleo es `jugar(semilla, toques)` (`tareas.md:85`): define la igualdad entre jugadores hoy y la validación del ranking en la segunda fase. Es la pieza con más riesgo. |
| Pantalla de juego y bucle de paso fijo | `tareas.md:153-167` (T8) | Es donde se puede perder el determinismo (toques medidos en tiempo y no en pasos, saltos de fotogramas). |
| Pantallas, copiar y compartir | `tareas.md:169-186` (T9) | Integración con `navigator.share` y `navigator.clipboard`. |
| Datos del navegador | `tareas.md:138-151` (T7) | Una clave `torre-diaria:` en `localStorage`. Sin datos en servidor. |
| Alojamiento | `tareas.md:203-219` (T11), `ESTRATEGIA_PROYECTOS.md:20,35` | Cloudflare Pages por subida directa; no se despliega en este cambio. |
| Integraciones externas | ninguna en ejecución | Sin peticiones a otros dominios (`tareas.md:200`). Solo se descarga de npm y la CDN de Playwright al instalar, en local. |
| Trabajos programados | ninguno | No hay cron, ni Actions (`tareas.md:13,38`). |
| Segunda fase (fuera de este cambio) | `tareas.md:225` (D3) | D1 + Pages Functions; depende de que `jugar` sea reproducible en un Worker. |

## Riesgos

### 1. Determinismo de la física (alto; afecta a todos los jugadores y a la segunda fase)

- **Comprobado (por la especificación de JavaScript y fuentes externas):** suma, resta, multiplicación, división y `Math.sqrt` dan el mismo resultado en todos los motores (IEEE-754 con redondeo correcto). `Math.sin`, `Math.cos`, `Math.atan2`, `Math.pow`, etc. son «aproximados por la implementación» y pueden diferir entre motores y sistemas.
- **Supuesto:** planck usa `Math.sin`/`Math.cos` al fijar el ángulo de un cuerpo y `Math.atan2` al leerlo, igual que Box2D. Si es así, en cuanto una pieza gira (siempre ocurre al apilar) Chrome/Node (V8, con su propia copia de fdlibm), Firefox y Safari (JavaScriptCore, que se apoya en la libm del sistema) pueden separarse en algún decimal, y una torre al borde del equilibrio amplifica la diferencia hasta cambiar la puntuación.
- **Consecuencia hoy:** las piezas son iguales para todos (T2-T3 no usan física), pero la misma secuencia de toques puede dar otra puntuación en Safari que en Chrome. Para el encargo («al menos en el mismo navegador») basta; hay que decirlo en el README y no prometer más.
- **Consecuencia en la segunda fase:** si el Worker (V8) vuelve a simular una partida jugada en un iPhone, puede salir otra puntuación y rechazar una partida legítima. Hay que medirlo ya (ver cambios en T10) para que D3 se decida con datos.
- **Riesgos dentro del mismo navegador que el plan no cierra:**
  - Que un toque se registre por tiempo y no por número de paso. T4 usa pasos en `jugar` (`tareas.md:85`), pero T8 (`tareas.md:155`) no exige que el bucle real registre y aplique el toque en un número de paso concreto. Sin eso, la partida en pantalla y la reproducción con `jugar` pueden diferir según la tasa de refresco (60 Hz frente a 120 Hz) o un fotograma perdido.
  - «Un máximo de 2 s» (`tareas.md:82`) debe ser 120 pasos, no reloj.
  - El vaivén (`tareas.md:81`) no debe usar `Math.sin`: una onda triangular lineal es igual de buena y exacta en todos los motores.
  - Las iteraciones de `world.step`, el orden de creación de cuerpos y las opciones del mundo deben ser constantes.
  - Una actualización de planck (aunque sea de parche) puede cambiar resultados. Con `^1.5.1` en `package.json`, un `npm install` futuro podría cambiarla. Hay que fijar la versión exacta y tener una prueba con un resultado fijado («prueba dorada»), igual que hace T2 con el generador (`tareas.md:58`).
  - Cambiar las constantes de `piezas.ts` cambia la secuencia de días ya compartidos. T2 fija el generador, pero T3 no fija la secuencia.
- **Se puede deshacer:** sí, mientras no se publique. Después, cualquier cambio de física o de piezas rompe la comparación de días ya jugados.

### 2. Compartir (medio)

- **Tarjeta y paleta:** solo hay nueve cuadrados de color en emoji (🟥🟧🟨🟩🟦🟪🟫⬛⬜). T3 pide «color de una paleta fija» (`tareas.md:64`) sin ligarla a esos emojis; si la paleta tiene un color sin equivalente, la tarjeta no coincide con lo que se vio. Los cuadrados de color son de Unicode 12 (2019): Windows 10 anterior a 1903 o un Android muy viejo pueden mostrar cajas vacías (supuesto, poco frecuente).
- **`navigator.share`:** si se pasan `text` y `url` a la vez, algunas apps (supuesto: WhatsApp y X en algunas versiones) se quedan con uno solo. El plan solo pasa `text` (`tareas.md:182`); hay que dejarlo escrito para que nadie añada `url`.
- **Navegadores integrados:** un enlace abierto desde WhatsApp o Instagram suele abrirse en su navegador interno, con su propio `localStorage`. Al pasar al navegador normal no aparece el resultado del día y se puede repetir el intento oficial. Se acepta (va en la línea de D4), pero hay que anotarlo. El portapapeles puede fallar ahí: la alternativa con `textarea` de T9 lo cubre.
- **Reto de hoy ya jugado:** T9 no dice qué pasa si alguien abre un reto del día de hoy después de haber jugado (`tareas.md:171`). Lo natural es comparar su resultado con el del amigo, sin otra partida oficial.
- **Vista previa en redes:** sin `og:image` (D8) WhatsApp y Telegram muestran solo título y descripción. Se acepta.
- **Día UTC:** en España el reto cambia a la 1:00 (invierno) o a las 2:00 (verano), y en América por la tarde. Es coherente y simple; se anota para la revisión final.

### 3. Rendimiento en móvil y tamaño de descarga (bajo-medio)

- **Tamaño:** planck 1.5.0 ocupa unos 206 KB minimizado y **unos 46 KB con gzip**, sin dependencias (dato de depscope, fuente secundaria). El presupuesto de T11 (150 KB gzip, `tareas.md:217`) deja unos 100 KB para el resto. **Supuesto:** cabe con holgura.
- **Lienzo:** con `devicePixelRatio` 3 en 390×844, el lienzo tiene 1170×2532 píxeles y se repinta entero en cada fotograma. En un Android de gama baja eso puede costar más que la física. T8 exige igualar el ratio a 3 (`tareas.md:166`); conviene limitarlo a 2.
- **Bucle:** si un fotograma tarda mucho (pestaña en segundo plano, móvil lento), el acumulador puede intentar recuperar cientos de pasos de golpe y bloquear la página. Hace falta un máximo de pasos por fotograma y pausar con `visibilitychange`. Como todo se cuenta en pasos, el juego solo se ralentiza: no pierde el determinismo.
- **Física:** con unas 40 piezas y reposo (*sleeping*) activado, un paso de planck debería costar bastante menos de 1 ms en un móvil medio (supuesto sin medir).

### 4. Licencias (bajo)

- **Comprobado en el plan:** planck es MIT (`tareas.md:224`). **Supuesto conocido:** Astro y Vitest son MIT y Playwright es Apache-2.0.
- **Supuesto:** Astro puede traer `sharp` (Apache-2.0), cuyos binarios `@img/sharp-libvips-*` son LGPL-3.0. Solo se usa al compilar y no llega a `dist/`, así que no obliga a nada, pero la comprobación de T1 (`tareas.md:39`) solo mira las dependencias directas y no lo detectaría. Conviene revisar todo el árbol con `npm query` (incluido en npm, sin herramientas nuevas) y, sobre todo, lo que llega a `dist/`.
- Nombre y mecánica: apilar piezas no está protegido. Basta con no usar nombres ni gráficos de otros juegos (por ejemplo, Tower Bloxx).

### 5. Seguridad y CSP (bajo)

- **Supuesto:** Astro, por defecto (`build.inlineStylesheets: 'auto'`), mete en línea las hojas de estilo pequeñas, y puede hacer lo mismo con scripts pequeños. Con una CSP sin `'unsafe-inline'` se bloquearían. T11 ya lo detecta (`tareas.md:215`); la solución más simple es `build.inlineStylesheets: 'never'` y comprobar que no queda ningún `<script>` en línea. La alternativa es la CSP integrada de Astro (`security.csp`, con hashes). Fijar `canvas.style.width` desde JavaScript no lo bloquea la CSP.
- T11 propone servir `dist` con `wrangler pages dev` (`tareas.md:215`): eso descarga wrangler, que es pesado, solo para una prueba. Con `page.route` de Playwright se añade la misma cabecera sin instalar nada más.

### 6. Datos existentes y migraciones

No hay ninguno. La única «migración» futura es el formato de la clave de `localStorage` (T7): si cambia, hay que leer la versión anterior o ignorarla, y T7 ya pide ignorar los datos corruptos (`tareas.md:150`). Riesgo nulo en esta fase.

**Riesgo grave fuera del alcance:** ninguno.

## Coste gratuito

| Servicio | Consumo de este cambio | Cálculo | Queda |
|---|---|---|---|
| GitHub Actions | 0 min | Sin `.github/` (`tareas.md:38`, D9). Si más adelante el repositorio es privado y se añade CI: Vitest ≈ 1 min por `push` (supuesto), y con Playwright de 4 a 6 min. Con el margen de 92 a 244 min (`ESTRATEGIA_PROYECTOS.md:52`) caben como mucho de 15 a 40 `push` al mes con solo Vitest. En un repositorio público, gratis. | 92 a 244 min/mes, sin cambios |
| Cloudflare Pages | 1 proyecto; de 0 a unos 10 despliegues al mes cuando se apruebe | 1 de 100 proyectos. Despliegues por subida directa: la documentación liga las 500 compilaciones a las de Git, así que probablemente no cuenten (supuesto); aunque contaran, 10 de 500. Archivos: unos 10 de 20.000. El mayor, unos 200 KB de 25 MiB. | 99 proyectos; ≥ 490 compilaciones |
| Cloudflare Workers | 0 en esta fase | Las peticiones a archivos estáticos de Pages no invocan Workers (supuesto según la documentación de precios). | 100.000 peticiones/día, compartidas con `App_Noticias/disparador` |
| Cloudflare D1 | 0 en esta fase | Segunda fase (estimación): 1 escritura por partida → hasta 100.000 partidas al día. Un `GET /api/ranking` con índice `(dia, puntos)` y `LIMIT 50` lee unas 50 filas → 5 M / 50 = 100.000 consultas al día; **sin índice, cada consulta lee todo el día y el límite se agota mucho antes**. Las peticiones a Workers (1 `POST` + unos 2 `GET` por jugador) limitan a unos 33.000 jugadores al día; con la clasificación en caché 60 s, el límite pasa a ser solo el `POST`. | 10 bases, 5 GB |
| CPU de Workers (segunda fase) | — | 10 ms por petición. Volver a simular 40 piezas son unos 5.000 pasos de planck: probablemente más de 10 ms (supuesto). Se mide en T4. | — |
| Supabase | 0 | Sin hueco (`ESTRATEGIA_PROYECTOS.md:54`); D3 ya usa D1, que es la excepción prevista (`ESTRATEGIA_PROYECTOS.md:22`). | 0 proyectos libres, sin cambios |
| Resend, Expo | 0 | No se usan. | sin cambios |
| Local | Gratis | npm y navegadores de Playwright: Chromium (unos 150 MB); WebKit y Firefox si se acepta el cambio de T10 (unos 200 MB más, supuesto). | — |

**Bloqueantes de coste:** ninguno. Todo cabe gratis y con herramientas de la tabla (la desviación de React ya está justificada en D1).

Descargas automáticas de sitios ajenos: el juego no hace ninguna. Para este análisis solo se ha consultado `registry.npmjs.org/robots.txt` (el registro responde con la ficha de un paquete llamado `robots.txt`, no con un fichero de reglas) y se han hecho búsquedas web; no se ha descargado nada en lote.

## Cómo encajarlo mejor

Recomendación: **mantener el plan (Astro estático + planck, sin React, sin servidor)** y endurecer el determinismo, que es lo único que no se arregla bien después de publicar:

1. **Contar todo en pasos.** El bucle de T8 guarda el número de paso de cada toque efectivo y lo aplica en ese paso. Así la partida en pantalla es, por construcción, `jugar(semilla, toques)`. Expón los toques al final de la partida (en memoria y en `data-toques` para las pruebas): es también el dato que enviará la segunda fase.
2. **Nada de trigonometría propia.** Onda triangular para el vaivén, piezas que nacen con ángulo 0 y tiempos en pasos.
3. **Fijar la versión exacta de planck y añadir pruebas doradas** de la secuencia de piezas (T3) y de una partida (T4).
4. **Medir ahora lo que decide la segunda fase:** el tiempo de `jugar` para una partida larga en Node y si Firefox y WebKit reproducen lo mismo que Node. Son pruebas informativas que no deben hacer fallar el cambio.
5. **Paleta = emojis**, limitar `devicePixelRatio` a 2, máximo de pasos por fotograma y pausa en segundo plano.
6. **CSP sin wrangler:** `inlineStylesheets: 'never'` y probar la cabecera con `page.route`.

Alternativa descartada: un motor propio o de coma fija para que el resultado sea igual en todos los navegadores. Lo resolvería del todo, pero es mucho más trabajo que lo que pide esta fase («al menos en el mismo navegador»). Se reconsidera en la segunda fase con la medición de T10.

## Cambios al plan

Incorporados en `tareas.md` y marcados con **[impacto]**:

1. **T1:** fijar `planck` a una versión exacta (sin `^` ni `~`); revisar las licencias de todo el árbol con `npm query`, prohibir GPL y AGPL, y permitir LGPL solo en herramientas de compilación, anotándolo. Licencia MIT, ISC, BSD o Apache-2.0 para todo lo que llega a `dist/`.
2. **T3:** paleta de 9 colores como máximo, cada uno ligado a un emoji cuadrado; prueba dorada con las 5 primeras piezas de `"2026-11-05"`.
3. **T4:** vaivén con onda triangular sin `Math.sin`/`Math.cos`; espera máxima en pasos (120); iteraciones y opciones del mundo como constantes; `simulacion.ts` sin `Math.random`, `Date.now` ni `performance.now`; prueba dorada de una partida (puntos, altura, pasos y posiciones finales redondeadas); medir y anotar el tiempo de `jugar` con 40 piezas o más (dato para D3).
4. **T5:** usar el emoji de la paleta de T3.
5. **T8:** registrar los toques por número de paso; máximo de pasos por fotograma; pausa con `visibilitychange`; `devicePixelRatio` limitado a 2 (cambia el requisito de «emulación a 3»).
6. **T9:** reto de hoy ya jugado → comparación sin otra partida oficial; `navigator.share` solo con `text`.
7. **T10:** reproducir en Node, con `jugar`, los toques de la partida jugada en el navegador y comparar el resultado (determinismo entre Node y Chromium). Prueba informativa, que no bloquea, de esa misma comparación en Firefox y WebKit, con el resultado anotado.
8. **T11:** `build.inlineStylesheets: 'never'` y ningún `<script>` en línea; probar la CSP con `page.route` en vez de wrangler; el README avisa de que el determinismo solo se garantiza en el mismo navegador y recoge el tiempo de `jugar`.
9. **D3:** añadir el riesgo de que no coincidan los motores, el índice y la caché de la clasificación, y que el límite de CPU depende de la medición de T4.
10. **D10:** supuesto de que la subida directa no cuenta como compilación.
11. **D12:** se permite la prueba informativa de T10 en Firefox y WebKit.
12. **Supuestos generales:** día en UTC (cambia a la 1:00 o a las 2:00 en España) y navegadores integrados con almacenamiento propio.

No se quita ni se reordena ninguna tarea.

**Contradicciones entre estrategia y realidad:** ninguna demostrada. Un matiz sin prueba concluyente: `ESTRATEGIA_PROYECTOS.md:35` da «500 compilaciones/mes» como límite de Pages, y la documentación de Cloudflare lo liga a las compilaciones lanzadas desde Git, así que la subida directa probablemente no cuente. Corrección propuesta, si el documentador lo confirma en la página de límites: añadir «(compilaciones desde Git; la subida directa con wrangler no consta que cuente)».

## Fuentes

- [depscope: planck](https://depscope.dev/pkg/npm/planck) (tamaño, fuente secundaria)
- [MDN: Math.sin](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sin) y [trigfills](https://awesome.ecosyste.ms/projects/github.com%2Fstrainer%2Ftrigfills) (diferencias de la trigonometría entre motores)
- [Astro: CSP](https://v5.docs.astro.build/en/reference/experimental-flags/csp/)
- [Cloudflare Pages: límites](https://developers.cloudflare.com/pages/platform/limits) y [subida directa](https://developers.cloudflare.com/pages/platform/direct-upload/)
