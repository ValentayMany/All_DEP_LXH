<?php

function handle_auth_login(): void
{
    $body = read_json_body();
    $username = trim((string) ($body['username'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if ($username === '' || $password === '') {
        json_response(['success' => false, 'message' => 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ']);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();

    if (!$row) {
        json_response(['success' => false, 'message' => 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ']);
    }

    $stored = (string) $row['password'];
    $ok = password_verify($password, $stored);
    if (!$ok && !str_starts_with($stored, '$2')) {
        $ok = hash_equals($stored, $password);
    }
    if (!$ok) {
        json_response(['success' => false, 'message' => 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ']);
    }

    $user = [
        'id' => $row['id'],
        'username' => $row['username'],
        'fullname' => $row['fullname'],
        'department' => $row['department'],
        'role' => $row['role'],
    ];

    $secret = env('JWT_SECRET');
    if (!$secret) {
        json_response(['success' => false, 'message' => 'JWT_SECRET not configured'], 500);
    }

    $token = jwt_encode($user, $secret);
    json_response(['success' => true, 'user' => $user, 'token' => $token]);
}

function handle_auth_register(): void
{
    $body = read_json_body();
    $username = trim((string) ($body['username'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $fullname = trim((string) ($body['fullname'] ?? ''));
    $department = trim((string) ($body['department'] ?? ''));

    if ($username === '' || $password === '' || $fullname === '' || $department === '') {
        json_response(['success' => false, 'message' => 'ກະລຸນາຕື່ມຂໍ້ມູນໃຫ້ຄົບ']);
    }

    $check = db()->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $check->execute([$username]);
    if ($check->fetch()) {
        json_response(['success' => false, 'message' => 'ຊື່ຜູ້ໃຊ້ນີ້ຖືກໃຊ້ແລ້ວ']);
    }

    $id = uuid_v4();
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = db()->prepare(
        'INSERT INTO users (id, username, password, fullname, department, role) VALUES (?, ?, ?, ?, ?, ?)'
    );
    try {
        $stmt->execute([$id, $username, $hash, $fullname, $department, 'user']);
    } catch (PDOException $e) {
        json_response(['success' => false, 'message' => $e->getMessage()]);
    }

    json_response(['success' => true]);
}

function uuid_v4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
