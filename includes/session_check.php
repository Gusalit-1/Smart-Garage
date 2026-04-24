<?php
session_start();

// Cek apakah user sudah login
if (!isset($_SESSION['status']) || $_SESSION['status'] != "login") {
    header("location:index.html");
    exit;
}

// Logika Auto-Logout 10 Menit (600 detik)
$timeout_duration = 600;

if (isset($_SESSION['last_activity'])) {
    $elapsed_time = time() - $_SESSION['last_activity'];
    
    if ($elapsed_time > $timeout_duration) {
        // Jika lebih dari 10 menit, hancurkan sesi
        session_unset();
        session_destroy();
        header("location:index.html?pesan=expired");
        exit;
    }
}

// Update waktu aktivitas terakhir setiap kali halaman diakses/direfresh
$_SESSION['last_activity'] = time();
?>