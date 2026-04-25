<?php
session_start();
include 'includes/config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $password = $_POST['password']; // Di dunia nyata, gunakan password_verify()

    // Query cek user (Contoh sederhana, sesuaikan dengan tabelmu)
    $query  = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
    $result = mysqli_query($conn, $query);

    if (mysqli_num_rows($result) > 0) {
        $user = mysqli_fetch_assoc($result);
        
        // Simpan data ke session
        $_SESSION['status'] = "login";
        $_SESSION['username'] = $user['username'];
        $_SESSION['last_activity'] = time(); // Simpan timestamp saat ini

        header("location:dashboard.php");
    } else {
        header("location:index.html?pesan=gagal");
    }
}
?>