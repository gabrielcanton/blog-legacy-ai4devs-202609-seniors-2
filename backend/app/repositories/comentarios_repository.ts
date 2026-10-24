import Comentario from '#models/comentario'
import type { DateTime } from 'luxon'

interface NuevoComentario {
  postId: number
  autorNombre: string
  autorEmail: string
  cuerpo: string
  estado: string
  creadoEn: DateTime
  padreId: number | null
}

export default class ComentariosRepository {
  buscar(id: string) {
    return Comentario.find(id)
  }

  async crear(datos: NuevoComentario) {
    const comentario = await Comentario.create(datos)
    // Se relee la fila para devolver exactamente lo que quedó guardado.
    await comentario.refresh()
    return comentario
  }

  async actualizarCuerpo(comentario: Comentario, cuerpo: string) {
    comentario.cuerpo = cuerpo
    await comentario.save()
    await comentario.refresh()
    return comentario
  }

  borrar(comentario: Comentario) {
    return comentario.delete()
  }
}
