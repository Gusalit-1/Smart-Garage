<?php
include 'includes/config.php';

// Gunakan __DIR__ agar path-nya absolut dan tidak bingung
$folder = __DIR__ . "/src/assets/img/captures/";
$filename = "capture_live.jpg"; // Kita pakai nama tetap agar mudah dipanggil

// Cek apakah folder ada, jika tidak buat foldernya
if (!file_exists($folder)) {
    mkdir($folder, 0777, true);
}

if (isset($_FILES["imageFile"])) {
    $temp_name = $_FILES["imageFile"]["tmp_name"];
    $destination = $folder . $filename;

    if (move_uploaded_file($temp_name, $destination)) {
        // Update database agar kolom foto di log terakhir terisi
        $sql = "UPDATE garage_logs 
                SET foto = '$filename' 
                WHERE (foto IS NULL OR foto = '') 
                ORDER BY id DESC LIMIT 1";
        mysqli_query($conn, $sql);
        
        echo "SUCCESS: File disimpan di " . $destination;
    } else {
        echo "ERROR: Gagal memindahkan file. Cek izin folder!";
    }
} else {
    echo "ERROR: Tidak ada data imageFile dari ESP32.";
}
?>