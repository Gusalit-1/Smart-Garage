<?php
session_start();
session_unset();
session_destroy();

// Redirect ke halaman login dengan pesan
header("location:index.html?pesan=logout");
exit;
?>