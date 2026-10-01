import { test } from "node:test";
import assert from "node:assert/strict";
import { build, columns, decode, isoDate, parseCsv } from "../scripts/phyto.mjs";

test("CSV : guillemets, points-virgules et retours à la ligne dans les champs", () => {
  assert.deepEqual(parseCsv('a;"b;c";"d ""e"""\r\n1;"x\ny";3\n'), [["a", "b;c", 'd "e"'], ["1", "x\ny", "3"]]);
});

test("colonnes repérées par leur intitulé", () => {
  const c = columns(["type produit", "numero AMM", "nom produit", "seconds noms commerciaux", "Etat d’autorisation", "Date de retrait du produit", "numéro AMM du produit de référence"]);
  assert.deepEqual(c, { amm: 1, nom: 2, etat: 4, retrait: 5, type: 0 });
  assert.throws(() => columns(["x", "y"]), /Colonnes introuvables/);
});

test("dates françaises", () => {
  assert.equal(isoDate("15/03/2024"), "2024-03-15");
  assert.equal(isoDate("2024-03-15T00:00"), "2024-03-15");
  assert.equal(isoDate(""), "");
});

test("catalogue : autorisés, retirés récents, retirés anciens écartés, autres types écartés", () => {
  let csv = "type produit;numero AMM;nom produit;Etat d'autorisation;Date de retrait du produit\n";
  for (let i = 0; i < 600; i++) csv += `PPP;${9000000 + i};Produit ${i};AUTORISE;\n`;
  csv += 'PPP;2150000;"FONGICIDE X";RETIRE;01/06/2025\n';
  csv += "PPP;2000001;VIEUX;RETIRE;01/01/2010\n";
  csv += "MFSC;1234567;ENGRAIS;AUTORISE;\n";
  const j = build(csv, "2026-10-01");
  assert.deepEqual(j.produits["2150000"], ["FONGICIDE X", "R", "2025-06-01"]);
  assert.equal(j.produits["2000001"], undefined, "retiré depuis plus de 10 ans");
  assert.equal(j.produits["1234567"], undefined, "matière fertilisante : hors catalogue phyto");
  assert.equal(j.autorises, 600);
  assert.throws(() => build("numero AMM;nom produit;etat;date de retrait\n2150000;X;AUTORISE;\n"), /inattendu/);
});

test("encodage : UTF-8 ou Windows-1252", () => {
  assert.equal(decode(Buffer.from("Etat d’autorisation;Numéro", "utf8")), "Etat d’autorisation;Numéro");
  assert.equal(decode(Buffer.from([0x4e, 0x75, 0x6d, 0xe9, 0x72, 0x6f, 0x92])), "Numéro’");
});
