<?php

function handle_approvers_list(array $user): void
{
    if (($user['role'] ?? '') !== 'admin') {
        json_response(['success' => false, 'message' => 'ບໍ່ມີສິດເຂົ້າເຖິງ'], 403);
    }

    $stmt = db()->query(
        'SELECT id, name, department, is_active, created_at FROM approvers ORDER BY department, name'
    );
    json_response(['success' => true, 'data' => $stmt->fetchAll()]);
}

function handle_approvers_active(): void
{
    $dept = trim((string) ($_GET['dept'] ?? ''));
    if ($dept !== '') {
        $stmt = db()->prepare(
            'SELECT name FROM approvers WHERE is_active = 1 AND department = ? ORDER BY name'
        );
        $stmt->execute([$dept]);
        $names = array_column($stmt->fetchAll(), 'name');
        json_response(['success' => true, 'data' => $names]);
    }

    $stmt = db()->query(
        'SELECT name, department FROM approvers WHERE is_active = 1 ORDER BY name'
    );
    json_response(['success' => true, 'data' => $stmt->fetchAll()]);
}

function handle_approvers_create(array $user): void
{
    if (($user['role'] ?? '') !== 'admin') {
        json_response(['success' => false, 'message' => 'ບໍ່ມີສິດທິໃນການດຳເນີນການ'], 403);
    }

    $body = read_json_body();
    $name = trim((string) ($body['name'] ?? ''));
    $department = trim((string) ($body['department'] ?? ''));
    if ($name === '' || $department === '') {
        json_response(['success' => false, 'message' => 'ກະລຸນາຕື່ມຂໍ້ມູນໃຫ້ຄົບ']);
    }

    $id = uuid_v4();
    $stmt = db()->prepare(
        'INSERT INTO approvers (id, name, department, is_active) VALUES (?, ?, ?, 1)'
    );
    try {
        $stmt->execute([$id, $name, $department]);
    } catch (PDOException $e) {
        json_response(['success' => false, 'message' => $e->getMessage()]);
    }
    json_response(['success' => true]);
}

function handle_approvers_update(array $user, string $id): void
{
    if (($user['role'] ?? '') !== 'admin') {
        json_response(['success' => false, 'message' => 'ບໍ່ມີສິດທິໃນການດຳເນີນການ'], 403);
    }

    $body = read_json_body();
    $fields = [];
    $params = [];

    if (array_key_exists('name', $body)) {
        $fields[] = 'name = ?';
        $params[] = trim((string) $body['name']);
    }
    if (array_key_exists('department', $body)) {
        $fields[] = 'department = ?';
        $params[] = trim((string) $body['department']);
    }
    if (array_key_exists('is_active', $body)) {
        $fields[] = 'is_active = ?';
        $params[] = $body['is_active'] ? 1 : 0;
    }

    if (!$fields) {
        json_response(['success' => true]);
    }

    $params[] = $id;
    $sql = 'UPDATE approvers SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = db()->prepare($sql);
    try {
        $stmt->execute($params);
    } catch (PDOException $e) {
        json_response(['success' => false, 'message' => $e->getMessage()]);
    }
    json_response(['success' => true]);
}
