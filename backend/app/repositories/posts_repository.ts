import Post from '#models/post'

export default class PostsRepository {
  publicadoPorSlug(slug: string) {
    return Post.query().where('slug', slug).where('estado', 'publicado').first()
  }
}
