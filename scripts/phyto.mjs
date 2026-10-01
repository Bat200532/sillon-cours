// Catalogue des produits phytosanitaires pour Sillon, à partir des données ouvertes E-Phy (ANSES).
// Lit le fichier « produits » (CSV, séparateur ;) et écrit un phyto.json compact :
//   { maj, source, produits: { "<n° AMM>": [nom, "A" | "R", date de retrait ou ""] } }
// "A" = autorisé, "R" = retiré (gardés 10 ans après le retrait : stocks et registres anciens).
// Utilisation : node scripts/phyto.mjs <produits.csv> [phyto.json]
import { readFileSync, writeFileSync } from "node:fs";

/** Découpe un CSV (guillemets doublés, retours à la ligne dans les champs). */
export function parseCsv(txt, sep = ";") {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && txt[i + 1] === "\n") i++;
      row.push(f); f = ""; if (row.some((x) => x !== "")) rows.push(row); row = [];
    } else f += c;
  }
  row.push(f); if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Repère les colonnes utiles par leur intitulé, quelle que soit leur position. */
export function columns(header) {
  const h = header.map(norm);
  const find = (ok) => h.findIndex(ok);
  const c = {
    amm: find((x) => /\bamm\b/.test(x) && !x.includes("reference") && !x.includes("parallele")),
    nom: find((x) => x.includes("nom produit") && !x.includes("reference") && !x.includes("second")),
    etat: find((x) => x.includes("etat")),
    retrait: find((x) => x.includes("retrait")),
    type: find((x) => x.includes("type produit")),
  };
  const manque = Object.entries(c).filter(([k, v]) => v < 0 && k !== "type").map(([k]) => k);
  if (manque.length) throw new Error(`Colonnes introuvables : ${manque.join(", ")} — en-tête : ${header.join(" | ")}`);
  return c;
}

/** « 15/03/2024 » ou « 2024-03-15 » → « 2024-03-15 » ; sinon "". */
export function isoDate(s) {
  const t = String(s || "").trim();
  let m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return "";
}

export function build(csv, today = new Date().toISOString().slice(0, 10)) {
  const rows = parseCsv(csv.replace(/^﻿/, ""));
  const c = columns(rows[0]);
  const limite = String(+today.slice(0, 4) - 10) + today.slice(4);
  const produits = {};
  let a = 0, r = 0;
  for (const row of rows.slice(1)) {
    const amm = String(row[c.amm] || "").replace(/\s/g, "");
    if (!/^\d{7}$/.test(amm)) continue;
    if (c.type >= 0 && row[c.type] && !/ppp|phyto/i.test(norm(row[c.type]))) continue;
    const etat = norm(row[c.etat]), retrait = isoDate(row[c.retrait]);
    const retire = etat.includes("retir") || (!!retrait && retrait <= today && !etat.includes("autoris"));
    if (retire && retrait && retrait < limite) continue;
    const prev = produits[amm];
    if (prev && prev[1] === "A") continue;              // un autorisé l'emporte sur un doublon retiré
    produits[amm] = [String(row[c.nom] || "").trim().slice(0, 80), retire ? "R" : "A", retire ? retrait : ""];
  }
  for (const v of Object.values(produits)) v[1] === "A" ? a++ : r++;
  if (a < 500) throw new Error(`Seulement ${a} produits autorisés lus : fichier E-Phy inattendu, phyto.json non remplacé.`);
  return { maj: today, source: "ANSES, catalogue E-Phy (data.gouv.fr, Licence Ouverte)", autorises: a, retires: r, produits };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [src, out = "phyto.json"] = process.argv.slice(2);
  const j = build(readFileSync(src, "utf8"));
  writeFileSync(out, JSON.stringify(j));
  console.log(`phyto.json : ${j.autorises} produits autorisés, ${j.retires} retirés depuis moins de 10 ans.`);
}
