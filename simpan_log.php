<?php
include 'includes/config.php';

// Gunakan $_REQUEST agar bisa dites lewat Browser (GET) maupun ESP32 (POST)
if (isset($_REQUEST['uid'])) {
    // Ambil data dan bersihkan
    $uid = trim(mysqli_real_escape_string($conn, $_REQUEST['uid']));
    
    // 1. Cari pemilik berdasarkan UID
    $query = mysqli_query($conn, "SELECT pemilik FROM rfid_cards WHERE uid_tag = '$uid'");
    $data = mysqli_fetch_assoc($query);

    if ($data) {
        $user = $data['pemilik'];
        $aksi = "AKSES GRANTED";
    } else {
        $user = "STRANGER";
        $aksi = "AKSES DENIED (UID: $uid)";
    }
    
    // 2. Insert ke tabel log (Pastikan nama kolom: username, aktivitas, foto)
    // Kita set foto jadi string kosong agar tidak NULL
    $sql = "INSERT INTO garage_logs (username, aktivitas, foto) VALUES ('$user', '$aksi', '')";
    $insert = mysqli_query($conn, $sql);
    
    if ($insert) {
        echo "OK: Berhasil simpan log untuk $user";
    } else {
        // Jika gagal, tampilkan error SQL-nya apa
        echo "DATABASE_ERROR: " . mysqli_error($conn);
    }
} else {
    // Pesan ini muncul jika kamu buka via browser tanpa ?uid=...
    echo "READY: Menunggu data UID. <br>Tes Manual: <a href='?uid=77 97 35 02'>Klik di sini untuk Tes Log</a>";
}
?>