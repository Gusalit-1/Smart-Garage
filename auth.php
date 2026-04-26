<?php
session_start();
include 'includes/config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    // Gunakan Prepared Statement untuk keamanan
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
    $stmt->bind_param("ss", $username, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        
        // Simpan data ke session
        $_SESSION['status'] = "login";
        $_SESSION['username'] = $user['username'];
        $_SESSION['last_activity'] = time(); // Simpan timestamp saat ini

        header("location:dashboard.php");
    } else {
        header("location:index.html?pesan=gagal");
    }
    $stmt->close();
}
?>
