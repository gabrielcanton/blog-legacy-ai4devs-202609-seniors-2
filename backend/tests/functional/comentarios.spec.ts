import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  COLUMNAS_DE_COMENTARIO,
  POST_ID,
  POST_SLUG,
  datosDeComentario,
  unComentario,
  unPostBorrador,
  unPostPublicado,
} from '#tests/helpers/blog'

/**
 * Caracterización de `POST /posts/:slug/comentarios`: fija lo que hace HOY, bugs incluidos.
 * Los casos marcados con BUG documentan un defecto de la auditoría (docs/auditoria/comentarios.md)
 * que NO se corrige en el refactor.
 */
const URL = `/posts/${POST_SLUG}/comentarios`

async function totalDeComentarios() {
  const fila = await db.from('comentarios').where('post_id', POST_ID).count('* as total').first()
  return Number(fila.total)
}

test.group('POST /posts/:slug/comentarios', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('deja un comentario en un post publicado y devuelve su contrato completo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(URL).json(datosDeComentario())

    // Assert
    respuesta.assertStatus(201)
    const cuerpo = respuesta.body()
    assert.deepEqual(Object.keys(cuerpo), ['comentario'])
    // BUG (#19/#22): la respuesta es la fila cruda, con autor_email y estado.
    assert.sameMembers(Object.keys(cuerpo.comentario), COLUMNAS_DE_COMENTARIO)
    assert.isNumber(cuerpo.comentario.id)
    assert.equal(cuerpo.comentario.post_id, POST_ID)
    assert.equal(cuerpo.comentario.autor_nombre, 'Lucía Ferrer')
    assert.equal(cuerpo.comentario.autor_email, 'lucia.ferrer@ejemplo.es')
    assert.equal(cuerpo.comentario.cuerpo, 'Un comentario suficientemente largo.')
    assert.strictEqual(cuerpo.comentario.estado, 'pendiente')
    assert.match(cuerpo.comentario.creado_en, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    assert.isNull(cuerpo.comentario.padre_id)
  })

  test('el comentario queda guardado como pendiente y no se ve en el detalle del post', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(URL).json(datosDeComentario())
    const detalle = await client.get(`/posts/${POST_SLUG}`)

    // Assert
    const guardado = await db
      .from('comentarios')
      .where('id', respuesta.body().comentario.id)
      .first()
    assert.equal(guardado.estado, 'pendiente')
    assert.equal(guardado.post_id, POST_ID)
    detalle.assertStatus(200)
    assert.deepEqual(detalle.body().comentarios, [])
  })

  test('guarda el padre_id cuando se envía', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ id: 9101, estado: 'aprobado' }))

    // Act
    const respuesta = await client.post(URL).json(datosDeComentario({ padre_id: 9101 }))

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 9101)
  })

  test('BUG #28: acepta un padre_id que no existe', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(URL).json(datosDeComentario({ padre_id: 999999 }))

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 999999)
  })

  test('sin nombre devuelve 400 {error}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const ausente = await client.post(URL).json(datosDeComentario({ autor_nombre: undefined }))
    const vacio = await client.post(URL).json(datosDeComentario({ autor_nombre: '' }))

    // Assert
    ausente.assertStatus(400)
    assert.deepEqual(ausente.body(), { error: 'El nombre es obligatorio' })
    vacio.assertStatus(400)
    assert.deepEqual(vacio.body(), { error: 'El nombre es obligatorio' })
    assert.equal(await totalDeComentarios(), 0)
  })

  test('sin email devuelve 422 {message}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const ausente = await client.post(URL).json(datosDeComentario({ autor_email: undefined }))
    const vacio = await client.post(URL).json(datosDeComentario({ autor_email: '' }))

    // Assert
    ausente.assertStatus(422)
    assert.deepEqual(ausente.body(), { message: 'Falta el email' })
    vacio.assertStatus(422)
    assert.deepEqual(vacio.body(), { message: 'Falta el email' })
    assert.equal(await totalDeComentarios(), 0)
  })

  test('un email sin arroba devuelve 400 {errores}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(URL).json(datosDeComentario({ autor_email: 'sin-arroba' }))

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { errores: ['email no válido'] })
    assert.equal(await totalDeComentarios(), 0)
  })

  test('BUG #24: basta con que el email contenga una arroba', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(URL).json(datosDeComentario({ autor_email: '@' }))

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.autor_email, '@')
  })

  test('BUG: un cuerpo corto devuelve 200 {ok:false} y no guarda nada', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const corto = await client.post(URL).json(datosDeComentario({ cuerpo: 'abcd' }))
    const ausente = await client.post(URL).json(datosDeComentario({ cuerpo: undefined }))
    const vacio = await client.post(URL).json(datosDeComentario({ cuerpo: '' }))

    // Assert
    for (const respuesta of [corto, ausente, vacio]) {
      respuesta.assertStatus(200)
      assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
    }
    assert.equal(await totalDeComentarios(), 0)
  })

  test('un cuerpo de exactamente 5 caracteres se acepta', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(URL).json(datosDeComentario({ cuerpo: 'abcde' }))

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.cuerpo, 'abcde')
  })

  test('un nombre o un cuerpo de solo espacios cuentan como vacíos (lo hace el bodyparser)', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const nombre = await client.post(URL).json(datosDeComentario({ autor_nombre: '   ' }))
    const cuerpo = await client.post(URL).json(datosDeComentario({ cuerpo: '     ' }))

    // Assert
    nombre.assertStatus(400)
    assert.deepEqual(nombre.body(), { error: 'El nombre es obligatorio' })
    cuerpo.assertStatus(200)
    assert.deepEqual(cuerpo.body(), { ok: false, motivo: 'comentario demasiado corto' })
    assert.equal(await totalDeComentarios(), 0)
  })

  test('BUG #26: no hay longitud máxima en el cuerpo', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const largo = 'x'.repeat(5000)

    // Act
    const respuesta = await client.post(URL).json(datosDeComentario({ cuerpo: largo }))

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.cuerpo, largo)
  })

  test('las validaciones se evalúan en orden: nombre, email, cuerpo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const sinNada = await client.post(URL).json({})
    const sinEmailNiCuerpo = await client.post(URL).json({ autor_nombre: 'Lucía' })
    const emailMalo = await client
      .post(URL)
      .json({ autor_nombre: 'Lucía', autor_email: 'sin-arroba', cuerpo: 'a' })

    // Assert
    sinNada.assertStatus(400)
    assert.deepEqual(sinNada.body(), { error: 'El nombre es obligatorio' })
    sinEmailNiCuerpo.assertStatus(422)
    assert.deepEqual(sinEmailNiCuerpo.body(), { message: 'Falta el email' })
    emailMalo.assertStatus(400)
    assert.deepEqual(emailMalo.body(), { errores: ['email no válido'] })
  })

  test('un post inexistente devuelve 404', async ({ client, assert }) => {
    // Arrange (sin posts)

    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json(datosDeComentario())

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })

  test('un post en borrador devuelve 404 y no guarda nada', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostBorrador())

    // Act
    const respuesta = await client
      .post('/posts/post-borrador/comentarios')
      .json(datosDeComentario())

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
    const fila = await db.from('comentarios').where('post_id', 9002).count('* as total').first()
    assert.equal(Number(fila.total), 0)
  })

  test('el 404 del post gana a la validación de la entrada', async ({ client, assert }) => {
    // Arrange (sin posts)

    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({})

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })
})
