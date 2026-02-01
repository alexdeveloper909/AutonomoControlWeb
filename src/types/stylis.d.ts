declare module 'stylis' {
  // stylis ships without TypeScript types (as of v4.x). We only need `prefixer` for RTL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const prefixer: any
}
