/**
 * Generic Firestore CRUD repository.
 *
 * Wraps common Firestore operations (getAll, getById, create, update,
 * delete, softDelete) for a single collection.  Each collection gets its
 * own repository instance with a specific type parameter.
 *
 * Usage:
 *   const templateRepo = new ContentRepository<FirestoreTemplateFamily>("templateFamilies");
 *   const all = await templateRepo.getActive();
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { getDbInstance } from "./firebase";

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ContentRepository<T extends { id: string }> {
  constructor(
    private readonly collectionName: string,
    private readonly db?: Firestore | null
  ) {}

  private getDb(): Firestore {
    const instance = this.db ?? getDbInstance();
    if (!instance) throw new Error(`Firestore unavailable (collection: ${this.collectionName})`);
    return instance;
  }

  /** Fetch all documents. */
  async getAll(): Promise<T[]> {
    const snap = await getDocs(collection(this.getDb(), this.collectionName));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  }

  /** Fetch a single document by its Firestore document ID. */
  async getById(id: string): Promise<T | null> {
    const ref = doc(this.getDb(), this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as T;
  }

  /** Fetch only documents where `isActive === true`. */
  async getActive(): Promise<T[]> {
    const q = query(
      collection(this.getDb(), this.collectionName),
      where("isActive", "==", true)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  }

  /** Fetch documents matching a category field. */
  async getByCategory(
    field: string,
    value: string
  ): Promise<T[]> {
    const q = query(
      collection(this.getDb(), this.collectionName),
      where(field, "==", value)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  }

  /** Create or overwrite a document. Document ID equals the logical id. */
  async create(id: string, data: Omit<T, "id">): Promise<T> {
    const ref = doc(this.getDb(), this.collectionName, id);
    await setDoc(ref, data as DocumentData);
    return { id, ...data } as T;
  }

  /** Partial update. */
  async update(id: string, data: Partial<T>): Promise<void> {
    const ref = doc(this.getDb(), this.collectionName, id);
    await updateDoc(ref, data as DocumentData);
  }

  /** Hard delete. */
  async delete(id: string): Promise<void> {
    const ref = doc(this.getDb(), this.collectionName, id);
    await deleteDoc(ref);
  }

  /** Soft delete — sets `isActive` to false without removing the document. */
  async softDelete(id: string): Promise<void> {
    const ref = doc(this.getDb(), this.collectionName, id);
    await updateDoc(ref, { isActive: false } as DocumentData);
  }
}
