/** The whole file was read. */
export type FileRead = {
  readonly kind: 'read'
  /** Full text of the file, decoded as UTF-8. */
  readonly content: string
}

/** The file could not be read, for example because permission is missing or the file was removed. */
export type FileReadError = {
  readonly kind: 'read-error'
  /** Error message reported by the file system. */
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
