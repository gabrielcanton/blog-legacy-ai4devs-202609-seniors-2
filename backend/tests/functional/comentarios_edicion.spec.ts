import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  CLAVE_MODERACION,
  COLUMNAS_DE_COMENTARIO,
  unComentario,
  unPostPublicado,
} from '#tests/helpers/blog'

/**
 * Caracterización de `PATCH /comentarios/:id`: fija lo que hace HOY, bugs incluidos.
 * Los casos marcados con BUG documentan un defecto de la auditoría (docs/auditoria/comentarios.md)
 * que NO se corrige en el refactor.
 */
const ID = 9101
const URL = `/comentarios/${ID}`
const EMAIL = 'lucia.ferrer@ejemplo.es'

async function cuerpoGuardado() {
  const fila = await db.from('comentarios').where('id', ID).first()
  return fila.cuerpo
}

test.group('PATCH /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('el autor edita su comentario pendiente y recibe el contrato completo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.patch(URL).json({ autor_email: EMAIL, cuerpo: 'Cuerpo nuevo.' })

    // Assert
    respuesta.assertStatus(200)
    const cuerpo = respuesta.body()
    assert.deepEqual(Object.keys(cuerpo), ['comentario'])
    // BUG (#22): la respuesta es la fila cruda, con autor_email y estado.
    assert.sameMembers(Object.keys(cuerpo.comentario), COLUMNAS_DE_COMENTARIO)
    assert.equal(cuerpo.comentario.id, ID)
    assert.equal(cuerpo.comentario.post_id, 9001)
    assert.equal(cuerpo.comentario.autor_nombre, 'Lucía Ferrer')
    assert.equal(cuerpo.comentario.autor_email, EMAIL)
    assert.equal(cuerpo.comentario.cuerpo, 'Cuerpo nuevo.')
    assert.strictEqual(cuerpo.comentario.estado, 'pendiente')
    assert.equal(cuerpo.comentario.creado_en, '2026-01-02 09:30:00')
    assert.isNull(cuerpo.comentario.padre_id)
    assert.equal(await cuerpoGuardado(), 'Cuerpo nuevo.')
  })

  test('un comentario inexistente devuelve 404', async ({ client, assert }) => {
    // Arrange (sin comentarios)

    // Act
    const respuesta = await client
      .patch('/comentarios/987654')
      .json({ autor_email: EMAIL, cuerpo: 'Cuerpo nuevo.' })

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })

  test('el correo se compara tal cual: otra capitalización devuelve 403', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch(URL)
      .json({ autor_email: EMAIL.toUpperCase(), cuerpo: 'Cuerpo nuevo.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(), 'Un comentario suficientemente largo.')
  })

  test('el correo de otra persona o ausente devuelve 403', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const ajeno = await client
      .patch(URL)
      .json({ autor_email: 'otra@ejemplo.es', cuerpo: 'Cuerpo nuevo.' })
    const ausente = await client.patch(URL).json({ cuerpo: 'Cuerpo nuevo.' })

    // Assert
    for (const respuesta of [ajeno, ausente]) {
      respuesta.assertStatus(403)
      assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    }
    assert.equal(await cuerpoGuardado(), 'Un comentario suficientemente largo.')
  })

  test('un comentario ya aprobado no se puede editar ni por su autor', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client.patch(URL).json({ autor_email: EMAIL, cuerpo: 'Cuerpo nuevo.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(), 'Un comentario suficientemente largo.')
  })

  test('BUG #20: la clave de moderación no vale para editar', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch(URL)
      .header('x-clave-moderacion', CLAVE_MODERACION)
      .json({ cuerpo: 'Cuerpo nuevo.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(), 'Un comentario suficientemente largo.')
  })

  test('sin cuerpo devuelve 400 {error}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const ausente = await client.patch(URL).json({ autor_email: EMAIL })
    const vacio = await client.patch(URL).json({ autor_email: EMAIL, cuerpo: '' })

    // Assert
    for (const respuesta of [ausente, vacio]) {
      respuesta.assertStatus(400)
      assert.deepEqual(respuesta.body(), { error: 'Falta el cuerpo' })
    }
    assert.equal(await cuerpoGuardado(), 'Un comentario suficientemente largo.')
  })

  test('el 403 gana a la validación del cuerpo y el 404 gana a los dos', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const sinPermisoYSinCuerpo = await client.patch(URL).json({ autor_email: 'otra@ejemplo.es' })
    const inexistenteYSinCuerpo = await client.patch('/comentarios/987654').json({})

    // Assert
    sinPermisoYSinCuerpo.assertStatus(403)
    assert.deepEqual(sinPermisoYSinCuerpo.body(), { error: 'No puedes editar este comentario' })
    inexistenteYSinCuerpo.assertStatus(404)
    assert.deepEqual(inexistenteYSinCuerpo.body(), { error: 'Comentario no encontrado' })
  })

  test('BUG #27: al editar se acepta un cuerpo más corto que el mínimo del alta', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.patch(URL).json({ autor_email: EMAIL, cuerpo: 'a' })

    // Assert
    respuesta.assertStatus(200)
    assert.equal(respuesta.body().comentario.cuerpo, 'a')
    assert.equal(await cuerpoGuardado(), 'a')
  })
})
