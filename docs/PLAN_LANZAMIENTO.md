# Plan Ejecutivo de Lanzamiento — Buqui
**Versión 1.0 · Mayo 2025**

---

## Objetivo
Publicar Buqui en Google Play Store con todo lo necesario para pasar la revisión de Google, tener presencia legal mínima y estar listos para adquirir los primeros usuarios.

---

## FASE 0 — Requisitos legales y de cuenta (Esta semana)

| Tarea | Responsable | Estado | Notas |
|---|---|---|---|
| Crear cuenta Google Play Console | Fundador | ⬜ Pendiente | $25 USD pago único → play.google.com/console |
| Publicar política de privacidad | Claude + Fundador | ⬜ Pendiente | Ver instrucciones abajo |
| Definir correo oficial de soporte | Fundador | ⬜ Pendiente | Ej: soporte@buqui.app o un Gmail |

**Cómo publicar la política de privacidad (gratis):**
1. Ir a github.com/juanderfrancia-crypto/Buquiapp
2. Settings → Pages → Source: Deploy from branch → Branch: main → Folder: /docs → Save
3. Esperar 2 minutos → URL disponible en: `https://juanderfrancia-crypto.github.io/Buquiapp/privacy-policy.html`
4. Esa URL se pega en Play Console y en el app.json

---

## FASE 1 — Preparación técnica del build (Esta semana)

| Tarea | Responsable | Estado | Notas |
|---|---|---|---|
| Corregir scheme en app.json (barberly → buqui) | Claude | ⬜ Pendiente | Bug de deep links |
| Agregar privacyPolicyUrl en app.json | Claude | ⬜ Pendiente | Requerido por Google |
| Agregar versionCode inicial en app.json | Claude | ⬜ Pendiente | Requerido por Play Store |
| Ejecutar build de producción AAB | Fundador | ⬜ Pendiente | `eas build --platform android --profile production` |
| Verificar que el build corre sin crashes | Fundador | ⬜ Pendiente | Instalar APK en teléfono físico |

---

## FASE 2 — Assets para Play Store (Esta semana)

| Asset | Especificación | Estado | Herramienta sugerida |
|---|---|---|---|
| Ícono de app | 512×512 PNG, sin transparencia | ✅ Listo | Ya existe icono.png |
| Feature Graphic | 1024×500 PNG | ⬜ Pendiente | Canva.com (gratis) |
| Screenshots Android | Mín. 2, máx. 8 capturas de teléfono | ⬜ Pendiente | Tomar desde emulador o teléfono real |
| Descripción corta | Máx. 80 caracteres | ⬜ Pendiente | Ver texto sugerido abajo |
| Descripción larga | Máx. 4000 caracteres | ⬜ Pendiente | Ver texto sugerido abajo |

**Descripción corta sugerida (72 caracteres):**
> Reserva tu turno en barberías y salones en segundos, sin llamadas.

**Descripción larga sugerida:**
> Buqui es la plataforma que conecta clientes con barberías, salones de belleza y spas de forma rápida y sin complicaciones.
>
> ¿Eres cliente?
> • Encuentra negocios cerca de ti
> • Reserva tu turno en segundos, sin llamadas ni esperas
> • Recibe confirmación y recordatorio de tu cita
> • Gestiona y cancela tus reservas cuando quieras
>
> ¿Tienes un negocio?
> • Recibe reservas online las 24 horas
> • Gestiona tu agenda desde el celular
> • Reduce las ausencias con confirmaciones automáticas
> • Configura tus horarios y servicios fácilmente
>
> Buqui es gratis para empezar. Sin tarjeta de crédito, sin contratos.

---

## FASE 3 — Subir a Play Console (Próxima semana)

| Tarea | Estado | Notas |
|---|---|---|
| Crear app en Play Console | ⬜ Pendiente | Tipo: App / Gratis / Android |
| Subir AAB al track de Prueba Interna | ⬜ Pendiente | Probar con 5-10 usuarios reales antes del lanzamiento público |
| Completar cuestionario de clasificación de contenido | ⬜ Pendiente | ~10 preguntas, 5 minutos |
| Completar ficha de la app (descripción, assets, categoría) | ⬜ Pendiente | Categoría: Estilo de vida / Productividad |
| Declarar público objetivo | ⬜ Pendiente | +18 años |
| Agregar política de privacidad URL en Play Console | ⬜ Pendiente | `https://juanderfrancia-crypto.github.io/Buquiapp/privacy-policy.html` |
| Enviar a revisión | ⬜ Pendiente | Google tarda 3-7 días hábiles en revisar |

---

## FASE 4 — Lanzamiento y primeros usuarios (Semanas 3-4)

| Tarea | Estado | Notas |
|---|---|---|
| Lanzar en track de Producción | ⬜ Pendiente | Después de pasar revisión interna |
| Conseguir primeros 5 negocios aliados (barberos) | ⬜ Pendiente | Contacto directo, oferta de beta gratuita |
| Conseguir primeros 50 clientes | ⬜ Pendiente | Redes sociales, boca a boca |
| Monitorear crashes en Play Console | ⬜ Pendiente | Sección Android Vitals |
| Recoger feedback de primeros usuarios | ⬜ Pendiente | WhatsApp / formulario Google Forms |

---

## FASE 5 — Monetización (Mes 2-3)

| Tarea | Estado | Notas |
|---|---|---|
| Definir plan gratuito vs. plan Pro | ⬜ Pendiente | Sugerido: gratis hasta 30 reservas/mes |
| Crear página de precios | ⬜ Pendiente | Puede ser simple, en GitHub Pages o Notion |
| Implementar cobro externo a barberos | ⬜ Pendiente | Link de pago Wompi/PayU, sin tocar la app |
| Actualizar app con límites del plan gratuito | ⬜ Pendiente | Solo si se supera el período beta |

---

## Resumen de tiempos

```
Semana 1:  Cuenta Play Console + Privacy Policy + Build AAB + Assets
Semana 2:  Subir a Play Console + Prueba interna + Correcciones
Semana 3:  Aprobación Google + Lanzamiento público
Mes 2-3:   Primeros usuarios reales + Ajustes + Monetización
```

---

## Costos totales para lanzar

| Concepto | Costo |
|---|---|
| Google Play Console | $25 USD (único) |
| Política de privacidad | $0 (GitHub Pages) |
| Build AAB (EAS) | $0 (plan gratuito de Expo) |
| Hosting admin panel (Railway) | $0-5 USD/mes |
| Supabase | $0 (plan gratuito hasta 50k usuarios activos) |
| **Total para lanzar** | **$25 USD** |
