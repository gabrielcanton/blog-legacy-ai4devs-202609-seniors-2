import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { CLAVE_MODERACION, unComentario, unPostPublicado } from '#tests/helpers/blog'

/**
 * Caracterización de `DELETE /comentarios/:id`: fija lo que hace HOY, bugs incluidos.
 * Los casos marcados con BUG documentan un defecto de la auditoría (docs/auditoria/comentarios.md)
 * que NO se corrige en el refactor.
 */
const ID = 9101
const URL = `/comentarios/${ID}`
const EMAIL = 'lucia.ferrer@ejemplo.es'

async function existe(id: number) {
  return (await db.from('comentarios').where('id', id).first()) !== null
}

test.group('DELETE /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('el autor borra su comentario y recibe {borrado:true}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete(URL).json({ autor_email: EMAIL })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existe(ID))
  })

  test('el correo se compara sin mayúsculas ni espacios sobrantes', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete(URL).json({ autor_email: `  ${EMAIL.toUpperCase()}  ` })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existe(ID))
  })

  test('el autor puede borrar también un comentario ya aprobado', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client.delete(URL).json({ autor_email: EMAIL })

    // Assert
    respuesta.assertStatus(200)
    assert.isFalse(await existe(ID))
  })

  test('BUG #8: la clave de moderación escrita en el código permite borrar', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete(URL).header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existe(ID))
  })

  test('una clave de moderación incorrecta devuelve 403', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete(URL).header('x-clave-moderacion', 'otra-clave')

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existe(ID))
  })

  test('el correo de otra persona devuelve 403 y no borra', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete(URL).json({ autor_email: 'otra@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existe(ID))
  })

  test('sin correo ni clave devuelve 403 y no borra', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete(URL)

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existe(ID))
  })

  test('un comentario inexistente devuelve 404', async ({ client, assert }) => {
    // Arrange (sin comentarios)

    // Act
    const respuesta = await client
      .delete('/comentarios/987654')
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })

  test('BUG #11: borrar un comentario deja huérfanas a sus respuestas', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ id: 9101 }))
    await db.table('comentarios').insert(unComentario({ id: 9102, padre_id: 9101 }))

    // Act
    const respuesta = await client.delete(URL).json({ autor_email: EMAIL })

    // Assert
    respuesta.assertStatus(200)
    assert.isFalse(await existe(9101))
    assert.isTrue(await existe(9102))
  })
})
