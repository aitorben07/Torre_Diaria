# Torre Diaria: diseño del juego

Principio que manda sobre todo lo demás (punto 6 del usuario): **un toque, se entiende al instante, y siempre hay un siguiente objetivo cerca** (un perfecto más, el récord, la misión, la medalla, la estrella, el siguiente desbloqueo).

## Qué cambió en la implementación (2026-11-09)

Este documento es el diseño de partida. La implementación de la rama `segunda-version` lo sigue salvo en lo siguiente; en cada apartado afectado hay una nota «Implementado». Los motivos están en `docs/proceso/segunda-version/` (`impacto.md`, `estado.md`) y los valores medidos, en el `README.md`.

- **Recorte aceptado (I1):** sin misiones diarias, sin efectos de aterrizaje en la tienda, 6 temas, 3 escenarios (sin Espacio), 10 niveles en un solo mundo (Puerto) en lugar de 30 y sin condiciones de estrellas ni de mundos para abrir niveles.
- **Constantes ajustadas para cumplir las duraciones (B4):** velocidad inicial 1,0 m/s, +0,03 por pieza, tope 3,4 m/s; perfecto a 0,16 m (0,08 m desde la pieza 100).
- **Cementado al soltar:** las piezas de abajo se vuelven piedra en el momento de soltar la siguiente, con como mucho 12 con física. Se sustituyó el requisito de 1 mm en 60 pasos por «menos de 1 cm en 30 pasos».
- **Niveles 4 y 6 a 10 más rápidos y largos** que el ejemplo de este documento, para que 3 estrellas exijan jugar bien (E2).
- **Medallas del reto diario:** bronce 550, plata 2.400, oro 4.000 puntos.
- **Precios de los temas ×1,4** salvo Madera (Caramelo 980, Neón 1.680, Mármol 2.520, Oro 4.200).
- **Otros:** comprar un tema lo equipa; los escenarios se desbloquean por mejor altura en libre o mejor racha; «Reto de hoy» visible en el HUD; enlace `?libre=` además de `?reto=`; el mar queda pegado al muelle sin paralaje.

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

- Formas físicas de la v1 (bloque, tablón, cuadrado, trapecio, columna; en el código el trapecio se llama `triangulo`); el dibujo redondea las esquinas un 8 % del lado menor (solo visual).
- Contorno de tinta de 0,035 m; sombra del mismo color oscurecido un 35 %, desplazada (0,06 m, −0,06 m).
- Trama de puntos de papel al 25 % en la mitad superior (patrón creado una vez con `createPattern`).
- Ojos en bloque y cuadrado: dos puntos de tinta de 0,07 m con brillo; parpadean cada 2 a 5 s (azar visual), se cierran contentos en un perfecto y se abren mucho si la pieza gira más de 10°.
- La pieza colgada pende de un gancho amarillo con cable de tinta; se inclina ±4° según la dirección del vaivén (visual).
- Base cementada: piezas en gris piedra `#B9AE98` con contorno, sin ojos (duermen).

### 1.4. Escenario y cámara

- Plataforma: muelle de madera con bolardos. Capas en paralaje: agua con ondas (0,1×), grúas y barcos en silueta azul riso al 40 % (0,3×), nubes de papel (0,6×).
- Al subir: el puerto queda abajo, aparecen gaviotas (10 a 30 m), globos (30 a 60 m), aviones de papel, y estrellas desde 100 m. Marcas de altura cada 5 m en el borde izquierdo («10 m»).
- Otros escenarios desbloqueables: Ciudad (azoteas y depósitos de agua), Nubes (islas flotantes) y Espacio (planetas de papel). Misma estructura de capas.
- *Implementado:* solo Puerto, Ciudad y Nubes; el Espacio no se hizo (I1). El agua va pegada al muelle, sin paralaje (0,1×).
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
- *Implementado:* perfecto a ≤ 0,16 m (`TOLERANCIA_PERFECTO`), ≤ 0,08 m desde la pieza 100; bueno a ≤ 0,35 m como se diseñó.
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
- *Implementado:* 1,0 m/s + 0,03 por pieza, tope 3,4 m/s (se alcanza en la pieza 80). Ajustado con `npm run medir:duracion` (B4) para las duraciones de 2.5.
- Formas: piezas 1 a 5, solo bloque, tablón y cuadrado. Desde la 6, trapecio y columna con probabilidad 10 % cada una, +3 puntos por tramo de 10 piezas, tope 25 % cada una.
- Desde la pieza 100, perfecto más estrecho.
- Cementado: como mucho 12 piezas dinámicas; las de abajo se vuelven piedra.
- *Implementado:* se cementa al soltar cada pieza nueva (las más antiguas que estén dormidas o quietas), no al asentarse; quedan como mucho 11 con física más la que cae.

### 2.5. Duración y puntuación esperadas por perfil (objetivos que se miden en B4)

| Perfil | Error de toque | Duración mediana | Piezas | Puntos aprox. | Monedas por partida |
|---|---|---|---|---|---|
| Novato | ±180 ms | 60 a 150 s | 20 a 45 | 300 a 800 | ~54 |
| Medio | ±90 ms | 2 a 5 min | 45 a 100 | 1.000 a 3.000 | ~125 |
| Experto | ±40 ms | 4 a 12 min | 100 a 250 | 4.000 a 12.000 | ~386 |

Cálculo de referencia: cada pieza tarda unos 2,5 a 3 s (llegar al centro, 3,4 m / velocidad, más quedarse quieta). Medio: 70 piezas ≈ 3,2 min; 70 × 10 + 25 perfectos con combo medio 2,4 (≈ 600) + 25 buenos (125) + 6 hitos (300) ≈ 1.700 puntos.

### 2.6. Superarse

Línea de récord en el escenario, «¡Nuevo récord!», medallas del día, estrellas de nivel, misiones del día (no implementadas, I1) y el siguiente desbloqueo a la vista en la pantalla de fin («Te faltan 120 monedas para Caramelo», «Llega a 25 m para la Ciudad»).

## 3. Modos

- **Libre (por defecto):** se abre la web y se juega. Sin límite de partidas. Cuenta para récord, monedas y desbloqueos por altura (misiones: no implementadas).
- **Retos diarios:** calendario con todos los días desde el día 1; un intento oficial por día (el de hoy suma racha; los atrasados solo medalla). Medallas bronce, plata y oro por puntos (*implementado:* 550, 2.400 y 4.000, medianas del novato y del medio y percentil 25 del experto, redondeadas hacia abajo). Racha con congeladores.
- **Niveles:** mapa de saga con 30 niveles, objetivos cortos y 3 estrellas. *Implementado:* 10 niveles del Puerto (I1); el siguiente se abre al completar el anterior.

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
| Misión diaria (no implementada, I1) | 30, 40 o 50; las tres: +50 |
| Estrella nueva de nivel | 20; mundo completo con 3 estrellas en todo: +200 (*implementado:* los 10 niveles con 3 estrellas, una vez) |

Partidas tipo: novato 35 piezas, 4 perfectos, 3 hitos = 35 + 4 + 15 = **54**; medio 70, 25, 6 = 70 + 25 + 30 = **125**; experto 180, 126, 16 = 180 + 126 + 80 = **386**. Unas 36 a 48 monedas por minuto en todos los perfiles: el tiempo jugado se premia parecido.

### 4.3. Misiones diarias (repertorio)

*No implementadas en la segunda versión (recorte I1, aplazadas).*

Haz N perfectos (5, 10, 15) · Combo de N (3, 5) · Llega a N m en una partida (10, 20, 30) · Coloca N piezas en total (50, 100) · Juega el reto de hoy · Gana un nivel · Consigue una estrella nueva · Supera tu récord. Tres al día, distintas, por semilla de la fecha.

### 4.4. En qué se gastan y ritmo

| Artículo | Tipo | Precio o condición |
|---|---|---|
| Riso | tema de piezas | gratis |
| Madera | tema | 300 |
| Caramelo | tema | 700 (*implementado:* 980) |
| Neón | tema | 1.200 (1.680) |
| Mármol | tema | 1.800 (2.520) |
| Oro | tema | 3.000 (4.200) |
| Polvo | efecto de aterrizaje | gratis (no implementado) |
| Confeti | efecto | 500 (no implementado) |
| Chispas | efecto | 1.000 (no implementado) |
| Puerto | escenario | gratis |
| Ciudad | escenario | 25 m en libre o mundo 1 completo (*implementado:* 25 m o racha de 3) |
| Nubes | escenario | 50 m o mundo 2 (50 m o racha de 7) |
| Espacio | escenario | 100 m o mundo 3 (no implementado) |
| Congelador de racha | consumible | 200 (máx. 2) |

Total comprable en el diseño: 8.500. *Implementado:* temas por 9.680 en total más el congelador. Plan de juego simulado (C5): novato 10 min al día (libre y reto), medio 15 min (libre, reto, misiones, niveles), experto 25 min. Objetivo: el novato compra Madera en ≤ 12 min de juego; el medio tiene 3 a 6 artículos el día 7 y todo entre los días 10 y 30. Ejemplo medio: 4 libres (500) + reto plata con racha 3 (90) + misiones (170) ≈ 760 al día → 8.500 en unos 11 días.

## 5. Desbloqueos

- Por monedas: temas y efectos.
- Por progreso: escenarios (altura o mundos), mundos de niveles (estrellas).
- Siempre a la vista el siguiente: la pantalla de fin muestra lo más cercano.

## 6. Niveles tipo saga

*Implementado:* solo el mundo 1, Puerto (10 niveles, el 10 es el jefe); los mundos 2 y 3 quedan para más adelante. Valores en `src/logica/niveles.ts`.

Diseño original: 30 niveles en 3 mundos de 10: **Puerto** (1-10, aprendizaje, lento), **Ciudad** (11-20, más rápido, columnas y trapecios), **Nubes** (21-30, rápido, piezas estrechas, retos de 1 vida). Nivel 10, 20 y 30: «jefe», más largo.

Tipos de objetivo: coloca N piezas · llega a N m · haz N perfectos · combo de N · consigue N puntos · llega a N m con como mucho M piezas · cualquiera de los anteriores con 1 o 2 vidas.

Ejemplo del mundo 1: 1) coloca 5 piezas; 2) llega a 3 m; 3) haz 2 perfectos; 4) coloca 10; 5) combo de 3; 6) 6 m con 2 vidas; 7) coloca 8 con 1 vida; 8) 400 puntos; 9) 8 m con como mucho 12 piezas; 10) 12 m con 2 vidas.

*Implementado (E2):* 1) 5 piezas; 2) 3 m; 3) 4 perfectos; 4) 12 piezas; 5) combo de 4; 6) 8 m con 2 vidas; 7) 12 piezas con 1 vida; 8) 600 puntos; 9) 10 m con como mucho 18 piezas; 10) 14 m con 2 vidas. Los niveles 3 y 5 piden más que el ejemplo porque con menos no había hueco entre los umbrales de 2 y 3 estrellas; del 4 en adelante la pieza empieza a 1,6-1,8 m/s. En el 8, ganar ya da 3 estrellas (los puntos son el objetivo).

Estrellas: 1 al cumplir; 2 con puntos ≥ P2; 3 con puntos ≥ P3 (medidos en E2 con `npm run medir:niveles`, redondeados a 50). Mundo 2 con 15 estrellas; mundo 3 con 40 (*no implementado:* no hay más mundos).

## 7. Compartir

### 7.1. Imagen (1080×1350)

Fondo de papel con grano y el escenario equipado en suave; arriba, «TORRE DIARIA» en 800 con sombra desplazada; una etiqueta con el modo («RETO #16 · 6 NOV», «PARTIDA LIBRE», «NIVEL 3» con las estrellas dibujadas al lado); en el centro, la torre dibujada con las formas, medidas y colores reales colocadas (hasta 40; luego «+N»), con ojos; los puntos en grande; una fila de datos (altura, perfectos, mejor combo, racha en el diario); abajo, «¿Me superas?» y el dominio. Nada de emojis.

### 7.2. Texto

- Diario: `Torre Diaria #16: 1.240 puntos, 18,4 m, racha de 5 días.` / `¿Me superas? https://<origen>/?reto=16.1240`
- Libre: `Torre Diaria: 2.310 puntos y 27,1 m en partida libre.` / `¿Me superas? https://<origen>/?libre=a1b2c3.2310`
- Nivel: `Torre Diaria: nivel 3 con 3 estrellas.` / `Juega en https://<origen>/`

## 8. Interfaz y flujo

Abrir → partida libre en marcha → fin (puntos, monedas, récord, siguiente desbloqueo, Otra vez, Compartir, barra con Retos, Niveles y Colección). El primer contacto no tiene menús.

## 9. Características de los juegos casuales con más descargas

| Característica | Veredicto | Motivo |
|---|---|---|
| Combos y recompensa por precisión | **Sí, ahora** | Es la maestría que pide el punto 2; un toque sigue bastando |
| Récord personal visible | **Sí, ahora** | Superarse sin servidor |
| Moneda blanda y tienda de aspectos | **Sí, ahora** | Desbloqueos con sentido, sin ventaja de juego |
| Desbloqueos por hitos | **Sí, ahora** | «Llegar a cierto punto desbloquea cosas» |
| Niveles tipo saga con estrellas | **Sí, ahora** (30; implementados 10) | Objetivos cortos y claros |
| Reto diario con calendario y racha | **Sí, ahora** | Hábito diario; ya existía la base |
| Misiones diarias | **Sí, ahora** (3 al día; aplazadas en la implementación) | Baratas, sin servidor, dan objetivos a corto plazo |
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

