import { isValidStorageKey } from '@/shared/lib/storage-key'

const DB_NAME = 'mppr-application-files'
const STORE_NAME = 'files'
const DB_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open application storage'))
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

export async function putApplicationFile(id: string, file: Blob): Promise<void> {
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

export async function getApplicationFile(id: string): Promise<Blob | null> {
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

export async function deleteApplicationFile(id: string): Promise<void> {
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
