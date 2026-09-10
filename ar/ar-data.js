/* =========================================================
   AR_DATA — Pemetaan targetIndex (0-37) ke:
   - file model 3D (.glb) di folder /3d/
   - file audio (.mp3) di folder /audio/
   - referensi ke FOOD_DATA (islandId + provIndex) untuk teks

   PENTING: urutan array ini HARUS sama persis dengan urutan
   gambar yang di-upload ke MindAR Image Target Compiler,
   karena targetIndex ditentukan dari urutan upload (0-based).
   ========================================================= */

const AR_DATA = [
  { no: 1,  glb: "1_Mie Aceh_Aceh.glb",                          audio: "1_Mie Aceh_Aceh.mp3",                          islandId: "sumatra",     provIndex: 0 },
  { no: 2,  glb: "2_Bika Ambon_Sumatera Utara.glb",               audio: "2_Bika Ambon_Sumatera Utara.mp3",               islandId: "sumatra",     provIndex: 1 },
  { no: 3,  glb: "3_Rendang_Sumatera Barat.glb",                  audio: "3_Rendang_Sumatera Barat.mp3",                  islandId: "sumatra",     provIndex: 2 },
  { no: 4,  glb: "4_Gulai Ikan Patin_Riau.glb",                   audio: "4_Gulai Ikan Patin_Riau.mp3",                   islandId: "sumatra",     provIndex: 3 },
  { no: 5,  glb: "5_Otak-Otak_Kepulauan Riau.glb",                audio: "5_Otak-Otak_Kepulauan Riau.mp3",                islandId: "sumatra",     provIndex: 4 },
  { no: 6,  glb: "6_Tempoyak Ikan Patin_Jambi.glb",                audio: "6_Tempoyak Ikan Patin_Jambi.mp3",                islandId: "sumatra",     provIndex: 5 },
  { no: 7,  glb: "7_Pempek_Sumatera Selatan.glb",                 audio: "7_Pempek_Sumatera Selatan.mp3",                 islandId: "sumatra",     provIndex: 6 },
  { no: 8,  glb: "8_Pendap_Bengkulu.glb",                         audio: "8_Pendap_Bengkulu.mp3",                         islandId: "sumatra",     provIndex: 7 },
  { no: 9,  glb: "9_Seruit_Lampung.glb",                          audio: "9_Seruit_Lampung.mp3",                          islandId: "sumatra",     provIndex: 8 },
  { no: 10, glb: "10_Lempah Kuning_Kep. Bangka Belitung.glb",      audio: "10_Lempah Kuning_Kep. Bangka Belitung.mp3",      islandId: "sumatra",     provIndex: 9 },

  { no: 11, glb: "11_Sate Bandeng_Banten.glb",                    audio: "11_Sate Bandeng_Banten.mp3",                    islandId: "jawa",        provIndex: 0 },
  { no: 12, glb: "12_Kerak Telor_Jakarta.glb",                    audio: "12_Kerak Telor_Jakarta.mp3",                    islandId: "jawa",        provIndex: 1 },
  { no: 13, glb: "13_Nasi Timbel_Jawa Barat.glb",                 audio: "13_Nasi Timbel_Jawa Barat.mp3",                 islandId: "jawa",        provIndex: 2 },
  { no: 14, glb: "14_Lumpia Semarang_Jawa Tengah.glb",             audio: "14_Lumpia Semarang_Jawa Tengah.mp3",             islandId: "jawa",        provIndex: 3 },
  { no: 15, glb: "15_Gudeg_DIY.glb",                              audio: "15_Gudeg_DIY.mp3",                              islandId: "jawa",        provIndex: 4 },
  { no: 16, glb: "16_Rawon_Jawa Timur.glb",                       audio: "16_Rawon_Jawa Timur.mp3",                       islandId: "jawa",        provIndex: 5 },

  { no: 17, glb: "17_Ayam Betutu_Bali.glb",                       audio: "17_Ayam Betutu_Bali.mp3",                       islandId: "bali-nusra",  provIndex: 0 },
  { no: 18, glb: "18_Ayam Taliwang_NTB.glb",                      audio: "18_Ayam Taliwang_NTB.mp3",                      islandId: "bali-nusra",  provIndex: 1 },
  { no: 19, glb: "19_Sei Sapi_NTT.glb",                           audio: "19_Sei Sapi_NTT.mp3",                           islandId: "bali-nusra",  provIndex: 2 },

  { no: 20, glb: "20_Bubur Pedas Sambas_Kalbar.glb",               audio: "20_Bubur Pedas Sambas_Kalbar.mp3",               islandId: "kalimantan",  provIndex: 0 },
  { no: 21, glb: "21_Juhu Singkah_Kalteng.glb",                   audio: "21_Juhu Singkah_Kalteng.mp3",                   islandId: "kalimantan",  provIndex: 1 },
  { no: 22, glb: "22_Soto Banjar_Kalsel.glb",                     audio: "22_Soto Banjar_Kalsel.mp3",                     islandId: "kalimantan",  provIndex: 2 },
  { no: 23, glb: "23_Nasi Bekepor_Kaltim.glb",                    audio: "23_Nasi Bekepor_Kaltim.mp3",                    islandId: "kalimantan",  provIndex: 3 },
  { no: 24, glb: "24_Kepiting Soka_Kaltara.glb",                  audio: "24_Kepiting Soka_Kaltara.mp3",                  islandId: "kalimantan",  provIndex: 4 },

  { no: 25, glb: "25_Tinutuan_Sulawesi Utara.glb",                audio: "25_Tinutuan_Sulawesi Utara.mp3",                islandId: "sulawesi",    provIndex: 0 },
  { no: 26, glb: "26_ Binte Biluhuta_Gorontalo.glb",              audio: "26_ Binte Biluhuta_Gorontalo.mp3",              islandId: "sulawesi",    provIndex: 1 },
  { no: 27, glb: "27_Kaledo_Sulawesi Tengah.glb",                 audio: "27_Kaledo_Sulawesi Tengah.mp3",                 islandId: "sulawesi",    provIndex: 2 },
  { no: 28, glb: "28_Jepa_Sulawesi Barat.glb",                    audio: "28_Jepa_Sulawesi Barat.mp3",                    islandId: "sulawesi",    provIndex: 3 },
  { no: 29, glb: "29_Coto Makassar_Sulawesi Selatan.glb",          audio: "29_Coto Makassar_Sulawesi Selatan.mp3",          islandId: "sulawesi",    provIndex: 4 },
  { no: 30, glb: "30_Sinonggi_Sulawesi Tenggara.glb",             audio: "30_Sinonggi_Sulawesi Tenggara.mp3",             islandId: "sulawesi",    provIndex: 5 },

  { no: 31, glb: "31_Papeda_Maluku.glb",                          audio: "31_Papeda_Maluku.mp3",                          islandId: "maluku",      provIndex: 0 },
  { no: 32, glb: "32_Gohu Ikan_Maluku Utara.glb",                 audio: "32_Gohu Ikan_Maluku Utara.mp3",                 islandId: "maluku",      provIndex: 1 },

  { no: 33, glb: "33_Ikan Bakar Manokwari_Papua Barat.glb",        audio: "33_Ikan Bakar Manokwari_Papua Barat.mp3",        islandId: "papua",       provIndex: 0 },
  { no: 34, glb: "34_Sagu Lempeng_Papua Barat Daya.glb",           audio: "34_Sagu Lempeng_Papua Barat Daya.mp3",           islandId: "papua",       provIndex: 1 },
  { no: 35, glb: "35_Papeda Ikan Kuah Kuning_Papua.glb",           audio: "35_Papeda Ikan Kuah Kuning_Papua.mp3",           islandId: "papua",       provIndex: 2 },
  { no: 36, glb: "36_Ulat Sagu_Papua Tengah.glb",                 audio: "36_Ulat Sagu_Papua Tengah.mp3",                 islandId: "papua",       provIndex: 3 },
  { no: 37, glb: "37_Ubi Bakar_Papua Pegunungan.glb",             audio: "37_Ubi Bakar_Papua Pegunungan.mp3",             islandId: "papua",       provIndex: 4 },
  { no: 38, glb: "38_Sagu Sep_Papua Selatan.glb",                 audio: "38_Sagu Sep_Papua Selatan.mp3",                 islandId: "papua",       provIndex: 5 },
];

/* Helper: ambil data lengkap (AR + teks FOOD_DATA) berdasarkan targetIndex */
function getArDataByIndex(targetIndex) {
  const ref = AR_DATA[targetIndex];
  if (!ref) return null;
  const food = getFoodByRef(ref.islandId, ref.provIndex);
  return { ...ref, provinsi: food ? food.provinsi : '', makanan: food ? food.makanan : '', deskripsi: food ? food.deskripsi : '' };
}

/* =========================================================
   AR_ADJUST — Koreksi per-model (karena tiap file .glb bisa
   punya orientasi sumbu berbeda tergantung software asalnya)

   Isi berdasarkan NOMOR MAKANAN (bukan targetIndex), supaya
   mudah dicocokkan dengan nama file.

   - rotX/rotY/rotZ : rotasi koreksi dalam DERAJAT (bukan radian)
   - scaleMultiplier : kalikan ukuran default (1 = normal,
     1.3 = 30% lebih besar dari default, dst)

   Default kalau nomor TIDAK ada di sini: rotX 90, rotY 0, rotZ 0, scaleMultiplier 1
   Silakan tambah/ubah baris untuk makanan yang modelnya masih
   terbalik/miring/kekecilan setelah dicoba di HP.
   ========================================================= */
const AR_ADJUST = {
   12: { rotX: -90, rotY: 0, rotZ: 0, scaleMultiplier: 1 }
   10: { rotX: -90, rotY: 0, rotZ: 0, scaleMultiplier: 1 }
  // Contoh cara pakai (hapus tanda // dan sesuaikan angkanya):
  // 10: { rotX: -90, rotY: 0, rotZ: 0, scaleMultiplier: 1.2 },  // Lempah Kuning
  // 3:  { rotX: 90, rotY: 180, rotZ: 0, scaleMultiplier: 1 },   // Rendang
};

function getAdjustFor(foodNumber) {
  return Object.assign(
    { rotX: 90, rotY: 0, rotZ: 0, scaleMultiplier: 1 },
    AR_ADJUST[foodNumber] || {}
  );
}
