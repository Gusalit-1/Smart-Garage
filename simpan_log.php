<?php
include 'includes/config.php';
if (isset($_REQUEST['uid'])) {
    
    $uid = trim($_REQUEST['uid']);
   
    $nama_foto = "capture_live.jpg"; 

  
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
    
    $stmt2 = $conn->prepare("INSERT INTO garage_logs (username, aktivitas, foto) VALUES (?, ?, ?)");
    $stmt2->bind_param("sss", $user, $aksi, $nama_foto);
    $insert = $stmt2->execute();
    
    if ($insert) {
        echo "OK: Berhasil simpan log dan referensi foto untuk $user";
    } else {
        echo "DATABASE_ERROR: " . $stmt2->error;
    }
    $stmt2->close();

} else {
    echo "READY: Menunggu data UID dari ESP32.";
    echo "<br>Tes Manual: <a href='?uid=77 97 35 02'>Klik Untuk Simulasikan Tap Kartu</a>";
}
?>