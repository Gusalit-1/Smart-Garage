<?php
include 'includes/config.php';

// Gunakan $_REQUEST agar bisa menerima data POST (dari ESP32) maupun GET (untuk tes manual)
if (isset($_REQUEST['uid'])) {
    
    // 1. Ambil data UID dan bersihkan
    $uid = trim($_REQUEST['uid']);
    
    // 2. Cari pemilik berdasarkan UID di tabel rfid_cards (Prepared Statement)
    $stmt = $conn->prepare("SELECT pemilik FROM rfid_cards WHERE uid_tag = ?");
    $stmt->bind_param("s", $uid);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();

    if ($data) {
        $user = $data['pemilik'];
        $aksi = "AKSES GRANTED";
    } else {
        $user = "STRANGER";
        $aksi = "AKSES DENIED (UID: $uid)";
    }
    
    // 3. Insert ke tabel garage_logs (Prepared Statement)
    $stmt2 = $conn->prepare("INSERT INTO garage_logs (username, aktivitas, foto) VALUES (?, ?, '')");
    $stmt2->bind_param("ss", $user, $aksi);
    $insert = $stmt2->execute();
    
    if ($insert) {
        echo "OK: Berhasil simpan log untuk $user";
    } else {
        echo "DATABASE_ERROR: " . $stmt2->error;
    }
    $stmt2->close();
} else {
    echo "READY: Menunggu data UID dari ESP32.";
    echo "<br>Tes Manual: <a href='?uid=77 97 35 02'>Klik Untuk Simulasikan Tap Kartu</a>";
}
?>
