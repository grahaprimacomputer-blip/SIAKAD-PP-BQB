import { Pembayaran, Santri } from '../types';
import { formatRupiah, formatDateIndo } from './formatters';

export interface KwitansiItem {
  jenisPembayaran: string;
  jumlah: number;
}

export interface KwitansiReceiptData {
  nomorKwitansi: string;
  tanggal: string;
  nama: string;
  nip?: string;
  nisn?: string;
  nis?: string;
  kelas?: string;
  email: string;
  emailSentAt?: string;
  metode: string;
  keterangan?: string;
  items: KwitansiItem[];
  totalJumlah: number;
}

export function generatePaymentReceiptText(pOrReceipt: Pembayaran | KwitansiReceiptData): {
  subject: string;
  body: string;
  whatsappText: string;
} {
  const isMulti = 'items' in pOrReceipt && Array.isArray((pOrReceipt as KwitansiReceiptData).items);
  const data: KwitansiReceiptData = isMulti
    ? (pOrReceipt as KwitansiReceiptData)
    : {
        nomorKwitansi: (pOrReceipt as Pembayaran).nomorKwitansi,
        tanggal: (pOrReceipt as Pembayaran).tanggal,
        nama: (pOrReceipt as Pembayaran).nama,
        nip: (pOrReceipt as Pembayaran).nip,
        nisn: (pOrReceipt as Pembayaran).nisn,
        nis: (pOrReceipt as Pembayaran).nis,
        kelas: (pOrReceipt as Pembayaran).kelas,
        email: (pOrReceipt as Pembayaran).email,
        emailSentAt: (pOrReceipt as Pembayaran).emailSentAt,
        metode: (pOrReceipt as Pembayaran).metode,
        keterangan: (pOrReceipt as Pembayaran).keterangan,
        items: [{ jenisPembayaran: (pOrReceipt as Pembayaran).jenisPembayaran, jumlah: (pOrReceipt as Pembayaran).jumlah }],
        totalJumlah: (pOrReceipt as Pembayaran).jumlah
      };

  const subject = `[KWITANSI RESMI] Pembayaran PP Baitul Qur'an Belopa - ${data.nama} (${data.nomorKwitansi})`;

  const itemDetailsText = data.items
    .map((it, idx) => `  ${idx + 1}. ${it.jenisPembayaran.padEnd(24)} : ${formatRupiah(it.jumlah)}`)
    .join('\n');

  const waItemsText = data.items
    .map((it, idx) => `• ${it.jenisPembayaran}: *${formatRupiah(it.jumlah)}*`)
    .join('\n');

  const body = `Yth. Wali Santri / Ananda ${data.nama},

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Alhamdulillah, pembayaran syahriah/infaq di Pondok Pesantren Baitul Qur'an Belopa telah kami terima dan tercatat dengan rincian sebagai berikut:

===========================================
BUKTI KWITANSI PEMBAYARAN ELEKTRONIK
PONDOK PESANTREN BAITUL QUR'AN BELOPA
===========================================
Nomor Kwitansi   : ${data.nomorKwitansi}
Tanggal Transaksi: ${formatDateIndo(data.tanggal)}
Nama Santri      : ${data.nama}
NIP Pondok       : ${data.nip || '-'}
NISN Santri      : ${data.nisn || data.nis || '-'}
Kelas            : ${data.kelas || 'Kelas 1'}
Email Santri     : ${data.email}

RINCIAN PEMBAYARAN:
${itemDetailsText}
-------------------------------------------
TOTAL DIBAYARKAN : ${formatRupiah(data.totalJumlah)}
Metode Bayar     : ${data.metode}
Keterangan       : ${data.keterangan || 'Pembayaran syahriah / administrasi santri'}
Status           : LUNAS & TERCATAT RESMI

Jazaakumullaahu khairan katsiiran atas partisipasi dan kerjasamanya dalam mendukung pendidikan para penghafal Al-Qur'an. Semoga berkah dan bernilai ibadah di sisi Allah Subhanahu Wa Ta'ala.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

Hormat kami,
Bagian Keuangan & Administrasi
PP BAITUL QUR'AN BELOPA
Kabupaten Luwu, Sulawesi Selatan`;

  const whatsappText = `*KWITANSI PEMBAYARAN ELEKTRONIK*
*PP BAITUL QUR'AN BELOPA*
-------------------------------------------
📄 No. Kwitansi : *${data.nomorKwitansi}*
📅 Tanggal      : ${formatDateIndo(data.tanggal)}
👤 Nama Santri  : *${data.nama}*
🏷️ NIP / NISN   : ${data.nip || '-'} / ${data.nisn || data.nis || '-'}
🏫 Kelas        : *${data.kelas || 'Kelas 1'}*
🏧 Metode       : ${data.metode}
📝 Keterangan   : ${data.keterangan || '-'}
-------------------------------------------
💳 *RINCIAN PEMBAYARAN:*
${waItemsText}
-------------------------------------------
💰 *TOTAL DIBAYARKAN: ${formatRupiah(data.totalJumlah)}*
✅ Status       : *LUNAS & TERCATAT*
-------------------------------------------
_Jazaakumullaahu Khairan Katsiiran atas pembayaran syahriah / infaq santri._`;

  return { subject, body, whatsappText };
}

export function generateRekapKhususText(
  paramOrSantri: any,
  maybeSummary?: any,
  maybeKelasView?: string
): {
  subject: string;
  body: string;
  whatsappText: string;
} {
  let santri: Santri;
  let kelasView: string | undefined;
  let totalInduk: number = 0;
  let totalBantu: number = 0;
  let grandTotal: number = 0;
  let details: {
    pendaftaran: number;
    uangPangkal: number;
    perlengkapan: number;
    kesehatan: number;
    wali: number;
    wisuda: number;
    yuranMonths: { month: string; paid: number; date?: string }[];
  };

  // Check if called as generateRekapKhususText(santri, summary, kelasView)
  if (maybeSummary && maybeSummary.pendaftaran !== undefined) {
    santri = paramOrSantri;
    const s = maybeSummary;
    kelasView = maybeKelasView || santri.kelas;
    totalInduk = s.totalInduk || 0;
    totalBantu = s.totalBantu || 0;
    grandTotal = s.grandTotal || 0;
    details = {
      pendaftaran: s.pendaftaran?.paid || 0,
      uangPangkal: s.uangPangkal?.paid || 0,
      perlengkapan: s.perlengkapan?.paid || 0,
      kesehatan: s.uangKesehatan?.paid || 0,
      wali: s.pertemuanWali?.paid || 0,
      wisuda: s.wisuda?.paid || 0,
      yuranMonths: [
        { month: 'Juli', paid: s.yuranJuli?.paid || 0, date: s.yuranJuli?.latestDate },
        { month: 'Agustus', paid: s.yuranAgustus?.paid || 0, date: s.yuranAgustus?.latestDate },
        { month: 'September', paid: s.yuranSeptember?.paid || 0, date: s.yuranSeptember?.latestDate },
        { month: 'Oktober', paid: s.yuranOktober?.paid || 0, date: s.yuranOktober?.latestDate },
        { month: 'November', paid: s.yuranNovember?.paid || 0, date: s.yuranNovember?.latestDate },
        { month: 'Desember', paid: s.yuranDesember?.paid || 0, date: s.yuranDesember?.latestDate },
        { month: 'Januari', paid: s.yuranJanuari?.paid || 0, date: s.yuranJanuari?.latestDate },
        { month: 'Februari', paid: s.yuranFebruari?.paid || 0, date: s.yuranFebruari?.latestDate },
        { month: 'Maret', paid: s.yuranMaret?.paid || 0, date: s.yuranMaret?.latestDate },
        { month: 'April', paid: s.yuranApril?.paid || 0, date: s.yuranApril?.latestDate },
        { month: 'Mei', paid: s.yuranMei?.paid || 0, date: s.yuranMei?.latestDate },
        { month: 'Juni', paid: s.yuranJuni?.paid || 0, date: s.yuranJuni?.latestDate }
      ]
    };
  } else {
    // Called with object params
    santri = paramOrSantri.santri;
    kelasView = paramOrSantri.kelasView;
    totalInduk = paramOrSantri.totalInduk;
    totalBantu = paramOrSantri.totalBantu;
    grandTotal = paramOrSantri.grandTotal;
    details = paramOrSantri.details;
  }

  const labelKelas = kelasView || santri.kelas || 'Kelas 1';

  const subject = `[REKAP PEMBAYARAN KHUSUS] ${santri.nama} (${labelKelas}) - PP Baitul Qur'an Belopa`;

  const body = `Yth. Orang Tua / Wali dari ${santri.nama},

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Berikut rincian rekapitulasi Formulir Pembayaran Khusus Santri di Pondok Pesantren Baitul Qur'an Belopa:

===========================================
FORMULIR PEMBAYARAN KHUSUS SANTRI
PP BAITUL QUR'AN BELOPA
===========================================
Nama Santri   : ${santri.nama}
NIP Pondok    : ${santri.nip || '-'}
NISN          : ${santri.nisn || santri.nis || '-'}
Kelas         : ${labelKelas}
Email         : ${santri.email}

A. FORM INDUK SANTRI:
1. Pendaftaran   : ${formatRupiah(details.pendaftaran)}
2. Uang Pangkal  : ${formatRupiah(details.uangPangkal)}
3. Perlengkapan  : ${formatRupiah(details.perlengkapan)}
Subtotal Form Induk: ${formatRupiah(totalInduk)}

B. FORM BANTU SANTRI:
- Uang Kesehatan : ${formatRupiah(details.kesehatan)}
- Pertemuan Wali : ${formatRupiah(details.wali)}
- Wisuda         : ${formatRupiah(details.wisuda)}

Rincian Yuran Bulanan (12 Bulan):
${details.yuranMonths.map(m => `  • ${m.month.padEnd(10)}: ${formatRupiah(m.paid)}${m.date ? ` (Tgl: ${m.date})` : ' (Belum Bayar)'}`).join('\n')}

Subtotal Form Bantu: ${formatRupiah(totalBantu)}

-------------------------------------------
GRAND TOTAL PEMBAYARAN : ${formatRupiah(grandTotal)}
-------------------------------------------

Semoga Allah memberkahi rezeki Bapak/Ibu wali santri sekalian.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
PP Baitul Qur'an Belopa`;

  const whatsappText = `*REKAP PEMBAYARAN KHUSUS SANTRI*
*PP BAITUL QUR'AN BELOPA*
-------------------------------------------
👤 *Nama Santri* : *${santri.nama}*
🏷️ NIP / NISN    : ${santri.nip || '-'} / ${santri.nisn || santri.nis || '-'}
🏫 *Kelas*       : *${labelKelas}*
📧 Email         : ${santri.email}

📋 *FORM INDUK:*
• Pendaftaran  : ${formatRupiah(details.pendaftaran)}
• Uang Pangkal : ${formatRupiah(details.uangPangkal)}
• Perlengkapan : ${formatRupiah(details.perlengkapan)}
*Subtotal Induk: ${formatRupiah(totalInduk)}*

📋 *FORM BANTU & YURAN:*
• Kesehatan : ${formatRupiah(details.kesehatan)}
• Yuran Bulanan Terbayar:
${details.yuranMonths.filter(m => m.paid > 0).map(m => `  ✓ ${m.month}: ${formatRupiah(m.paid)} (${m.date || 'Lunas'})`).join('\n') || '  (Belum ada yuran bulanan tercatat)'}
• Wali & Wisuda: ${formatRupiah(details.wali + details.wisuda)}
*Subtotal Bantu: ${formatRupiah(totalBantu)}*

-------------------------------------------
🌟 *GRAND TOTAL: ${formatRupiah(grandTotal)}*
-------------------------------------------
_PP Baitul Qur'an Belopa - Kab. Luwu_`;

  return { subject, body, whatsappText };
}

// Buka compose email di Gmail Web
export function openGmailWeb(to: string, subject: string, body: string) {
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Buka compose email via mailto: (aplikasi email komputer/HP)
export function openDefaultMailClient(to: string, subject: string, body: string) {
  const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

// Salin teks ke clipboard
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

// Buka WhatsApp Web / Aplikasi WhatsApp
export function openWhatsAppWebOrApp(phone?: string, text: string = '') {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  let formattedPhone = cleanPhone;
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  }
  const encoded = encodeURIComponent(text);
  const url = formattedPhone 
    ? `https://wa.me/${formattedPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

