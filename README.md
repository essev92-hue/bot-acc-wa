# 🤖 Bot Telegram — ACC Anggota WhatsApp Grup

Bot Telegram berbasis **Node.js** untuk approve (ACC) anggota baru WhatsApp
langsung dari Telegram. Support **semua nomor telepon dunia** dan **semua karakter Unicode**.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 📋 Daftar Grup | Lihat semua grup + jumlah pending |
| ✅ ACC Semua | Approve semua anggota sekaligus |
| ☑️ ACC Sebagian | Pilih anggota satu per satu |
| 🌐 Nomor Internasional | Support +62, +1, +44, +86, +91, dll |
| 🔤 Unicode Penuh | Arab, Cina, Jepang, Korea, Cyrillic, Emoji |
| 🏁 Bendera Otomatis | Deteksi negara & tampilkan emoji bendera |
| ➕ Tambah Grup | Tambah grup baru via menu/command |
| ➕ Tambah Anggota | Input manual via menu/command |
| 🔒 Multi-Admin | Beberapa admin bisa diset |

---

## 🚀 Deploy ke Railway (Cara Tercepat)

### Langkah 1 — Siapkan Bot Telegram
1. Chat ke **@BotFather** → `/newbot`
2. Catat **TOKEN** yang diberikan
3. Chat ke **@userinfobot** → catat **ID** Telegram Anda

### Langkah 2 — Upload ke GitHub
```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/USERNAME/wa-acc-bot.git
git push -u origin main
```

### Langkah 3 — Deploy di Railway
1. Buka [railway.app](https://railway.app) → **New Project**
2. Pilih **Deploy from GitHub repo** → pilih repo Anda
3. Buka tab **Variables** → tambahkan:

```
BOT_TOKEN        = token_dari_botfather
ADMIN_IDS        = 123456789
MODE             = webhook
WEBHOOK_URL      = (kosongkan dulu, isi setelah deploy)
```

4. Klik **Deploy** — tunggu build selesai
5. Buka tab **Settings** → **Domains** → Generate Domain
6. Copy URL (contoh: `https://wa-acc-bot-production.up.railway.app`)
7. Kembali ke **Variables** → isi `WEBHOOK_URL` dengan URL tersebut
8. Railway akan redeploy otomatis ✅

### Langkah 4 — Test Bot
Buka Telegram → cari bot Anda → ketik `/start`

---

## 💻 Jalankan Lokal (Development)

```bash
# Clone / download project
cd wa-acc-bot

# Install dependensi
npm install

# Buat file .env
cp .env.example .env
# Edit .env: isi BOT_TOKEN dan ADMIN_IDS
# Set MODE=polling untuk lokal

# Jalankan
npm run dev
```

---

## 📱 Cara Pakai

```
/start              → Menu utama
/addgroup NamaGrup  → Tambah grup baru
/addmember NamaGrup | Nama | +Nomor  → Tambah anggota manual
/help               → Panduan
```

### Alur Normal:
```
📋 Daftar Grup
  → Pilih grup (🔴 ada pending)
  → Lihat daftar anggota + nomor internasional + bendera negara
  → [✅ ACC Semua] atau [☑️ ACC Sebagian]
  → Selesai!
```

---

## 🌐 Format Nomor Telepon

Bot otomatis menormalisasi semua format:

| Input | Hasil |
|---|---|
| `08123456789` | `+62 812-3456-789 🇮🇩` |
| `+6281234567890` | `+62 812-3456-7890 🇮🇩` |
| `+14155552671` | `+1 415-555-2671 🇺🇸` |
| `+447911123456` | `+44 7911 123456 🇬🇧` |
| `+8613812345678` | `+86 138 1234 5678 🇨🇳` |
| `+966501234567` | `+966 50 123 4567 🇸🇦` |

---

## 🔗 Integrasi WhatsApp

File `data.json` adalah database anggota pending. Format:

```json
{
  "groups": {
    "Nama Grup WA": {
      "pending": [
        { "nama": "Budi", "nomor": "+6281234567890", "negara": "ID" }
      ]
    }
  }
}
```

Untuk integrasi otomatis dengan WhatsApp (deteksi join request), tambahkan
script terpisah menggunakan **WhatsApp Business API** atau **whatsapp-web.js**
yang menulis ke `data.json` secara real-time.

---

## ❓ Troubleshooting

| Masalah | Solusi |
|---|---|
| Bot tidak merespons | Cek `BOT_TOKEN` benar |
| "Akses ditolak" | Tambahkan User ID ke `ADMIN_IDS` |
| Webhook error | Pastikan `WEBHOOK_URL` diisi dengan HTTPS Railway |
| Deploy gagal | Pastikan `node >= 18` di railway.toml |
