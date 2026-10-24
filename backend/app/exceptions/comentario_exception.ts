import { Exception } from '@adonisjs/core/exceptions'
import type { SimpleError } from '@vinejs/vine/types'

/**
 * Errores de los endpoints de comentarios. Conservan el status y la forma del cuerpo que la API
 * devolvía antes del refactor (son inconsistentes entre sí: ver #23 de la auditoría).
 * `app/exceptions/handler.ts` los convierte en respuesta.
 */
export default class ComentarioException extends Exception {
  static status = 400

  constructor(
    status: number,
    readonly cuerpo: Record<string, unknown>
  ) {
    super(String(Object.values(cuerpo)[0]), { status })
  }

  static postNoEncontrado() {
    return new this(404, { error: 'Post no encontrado' })
  }

  static comentarioNoEncontrado() {
    return new this(404, { error: 'Comentario no encontrado' })
  }

  static noPuedesBorrar() {
    return new this(403, { error: 'No puedes borrar este comentario' })
  }

  static noPuedesEditar() {
    return new this(403, { error: 'No puedes editar este comentario' })
  }

  /**
   * Traduce el primer error del validador a la respuesta que daba la ruta antigua.
   */
  static desdeValidacion(errores: SimpleError[], operacion: 'alta' | 'edicion') {
    if (operacion === 'edicion') {
      return new this(400, { error: 'Falta el cuerpo' })
    }

    const { field, rule } = errores[0]
    if (field === 'autor_nombre') {
      return new this(400, { error: 'El nombre es obligatorio' })
    }
    if (field === 'autor_email') {
      return rule === 'required'
        ? new this(422, { message: 'Falta el email' })
        : new this(400, { errores: ['email no válido'] })
    }
    return new this(200, { ok: false, motivo: 'comentario demasiado corto' })
  }
}
