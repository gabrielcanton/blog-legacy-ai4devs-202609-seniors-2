import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ComentarioService } from '#services/comentario_service'
import ComentarioTransformer from '#transformers/comentario_transformer'
import { crearComentarioValidator, editarComentarioValidator } from '#validators/comentario'

@inject()
export default class ComentariosController {
  constructor(protected comentarios: ComentarioService) {}

  /**
   * El 404 del post va antes que la validación: es el orden que tenía la ruta antigua.
   */
  async store({ params, request, response, serialize }: HttpContext) {
    const post = await this.comentarios.postPublicado(params.slug)
    const datos = await request.validateUsing(crearComentarioValidator)

    const comentario = await this.comentarios.crear(post, datos)

    response.status(201)
    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(comentario) })
  }

  /**
   * Orden de las comprobaciones, igual que antes: 404, luego 403, luego 400 del cuerpo.
   */
  async update({ params, request, serialize }: HttpContext) {
    const comentario = await this.comentarios.encontrar(params.id)
    this.comentarios.autorizarEdicion(comentario, request.input('autor_email', ''))
    const { cuerpo } = await request.validateUsing(editarComentarioValidator)

    const actualizado = await this.comentarios.editar(comentario, cuerpo)

    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(actualizado) })
  }

  async destroy({ params, request }: HttpContext) {
    const comentario = await this.comentarios.encontrar(params.id)
    await this.comentarios.borrar(
      comentario,
      request.input('autor_email', ''),
      request.header('x-clave-moderacion')
    )

    return { borrado: true }
  }
}
