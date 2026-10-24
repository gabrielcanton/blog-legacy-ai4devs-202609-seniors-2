import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import ComentarioException from '#exceptions/comentario_exception'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof ComentarioException) {
      return ctx.response.status(error.status).send(error.cuerpo)
    }

    // Los endpoints de comentarios conservan los errores de validación que tenían antes del
    // refactor. El resto de la API sigue con el formato estándar.
    const ruta = ctx.route?.name
    if (error instanceof errors.E_VALIDATION_ERROR && ruta?.startsWith('comentarios.')) {
      const operacion = ruta === 'comentarios.update' ? 'edicion' : 'alta'
      const traducido = ComentarioException.desdeValidacion(error.messages, operacion)
      return ctx.response.status(traducido.status).send(traducido.cuerpo)
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // Los rechazos de comentarios son respuestas normales de la API, no incidencias.
    if (error instanceof ComentarioException) return
    return super.report(error, ctx)
  }
}
