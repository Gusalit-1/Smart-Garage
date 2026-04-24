<?php
include 'includes/config.php';

if (isset($_POST['uid'])) {
    // Ambil data dan bersihkan spasi di awal/akhir
    $uid = trim(mysqli_real_escape_string($conn, $_POST['uid']));
    
    // Cari pemilik berdasarkan UID
    $query = mysqli_query($conn, "SELECT pemilik FROM rfid_cards WHERE uid_tag = '$uid'");
    $data = mysqli_fetch_assoc($query);

    if ($data) {
        $user = $data['pemilik'];
        $aksi = "AKSES GRANTED";
    } else {
        $user = "STRANGER";
        $aksi = "AKSES DENIED (UID: $uid)";
    }
    
    // Insert ke tabel log
    $sql = "INSERT INTO garage_logs (username, aktivitas, waktu) VALUES ('$user', '$aksi', NOW())";
    $insert = mysqli_query($conn, $sql);
    
    if ($insert) {
        echo "OK: Berhasil simpan log untuk $user";
    } else {
        echo "ERROR DB: " . mysqli_error($conn);
    }
} else {
    echo "Menunggu kiriman data POST 'uid' dari ESP32...";
}
?>