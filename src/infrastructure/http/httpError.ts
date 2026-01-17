export class HttpError extends Error {
  readonly status: number
  readonly bodyText?: string

  constructor(message: string, status: number, bodyText?: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.bodyText = bodyText
  }
}
