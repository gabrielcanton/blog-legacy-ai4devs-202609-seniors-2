import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import ComentarioException from '#exceptions/comentario_exception'
import type Comentario from '#models/comentario'
import type Post from '#models/post'
import ComentariosRepository from '#repositories/comentarios_repository'
import PostsRepository from '#repositories/posts_repository'

/**
 * Clave con la que un moderador puede borrar cualquier comentario.
 * TODO(2024-11): sacarla a variables de entorno antes de subir a producción (#8 de la auditoría).
 */
const CLAVE_MODERACION = 'dev-secret-cambiar'

const normalizar = (correo: unknown) => String(correo).toLowerCase().trim()

interface DatosDeAlta {
  autor_nombre: string
  autor_email: string
  cuerpo: string
  padre_id?: any
}

@inject()
export class ComentarioService {
  constructor(
    protected posts: PostsRepository,
    protected comentarios: ComentariosRepository
  ) {}

  async postPublicado(slug: string) {
    const post = await this.posts.publicadoPorSlug(slug)
    if (!post) {
      throw ComentarioException.postNoEncontrado()
    }
    return post
  }

  /**
   * Todo comentario nuevo entra pendiente de moderar.
   */
  crear(post: Post, datos: DatosDeAlta) {
    return this.comentarios.crear({
      postId: post.id,
      autorNombre: datos.autor_nombre,
      autorEmail: datos.autor_email,
      cuerpo: datos.cuerpo,
      estado: 'pendiente',
      creadoEn: DateTime.utc(),
      padreId: datos.padre_id ?? null,
    })
  }

  async encontrar(id: string) {
    const comentario = await this.comentarios.buscar(id)
    if (!comentario) {
      throw ComentarioException.comentarioNoEncontrado()
    }
    return comentario
  }

  /**
   * Borra quien lo escribió (sin distinguir mayúsculas ni espacios) o quien trae la clave
   * de moderación.
   */
  async borrar(comentario: Comentario, correo: unknown, clave: string | undefined) {
    const esModerador = clave === CLAVE_MODERACION
    const esAutor = normalizar(comentario.autorEmail) === normalizar(correo)
    if (!esModerador && !esAutor) {
      throw ComentarioException.noPuedesBorrar()
    }
    await this.comentarios.borrar(comentario)
  }

  /**
   * Edita solo el autor, con el correo escrito exactamente igual, y mientras siga pendiente.
   * Esta regla difiere a propósito de la de borrar (#20 de la auditoría).
   */
  autorizarEdicion(comentario: Comentario, correo: unknown) {
    if (comentario.autorEmail !== correo || comentario.estado !== 'pendiente') {
      throw ComentarioException.noPuedesEditar()
    }
  }

  editar(comentario: Comentario, cuerpo: string) {
    return this.comentarios.actualizarCuerpo(comentario, cuerpo)
  }
}
