# Torre Diaria: segunda versión. Impacto

Análisis del 2026-11-06 sobre `docs/proceso/segunda-version/tareas.md` (plan del mismo día), el código de la rama `segunda-version` (igual a `main` más el plan: `git log` muestra `b338822` y `00db05e` por encima de la fusión de la v1), `C:\Users\aitor\Music\ESTRATEGIA_PROYECTOS.md` y los límites gratuitos.

Marcas: **[comprobado]** lo he leído en el código, medido o consultado hoy; **[supuesto]** lo deduzco sin haberlo medido.

**Sobre `tareas.md`:** el encargo me pedía incorporar los cambios allí con la marca [impacto]. Mi papel solo me permite crear este archivo y usar la consola solo para leer, y la única forma de tocar `tareas.md` sería reescribir sus 924 líneas enteras, con riesgo de estropearlo. Por eso no lo he editado. Todos los cambios del apartado 5 llevan ya la marca **[impacto]** y el sitio exacto donde van, para que el coordinador los pegue tal cual (el `CLAUDE.md` del proyecto le asigna a él ese paso: «incorpora sus cambios al plan»).

---

## 1. Qué se ve afectado

### Lógica (`src/logica/`)

| Archivo | Qué cambia | Dónde engancha hoy [comprobado] |
|---|---|---|
| `simulacion.ts` | Vidas, retirada de piezas caídas, eventos, imán, combo, cementado, objetivos de nivel y cambio de la firma de `jugar` | `constructor(semilla)` en `simulacion.ts:108`; la pieza se crea en `xColgada()` en `simulacion.ts:133-137` (ahí va el imán); la caída pasa a «asentando» y luego a `fin` sin vuelta atrás en `simulacion.ts:160-169` (ahí van las vidas y la retirada); los puntos son `piezas.length` en `simulacion.ts:185` y `:198` (pasan a acumularse); `FormaColocada` sin medidas en `simulacion.ts:70`; la secuencia da la vuelta cada 300 piezas en `simulacion.ts:211`; la firma es `jugar(semilla, toques, maxPasos?)` en `simulacion.ts:276` |
| `piezas.ts` | Curva de velocidad, formas por tramos, secuencia de 600 piezas o más, paleta sin emojis | `VEL_MIN/MAX/INCREMENTO` en `piezas.ts:30-32` (1,2 / 5 / 0,05; el plan propone 1,3 / 4,2 / 0,035); la paleta va ligada a emojis en `piezas.ts:35-43`; `PIEZAS_POR_PARTIDA = 300` en `piezas.ts:54`; el generador lineal en `piezas.ts:72-85`. La forma se llama `triangulo` en `piezas.ts:6`, no «trapecio» como en el Anexo 1 |
| `registro.ts` | Pasa a leer solo la v1 para la migración | La clave `torre-diaria:resultado` está en `registro.ts:5`; valida `color < PALETA.length` en `registro.ts:36` |
| `reto.ts` | Puntos hasta 999.999 y nuevo `?libre=` | Expresión `FORMATO` con un máximo de 999 en `reto.ts:29` (línea 81 de la salida concatenada; en el archivo es la 8) |
| `tarjeta.ts` | Sin emojis, puntos con punto de miles, tres modos | Fila de emojis en `tarjeta.ts:29-33`; `formatearPiezas` («N piezas») en `tarjeta.ts:25-27`, que usan también `pantallas.ts:59,80-82,87` y `principal.ts:114,128` |
| `semilla.ts` | `semillaPractica` pasa a `semillaLibre` | `semilla.ts:61-63` (el prefijo `practica-` va dentro de la semilla) y la prueba que exige que sea el único `Math.random` en `semilla.test.ts:63` |
| Nuevos | `progreso.ts`, `economia.ts`, `catalogo.ts`, `misiones.ts`, `diarios.ts`, `niveles.ts`, `puntuacion.ts` | — |

### Pantalla (`src/juego/`, `src/pages/`, `src/estilos.css`)

- `principal.ts` se reescribe casi entero. El modo `"oficial" | "reto" | "practica"` (`principal.ts:12`) pasa a libre, diario y nivel; el arranque (`principal.ts:202-204`) pasa de `mostrarInicio()` a empezar la partida libre; el guardado oficial (`principal.ts:112`) pasa a `progreso.ts`; los botones de `principal.ts:174-185` desaparecen o cambian. Hoy tiene 204 líneas y con calendario, mapa, colección, tienda, sonido y anuncios superará con facilidad las 800 [supuesto].
- `dibujo.ts`: los degradados se crean una vez en `ajustar()` (`dibujo.ts:62-77`) y por fotograma solo se rellena (`dibujo.ts:90-120`). Esa es la convención que A2 debe seguir. El color sale de `PALETA[pieza.color]` (`dibujo.ts:132`) y pasará al `Tema`. `RATIO_MAXIMO = 2` (`dibujo.ts:25`) es el ajuste más barato si el móvil no da la talla.
- `pantallas.ts`: el objeto `ui` (`pantallas.ts:14-36`) usa ids fijos y lanza un error si falta uno. Al quitar botones hay que quitar también sus entradas. La función `compartir` solo comparte texto (`pantallas.ts:125-132`).
- `index.astro`: el favicon con los colores de la v1 (`index.astro:7-16`), `theme-color #28508f` (`index.astro:29`), la barra negra (`index.astro:34-37`) y los botones «Práctica» y «Jugar práctica» (`index.astro:48,62`).
- `estilos.css`: fuente del sistema y colores sueltos (`estilos.css:18-20`) y columna fija de 480 px (`estilos.css:27`).
- `bucle.ts` no cambia: el paso fijo y la pausa con la pestaña oculta (`bucle.ts:235-239`) ya sirven. Solo hay que suspender también el `AudioContext`.

### Configuración y cabeceras

- `public/_headers:5`: `font-src 'none'` pasa a `font-src 'self'`.
- `package.json`: nueva dependencia de la fuente y scripts `medir:economia` y `medir:niveles`.
- `astro.config.mjs`: `inlineStylesheets: "never"` ya evita `<style>` en línea. **No usar** la API de fuentes de Astro: inserta `<style>` y precargas en el HTML y chocaría con G6 [supuesto, no lo he probado en Astro 7.4.5].

### Pruebas que se rompen seguro [comprobado]

- `e2e/compilacion.spec.ts:15` prohíbe `woff2?` en `dist/`. Hay que cambiarla en A1, o A1 nunca pasará G1.
- `e2e/ayudas.ts:43-46` (`empezarHoy` pulsa «Jugar el reto de hoy») y casi todo `e2e/pantallas.spec.ts` (líneas 14-179: «Jugar práctica», «Ver mi resultado de hoy», `CLAVE` v1, «5 piezas»).
- `e2e/partida.spec.ts:38` llama a `jugar(fin.semilla, fin.toques)` sin opciones. En niveles y en partidas con otras vidas no bastará: la pantalla tiene que exponer las opciones (por ejemplo en `data-opciones`).
- `src/logica/piezas.test.ts:81-86` exige un emoji por color. `tarjeta.test.ts:69-71` comprueba la fila de emojis. `simulacion.test.ts:57-64` llama a `jugar` con un número como tercer argumento.
- `scripts/duracion.test.ts:12` tiene objetivos de la v1 (30 a 90 s) y `scripts/duracion.ts:34` apunta a x = 0.
- Todas las pruebas doradas de simulación y secuencia (G4, previsto en el plan).

### Datos guardados

- Hoy solo existe `torre-diaria:resultado` con un día (`registro.ts:5,55-64`). El juego **no está desplegado** (`README.md:5`), así que esa clave solo existe en los navegadores de quien lo ha probado en local [comprobado en el README; supuesto que nadie más lo ha abierto].

### Integraciones y trabajos programados

- No hay ninguno nuevo en el código. H2 añade el primer flujo de GitHub Actions (hoy no existe `.github/`) [comprobado].
- El repositorio `aitorben07/Torre_Diaria` es **público** (`gh repo view`: `"visibility":"PUBLIC"`, consultado el 2026-11-06) y no tiene ejecuciones de Actions [comprobado].

---

## 2. Riesgos

### 2.1. Determinismo: el imán, el cementado y la retirada de piezas

- **El imán es determinista en el mismo motor** [comprobado en el código]. El objetivo sale de la posición de un cuerpo de planck, la misma en dos ejecuciones del mismo motor. Pero el plan no define «la pieza en pie más alta». Puede ser la de mayor `upperBound.y` del AABB, la de mayor centro, o la de un empate entre dos piezas a la misma altura. Sin una regla escrita, dos implementaciones razonables dan objetivos distintos. **Corrección:** usar el mayor `upperBound.y` del AABB, como `alturaTorre` en `simulacion.ts:263-267`, y en empate la última soltada.
- **Pantalla frente a Node (G3).** En la v1 los puntos coinciden siempre, pero la altura difiere en el último decimal en la mitad de las partidas, porque `Math.sin` y `Math.cos` de Chrome y de Node no dan lo mismo (`README.md:87`) [comprobado en el README]. En la v2 la calidad (perfecto, bueno o normal) depende de una comparación con 0,12 m. Un error de 1e-16 solo cambia el resultado si cae justo en el umbral, algo improbable [supuesto]. Lo peligroso son las partidas largas: la física es caótica y la diferencia crece con los pasos. La prueba G3 se mantiene estable si se juega como hoy (4 piezas centradas y las demás soltadas en el extremo, `e2e/partida.spec.ts:34`). No hay que prometer igualdad en partidas de 5 minutos.
- **El cementado con `setType("static")` se puede hacer, pero tiene un efecto secundario** [comprobado en `node_modules/planck/src/dynamics/Body.ts:399-444`]. Si el mundo está en mitad de un paso, la llamada no hace nada y lo ignora en silencio. Además destruye todos los contactos del cuerpo y pierde su «arranque en caliente», así que la pieza de encima puede dar un pequeño salto en el paso siguiente. Es determinista, pero puede desestabilizar torres que estaban quietas. **Corrección:** cementar solo en `colgarPieza()` (cuando todo está quieto o ha vencido `ESPERA_MAX`), nunca dentro de `asentando`, y solo cuerpos dormidos (`!isAwake()`). Hay que añadir un requisito que mida que la pieza de encima no se mueve más de 1 mm en los 60 pasos siguientes.
- **Retirada tras `MAX_PASOS_ASENTAR`.** Hoy, al vencer los 180 pasos, la partida acaba aunque algo siga moviéndose (`simulacion.ts:162`). En la v2 la partida sigue. Una pieza que resbala por el borde puede caer al agua después y contar como **otro** episodio, con otra vida perdida por el mismo derrumbe. **Corrección:** al cerrar el episodio, retirar también las piezas que estén fuera de la plataforma (`|x| > PLATAFORMA_MEDIO_ANCHO`) o que bajen a más de 0,5 m/s, y probarlo.
- **Secuencia de longitud variable.** Si B3 genera las piezas bajo demanda, las *k* primeras deben ser iguales sea cual sea el total generado. Hoy se cumple, porque cada pieza consume siempre el mismo número de valores de azar (`piezas.ts:76-81`). Las formas por tramos tienen que mantener esa propiedad, y hace falta una prueba que lo diga. El guardado compacto que propongo en 2.4 depende de ella.

### 2.2. Rendimiento en móvil

- **Física** [comprobado en `README.md:78`]: 0,2 a 0,5 ms por paso en Node con unas 40 piezas. En pantalla se da un paso por fotograma, así que en un móvil cuatro veces más lento serían unos 2 ms de un presupuesto de 16,7 ms [supuesto]. El cementado mantiene esa cifra plana. Hay riesgo de CPU, pero bajo.
- **Dibujo** [supuesto, sin medir]. Lo caro no es la trama de `createPattern` ni las 200 partículas. Lo caro sería:
  1. Cualquier `shadowBlur`, `ctx.filter` o `globalCompositeOperation` distinto de `source-over` en cada fotograma, como un grano de papel en multiplicar a pantalla completa.
  2. Dibujar las 250 piezas de una partida experta cuando solo se ven unas 20.
  3. Repintar a 2× de densidad de píxeles las tres capas de paralaje sin guardarlas en lienzos aparte.

  La v1 ya fija la convención de crear degradados solo al cambiar de tamaño (`dibujo.ts:61-77`). Falta convertirlo en requisito y añadir un recorte de lo que queda fuera de la vista.
- **A2 solo pone umbral en escritorio.** El usuario juega sobre todo en móvil (supuesto del plan) y la medición con la CPU 4 veces más lenta solo se anota. Propongo un umbral orientativo y una salida barata: bajar `RATIO_MAXIMO` (`dibujo.ts:25`) a 1,5 en táctil si no se llega. La ralentización por CDP no frena la GPU, así que esta medición no sustituye a un móvil real. Hay que declararlo «sin comprobar en dispositivo».
- **Sonido:** unos pocos osciladores por evento y un búfer de ruido creado una vez: barato [supuesto]. En iPhone, el interruptor de silencio apaga WebAudio. Es una limitación que hay que anotar, no un fallo.

### 2.3. Descarga, fuente, CSP y compartir

- **Peso de la fuente** [comprobado con `npm pack` de `@fontsource-variable/bricolage-grotesque@5.3.0`, licencia `OFL-1.1`]. Los archivos del eje de peso (`wght`) ocupan:

  | Archivo | Bytes |
  |---|---|
  | `latin-wght` | 41.344 |
  | `latin-ext-wght` | 18.668 |
  | `vietnamese-wght` | 8.608 |

  - `index.css` y `wght.css` declaran **los tres** subconjuntos. El paquete no trae un CSS por subconjunto, así que el plan («importar solo latino y latino extendido») **no se puede hacer con un `import`**. Con `index.css`, `dist/` lleva 68.620 B (≤ 80 KB, cumple G8). Con un `@font-face` propio para dos subconjuntos, 60.012 B.
  - Por `unicode-range`, un navegador en español solo descarga `latin`: 41 KB.
  - Rango de pesos: 200 a 800. El 800 de los títulos cabe justo.
  - **No uses** `standard.css`, que lleva todos los ejes: 131.548 B solo en latín.
  - Ningún `.woff2` baja de 4 KB, así que Vite no los mete como `data:`, que `font-src 'self'` bloquearía [comprobado en tamaño; el límite de 4 KB de Vite es supuesto].
- **Licencia OFL-1.1** [comprobado en el `LICENSE` del paquete]: no declara «Reserved Font Name», así que usar los subconjuntos de Fontsource no obliga a renombrar. Basta con acompañar el texto de la licencia en `dist/`, que ya prevé A1. G9 ya admite OFL.
- **Glifos que no tiene la fuente** [comprobado en `unicode-range`]: «★», «☆», «♥» y «→» no están en `latin` ni en `latin-ext`. Saldrían con la fuente del sistema y, según la plataforma, en estilo emoji. Eso choca con «sin emojis» y con un aspecto propio. Estrellas, corazones y monedas tienen que dibujarse como trazados en canvas o SVG, nunca como caracteres. La etiqueta del Anexo 1, 7.1 («NIVEL 12 ★★☆») debe cambiarse.
- **Fuente en canvas:** `document.fonts.ready` no fuerza la descarga de una cara que el DOM aún no ha pedido. Para el texto emergente (A3) y para la imagen (F1) hay que llamar a `document.fonts.load('800 64px "Bricolage Grotesque Variable"')` antes de dibujar.
- **CSP** [comprobado en `public/_headers:5` y en el diseño]:
  - `canvas.toBlob` y `URL.createObjectURL` con `<a download>` no necesitan ninguna directiva.
  - La vista previa en `<canvas>` evita `blob:` en `img-src`: bien pensado.
  - `elemento.style` desde TypeScript no lo bloquea `style-src`.
  - `Permissions-Policy` (`public/_headers:9`) no menciona `web-share`, que por defecto se permite en el propio origen.
  - El único cambio necesario es `font-src 'self'`.
- **Web Share con archivo** [supuesto, por la documentación de los navegadores]: `navigator.share` exige que el usuario acabe de tocar algo. Generar el PNG (con `fonts.load` y `toBlob`) **después** del toque puede agotar ese margen, sobre todo en Safari (`NotAllowedError`). **Corrección:** generar el `Blob` al pintar la pantalla de fin y compartir al momento al tocar. Si da `NotAllowedError`, ofrecer «Descargar imagen».
- **Formato de miles** [comprobado en Node 24]: `Intl.NumberFormat('es-ES').format(1240)` da `"1240"`, sin punto, porque en español solo se agrupa desde 5 cifras. El supuesto del plan («1.240») y los ejemplos del Anexo 1, 7.2 necesitan `useGrouping: "always"` o una función propia. Recomiendo la función propia: pura, probada con Vitest e igual en todos los motores.

### 2.4. Guardado v2 y migración

- **El requisito de C1 «365 días ≤ 100 KB» no se cumple con el formato propuesto** [cálculo]. Un elemento `{"forma":"cuadrado","color":3}` ocupa unos 29 B. Por 60 piezas son 1.740 B al día, más unos 100 B de los demás campos: ≈ 1,85 KB al día. En 365 días, ≈ 675 KB. Y con `ancho` y `alto` (B1, para la imagen), más. Cabe en `localStorage` (unos 5 MB por origen) pero rompe el requisito y hace lento cada `JSON.parse`. **Corrección:** guardar en cada día los **índices** de las piezas colocadas como tramos (`"0-11,13-40"`) y reconstruir forma, medidas y color con `generarSecuencia(semilla)`. La imagen de un día pasado no necesita las posiciones, porque la torre del Anexo 1, 7.1 se dibuja apilada. Así quedan unos 150 B al día y unos 55 KB al año.
- **La migración convierte puntos de la v1 con una regla inventada** (`puntos × 10`). Esas cifras no son comparables con las de la v2, porque no tienen perfectos, combos ni hitos, y pueden dar medalla y monedas sin haberlas ganado. Como la v1 no se desplegó, la migración solo afecta a quien la probó en local [comprobado en `README.md:5`]. **Recomendación:** no convertir. Marcar ese día como jugado (`reglas: 1`, sin medalla, sin monedas, sin racha) y no borrar la clave de la v1 (S20 se mantiene). Así se deshace con facilidad y se evitan datos falsos.
- **Dos pestañas:** con una sola clave y un `setItem` por guardado, la segunda pestaña que guarda pisa las monedas de la primera. **Corrección:** releer la clave justo antes de escribir y aplicar el cambio (sumar las monedas ganadas, añadir el día) sobre lo leído. Es el mismo caso que `e2e/pantallas.spec.ts:170` ya prueba en la v1.
- **Reversibilidad:** la clave nueva no toca la vieja, así que volver a `main` sigue leyendo `torre-diaria:resultado`. Se puede deshacer.

### 2.5. Experiencia: riesgos que el plan no cubre

- **Toque que reinicia sin querer:** el jugador está tocando rápido cuando cae la torre. Si «Otra vez» responde al primer toque o a Espacio en la pantalla de fin (B5), el toque siguiente reinicia y no ve el resultado. Hacen falta unos 700 ms en los que la pantalla de fin ignora toques y teclas.
- **Duración con personas:** en la v1, los jugadores simulados daban de 38 a 57 s y las partidas reales de 9 a 43 s (`README.md:83`, `docs/proceso/version-inicial/pruebas.md:95`) [comprobado]. Los perfiles de B4 sobrestiman la habilidad, así que el «novato ±180 ms» puede quedarse corto. S25 ya pide partidas a mano. Falta decir qué se hace si no cuadran.
- **Dos sistemas diarios:** el propio Anexo 1, 9 rechaza el calendario de entrada diaria porque «dos calendarios confunden». Las misiones diarias (C4) junto al reto diario plantean el mismo problema en una pantalla de fin que ya lleva puntos, monedas, récord, siguiente desbloqueo, Otra vez, Compartir y cuatro accesos.
- **Efectos repetidos en la tienda:** A3 da gratis chispas en el perfecto y confeti desde combo 3, y C3 vende «Confeti» (500) y «Chispas» (1.000) como efectos de aterrizaje. El jugador compraría algo que ya ve.
- **Retos diarios sin desbloqueos:** el usuario pidió «retos diarios con rachas y desbloqueos». En el plan, el reto diario solo da monedas y medalla. Todos los desbloqueos por progreso dependen de la altura en partida libre o de completar mundos de niveles. Ningún artículo se gana con la racha.

### 2.6. CI y pruebas largas

- **Pruebas que fallarán en Actions aunque el código esté bien** [supuesto, por cómo funcionan Playwright y los ejecutores compartidos]:
  - A2: umbrales de tiempo entre fotogramas en una máquina compartida.
  - F1: `toHaveScreenshot` con referencia hecha en Windows y comparada en Linux. Playwright guarda una referencia por sistema y la de Linux no existe.
- **Tiempo de los scripts de medición** [cálculo con 0,2 a 0,5 ms por paso, `README.md:78`]:

  | Script | Cálculo | Por vuelta |
  |---|---|---|
  | B4, experto (mediana de unos 8 min) | 28.800 pasos ≈ 6 a 14 s por partida × 30 días | 3 a 7 min |
  | B4, medio | 12.600 pasos ≈ 2,5 a 6,3 s × 30 | 1,3 a 3,2 min |
  | B4, novato | — | 0,6 a 1,6 min |
  | **B4, en total** | — | **5 a 12 min por cada ajuste de constantes** |
  | E2 con 30 niveles | 900 partidas de unos 4.500 pasos | **14 a 34 min** |
  | E2 con 10 niveles | — | 5 a 11 min |
  | `scripts/duracion.test.ts` en `npm test` (novato y medio, 3 días) | 11 a 29 s en este equipo | cumple ≤ 60 s, con poco margen en un ejecutor más lento |

---

## 3. Coste gratuito

| Recurso | Consumo | Cálculo | Queda |
|---|---|---|---|
| GitHub Actions (H2) | 0 min de la cuota | Repositorio público [comprobado con `gh repo view`]. Según la estrategia, «gratis en repos públicos». Estimación por ejecución [supuesto]: `npm ci` con caché 0,5 a 1 min, Chromium con dependencias del sistema 0,5 a 1,5 min, `check` 0,5 min, `test` 0,5 a 1 min, `build` 0,3 min, `e2e` en dos proyectos con 2 hilos 4 a 8 min (la v1 tardaba 2,1 min en local con 40 pruebas, `pruebas.md:15`; la v2 tendrá unas 2 o 3 veces más). **Total: 7 a 13 min por ejecución.** Si el repositorio fuera privado: unas 20 subidas al mes ≈ 140 a 260 min, más que los 92 a 244 min libres de la estrategia. Por eso hace falta la guarda | Los 92 a 244 min libres de la estrategia siguen intactos con la guarda de 5.H2 |
| Caché de Actions | ≈ 0,3 a 0,5 GB (npm y Chromium) [supuesto] | Límite de 10 GB por repositorio | > 9 GB |
| Cloudflare Pages | 0 en esta fase | No se despliega (fuera de alcance) | 500 compilaciones al mes |
| Supabase, D1, Workers, Resend, Expo | 0 | No se usan | Sin cambio |
| npm (fuente) | 0 € | Paquete OFL | — |
| Peso para el jugador | JS de la v1: 50,5 KB con gzip (`README.md:76`) más unos 35 a 60 KB [supuesto] ≈ 85 a 110 KB de 150. Fuente: 41 KB descargados, 68,6 KB en `dist/` de 80 | — | ≈ 40 a 65 KB de JS y 11 KB de fuente |
| Uso del plan de Claude | Alto: 28 tareas y varias vueltas de ajuste de constantes | — | Los recortes de 4 lo reducen |

**Bloqueantes de coste o de herramienta: ninguno.** Todo cabe gratis y usa las herramientas de la estrategia (Astro sin React ya está justificado en S13 y en D1 de la v1).

---

## 4. Cómo encajarlo mejor (recomendación)

1. **Reutilizar lo que ya funciona:**
   - El bucle de paso fijo (`bucle.ts`) y la API `paso()`/`soltar()`/`estado()` como frontera entre pantalla y lógica. Los eventos se añaden con `tomarEventos()` sin romperla.
   - La interfaz `Almacen` y el patrón «validar todo al leer y devolver `null` o los valores por defecto» de `registro.ts:17-52`.
   - Los degradados creados en `ajustar()`.
   - Los atributos `data-*` para las pruebas.
   - La comprobación de CSP con `page.route` (`e2e/csp.spec.ts:21`), que ya cubre la fuente si se le añade una comprobación de `font-src`.
2. **`jugar(semilla, toques, opciones?)`**, con `opciones` como objeto que admita también `maxPasos`. Hay que cambiar las tres llamadas de `simulacion.test.ts:57-64` en la misma tarea.
3. **Un controlador de flujo puro** (`src/juego/flujo.ts`: estados inicio, jugando, fin, retos, niveles y colección, y sus transiciones). Se crea en B5 y `principal.ts` solo conecta el DOM. Así G1 se prueba con Vitest, como pide el plan, y `principal.ts` no se convierte en un archivo de 1.000 líneas.
4. **Escritorio en 9:16 sin trabajo extra:** `Lienzo` ya centra x = 0 y escala por el lado limitante (`dibujo.ts:67,96`). Si el `<canvas>` ocupa todo el ancho de la ventana y el HUD y los paneles van en la columna de 9:16, el escenario se extiende solo a los lados.
5. **Iconos, estrellas y corazones como trazados**, nunca como glifos (2.3).
6. **Imagen generada al mostrar el fin** y compartida al tocar (2.3).
7. **Guardado compacto por índices y migración mínima** (2.4).
8. **Alcance recomendado para entregar antes**, sin perder nada de lo que pidió el usuario:
   - **Niveles: 10 en un mundo** (Puerto) en vez de 30 en tres. Se mantiene el sistema completo (tabla, objetivos, estrellas, mapa, validación). Los mundos 2 y 3 son añadir filas a la tabla en la fase siguiente. E2 baja de 14-34 min a 5-11 min por vuelta.
   - **Misiones diarias (C4): para la siguiente fase.** No las pidió el usuario y duplican el reto diario (2.5). C5 se simula sin ellas.
   - **Tienda: 6 temas** (son solo datos de color, baratos), **sin pestaña de efectos** (2.5) y **3 escenarios** (Puerto, Ciudad y Nubes) en vez de 4. Cada escenario lleva tres capas dibujadas a mano en código, que es lo más caro del arte.
   - **Desbloqueos por racha:** Ciudad se consigue con 25 m en libre **o una racha de 3 días**, y Nubes con 50 m **o una racha de 7**. Sustituye a «o mundo N completo» y cubre lo que el usuario pidió de «retos diarios con desbloqueos».
   - **Anuncios (G):** solo la interfaz, `anunciosNulos` y las llamadas. Sin botones recompensados ocultos en el DOM hasta que existan anuncios. El Anexo 2, 4 ya prohíbe «botones de anuncio que no hacen nada», y tenerlos ocultos solo añade marcado que mantener.
9. **Precios:** con los números del propio Anexo 1, el objetivo «el experto no completa el catálogo antes del día 7» **no se cumple**.
   - Con misiones: 25 min × ≈ 48 monedas/min + reto (≈ 170) + misiones (≈ 170) ≈ 1.540 al día, y 8.500 / 1.540 ≈ 5,5 días.
   - Sin efectos ni misiones: total comprable ≈ 7.000 (300 + 700 + 1.200 + 1.800 + 3.000).
     - Medio: ≈ 590 al día.
     - Experto: ≈ 1.376 al día, y llega en ≈ 5,1 días.
   - **Propuesta:** C5 parte de los precios ×1,4 salvo Madera, que queda en 300 para la primera compra del novato.
     - Total ≈ 9.680.
     - Medio: lo completa hacia el día 16 y tiene 3 artículos al día 7.
     - Experto: lo completa hacia el día 7.
     - Todo dentro de objetivo, con poco margen [cálculo].

---

## 5. Cambios al plan

Cada línea indica dónde va en `tareas.md`. Todas llevan la marca **[impacto]**.

### Requisitos globales

- **G6, añadir [impacto]:** «`e2e/compilacion.spec.ts:15` deja de prohibir `.woff2` (solo `.woff2` bajo `/_astro/`) y `e2e/csp.spec.ts` comprueba que la CSP servida contiene `font-src 'self'`».
- **G8, cambiar [impacto]:** «fuentes en `dist/` ≤ 80 KB (con `index.css`: 68.620 B, medido el 2026-11-06); descarga real en español ≤ 45 KB (solo el subconjunto latino)».
- **G11, nuevo [impacto]:** «Ningún icono (estrella, corazón, moneda, flecha) es un carácter de texto: se dibujan como trazados. Prueba: buscar `★☆♥→` en `src/` (no deben aparecer en textos de interfaz ni en la imagen)».

### Bloque B

- **B1, añadir [impacto]:**
  - «`jugar(semilla, toques, opciones?)` con `opciones.maxPasos`; se actualizan las llamadas de `simulacion.test.ts:57-64`».
  - «Al cerrar un episodio de caída se retiran también las piezas con `|x| > PLATAFORMA_MEDIO_ANCHO` o con velocidad de bajada > 0,5 m/s. Requisito: un derrumbe que sigue resbalando tras 180 pasos cuesta una sola vida (Vitest con semilla y toques fijados)».
  - «La pantalla expone las opciones de la partida en `data-opciones` para que G3 reproduzca niveles y vidas».
- **B2, añadir [impacto]:** «Objetivo = x de la pieza en pie con mayor `upperBound.y` del AABB; en empate, la última soltada. Requisito: Vitest con dos piezas a la misma altura».
- **B3, cambiar [impacto]:**
  - «El cementado se hace solo al colgar la pieza nueva y solo con cuerpos dormidos (`!isAwake()`); nunca durante `asentando`».
  - Requisito nuevo: «tras cementar, ninguna pieza dinámica en pie se desplaza más de 1 mm en los 60 pasos siguientes».
  - Requisito nuevo: «`generarSecuencia(s, n)` y `generarSecuencia(s, m)` coinciden en las `min(n, m)` primeras piezas».
  - Renombrar `triangulo` a `trapecio` **o** decir «trapecio» solo en los textos; elegir uno y anotarlo (recomiendo mantener `triangulo` en el código: cambiarlo rompe la validación de `registro.ts:34` sin ganar nada).
- **B4, añadir [impacto]:**
  - «Durante el ajuste se mide con 10 días por perfil; la medición final, con 30. Anotar el tiempo de cada ejecución».
  - «Si las partidas a mano del probador (S25) dan una mediana < 60 s, se añade un perfil "torpe" de ±250 ms y la tabla se cumple también para él». Motivo: en la v1 las personas duraron la mitad que los perfiles simulados (`README.md:83`).
- **B5, añadir [impacto]:**
  - «Crear `src/juego/flujo.ts` (máquina de estados pura) y probarla con Vitest; `principal.ts` solo conecta DOM y eventos».
  - Requisito: «durante los primeros 700 ms de la pantalla de fin se ignoran toques y teclas (Playwright: un toque a los 300 ms no reinicia; a los 800 ms, sí)».
  - «Actualizar favicon y `theme-color` (`index.astro:7-16,29`) a la paleta nueva» (o en A1).

### Bloque A

- **A1, cambiar [impacto]:**
  - «Importar `@fontsource-variable/bricolage-grotesque/index.css` (eje de peso, 3 subconjuntos, 68.620 B) **o** un `@font-face` propio con los dos `.woff2` de latín (60.012 B). No usar `standard.css` (131.548 B solo el latín) ni la API de fuentes de Astro».
  - «Copiar `LICENSE` del paquete (4.401 B) a `public/fuentes/OFL.txt`».
  - Añadir la función pura `formatearNumero` con punto de miles desde 4 cifras (no `Intl` por defecto: da «1240»), con Vitest.
- **A2, añadir [impacto]:**
  - Requisito: «en el camino por fotograma no hay `shadowBlur`, `filter` ni `globalCompositeOperation` distinto de `source-over`, ni se crean degradados o patrones (buscar el texto en `dibujar`)».
  - Requisito: «solo se dibujan las piezas cuya caja cae dentro de la vista (Vitest sobre la función de recorte)».
  - «Las capas de paralaje y el grano se pintan en lienzos aparte al cambiar de tamaño».
- **A2, cambiar [impacto]:**
  - El requisito de fotogramas en móvil pasa de «se anota» a «objetivo: p95 ≤ 33 ms con CPU ×4; si no se cumple, `RATIO_MAXIMO` = 1,5 en táctil y se vuelve a medir».
  - Las pruebas de fotogramas se saltan en CI (`process.env.CI`).
  - «Sin comprobar en un móvil real» va a la revisión final.
- **A3, añadir [impacto]:** «El texto emergente en canvas espera a `document.fonts.load(...)` de la cara usada; antes, no se dibuja texto (o se usa la de respaldo) sin errores».
- **A4, añadir [impacto]:** «Limitación anotada: en iPhone el interruptor de silencio apaga WebAudio».

### Bloque C

- **C1, cambiar [impacto]:**
  - `diarios[dia]` guarda `colocadas` como tramos de índices (`"0-11,13-40"`) en vez de `formas`; forma, medidas y color se reconstruyen con `generarSecuencia`. El requisito de 365 días ≤ 100 KB queda igual y ahora se puede cumplir.
  - **Migración:** el día de la v1 se marca como jugado con `reglas: 1`, sin puntos convertidos, sin medalla, sin monedas y sin racha; la clave v1 no se borra. Se quita el requisito de `puntos === 70`.
  - Añadir: «`guardar` relee la clave y aplica el cambio sobre lo leído; con dos pestañas que ganan 50 y 30 monedas, quedan +80 (Vitest con almacén compartido)».
- **C3, cambiar [impacto]:**
  - Catálogo: 6 temas, sin pestaña de efectos, y escenarios Puerto (gratis), Ciudad (25 m en libre **o** racha de 3) y Nubes (50 m **o** racha de 7). Espacio pasa a la siguiente fase; las estrellas del cielo desde 100 m siguen.
  - Requisito: «una racha de 3 desbloquea Ciudad aunque la altura récord sea < 25 m».
- **C4 [impacto]:** **aplazar a la siguiente fase** (las misiones duplican el reto diario, ver 2.5). Si el coordinador decide mantenerla, pasarla al final del bloque C para que no bloquee D.
- **C5, cambiar [impacto]:** «Plan simulado sin misiones; precios iniciales ×1,4 salvo Madera (300) y ajuste por medición». Motivo: con las cifras del Anexo 1, el experto completa el catálogo en ≈ 5,5 días (ver 4.9).

### Bloque D

- **D2, añadir [impacto]:** «La cabecera de Retos muestra el siguiente desbloqueo por racha («Racha de 3: Ciudad»)».

### Bloque E

- **E1 a E3, cambiar [impacto]:** **10 niveles en un mundo (Puerto)**. Se quitan las condiciones de 15 y 40 estrellas y el premio de mundo completo pasa a «los 10 niveles con 3 estrellas: +200».
  - Requisitos afectados: «Hay 10 niveles…».
  - Se elimina el requisito del nivel 11.
  - E2: el medio completa cada nivel en ≥ 6 de 10, salvo el 10 (jefe) en ≥ 4 de 10.
  - E3: el mapa centra el último nivel disponible (con progreso sembrado en el nivel 8).

### Bloque F

- **F1, cambiar [impacto]:**
  - Sustituir `toHaveScreenshot` por comprobaciones de píxeles concretos (fondo papel en una esquina, tinta en la cabecera, al menos N colores de la paleta en la zona de la torre), que valen en Windows y en Linux. La captura se guarda en `docs/proceso/segunda-version/capturas/` para el revisor.
  - Etiqueta de nivel sin «★★☆»: estrellas dibujadas.
  - Usar `document.fonts.load` en vez de `document.fonts.ready`.
- **F3, cambiar [impacto]:**
  - «El PNG se genera al mostrar la pantalla de fin (o al abrir la ficha del día) y se guarda en memoria; "Compartir" llama a `share` sin esperas».
  - Requisito: «un `share` que rechaza con `NotAllowedError` muestra "Descargar imagen" sin error».

### Bloque G

- **G1, cambiar [impacto]:** sin botones recompensados en el DOM en esta fase; solo la interfaz, `anunciosNulos` y las llamadas a `partidaEmpieza`, `partidaPara` e `intersticial`. Quitar la dependencia de E3 si se adelanta.

### Bloque H

- **H2, cambiar [impacto]:**
  - Disparadores: `push` a `main` y `pull_request`, **no** `push` a todas las ramas (evita ejecuciones dobles en cada PR).
  - `concurrency` con `cancel-in-progress: true` y `timeout-minutes: 20`.
  - **Guarda:** `if: ${{ !github.event.repository.private }}` en el trabajo, para que si el repositorio pasa a privado **no corra ni gaste cuota**.
  - Las pruebas de rendimiento (A2) y las que dependen del sistema se saltan con `CI`.
  - Requisito nuevo: «la duración medida de una ejecución (estimada en 7 a 13 min) se anota en el README y en la tabla "Reparto actual" de la estrategia como "CI de Torre Diaria: público, no cuenta"».
  - El cambio en la estrategia lo hace el documentador o el coordinador, no este análisis. Hoy la tabla de la estrategia no lista este proyecto.
- **H1, añadir [impacto]:** «README: limitaciones nuevas (iPhone en silencio sin sonido, fotogramas sin medir en móvil real, igualdad pantalla-Node solo en partidas cortas)».

### Decisiones nuevas para la revisión final

- **[impacto] I1.** Alcance recortado (10 niveles, sin misiones, sin efectos en la tienda, 3 escenarios, desbloqueos por racha). Se puede deshacer: son filas de tablas y una tarea aplazada.
- **[impacto] I2.** La migración v1 no convierte puntos.
- **[impacto] I3.** El CI se protege con la guarda de repositorio público.

### Contradicciones con la realidad

- **README frente a la realidad:** `README.md:58,65` dicen «sin CI» y «sin repositorio en GitHub», y el repositorio es público. Ya lo recoge S2 y lo corrige H1. Nada que añadir.
- **Estrategia:** no contradice nada del plan. Solo le falta la fila de este proyecto en «Reparto actual», con la corrección propuesta en H2.

---

**Riesgo grave ajeno al alcance:** ninguno detectado.
