export const POST_ID = 9001
export const POST_SLUG = 'post-de-prueba'

export function unPostPublicado(extra: Record<string, unknown> = {}) {
  return {
    id: POST_ID,
    titulo: 'Post de prueba',
    slug: POST_SLUG,
    resumen: 'Resumen de prueba',
    cuerpo: '## Cuerpo de prueba',
    imagen_portada: null,
    estado: 'publicado',
    publicado_en: '2026-01-01 10:00:00',
    autor_id: 1,
    categoria_id: 1,
    autor_nombre: 'Marta Ruiz Calvo',
    autor_email: 'marta.ruiz@corriente.es',
    categoria_nombre: 'Noticias',
    etiquetas: 'Artículos',
    created_at: '2026-01-01 10:00:00',
    updated_at: '2026-01-01 10:00:00',
    ...extra,
  }
}

export function unPostBorrador(extra: Record<string, unknown> = {}) {
  return unPostPublicado({ id: 9002, slug: 'post-borrador', estado: 'borrador', ...extra })
}

export function unComentario(extra: Record<string, unknown> = {}) {
  return {
    id: 9101,
    post_id: POST_ID,
    autor_nombre: 'Lucía Ferrer',
    autor_email: 'lucia.ferrer@ejemplo.es',
    cuerpo: 'Un comentario suficientemente largo.',
    estado: 'pendiente',
    creado_en: '2026-01-02 09:30:00',
    padre_id: null,
    ...extra,
  }
}

/**
 * Cuerpo válido para `POST /posts/:slug/comentarios`.
 */
export function datosDeComentario(extra: Record<string, unknown> = {}) {
  return {
    autor_nombre: 'Lucía Ferrer',
    autor_email: 'lucia.ferrer@ejemplo.es',
    cuerpo: 'Un comentario suficientemente largo.',
    ...extra,
  }
}

/**
 * Clave de moderación que hoy está escrita a fuego en `start/routes.ts`.
 */
export const CLAVE_MODERACION = 'dev-secret-cambiar'

/**
 * Las ocho columnas de `comentarios`, que hoy salen TODAS en la respuesta (incluido el correo).
 */
export const COLUMNAS_DE_COMENTARIO = [
  'id',
  'post_id',
  'autor_nombre',
  'autor_email',
  'cuerpo',
  'estado',
  'creado_en',
  'padre_id',
]
