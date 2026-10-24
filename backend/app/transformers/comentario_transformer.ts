import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comentario from '#models/comentario'

/**
 * Mantiene la forma que devolvía la API antes del refactor: las ocho columnas de la fila,
 * con sus nombres en snake_case. Eso incluye `autor_email` y `estado`, que no deberían salir
 * (#19 y #22 de la auditoría); quitarlos es otra tarea.
 */
export default class ComentarioTransformer extends BaseTransformer<Comentario> {
  toObject() {
    const comentario = this.resource
    return {
      id: comentario.id,
      post_id: comentario.postId,
      autor_nombre: comentario.autorNombre,
      autor_email: comentario.autorEmail,
      cuerpo: comentario.cuerpo,
      estado: comentario.estado,
      creado_en: comentario.creadoEn ? comentario.creadoEn.toFormat('yyyy-MM-dd HH:mm:ss') : null,
      padre_id: comentario.padreId,
    }
  }
}
