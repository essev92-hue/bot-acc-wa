// index.js
// Entry point Bot Telegram ACC WhatsApp - Node.js / grammY
// Deploy-ready untuk Railway (webhook mode) atau lokal (polling mode)

import "dotenv/config";
import express from "express";
import { Bot, webhookCallback } from "grammy";
import {
  handleStart,
  handleMenuGrup,
  handleDetailGrup,
  handleAccSemua,
  handleAccSebagian,
  handleAccSatu,
  handleTambahGrup,
  handleTambahAnggota,
  handleBantuan,
  handleMenuUtama,
  isAdmin,
  escMd,
} from "./handlers.js";
import { formatPhone, normalizeName } from "./phoneUtils.js";
import { addGroup, addPendingMember, getGroupNames } from "./db.js";

// ─────────────────────────────────────────────
// Validasi env
// ─────────────────────────────────────────────
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN || TOKEN === "ISI_TOKEN_DISINI") {
  console.error("❌ BOT_TOKEN belum diisi di environment variables!");
  process.exit(1);
}

const MODE = process.env.MODE ?? "polling";
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? "";

// ─────────────────────────────────────────────
// Inisialisasi Bot
// ─────────────────────────────────────────────
const bot = new Bot(TOKEN);

// ─────────────────────────────────────────────
// State sesi sederhana (in-memory, per user)
// ─────────────────────────────────────────────
const sessionStore = new Map();

function getSession(userId) {
  return sessionStore.get(userId) ?? {};
}
function setSession(userId, data) {
  sessionStore.set(userId, data);
}
function clearSession(userId) {
  sessionStore.delete(userId);
}

// ════════════════════════════════════════════════
// COMMAND HANDLERS
// ════════════════════════════════════════════════
bot.command("start", handleStart);
bot.command("help", handleBantuan);

// ─────────────────────────────────────────────
// Perintah tambah grup via command: /addgroup Nama Grup
// ─────────────────────────────────────────────
bot.command("addgroup", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("⛔ Akses ditolak.");
  const args = ctx.message?.text?.slice("/addgroup".length).trim();
  if (!args) {
    return ctx.reply("⚠️ Format: `/addgroup Nama Grup`", { parse_mode: "Markdown" });
  }
  const groupName = normalizeName(args);
  const created = addGroup(groupName);
  if (created) {
    await ctx.reply(`✅ Grup *${groupName}* berhasil ditambahkan!`, {
      parse_mode: "Markdown",
    });
  } else {
    await ctx.reply(`⚠️ Grup *${groupName}* sudah ada.`, { parse_mode: "Markdown" });
  }
});

// ─────────────────────────────────────────────
// Perintah tambah anggota via command:
// /addmember NamaGrup | Nama Anggota | +628xxxx
// ─────────────────────────────────────────────
bot.command("addmember", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("⛔ Akses ditolak.");
  const args = ctx.message?.text?.slice("/addmember".length).trim() ?? "";
  const parts = args.split("|").map((s) => s.trim());

  if (parts.length < 3) {
    return ctx.reply(
      "⚠️ Format: `/addmember NamaGrup | Nama Anggota | +628xxxx`\n\n" +
        "_Contoh:_\n`/addmember Grup RT 05 | Budi Santoso | +6281234567890`",
      { parse_mode: "Markdown" }
    );
  }

  const [groupName, namaRaw, nomorRaw] = parts;
  const nama = normalizeName(namaRaw);
  const phone = formatPhone(nomorRaw);

  if (!phone.valid) {
    return ctx.reply(
      `⚠️ Nomor tidak valid: \`${nomorRaw}\`\n` +
        "Gunakan format internasional: +6281234567890",
      { parse_mode: "Markdown" }
    );
  }

  addPendingMember(groupName, { nama, nomor: phone.formatted, negara: phone.country });

  await ctx.reply(
    `✅ Anggota ditambahkan ke *${groupName}*:\n` +
      `👤 ${phone.flag} *${nama}*\n` +
      `📞 \`${phone.formatted}\``,
    { parse_mode: "Markdown" }
  );
});

// ════════════════════════════════════════════════
// CALLBACK QUERY ROUTER
// ════════════════════════════════════════════════
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCallbackQuery(); // acknowledge immediately

  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({ text: "⛔ Akses ditolak", show_alert: true });
  }

  // ── Menu navigasi ──
  if (data === "menu_utama") return handleMenuUtama(ctx);
  if (data === "menu_grup") return handleMenuGrup(ctx);
  if (data === "menu_bantuan") return handleBantuan(ctx);
  if (data === "menu_tambah_anggota") return handleTambahAnggota(ctx);
  if (data === "tambah_grup") return handleTambahGrup(ctx);

  // ── Detail grup: "grup|NamaGrup" ──
  if (data.startsWith("grup|")) {
    const groupName = data.slice(5);
    return handleDetailGrup(ctx, groupName);
  }

  // ── ACC Semua: "acc_semua|NamaGrup" ──
  if (data.startsWith("acc_semua|")) {
    const groupName = data.slice(10);
    return handleAccSemua(ctx, groupName);
  }

  // ── ACC Sebagian: "acc_sebagian|NamaGrup" ──
  if (data.startsWith("acc_sebagian|")) {
    const groupName = data.slice(13);
    return handleAccSebagian(ctx, groupName);
  }

  // ── ACC Satu: "acc_satu|NamaGrup|index" ──
  if (data.startsWith("acc_satu|")) {
    const parts = data.slice(9).split("|");
    const groupName = parts.slice(0, -1).join("|");
    const index = parseInt(parts[parts.length - 1], 10);
    return handleAccSatu(ctx, groupName, index);
  }

  // ── Pilih grup untuk tambah anggota: "pilih_grup_anggota|NamaGrup" ──
  if (data.startsWith("pilih_grup_anggota|")) {
    const groupName = data.slice(19);
    setSession(ctx.from.id, { waitingFor: "member_data", groupName });
    return ctx.editMessageText(
      `➕ *Tambah Anggota ke ${groupName}*\n` +
        "━━━━━━━━━━━━━━━━━━━━\n\n" +
        "Kirim data dengan format:\n" +
        "`Nama Anggota | +NomorHP`\n\n" +
        "_Contoh:_\n" +
        "`Budi Santoso | +6281234567890`\n" +
        "`محمد علي | +966501234567`\n" +
        "`李明 | +8613812345678`\n\n" +
        "Support semua nomor & karakter dunia! 🌐",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "❌ Batal", callback_data: "menu_grup" }]] },
      }
    );
  }
});

// ════════════════════════════════════════════════
// TEXT MESSAGE HANDLER (untuk input dari sesi)
// ════════════════════════════════════════════════
bot.on("message:text", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const userId = ctx.from.id;
  const session = getSession(userId);
  const text = ctx.message.text.trim();

  // ── Sedang tunggu nama grup baru ──
  if (session.waitingFor === "new_group_name") {
    clearSession(userId);
    const groupName = normalizeName(text);
    const created = addGroup(groupName);
    if (created) {
      await ctx.reply(`✅ Grup *${escMd(groupName)}* berhasil dibuat\\!`, {
        parse_mode: "MarkdownV2",
      });
    } else {
      await ctx.reply(`⚠️ Grup *${escMd(groupName)}* sudah ada\\.`, {
        parse_mode: "MarkdownV2",
      });
    }
    return;
  }

  // ── Sedang tunggu data anggota baru ──
  if (session.waitingFor === "member_data") {
    const parts = text.split("|").map((s) => s.trim());
    if (parts.length < 2) {
      return ctx.reply(
        "⚠️ Format salah\\. Gunakan:\n`Nama | \\+Nomor`",
        { parse_mode: "MarkdownV2" }
      );
    }

    const nama = normalizeName(parts[0]);
    const phone = formatPhone(parts[1]);

    if (!phone.valid) {
      return ctx.reply(
        `⚠️ Nomor tidak valid: \`${escMd(parts[1])}\`\n` +
          "Gunakan format internasional: \\+6281234567890",
        { parse_mode: "MarkdownV2" }
      );
    }

    const { groupName } = session;
    clearSession(userId);

    addPendingMember(groupName, {
      nama,
      nomor: phone.formatted,
      negara: phone.country,
    });

    await ctx.reply(
      `✅ Anggota ditambahkan ke *${escMd(groupName)}*:\n` +
        `${phone.flag} *${escMd(nama)}*\n` +
        `📞 \`${escMd(phone.formatted)}\``,
      {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 Lihat Grup", callback_data: `grup|${groupName}` }],
            [{ text: "🏠 Menu Utama", callback_data: "menu_utama" }],
          ],
        },
      }
    );
    return;
  }

  // Pesan lain
  await ctx.reply("Ketik /start untuk membuka menu bot.");
});

// ════════════════════════════════════════════════
// ERROR HANDLER
// ════════════════════════════════════════════════
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`❌ Error update ${ctx?.update?.update_id}:`, err.error);
});

// ════════════════════════════════════════════════
// START BOT
// ════════════════════════════════════════════════
async function startBot() {
  if (MODE === "webhook" && WEBHOOK_URL) {
    // ── Webhook Mode (Railway / Production) ──
    const app = express();
    app.use(express.json());

    const path = `/webhook/${TOKEN}`;

    // Health check endpoint — Railway butuh ini
    app.get("/", (req, res) => {
      res.json({
        status: "ok",
        bot: "WA ACC Bot",
        mode: "webhook",
        uptime: process.uptime(),
      });
    });

    app.use(path, webhookCallback(bot, "express"));

    app.listen(PORT, () => {
      console.log(`🚀 Server berjalan di port ${PORT}`);
      console.log(`🔗 Webhook path: ${path}`);
    });

    // Daftarkan webhook ke Telegram
    await bot.api.setWebhook(`${WEBHOOK_URL}${path}`);
    console.log(`✅ Webhook terdaftar: ${WEBHOOK_URL}${path}`);
  } else {
    // ── Polling Mode (lokal / development) ──
    console.log("🔄 Berjalan dalam mode polling (development)...");
    await bot.api.deleteWebhook();
    bot.start();
    console.log("✅ Bot aktif (polling mode)!");
  }

  console.log("🤖 Bot ACC WhatsApp siap digunakan!");
}

startBot();
