import vine from '@vinejs/vine'

/**
 * Alta de un comentario. Las reglas son las de la ruta antigua, a propósito: la auditoría
 * (#24, #26, #28) propone endurecerlas, pero eso es otra tarea.
 */
export const crearComentarioValidator = vine.create({
  autor_nombre: vine.string(),
  autor_email: vine.string().regex(/@/),
  cuerpo: vine.string().minLength(5),
  padre_id: vine.any().optional(),
})

/**
 * Edición del cuerpo de un comentario. No exige el mínimo de 5 caracteres (#27).
 */
export const editarComentarioValidator = vine.create({
  cuerpo: vine.string(),
})
