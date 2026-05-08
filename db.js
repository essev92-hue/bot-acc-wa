// src/db.js
// Database sederhana berbasis JSON — bisa diganti dengan Postgres/Redis untuk skala besar

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "data.json");

/** Struktur default database */
const DEFAULT_DB = {
  groups: {
    "Grup Alumni SMA 1 🎓": {
      pending: [
        { nama: "Budi Santoso", nomor: "+6281234567890", negara: "ID" },
        { nama: "Siti Rahayu", nomor: "+6282345678901", negara: "ID" },
        { nama: "Ahmad Fauzi", nomor: "+6283456789012", negara: "ID" },
      ],
    },
    "Grup RT 05 RW 03 🏘️": {
      pending: [
        { nama: "Dewi Lestari", nomor: "+6284567890123", negara: "ID" },
        { nama: "Eko Prasetyo", nomor: "+6285678901234", negara: "ID" },
      ],
    },
    "Grup Arisan Ibu-Ibu 💰": {
      pending: [],
    },
    "مجموعة المسجد 🕌": {
      pending: [
        { nama: "محمد علي", nomor: "+966501234567", negara: "SA" },
        { nama: "فاطمة أحمد", nomor: "+971501234567", negara: "AE" },
      ],
    },
    "东南亚商业群 🌏": {
      pending: [
        { nama: "李明", nomor: "+8613812345678", negara: "CN" },
        { nama: "Nguyen Van A", nomor: "+84901234567", negara: "VN" },
      ],
    },
  },
};

// ── Load ──────────────────────────────────────
export function loadDB() {
  if (!existsSync(DB_PATH)) {
    saveDB(DEFAULT_DB);
    return structuredClone(DEFAULT_DB);
  }
  try {
    return JSON.parse(readFileSync(DB_PATH, "utf-8"));
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

// ── Save ──────────────────────────────────────
export function saveDB(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ── Helpers ───────────────────────────────────
export function getGroups() {
  return loadDB().groups;
}

export function getGroupNames() {
  return Object.keys(loadDB().groups);
}

export function getPending(groupName) {
  const db = loadDB();
  return db.groups?.[groupName]?.pending ?? [];
}

export function approveAll(groupName) {
  const db = loadDB();
  if (!db.groups[groupName]) return [];
  const approved = [...db.groups[groupName].pending];
  db.groups[groupName].pending = [];
  saveDB(db);
  return approved;
}

export function approveOne(groupName, index) {
  const db = loadDB();
  const pending = db.groups?.[groupName]?.pending;
  if (!pending || index < 0 || index >= pending.length) return null;
  const [approved] = pending.splice(index, 1);
  saveDB(db);
  return approved;
}

export function addPendingMember(groupName, member) {
  const db = loadDB();
  if (!db.groups[groupName]) {
    db.groups[groupName] = { pending: [] };
  }
  db.groups[groupName].pending.push(member);
  saveDB(db);
}

export function addGroup(groupName) {
  const db = loadDB();
  if (!db.groups[groupName]) {
    db.groups[groupName] = { pending: [] };
    saveDB(db);
    return true;
  }
  return false; // sudah ada
}
