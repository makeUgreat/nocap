/** The whole file was read. `content` is decoded as UTF-8. */
export type FileRead = {
  readonly kind: 'read'
  readonly content: string
}

/**
 * The file could not be read, for example because permission is missing or the file was removed.
 * `message` is the error message of the file system.
 */
export type FileReadError = {
  readonly kind: 'read-error'
  readonly message: string
}

export type FileReadResult = FileRead | FileReadError

export interface FileReader {
  /**
   * Reads one file as text.
   *
   * @param path - Path relative to the root directory of the reader, as returned by `FileFinder`.
   */
  read(path: string): Promise<FileReadResult>
}
