# Agustin Control

App local personalizada para Agustin: inicio motivador, trabajo, estudio, Proyecto Personal DGLAB, gimnasio, gastos, ingresos, ahorros e inversiones.

## Como abrirla

Opcion simple:

```bash
xdg-open /home/agustin/PERSONAL/proyectos/finanzas-jornada-local/index.html
```

Opcion con servidor local:

```bash
cd /home/agustin/PERSONAL/proyectos/finanzas-jornada-local
python3 -m http.server 8080
```

Despues entrar a `http://localhost:8080`.

## Datos

Los datos quedan guardados en el navegador con `localStorage`.

Usa el boton de descarga para exportar un backup JSON. Ese archivo sirve para restaurar la app en otro navegador o despues de limpiar datos.

## Cierre mensual

En el inicio podes elegir un mes y tocar `Exportar Excel`.

La app descarga un archivo `.xls` con hojas separadas:

- Resumen
- Trabajo
- Horas Extra
- Ingresos y gastos
- Estudio
- DGLAB
- Gimnasio
- Ahorros

Exportar el mes no borra los datos. Solo genera un archivo para guardar tu resumen.

## Recordatorios

En el inicio podes activar notificaciones del navegador para que la compu te recuerde anotar tus avances y movimientos.

Funcionan mientras la app esta abierta en el navegador. Para mejor resultado, abrila desde `http://localhost:8080` o el puerto local que estes usando.

## Recordatorio del sistema

Tambien quedo instalado un recordatorio local que arranca con tu sesion de Linux:

```text
/home/agustin/.config/autostart/agustin-control-recordatorios.desktop
```

Ese recordatorio no necesita que la app ya este abierta. Espera 2 minutos despues de iniciar sesion y despues recuerda cada 90 minutos, entre las 08:00 y las 23:00.

Si el entorno lo permite, la notificacion muestra un boton `Abrir app`. Si no aparece el boton, igual te avisa para que la abras.

Para abrirla manualmente:

```bash
/home/agustin/PERSONAL/proyectos/finanzas-jornada-local/abrir_agustin_control.sh
```

Para desactivar el recordatorio automatico, borra o mueve:

```text
/home/agustin/.config/autostart/agustin-control-recordatorios.desktop
```
