<?php
// Tentukan path lengkap dari root project
$target_dir = "src/assets/img/captures/";
$file_name = "capture_live.jpg";
$target_file = $target_dir . $file_name;

// Pastikan folder ada
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_FILES['imageFile'])) {
    if (move_uploaded_file($_FILES['imageFile']['tmp_name'], $target_file)) {
        echo "OK: File berhasil disimpan di " . $target_file;
    } else {
        echo "ERROR: Gagal memindahkan file.";
    }
} else {
    echo "ERROR: Data tidak valid atau file imageFile tidak ada.";
}
?>