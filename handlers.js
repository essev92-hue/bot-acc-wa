// src/handlers.js
// Handler lengkap semua menu, callback, dan perintah bot

import { InlineKeyboard } from "grammy";
import {
  getGroupNames,
  getPending,
  approveAll,
  approveOne,
  loadDB,
  addGroup,
  addPendingMember,
} from "./db.js";
import { formatPhone, normalizeName, truncate, countryFlag } from "./phoneUtils.js";

// ── Cek admin ──────────────────────────────────
export function isAdmin(userId) {
  const ids = (process.env.ADMIN_IDS ?? "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter(Boolean);
  return ids.includes(userId);
}

// ── Teks header bot ────────────────────────────
const HEADER = "🤖 *Bot ACC Anggota WhatsApp*\n━━━━━━━━━━━━━━━━━━━━\n";

// ════════════════════════════════════════════════
// /start
// ════════════════════════════════════════════════
export async function handleStart(ctx) {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply("⛔ Anda tidak memiliki akses ke bot ini.");
  }

  const keyboard = new InlineKeyboard()
    .text("📋 Daftar Grup", "menu_grup")
    .row()
    .text("➕ Tambah Anggota Manual", "menu_tambah_anggota")
    .row()
    .text("ℹ️ Bantuan", "menu_bantuan");

  await ctx.reply(
    `${HEADER}Halo, *${escMd(ctx.from.first_name)}*\\!\n\n` +
      "Bot ini membantu Anda meng\\-*approve* anggota baru grup WhatsApp " +
      "langsung dari Telegram dalam satu ketukan\\.\n\n" +
      "Pilih menu di bawah:",
    { parse_mode: "MarkdownV2", reply_markup: keyboard }
  );
}

// ════════════════════════════════════════════════
// Daftar Grup
// ════════════════════════════════════════════════
export async function handleMenuGrup(ctx) {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery("⛔ Akses ditolak");

  const db = loadDB();
  const names = Object.keys(db.groups);

  if (names.length === 0) {
    return ctx.editMessageText("📭 Belum ada grup terdaftar.", {
      reply_markup: new InlineKeyboard().text("🔙 Kembali", "menu_utama"),
    });
  }

  const keyboard = new InlineKeyboard();
  for (const name of names) {
    const jumlah = db.groups[name].pending.length;
    const icon = jumlah > 0 ? "🔴" : "🟢";
    const label = `${icon} ${truncate(name, 25)} (${jumlah})`;
    keyboard.text(label, `grup|${name}`).row();
  }
  keyboard.text("➕ Tambah Grup Baru", "tambah_grup").row();
  keyboard.text("🔙 Menu Utama", "menu_utama");

  await ctx.editMessageText(
    "📋 *Daftar Grup WhatsApp*\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "🔴 Ada anggota pending  •  🟢 Kosong\n\n" +
      "Pilih grup untuk detail:",
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
}

// ════════════════════════════════════════════════
// Detail Grup
// ════════════════════════════════════════════════
export async function handleDetailGrup(ctx, groupName) {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery("⛔ Akses ditolak");

  const pending = getPending(groupName);
  const jumlah = pending.length;

  if (jumlah === 0) {
    const keyboard = new InlineKeyboard()
      .text("🔙 Daftar Grup", "menu_grup");

    return ctx.editMessageText(
      `✅ *${escMd(groupName)}*\n` +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "Tidak ada anggota yang perlu di\\-ACC saat ini\\.",
      { parse_mode: "MarkdownV2", reply_markup: keyboard }
    );
  }

  // Tampilkan daftar anggota pending
  let daftar = "";
  for (let i = 0; i < pending.length; i++) {
    const m = pending[i];
    const phone = formatPhone(m.nomor);
    const nama = normalizeName(m.nama);
    daftar += `${i + 1}\\. ${phone.flag} *${escMd(truncate(nama, 25))}*\n`;
    daftar += `    📞 \`${escMd(phone.formatted)}\`\n`;
  }

  const keyboard = new InlineKeyboard()
    .text("✅ ACC Semua", `acc_semua|${groupName}`)
    .text("☑️ ACC Sebagian", `acc_sebagian|${groupName}`)
    .row()
    .text("🔙 Daftar Grup", "menu_grup");

  await ctx.editMessageText(
    `👥 *${escMd(groupName)}*\n` +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      `📌 *${jumlah} anggota menunggu ACC:*\n\n` +
      daftar +
      "\nPilih tindakan:",
    { parse_mode: "MarkdownV2", reply_markup: keyboard }
  );
}

// ════════════════════════════════════════════════
// ACC Semua
// ════════════════════════════════════════════════
export async function handleAccSemua(ctx, groupName) {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery("⛔ Akses ditolak");

  const approved = approveAll(groupName);
  const jumlah = approved.length;

  let daftar = "";
  for (const m of approved) {
    const phone = formatPhone(m.nomor);
    const nama = normalizeName(m.nama);
    daftar += `✅ ${phone.flag} *${escMd(truncate(nama, 25))}* — \`${escMd(phone.formatted)}\`\n`;
  }

  const keyboard = new InlineKeyboard()
    .text("📋 Daftar Grup", "menu_grup")
    .row()
    .text("🏠 Menu Utama", "menu_utama");

  await ctx.editMessageText(
    `🎉 *ACC Berhasil\\!*\n` +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      `Grup: *${escMd(groupName)}*\n` +
      `Total: *${jumlah} anggota* di\\-ACC\n\n` +
      daftar +
      "\n✅ Semua anggota berhasil di\\-ACC\\!",
    { parse_mode: "MarkdownV2", reply_markup: keyboard }
  );
}

// ════════════════════════════════════════════════
// ACC Sebagian — tampilkan daftar tombol per orang
// ════════════════════════════════════════════════
export async function handleAccSebagian(ctx, groupName) {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery("⛔ Akses ditolak");

  const pending = getPending(groupName);
  if (pending.length === 0) {
    return ctx.editMessageText("✅ Tidak ada anggota pending.", {
      reply_markup: new InlineKeyboard().text("🔙 Kembali", "menu_grup"),
    });
  }

  const keyboard = new InlineKeyboard();
  for (let i = 0; i < pending.length; i++) {
    const m = pending[i];
    const phone = formatPhone(m.nomor);
    const nama = normalizeName(m.nama);
    keyboard
      .text(
        `${phone.flag} ${truncate(nama, 18)} ✅`,
        `acc_satu|${groupName}|${i}`
      )
      .row();
  }
  keyboard.text("🔙 Kembali", `grup|${groupName}`);

  await ctx.editMessageText(
    `☑️ *ACC Sebagian*\n` +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      `Grup: *${escMd(groupName)}*\n\n` +
      "Tap nama anggota untuk meng\\-ACC satu per satu:",
    { parse_mode: "MarkdownV2", reply_markup: keyboard }
  );
}

// ════════════════════════════════════════════════
// ACC satu anggota
// ════════════════════════════════════════════════
export async function handleAccSatu(ctx, groupName, index) {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery("⛔ Akses ditolak");

  const approved = approveOne(groupName, index);
  if (!approved) {
    await ctx.answerCallbackQuery("⚠️ Anggota tidak ditemukan / sudah di-ACC", {
      show_alert: true,
    });
    return handleAccSebagian(ctx, groupName);
  }

  const phone = formatPhone(approved.nomor);
  const nama = normalizeName(approved.nama);
  await ctx.answerCallbackQuery(
    `✅ ${nama} berhasil di-ACC!`,
    { show_alert: false }
  );

  // Refresh tampilan
  return handleAccSebagian(ctx, groupName);
}

// ════════════════════════════════════════════════
// Tambah Grup Baru
// ════════════════════════════════════════════════
export async function handleTambahGrup(ctx) {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery("⛔ Akses ditolak");

  await ctx.editMessageText(
    "➕ *Tambah Grup Baru*\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Kirim nama grup baru dalam pesan berikutnya\\.\n\n" +
      "_Contoh: Grup Kerja Kantor 🏢_\n\n" +
      "Support semua karakter: Arab, Cina, Emoji, dll\\.",
    {
      parse_mode: "MarkdownV2",
      reply_markup: new InlineKeyboard().text("❌ Batal", "menu_grup"),
    }
  );

  // Simpan state di session sementara
  ctx.session = { waitingFor: "new_group_name" };
}

// ════════════════════════════════════════════════
// Tambah Anggota Manual
// ════════════════════════════════════════════════
export async function handleTambahAnggota(ctx) {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery("⛔ Akses ditolak");

  const names = getGroupNames();
  if (names.length === 0) {
    return ctx.editMessageText("📭 Belum ada grup. Tambah grup dulu.", {
      reply_markup: new InlineKeyboard().text("🔙 Kembali", "menu_utama"),
    });
  }

  const keyboard = new InlineKeyboard();
  for (const name of names) {
    keyboard.text(truncate(name, 28), `pilih_grup_anggota|${name}`).row();
  }
  keyboard.text("🔙 Kembali", "menu_utama");

  await ctx.editMessageText(
    "➕ *Tambah Anggota Manual*\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Pilih grup tujuan:",
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
}

// ════════════════════════════════════════════════
// Bantuan
// ════════════════════════════════════════════════
export async function handleBantuan(ctx) {
  const keyboard = new InlineKeyboard().text("🔙 Menu Utama", "menu_utama");

  const text =
    "ℹ️ *Panduan Penggunaan Bot*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "1️⃣ Ketik /start → menu utama\n" +
    "2️⃣ *Daftar Grup* → lihat semua grup\n" +
    "3️⃣ Pilih grup 🔴 = ada pending\n" +
    "4️⃣ Lihat anggota menunggu ACC\n" +
    "5️⃣ Pilih:\n" +
    "   • *ACC Semua* — approve sekaligus\n" +
    "   • *ACC Sebagian* — satu per satu\n\n" +
    "📌 *Support Nomor Internasional:*\n" +
    "Indonesia 🇮🇩, Arab Saudi 🇸🇦, China 🇨🇳,\n" +
    "AS 🇺🇸, India 🇮🇳, Jepang 🇯🇵, dan semua negara lain\n\n" +
    "📌 *Support Semua Karakter:*\n" +
    "Latin, Arab, Cina, Jepang, Korea,\n" +
    "Cyrillic, Thai, Emoji, dan lainnya";

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard });
  }
}

// ════════════════════════════════════════════════
// Menu Utama (kembali)
// ════════════════════════════════════════════════
export async function handleMenuUtama(ctx) {
  const keyboard = new InlineKeyboard()
    .text("📋 Daftar Grup", "menu_grup")
    .row()
    .text("➕ Tambah Anggota Manual", "menu_tambah_anggota")
    .row()
    .text("ℹ️ Bantuan", "menu_bantuan");

  await ctx.editMessageText(
    `${HEADER}Pilih menu:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
}

// ════════════════════════════════════════════════
// Escape MarkdownV2
// ════════════════════════════════════════════════
export function escMd(text) {
  if (!text) return "";
  return String(text).replace(/[_*[\]()~`>#+=|{}.!\\-]/g, "\\$&");
}
