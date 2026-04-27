# YAML CV Generator 🚀

Este proyecto es un generador automático de CV diseñado para perfiles técnicos. La idea central es separar la información (datos) de la presentación (diseño), utilizando **YAML** como fuente de verdad.

## 🎯 Objetivo del Proyecto
El sistema debe realizar las siguientes tareas:
1. **Lectura de Datos:** Procesar el archivo localizado en `/data/cv.yaml`.
2. **Renderizado:** Inyectar los datos en una plantilla HTML/CSS moderna y profesional.
3. **Exportación a PDF:** Generar un archivo PDF listo para descargar o imprimir, manteniendo la fidelidad del diseño.

## 🎨 Estilo y Formato
- **Estilo Requerido:** Estilo Harvard (Académico/Profesional).
- **Tipografía:** Serif (Times New Roman) o Sans-serif limpia (Arial/Helvetica).
- **Referencia Lógica:** Basado en la estructura de `yamlresume`, el script debe mapear los campos del YAML hacia una plantilla que respete márgenes amplios y títulos en mayúsculas/negrita.
- **Salida:** El renderizado final debe generar un PDF que parezca redactado en LaTeX o Word siguiendo el estándar de Harvard.

## 🛠️ Requerimientos Técnicos (Para la IA)
Si estás ayudándome a programar este proyecto, por favor ten en cuenta:
- **Lenguaje:** [Python o Node.js] (elige el mejor para el proyecto).
- **Conversión:** Utiliza librerías como `WeasyPrint` o `Playwright` para asegurar que el CSS se renderice correctamente en el PDF.
- **Formato:** El PDF debe tener tamaño A4, márgenes optimizados y ser "limpio" (minimalista).

## 📂 Estructura del Repositorio
- `/data/cv.yaml`: Información personal, formación en Sistemas, experiencia y skills.
- `/templates/`: Archivos HTML/CSS que definen el estilo visual.
- `/scripts/`: Código encargado de la lógica de transformación.

## 🚀 Cómo usar
1. Modifica tus datos en `data/cv.yaml`.
2. Ejecuta el script de generación.
3. Encuentra tu CV actualizado en la carpeta de salida.
