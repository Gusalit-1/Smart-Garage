<?php
include 'includes/config.php';
$folder = "src/assets/img/captures/";
$filename = "img_" . time() . ".jpg";

if (move_uploaded_file($_FILES["imageFile"]["tmp_name"], $folder . $filename)) {
    mysqli_query($conn, "INSERT INTO garage_logs (username, aktivitas, foto) VALUES ('ESP32-CAM', 'Capture Keamanan', '$filename')");
}
?>