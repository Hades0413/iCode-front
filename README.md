# iCode-front

Frontend web de **Puente 18+** (Hackatón Niño San Borja 2026) — consume la
API de [iCode-back](../iCode-back). React + Vite + SWC + TypeScript.

## El flujo

El problema: un chico con una enfermedad crónica que se atiende en el INSN
cumple 18 años y el sistema pediátrico deja de atenderlo. Si nadie lo agarra
del otro lado, se cae.

Son **tres actores**, y quién hace qué es lo que define toda la app:

```
   INSN San Borja                posta del distrito              hospital de adultos
   (pediatría)                   (primer nivel)                  (donde se atiende)
        │                              │                                 │
        │ prepara el resumen           │ recibe el caso                  │
        │ clínico de 2 hojas           │ deriva al hospital              │ da la fecha
        │                              │ GESTIONA LA CITA                │
        ├──── al cumplir 18 ──────────▶│                                 │
        │     (a la posta más          ├────────── deriva ──────────────▶│
        │      cercana al domicilio)   │                                 │
        │                              │◀───────── cita ─────────────────┤
        │ ···· "no se olviden" ·······▶│                                 │
        │      (aviso, lo único que    │                                 │
        │       puede hacer)           ▼                                 │
        │                        esa cita es la que ve el paciente
        │                        y su padre o tutor en la app
```

**El especialista no agenda la cita, y tampoco habla con la posta.** Dentro
del INSN hay dos oficinas:

| Oficina | Qué hace |
| --- | --- |
| **Consultorio** (el especialista) | Prepara y **firma la historia clínica** de transferencia. Ve el tramo de la posta pero no lo toca: si algo está frenado, le reclama al área. |
| **Referencias y contrarreferencias** | **Avisa a la posta 2 meses antes** del cumpleaños para que vaya tramitando la cita, y cuando el paciente cumple 18 le manda la **carta de contrarreferencia** que devuelve el caso al primer nivel. |

Dos reglas de tiempo que ordenan todo:

- El aviso a la posta sale **2 meses antes**. Es solo un aviso: la cita se
  pide recién cuando el paciente cumple 18, así que antes de los 18 ningún
  paciente tiene fecha.
- La carta de contrarreferencia **no puede salir antes del cumpleaños**. Hasta
  ese día el paciente es del hospital de niños; mandarla antes lo devolvería
  a la posta mientras todavía se atiende aquí. La valida el servidor, no solo
  la pantalla.

Los estados del recorrido (`TransitionState` en
`domain/entities/patient.entity.ts`):

| Código | Etiqueta | Quién tiene el caso |
| --- | --- | --- |
| `PENDING` | Pendiente | INSN |
| `IN_PREPARATION` | En preparación | INSN (armando el resumen) |
| `REFERRED_TO_POST` | Derivado a la posta | la posta |
| `APPOINTMENT_IN_PROCESS` | Cita en gestión | la posta ya derivó, falta la fecha |
| `APPOINTMENT_GRANTED` | Cita otorgada | hospital de adultos |
| `FIRST_CARE_DONE` | Primera atención realizada | hospital de adultos |
| `LOST_TO_FOLLOW_UP` | Pérdida de seguimiento | nadie — se cayó |
| `READMITTED` | Reingreso | se lo recuperó |

## Arquitectura

Mismas capas que iCode-back, adaptadas a un SPA — cada una depende solo de
la de abajo, nunca al revés:

```
src/
  domain/          # Tipos puros de negocio + reglas, sin React ni axios
                     #   entities/  Patient, AuthenticatedUser
                     #   rules/     el puente (transition) y la cohorte
  application/      # Casos de uso (AuthService, PatientService) + "puertos"
                     # (interfaces) que infrastructure implementa —
                     # inversión de dependencias, igual que un service de
                     # Nest recibiendo sus repositorios inyectados
  infrastructure/    # Implementaciones concretas: axios (http/, con el
                     # backend simulado en http/mock/), localStorage
                     # (storage/), variables de entorno (config/)
  presentation/      # React: contextos, rutas, layouts, páginas, estilos
  common/            # Utilidades transversales (errores de API, fechas)
  composition-root.ts # Dónde se inyecta cada implementación
```

`application/ports/*.port.ts` son las interfaces (`AuthRepositoryPort`,
`PatientRepositoryPort`, `TokenStoragePort`); `infrastructure/repositories` e
`infrastructure/storage` las implementan. Los services de application nunca
importan axios ni localStorage directamente — así se pueden testear con
fakes. El "cableado" (qué implementación concreta usa cada puerto) pasa en un
solo lugar: `src/composition-root.ts`.

`domain/rules/` es la otra mitad del dominio: las reglas puras que el
prototipo de diseño tenía mezcladas con el HTML. Qué significa "requiere
acción", cuándo una fila es urgente, qué merece una alerta y en qué orden —
`transition.rules.ts` para un paciente, `cohort.rules.ts` para la lista
entera. Están afuera de los componentes porque son definiciones de negocio:
"sin resumen aprobado" tiene que significar lo mismo en la tabla, en el
contador del riel y en un reporte.

## Setup

```bash
pnpm install
cp .env.example .env.local   # y ajusta VITE_API_URL si iCode-back no corre en :3000
pnpm dev
```

Si todavía no tienes iCode-back levantado, agrega esto a `.env.local` y el
front arranca solo, con datos estáticos y sin pedir login:

```
VITE_USE_MOCK_DATA=1
VITE_DEMO_USER=admin
VITE_DEMO_PASSWORD=Passw0rd1!
```

Ver [Backend simulado](#backend-simulado) y [Modo prototipo](#modo-prototipo-entrar-sin-tipear-nada).

```bash
pnpm build      # typecheck + build de producción
pnpm lint
pnpm format     # Prettier sobre src/
pnpm preview    # sirve el build de producción localmente
```

O con `make` (`make help` lista todos los comandos):

```bash
make install
make dev
make build
```

## Docker

Mismo criterio que [iCode-back](../iCode-back#docker): un solo
`docker/Dockerfile` multi-stage, `docker-compose.override.yml` se suma
solo en dev, producción encadena `docker-compose.prod.yml` a mano. La
diferencia principal es que este proyecto no tiene base de datos ni
proceso propio en producción — el `target: runtime` del Dockerfile ya es
nginx sirviendo el build estático + TLS, sin un segundo contenedor de
reverse proxy delante.

```bash
make env-setup     # crea .env.dev y .env.prod desde .env.example

# desarrollo: Vite con hot-reload dentro del contenedor (bind mount, sin nginx/SSL)
make docker-up
make docker-logs

# producción: compila con VITE_API_URL de .env.prod y sirve con nginx (TLS + estáticos)
make docker-up-prod
```

Ojo con `VITE_API_URL` en producción: Vite la hornea en el bundle en
**build time**, no en runtime — cambiarla en `.env.prod` no tiene efecto
hasta correr `make docker-build-prod` de nuevo (ver
`docker-compose.prod.yml` y `.env.example`).

## Autenticación

Igual que documenta iCode-back: el login devuelve un **token opaco** (no
JWT) que se manda como `Authorization: Bearer <token>` en cada request
(ver `infrastructure/http/api-client.ts`). Se guarda en `localStorage` —
tradeoff consciente para un prototipo de hackatón (un despliegue real
debería usar una cookie `httpOnly` del lado del backend para no
exponerlo a un XSS).

Un `401` de cualquier endpoint (sesión revocada, expirada, o usuario
desactivado — ver `SessionAuthGuard` en iCode-back) dispara el evento
`icode:session-expired`, que `AuthProvider` escucha para cerrar la
sesión del lado del cliente sin esperar a la próxima navegación.

`ProtectedRoute` (`presentation/routes/`) es solo UX: redirige a
`/login` si no hay sesión, pero la autorización real siempre la decide
el servidor — la misma filosofía que el README de iCode-back sobre
`RoleMenu` (OWASP A01: Broken Access Control nunca se resuelve
ocultando algo en el cliente).

Usuarios de prueba: los mismos del seed de iCode-back (`admin` /
`Passw0rd1!`, entre otros — ver
[el README de iCode-back](../iCode-back/README.md#autenticación)).

### Modo prototipo: un login que se ve pero no pide cuenta

Con `VITE_DEMO_USER` y `VITE_DEMO_PASSWORD` en `.env.local`, la pantalla de
ingreso **viene con los datos puestos y no exige nada**: se entra con un
click. Es lo que quieres para mostrar el prototipo — el login sigue estando
(es parte del recorrido que se muestra) pero no es un obstáculo.

Decorativo **no** quiere decir falso, y la diferencia importa. El formulario
hace el mismo `POST /auth/login` que haría cualquier usuario, con esas
credenciales: se crea una sesión de verdad, se guarda un token opaco de
verdad, y `GET /auth/me` trae el perfil. Todo lo demás (el `Bearer` en cada
request, el `403` sin permiso, el `401` que dispara `icode:session-expired`)
funciona exactamente igual. Lo único que no pasa es que alguien escriba las
credenciales.

Detalles del comportamiento:

- Los campos arrancan con el usuario demo y **no son obligatorios**: entrar
  con los campos vacíos también funciona. Sin modo prototipo vuelven a ser
  `required` y no hay ningún atajo.
- Debajo del botón hay atajos para entrar como **`operador`** (no puede
  notificar a la posta: los botones desaparecen) o **`sinpermisos`** (recibe
  el `403` en la lista). Sirven para mostrar los permisos sin editar
  `.env.local`. Todos los usuarios del seed comparten la contraseña de prueba.
- `/login` redirige al tablero si ya hay sesión, así que recargar no te pide
  nada. Para volver a ver el formulario está **"Salir"** en el riel.
- La app **no** abre sesión sola al arrancar: entrar es un click, a propósito.
  Si prefieres saltear la pantalla del todo, se hace en una línea de
  `AuthProvider` — pero entonces el login deja de verse.

Nada de esto vive en el contexto de sesión: `AuthProvider` solo pregunta si
hay una sesión guardada, igual que contra el backend real. Que el formulario
venga lleno es asunto de la pantalla de login y de nadie más.

Igual que la flag del mock, estas dos variables quedan **comentadas** en
`.env.example`, y aquí importa más: Vite las hornea en el bundle en build
time, así que un build con esto puesto publica una contraseña dentro del
JavaScript. Van únicamente en `.env.local`.

## Pantallas

El diseño sale del prototipo navegable de la carpeta de diseño
(`puente-18.src.html`): un solo archivo con el sistema de diseño y las 5
vistas por rol. Lo que está construido aquí es la vista del **especialista**
del Hospital del Niño.

```
/login                  Ingreso (visual: no pide cuenta, ver Modo prototipo)

CONSULTORIO — el especialista de pediatría
/pacientes              Pacientes en tutela  ← el tablero
/pacientes/:id          Ficha: historia clínica de transferencia + recorrido
/seguimiento            Panel post-transición

REFERENCIAS Y CONTRARREFERENCIAS — la oficina que habla con la posta
/referencias            Por avisar a la posta (los que cumplen 18 en ≤ 2 meses)
/contrarreferencias     Las cartas de los que ya cumplieron 18

EL OTRO LADO — el paciente y quien lo acompaña (pensada para el celular)
/mi-recorrido           Su cita, su preparación, su tratamiento y a quién llamar
```

Qué ve cada usuario sale de sus permisos, no de una ruta fija: el riel se
arma con `visibleSections()` y `/` manda a cada uno a su bandeja
(`presentation/routes/workspace-sections.ts`). Los permisos son los mismos que
exige cada endpoint, así que esto no da acceso — evita ofrecer una pantalla
que el servidor va a contestar con `403`.

En el riel, abajo de todo, está el **cambio de perfil**: en modo prototipo
despliega los tres perfiles (especialista, referencias, coordinación) para
mirar el mismo paciente desde las dos oficinas sin cerrar sesión a mano.
Cambiar de perfil cierra la sesión y abre otra de verdad con ese usuario —los
permisos que llegan son los del servidor, no un modo de la pantalla—, y fuera
del modo prototipo el menú no existe.

**Ingreso** es dos paneles: a la izquierda la foto del **Puente Villena Rey de
Miraflores** —un puente real de Lima, que es literalmente lo que nombra el
producto— con la marca y el recorrido de los tres actores encima; a la derecha
la elección de perfil y el formulario. El degradado sobre la foto va de teal a
índigo, los dos lados del puente y los mismos tonos del riel, y no es solo
estética: es lo que le da al texto blanco el contraste para leerse sobre un
cielo claro.

La foto es de Avodrocc ([Miraflores — Puente Villena, Lima,
Perú](https://commons.wikimedia.org/wiki/File:Miraflores_-_Puente_Villena_(Lima,_Peru).jpg),
CC BY 2.0), redimensionada a 1400 px y comprimida a 333 KB. Vive en
`src/assets/` y no en `public/` para que Vite le ponga hash y la cachee sin
límite. El crédito está en el pie del panel, como pide la licencia.

`ClinicLayout` (`presentation/layouts/`) es el marco del resto: el riel
oscuro de la izquierda más la pantalla activa. El `data-role="esp"` no es
decorativo — de ahí sale `--acc` (el teal de pediatría) para todo lo que esté
adentro; el mismo envoltorio con `data-role="adu"` queda índigo para cuando se
haga la vista del hospital receptor.

**Pacientes en tutela** es el tablero, y tiene dos trabajos: que la historia
clínica esté firmada antes de los 18, y que la posta no se duerma con la cita.
De arriba abajo: los cortes con sus conteos, la búsqueda y la tabla. El
trabajo se hace desde la fila —generar el borrador, abrirlo para firmarlo,
avisarle a la posta—, sin un resumen de tareas aparte que repita lo que la
tabla ya muestra.

Los **KPIs son botones**: cada uno filtra la lista por exactamente lo que
mide. Un KPI que no lleva a ninguna parte es un adorno — si el número te
alarma, quieres ver los casos, no leer otro número. El medidor de abajo muestra
la proporción sobre la cohorte, así "4" se lee distinto si son 4 de 12 o 4 de
400. Los cinco salen de `cohortKpis()` en `domain/rules/cohort.rules.ts`, cada
uno atado a un `CohortFilterKey` real.

El tablero **abre filtrado por lo que falta hacer**: `/pacientes` sin query
muestra a los que todavía no tienen la historia clínica firmada
(`DEFAULT_COHORT_FILTER` en `cohort.rules.ts`), no la cohorte entera. Antes de
los 18 ese es el trabajo del especialista; los demás siguen a un click en
"Todos", porque filtrar por defecto es ordenar el trabajo, no esconder
pacientes.

Lo que acota la lista son tres cosas distintas y por eso conviven en una
línea, arriba de la tabla:

- **Los cortes** (Pacientes · Cumplen 18 pronto · Sin historia clínica), que
  son el trabajo. No están ni "esperando a la posta" ni "ya tienen cita": son
  estados del caso, no trabajo del especialista, y se leen en la columna de
  estado de cada fila.
- **La especialidad**, que en un hospital con ocho servicios es la diferencia
  entre 50 filas y 6.
- **El DNI**, para cuando ya sabes a quién buscas. La búsqueda es por
  documento y no por texto libre sobre media ficha: el especialista llega con
  el DNI en la mano (se lo dijo la madre, está en la orden), y una búsqueda
  que además matchea diagnósticos devuelve nueve filas cuando querías una. Se
  acepta prefijo y se ignoran los puntos, y el DNI se muestra en la fila —
  buscar por un dato que la lista no enseña no deja confirmar nada.

Todo eso vive en **la barra de filtros y en ningún otro lado**: el riel tiene
una sola entrada ("Pacientes") porque repetir ahí los mismos cortes era el
mismo control dos veces, lejos de la tabla donde se ve el resultado.

La tabla pagina **de 10 en 10** y el pie dice en qué parte del total estás
("11–20 de 22 pacientes"), no solo qué página: con la cohorte entera de un
especialista, "página 2 de 3" no te dice cuántos te faltan mirar. La página
también viaja en la URL (`?pagina=2`) y vuelve a 1 en cuanto cambias un
corte.

El filtro, la búsqueda y el orden viven en la URL
(`/pacientes?filtro=posta&q=comas&orden=estado`) y no en `useState`: así se
puede llegar a un corte con un link normal y compartirlo. La cohorte de un
especialista son decenas de pacientes, así que se filtra en el cliente — el
día que crezca, las mismas funciones de `domain/rules/cohort.rules.ts` se
mueven a query params sin tocar la UI.

La columna de estado lleva debajo **dónde está el caso** (la posta o el
hospital, y cuántos días lleva ahí). Con este flujo el estado solo no alcanza:
"Derivado a la posta" sin decir qué posta no le sirve a nadie.

La acción de **notificar a la posta** está en la fila, no escondida en la
ficha: es la única cosa que el especialista puede hacer con una cita. Solo
aparece si el caso está esperando a una posta **y** el usuario tiene
`HEALTH_POST_NOTIFY` — y el servidor lo valida igual (403), porque esconder un
botón nunca es la autorización.

El contador del riel, los cortes y la tabla salen de la misma cohorte
(`CohortProvider` envuelve al layout, no a la página): si dijeran números
distintos, uno de los dos estaría mintiendo. Después de un aviso solo se
reemplaza esa fila (`applyPatient`), no se recarga la cohorte entera.

### La app del paciente y de quien lo acompaña

`/mi-recorrido` es **la misma pantalla para los dos**, con el marco aparte
(`JourneyLayout`, sin riel ni cohorte) porque no son personal del hospital.
Se lee de arriba abajo: la cita primero —que es lo único que importa si abre
con apuro—, después lo que tiene que preparar, su tratamiento, a quién llamar
y las dudas de siempre.

Lo que **comparten**: la cita con su dirección y a qué hora estar ahí, el
diagnóstico explicado en castellano llano (con el nombre técnico abajo, chico,
para cuando tenga que decirlo en una ventanilla), los medicamentos con para
qué son, las alergias en su propio bloque rojo, los teléfonos y la guía.

Lo que los **separa** son dos cosas, y las dos salen del `viewer` que manda el
servidor (`JourneyViewer` en `domain/entities/journey.entity.ts`):

| | El paciente (`OWNER`) | Quien acompaña (`GUARDIAN`) |
| --- | --- | --- |
| Su preparación | **La marca** | La ve, no la toca |
| Recordatorios | Los recibe y los descarta | **Se los manda** |
| Quién ve su información | **Decide** (puede quitar el acceso) | — |
| Sin acceso | — | Pantalla que se lo explica |

Que el padre no pueda tachar el checklist no es un detalle de permisos: si
pudiera, la lista dejaría de decir lo que el chico sabe hacer y pasaría a
decir lo que el padre cree que sabe — y la lista existe para lo primero. Lo
mismo con el acceso: a los 18 la información es del paciente, y "suya" incluye
poder decidir que su madre deje de verla. Por eso el servidor contesta ese
caso con **200 y `access: 'REVOKED'`**, no con un 403: no es un error, es un
estado legítimo que merece una pantalla amable en vez de un "algo salió mal".

**Está escrita para el celular**, que es donde se abre: una columna, todo lo
tocable de 48 px o más, texto base de 16 px (menos que eso y iOS hace zoom
solo al enfocar un campo), `env(safe-area-*)` para el notch, los teléfonos
como enlaces `tel:` y `<details>` nativo para las preguntas. En pantallas
grandes no se estira: se centra, y recién a partir de 980 px se acomoda en dos
columnas.

### El área de Referencias y Contrarreferencias

Sus dos pantallas son sus dos actos, separados por el cumpleaños:

**`/referencias` — por avisar a la posta.** La bandeja trae solo a los que
cumplen 18 en 2 meses o menos, y el corte lo hace el servidor
(`GET /referrals/notice-queue`): es su propia pregunta, no un filtro sobre la
cohorte del médico que el cliente podría aflojar. Cada fila dice qué posta le
toca por domicilio, hace cuántos días se le avisó y si el especialista ya vino
a reclamar.

**`/contrarreferencias` — las cartas.** Una tarjeta por paciente que ya cumplió
18. La carta se redacta en el sistema externo y se **sube aquí** (PDF o Word,
hasta 10 MB); subirla no es enviarla, y esa diferencia es del proceso: el
documento existe desde el cumpleaños pero recién sale cuando alguien lo manda.
El envío es un sub-recurso propio (`POST .../counter-referral/delivery`) porque
es un acto con autor y fecha, y el único punto que no se puede deshacer.

Del archivo, el mock guarda el registro y no el contenido (nombre, formato,
tamaño, quién lo subió): contra iCode-back el request es el mismo multipart,
pero el PDF tiene que terminar en el storage del hospital, no en un
`localStorage`.

**Del lado del médico** no hay ningún botón que hable con la posta: hay una
columna que muestra si el área avisó y desde cuándo, y un botón **"Avisar al
área"** cuando falta el aviso o la carta. La razón del reclamo no la elige la
UI —sale de lo que efectivamente está faltando (`pendingReferralAction`)— para
que el registro no pueda decir algo distinto de lo que muestra el tablero. Un
solo canal hacia la posta: dos orígenes de aviso es la forma más rápida de que
la posta deje de leerlos.

### La historia clínica de transferencia: borrador con IA, firma del médico

Antes de los 18, un paciente en el tablero tiene **información pero no una
historia clínica firmada**. Armarla es el otro trabajo del especialista, y la
columna **Resumen** lo muestra en un número y un escalón:

| | Qué pasó | Qué hacer |
| --- | --- | --- |
| `0 %` Sin generar | No hay nada escrito | **Generar con IA** (en la fila o en la ficha) |
| `43 %` En preparación | El borrador está a medias | Completar los bloques que faltan |
| `85 %` Revisión | El borrador está completo | Revisarlo, corregirlo y **firmarlo** |
| `100 %` Validado | Firmado por un médico | Nada: ya puede viajar con el paciente |

El 15 % que le falta a un borrador completo **es la firma**. Que un texto
generado por un modelo se muestre al 100 % antes de que alguien lo lea es
justamente lo que no queremos: el número sale de `summaryProgress()` en
`domain/rules/clinical-summary.rules.ts` y lo calcula el servidor sobre el
documento, así que la lista y la ficha no pueden decir cosas distintas.

El flujo entero vive en la ficha (`ClinicalSummaryPanel`):

```
sin generar → [Generar con IA] → borrador → revisar / corregir → [Firmar] → validado
```

Cuatro decisiones que no son de diseño sino de seguridad clínica:

- **La IA propone, el médico dispone.** Generar deja el documento en `DRAFT` y
  no hay ningún camino en el front que genere y firme de golpe. Firmar es un
  sub-recurso propio (`POST .../clinical-summary/approval`), con el autor y la
  fecha que pone el servidor a partir de la sesión — no un
  `PATCH { status: 'APPROVED' }` que cualquiera podría escribir de paso.
- **Un borrador nunca se disfraza de documento**: lleva su aviso arriba, el
  porcentaje no llega a 100 y las dudas que el generador no pudo resolver van
  **antes** del texto, no al final. Un bloque sin escribir se muestra vacío y
  rayado, no relleno con texto plausible.
- **Firmar pide confirmación con el nombre de quien firma.** Es irreversible y
  es lo que convierte texto propuesto en un documento que otro médico va a
  usar para atender a esta persona.
- **Volver a generar solo si nadie lo editó**: pisar las correcciones de un
  médico con una tirada nueva del modelo sería perder trabajo sin avisar. Y si
  el guardado falla, el panel se queda en modo edición con lo que escribió — un
  error de red no le borra las correcciones.

Generar sale de la fila con un click; **revisar y firmar no**: para eso hay
que abrir la ficha y leer. Es la asimetría del proceso, y la UI la respeta en
vez de esconderla detrás de un botón que firme de a varios.

Hoy el generador es una simulación local con plantillas por especialidad
(`infrastructure/http/mock/clinical-summaries.data.ts`), no un modelo. Cuando
exista iCode-back, esto lo reemplaza un endpoint que llama al modelo **del
lado del servidor**: la historia clínica no puede salir del hospital hacia un
proveedor desde el navegador de un médico, y el prompt, el modelo y su versión
tienen que quedar auditados junto al documento.

### Sobre el diseño

Dos cambios pedidos sobre el prototipo original, los dos hechos con tokens y
no a mano archivo por archivo:

- **Tipografía más grande.** El prototipo buscaba densidad máxima (9.5–13.5px)
  y se leía chico. Ahora todo sale de los tokens `--t-*` en `clinic.css`
  (`--t-micro` a `--t-page`), así que la escala se sube o baja de un lugar.
- **Menos plano.** Elevación real en lo accionable (KPIs y botones que se
  levantan al pasar el mouse), fondos por capas en vez de todo blanco, banda
  con degradado detrás del título, barrita de acento en el ítem activo del
  riel y en los títulos de sección, filete de urgencia que engorda al pasar
  por la fila, números de KPI que cuentan al aparecer (`useCountUp`, portado
  del prototipo) y toasts para confirmar acciones.

Todo respeta `prefers-reduced-motion`: si el sistema pide menos movimiento,
`useCountUp` no anima — muestra el valor final directamente.

Los estilos están en `presentation/styles/`, en tres archivos con un solo
sistema para todo el producto:

```
design-system.css   tokens (:root) + resets + primitivas: botones, pills,
                    chips, formularios, avisos, toasts, utilidades
clinic.css          lo propio del escritorio: riel, KPIs, filtros, tabla
auth.css            lo propio del ingreso
```

Los **tokens van en `:root`** para que el `<body>` también los pueda usar; los
**resets van scopeados en `.p18`**, el envoltorio que cada pantalla se pone.
Antes el login tenía su propia paleta y sus propios resets globales en
`index.css` y los dos sistemas se pisaban — de ahí venía el scope. Ahora las
dos pantallas usan el mismo sistema, `index.css` quedó en un reset mínimo del
documento, y el envoltorio existe para no imponerle nada a lo que esté afuera.

## Backend simulado

Con `VITE_USE_MOCK_DATA=1` en `.env.local`, el front corre sin iCode-back:
ningún request sale a la red, los contesta un backend de mentira que vive
en `infrastructure/http/mock/`.

Lo importante es **dónde** está el engaño: en el _adapter_ de axios, que es
la pieza que hace el viaje a la red. Todo lo de arriba corre exactamente
igual que contra la API real — los repositorios siguen llamando
`apiClient.post('/auth/login')`, los interceptores siguen poniendo el
`Bearer`, un `401` sigue llegando como `AxiosError` y sigue disparando
`icode:session-expired`. Por eso no hay un "repositorio falso": el código
que pruebas en dev es el mismo que va a correr en producción, y enchufar
iCode-back es borrar una variable de entorno, no cambiar código.

```
infrastructure/http/mock/
  mock-http.ts        # el contrato: MockRequest -> { status, data }
  mock-adapter.ts     # traduce ese contrato a lo que axios espera, y resuelve
                      #   rutas con params (/patients/:patientId/reminders)
  mock-guards.ts      # requireSession / requirePermission (espejo de SessionAuthGuard)
  mock-database.ts    # usuarios y sesiones (las "tablas" del servidor falso)
  auth.handlers.ts    # POST /auth/login, POST /auth/logout, GET /auth/me
  referrals.data.ts   # avisos a la posta, reclamos del médico y cartas
  referrals.handlers.ts # las 2 bandejas del área + avisar / subir / enviar
  patients.data.ts    # la cohorte (~50 casos) + el store de avisos a la posta
  patients.handlers.ts # GET /patients, POST /patients/:patientId/reminders
  clinical-summaries.data.ts     # el store de las 2 hojas + el generador que hace de IA
  clinical-summaries.handlers.ts # GET/POST/PUT .../clinical-summary y .../approval
  mock-routes.ts      # tabla de rutas, como los controllers de un módulo de Nest
```

Para sumar un endpoint: crea `<dominio>.handlers.ts` al lado, exporta su
lista de `MockRoute` y agrégala en `mock-routes.ts`. Nada más del front se
entera. Ojo con una cosa al escribirlo: los handlers no deben ejecutar nada
al cargarse el módulo (nada de `const h = unWrapper(...)` en el tope) — está
explicado en `mock-guards.ts` y en el punto del bundle, más abajo.

Lo que el mock imita a propósito, para no tener sorpresas después:

- Status y bodies de error con la forma de `AllExceptionsFilter`
  (`statusCode`, `message`, `timestamp`, `path`) — es lo que
  `getApiErrorMessage()` sabe leer.
- Tokens **opacos** y aleatorios, validados en cada request (espejo de
  `SessionAuthGuard`): un token vencido, revocado por logout o de un
  usuario desactivado devuelve `401`, así el camino de sesión expirada se
  puede probar de verdad.
- **Permisos de verdad**: `GET /patients` exige `PATIENTS_READ`,
  `POST /patients/:id/reminders` exige `HEALTH_POST_NOTIFY` y todo lo que
  escribe la historia clínica (generarla, corregirla, **firmarla**) exige
  `PATIENTS_WRITE`; sin ellos contesta `403`. La diferencia con el `401` importa — uno es "no sé quién eres", el otro
  "sé quién eres y no te toca" — y la pantalla muestra cada caso distinto.
  Esconder el botón nunca es la autorización (OWASP A01).
- **Precondiciones de negocio**: avisarle a una posta que ya consiguió la cita,
  o a un caso que todavía no salió del INSN, es un `409` y no un éxito
  silencioso. El dominio lo chequea antes de salir a la red
  (`NoHealthPostToRemindError`) y el servidor lo valida igual, por si alguien
  saltea el service.
- Sesiones persistidas en `localStorage` (`icode.mock.sessions`, la "tabla
  sessions" del servidor falso, aparte del token del usuario): un refresh
  no te desloguea, igual que contra el backend real. Los avisos a la posta
  (`icode.mock.reminders`) y las historias clínicas que se generen o firmen
  en la demo (`icode.mock.clinical-summaries`) también — borra esas claves
  para volver al estado inicial.
- ~350 ms de latencia, para que los estados de carga se vean — y ~1,4 s la
  generación del borrador, porque un modelo escribiendo 2 hojas no contesta en
  350 ms y ese estado también hay que poder probarlo.
- `password` e `isActive` no salen nunca en una respuesta.

Usuarios del mock (todos con password `Passw0rd1!`):

| Usuario | Para qué sirve |
| --- | --- |
| `admin` | Todos los permisos — es el del modo prototipo, ve las dos oficinas |
| `medico` | El especialista: firma la historia clínica y le reclama al área. No puede avisarle a la posta |
| `referencias` | El área: avisa a la posta y maneja las cartas. No puede firmar historias clínicas |
| `paciente` | El otro lado: ve su recorrido, marca su preparación y decide quién lo ve |
| `tutor` | Acompaña al paciente: ve lo mismo y puede recordarle, mientras él le dé acceso |
| `operador` | `PATIENTS_READ` + `REPORTS_READ`: ve el tablero pero no puede notificar a la posta (los botones no aparecen) |
| `sinpermisos` | Loguea bien y recibe `403` en la lista — para ver ese estado |
| `inactivo` | Siempre `401` |

El catálogo de permisos vive en `domain/rules/permissions.ts` (no en el mock):
lo consultan igual el servidor simulado, para contestar `403`, y la UI, para no
ofrecer una acción que va a fallar. Los códigos son inventados — hay un
`TODO(back)` ahí y otro en `patients.data.ts` para sincronizarlos con el seed
real de iCode-back.

Tres cosas sobre la flag:

- Queda **comentada** en `.env.example` porque `make env-setup` copia ese
  archivo a `.env.prod`, y un build de producción con la flag activada se
  autenticaría solo contra usuarios inventados. Descoméntala solo en
  `.env.local`.
- Vite lee `.env.local` también en `pnpm build`, no solo en `pnpm dev`.
- Con la flag desactivada, el mock **no entra al build**: ni un byte, ni un chunk
  aparte (verificado buscando la password del seed en `dist/`). Para que eso
  funcione hicieron falta dos cosas, las dos explicadas en
  `infrastructure/http/api-client.ts`: la flag se lee ahí con
  `import.meta.env` (única excepción a leerlas todas en `config/env.ts`) y el
  `import` del mock es dinámico. Con cualquiera de las dos al revés, rolldown
  se lleva la carpeta `mock/` puesta aunque la rama esté muerta.

## Contributing

Flujo de ramas, PRs y convención de commits en [CONTRIBUTING.md](CONTRIBUTING.md)
— es el mismo para este repo y para iCode-back.

## License

[MIT](LICENSE)
