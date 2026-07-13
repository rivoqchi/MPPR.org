import { isValidStorageKey } from '@/shared/lib/storage-key'

const DB_NAME = 'mppr-object-files'
const STORE_NAME = 'files'
const DB_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open document storage'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function putDocumentFile(id: string, file: Blob): Promise<void> {
  if (!isValidStorageKey(id)) {
    return
  }

  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to save file'))

    transaction.objectStore(STORE_NAME).put(file, id)
  })
}

export async function getDocumentFile(id: string): Promise<Blob | null> {
  if (!isValidStorageKey(id)) {
    return null
  }

  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(id)

    request.onsuccess = () => {
      resolve((request.result as Blob | undefined) ?? null)
    }

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to read file'))
    }
  })
}

export async function deleteDocumentFile(id: string): Promise<void> {
  if (!isValidStorageKey(id)) {
    return
  }

  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to delete file'))

    transaction.objectStore(STORE_NAME).delete(id)
  })
}

export async function putDocumentFiles(files: Array<{ id: string; blob: Blob }>): Promise<void> {
  await Promise.all(
    files
      .filter((file) => isValidStorageKey(file.id))
      .map((file) => putDocumentFile(file.id, file.blob)),
  )
}
