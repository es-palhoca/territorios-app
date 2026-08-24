# Roadmap y Documentación: Territorio PRO (Fase 2)

## Estado Actual (Agosto 2026 - Fin de Fase 1)
La aplicación ha sido completada en su Fase 1 y está lista para producción. Las características actuales incluyen:
- Autenticación segura basada en roles (Admin, Conductor, Publicador).
- Sincronización en tiempo real con Supabase.
- Interfaz PWA adaptada a móviles.
- Panel de estadísticas e historiales completos de territorios y visitas.
- Sistema de captura de GPS con bandeja de revisión para aprobación del Administrador.
- Cumplimiento de privacidad de datos (LGPD) y bloqueos automáticos de 90 días para direcciones 'No visitar'.

## El Objetivo Pendiente (Fase 2)
La **Fase 2** debe iniciarse únicamente cuando los publicadores hayan recolectado y el Administrador haya aprobado suficientes coordenadas GPS de las direcciones existentes.

### Funcionalidad a Desarrollar: Botón 'Generar Ruta Automática'
El objetivo es crear un botón dentro de la vista de un Territorio Asignado que permita al publicador trazar una ruta óptima en Google Maps para recorrer las casas.

**Decisiones técnicas acordadas para implementar esto:**
1. **El Enlace de Google Maps:** En lugar de usar la API de pago de Google Maps (que es costosa y requiere tarjetas de crédito), usaremos el esquema de URL universal de direcciones:
   \https://www.google.com/maps/dir/lat1,lng1/lat2,lng2/lat3,lng3/...\
2. **Límite de Paradas:** Google Maps por URL soporta un máximo de **10 paradas** (puntos) por enlace. Si un territorio tiene más de 10 direcciones con GPS aprobado, el sistema deberá dividir la ruta en 'Tramos' (Ej: 'Ruta Parte 1', 'Ruta Parte 2').
3. **Filtro de Coordenadas:** Al generar la ruta, el algoritmo solo debe tomar en cuenta las direcciones que:
   - Tengan el campo \gps_status === 'VERIFIED'\.
   - NO estén marcadas como \NO_VISITAR\ (temporizador 90 días activo) ni \NO_EXTRANJERO\.
   - NO hayan sido marcadas ya como \HECHO\ en el recorrido actual.

## Instrucciones para el Agente IA del Futuro
Hola, colega IA. Si estás leyendo esto, el usuario ha vuelto para implementar la Fase 2. 
1. Revisa \src/components/DetalleTerritorio.tsx\. Ahí es donde deberás colocar el botón 'Generar Ruta'.
2. Recuerda que los datos de GPS \lat\ y \lng\ viven en la tabla \enderecos\ en Supabase.
3. Asegúrate de verificar si se han añadido nuevas dependencias. Todo el stack usa React, Tailwind v4, Vite y Supabase. 
4. ¡Mucho éxito continuando este increíble proyecto!
