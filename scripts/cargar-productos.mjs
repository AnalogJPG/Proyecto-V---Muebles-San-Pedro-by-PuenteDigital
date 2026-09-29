import { readFile } from "node:fs/promises";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault(), projectId: "muebles-san-pedro" });
const db = getFirestore();

const ruta = new URL("../products.json", import.meta.url);
const productos = JSON.parse(await readFile(ruta, "utf8"));

const lote = db.batch();
for (const { id, ...datos } of productos) {
  if (typeof datos.precio !== "number") {
    throw new Error(`Precio no numérico en el producto ${id}`);
  }
  lote.set(db.collection("productos").doc(String(id)), datos);
}
await lote.commit();
console.log(`${productos.length} productos cargados en Firestore`);